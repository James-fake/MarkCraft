import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { usePresenceValue, POPOVER_EXIT_MS } from '@components/ui/usePresence'
import { Icon } from '../../icons'
import { fileTypeMeta } from '../../themes/categoricalColors'
import { useFileManager } from '@stores/FileStore'
import {
  getRecentFiles,
  subscribeRecentFiles,
  type RecentFileEntry,
} from '@core/files/recentFiles'
import { collectFolderIds, flattenFileTree } from '@core/files/fileTree'
import type { FileNode } from '@src/types/fileManager'

/**
 * Aurora 文件管理器（编辑器左侧文件树）—— 视觉 = Aurora、数据 = 真实
 *
 * 严格对齐：
 * - 设计规范 22-file-manager.md（库名 Header / 搜索 / 操作按钮 / 树形层级 / 类型图标色 / 激活竖条）
 * - 项目真实实现 features/fileManager/Sidebar.tsx（最近文件、激活竖条、类型图标）
 *
 * 换芯（Phase 2 D8 / Phase 4 #155）：数据全部来自真实 useFileManager().rootFolder，
 * 打开/新建走真实 FileStore API（openFile 内部自动登记最近文件），不保留任何 mock 数据。
 */

// 文件类型 → 图标 + 颜色 统一走 src/aurora/themes/categoricalColors（fileTypeMeta / FILE_TYPE_META）

// 搜索框滚动显隐迟滞阈值：同向累计滚动超过该值（px）才展开/收起。
// 取值 < 单行高 26px，吸收触摸板微调/惯性/展开动画 clamp 造成的方向抖动。
const SEARCH_SCROLL_HYST = 20
// 删除确认弹层退场时长：必须与 components.css 的 --mc-dur-fast（180ms）保持一致，
// 退场动画播完才卸载 DOM（进出对称：入 420ms 强减速 → 出 180ms 加速）。
const CONFIRM_EXIT_MS = 180
// 翻转锁定窗：搜索框收起会令滚动区瞬时变高，若视口正停在列表底部附近，浏览器会把
// scrollTop 钳制回新最大值，产生一连串「反向」scroll 事件——那不是用户滚动。翻转后
// 短时忽略这些事件（须盖过 0.24s 折叠动画），否则会形成「收起→clamp 误判上滑→展开」
// 的自激振荡（搜索框反复快速抖动）。锁定期间方向累计清零，锁定期满后从零重新累计。
const SEARCH_FLIP_LOCKOUT_MS = 300

// 找出某文件的所有祖先文件夹 id（用于打开文件时自动展开其所在路径）
function findAncestorFolderIds(node: FileNode, targetId: string, acc: string[] = []): string[] | null {
  for (const child of node.children ?? []) {
    if (child.id === targetId) return acc
    if (child.type === 'folder') {
      const res = findAncestorFolderIds(child, targetId, [...acc, child.id])
      if (res) return res
    }
  }
  return null
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  return `${day}天前`
}

interface FileTreeProps {
  /** 收起整个文件树栏（点击列表顶部的折叠按钮时触发） */
  onCollapse?: () => void
  /** v7 边缘悬停浮层自带 head 时，隐藏文件树自带顶部条避免重复 */
  hideTopbar?: boolean
}

export function FileTree({ onCollapse, hideTopbar }: FileTreeProps) {
  const { rootFolder, openFile, createFile, createFolder, renameNode, deleteNode, getActiveFileId } = useFileManager()
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectFolderIds(rootFolder.children ?? [])),
  )
  const [search, setSearch] = useState('')
  // 搜索框默认收起：向列表开头方向滚动（上滑）即展开、下滑浏览即收起；已输入查询时保持可见
  const [treeSearchOpen, setTreeSearchOpen] = useState(false)
  // 滚动方向迟滞状态机：lastTop 记录上一帧位置；pending 累计同向位移，
  // 累计超过阈值（±SEARCH_SCROLL_HYST）才翻转状态并清零——吸收微调/惯性/clamp 抖动；
  // lockUntil 为翻转锁定截止时间：布局 clamp 引发的伪滚动在锁定期内一律忽略
  const treeLastTop = useRef<number | null>(null)
  const treePending = useRef(0)
  const treeLockUntil = useRef(0)
  // 最近打开分组：默认折叠（用户要求每次打开文件列表时「最近文件」默认收起）
  const [recentOpen, setRecentOpen] = useState(false)
  const [treeOpen, setTreeOpen] = useState(true)
  const [recent, setRecent] = useState<RecentFileEntry[]>(() => getRecentFiles())

  // 行内重命名（新建文件/文件夹后进入；后续可扩展到双击已有节点重命名）
  const [editing, setEditing] = useState<{ id: string; type: 'file' | 'folder'; value: string } | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const editEndingRef = useRef(false) // 防止 回车/取消 后的 blur 重复触发

  // 右键上下文菜单 + 删除确认
  const [menu, setMenu] = useState<{ id: string; type: 'file' | 'folder'; name: string; x: number; y: number } | null>(null)
  // 右键菜单退场相位（动效审计 P0-3）：setMenu(null) 后仍保留最后一份 x/y 播完 100ms 再卸载
  const menuPresence = usePresenceValue(menu, POPOVER_EXIT_MS)
  const [confirming, setConfirming] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  /** 删除确认退场态：置位后先播 180ms 反向动画，播完才真正卸载（与共享 Modal 同款进出对称） */
  const [confirmExiting, setConfirmExiting] = useState(false)
  const confirmExitTimer = useRef<number | null>(null)

  useEffect(() => subscribeRecentFiles(() => setRecent(getRecentFiles())), [])

  // 进入重命名时聚焦并全选输入框
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editing])

  // 数据源变化（首次挂载 / async 从 IndexedDB 恢复 / 新建节点）后，自动展开所有已存在的
  // 文件夹，保证文件树在任意数据源下都完整可见。虚拟根始终展开，无需纳入 expanded；
  // 仅做「增量添加」，不会清除用户手动折叠的文件夹。
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev)
      let changed = false
      const addFolders = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.type === 'folder') {
            if (!next.has(n.id)) { next.add(n.id); changed = true }
            if (n.children) addFolders(n.children)
          }
        }
      }
      if (rootFolder.children) addFolders(rootFolder.children)
      return changed ? next : prev
    })
  }, [rootFolder])

  const activeId = getActiveFileId()

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 打开文件并自动展开其祖先路径，确保激活项在树中可见
  const openFileById = (fileId: string) => {
    openFile(fileId)
    const chain = findAncestorFolderIds(rootFolder, fileId)
    if (chain && chain.length) {
      setExpanded((prev) => {
        const next = new Set(prev)
        chain.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const openNode = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id)
      return
    }
    openFileById(node.id)
  }

  // ── 新建文件 / 文件夹：先建占位节点，再进入行内重命名（VS Code 风格）──
  const startEditing = (id: string, type: 'file' | 'folder', defaultName: string) => {
    setSearch('')
    setTreeOpen(true)
    editEndingRef.current = false
    setEditing({ id, type, value: defaultName })
  }

  const commitEdit = () => {
    if (editEndingRef.current) return
    editEndingRef.current = true
    if (!editing) return
    const name = editing.value.trim()
    if (!name) {
      // 空名视为取消：移除占位节点
      deleteNode(editing.id)
      setEditing(null)
      return
    }
    // 与 FileStore.renameNode 对齐：文件无 .md 后缀时自动补 .md
    const finalOf = (n: string) =>
      editing.type === 'file' && !n.toLowerCase().endsWith('.md') ? `${n}.md` : n
    const desired = finalOf(name)
    const siblings = rootFolder.children ?? []
    const clash = (cand: string) =>
      siblings.some((c) => c.id !== editing.id && c.name.toLowerCase() === cand.toLowerCase())
    let final = desired
    if (clash(desired)) {
      let i = 2
      while (clash(`${desired} (${i})`)) i++
      final = `${desired} (${i})`
    }
    renameNode(editing.id, final)
    setEditing(null)
  }

  const cancelEdit = () => {
    if (editEndingRef.current) return
    editEndingRef.current = true
    if (editing) deleteNode(editing.id) // 取消则移除占位节点
    setEditing(null)
  }

  // ── 右键上下文菜单 + 删除确认 ──
  const openMenu = (node: FileNode, e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(null)
    setConfirmExiting(false)
    // 防止菜单溢出视口右/下边界
    const x = Math.min(e.clientX, window.innerWidth - 180)
    const y = Math.min(e.clientY, window.innerHeight - 96)
    setMenu({ id: node.id, type: node.type, name: node.name, x, y })
  }

  const onMenuRename = () => {
    if (!menu) return
    const { id, type, name } = menu
    setMenu(null)
    startEditing(id, type, name) // 复用行内重命名
  }

  const onMenuDelete = () => {
    if (!menu) return
    setConfirmExiting(false)
    setConfirming({ id: menu.id, type: menu.type, name: menu.name })
    setMenu(null)
  }

  const confirmDelete = () => {
    if (!confirming) return
    deleteNode(confirming.id) // 文件夹会递归删除其内全部内容
    dismissConfirm()
  }

  /** 关删除确认：先退场再卸载（退场时长 = components.css 的 --mc-dur-fast 180ms） */
  const dismissConfirm = () => {
    if (confirmExitTimer.current !== null) return
    setConfirmExiting(true)
    confirmExitTimer.current = window.setTimeout(() => {
      confirmExitTimer.current = null
      setConfirming(null)
      setConfirmExiting(false)
    }, CONFIRM_EXIT_MS)
  }

  const cancelDelete = () => dismissConfirm()

  // 卸载时清退场计时器，避免定时器泄漏
  useEffect(() => () => {
    if (confirmExitTimer.current !== null) window.clearTimeout(confirmExitTimer.current)
  }, [])

  // 菜单：点击外部 / Esc / 滚动 / 缩放 时关闭
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', () => setMenu(null))
    window.addEventListener('scroll', () => setMenu(null), true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', () => setMenu(null))
      window.removeEventListener('scroll', () => setMenu(null), true)
    }
  }, [menu])

  // 删除确认：Enter 确认 / Esc 取消
  useEffect(() => {
    if (!confirming) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cancelDelete() }
      else if (e.key === 'Enter') { e.preventDefault(); confirmDelete() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirming])

  const handleNewFile = () => {
    // openAfterCreate=false：命名期间不自动打开/收起侧栏，避免打断输入
    const id = createFile(rootFolder.id, '未命名.md', '', false)
    startEditing(id, 'file', '未命名')
  }

  const handleNewFolder = () => {
    const id = createFolder(rootFolder.id, '新建文件夹')
    startEditing(id, 'folder', '新建文件夹')
  }

  // 搜索框显隐完全交给滚动方向状态机（上滑展开/下滑收起；onScroll 内处理），无需图标入口

  const rows = flattenFileTree(rootFolder, 0, expanded).filter((r) => r.depth > 0)

  const filtered = search.trim()
    ? rows.filter((r) => r.node.name.toLowerCase().includes(search.trim().toLowerCase()))
    : rows

  return (
    <div className="aurora-filetree material-sidebar">
      {/* 顶部条：标题 + 收起按钮（v7 overlay 自带 head 时由 hideTopbar 隐藏） */}
      {!hideTopbar && (
        <div className="aurora-filetree__topbar">
          <span className="aurora-filetree__topbar-title">
            <Icon.layers size={14} />
            文件列表
          </span>
          <button
            type="button"
            className="aurora-filetree__collapse-btn"
            onClick={onCollapse}
            aria-label="收起文件列表"
            title="收起文件列表"
          >
            <Icon.chevronLeft size={16} />
          </button>
        </div>
      )}

      {/* 搜索框：默认收起——上滑（向列表开头）展开、下滑浏览收起；已输入查询时保持可见 */}
      <div className={`aurora-filetree__search ${treeSearchOpen || search.trim() ? '' : 'is-hidden'}`}>
        <Icon.search size={14} />
        <input
          className="aurora-filetree__search-input"
          placeholder="搜索文件..."
          value={search}
          tabIndex={treeSearchOpen || search.trim() ? 0 : -1}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 快捷操作：新建文件 / 新建文件夹（真实 API） */}
      <div className="aurora-filetree__actions">
        <button
          type="button"
          className="aurora-filetree__action aurora-filetree__action--wide"
          title="新建文件"
          onClick={handleNewFile}
        >
          <Icon.filePlus size={16} />
          <span className="aurora-filetree__action-label">新建文件</span>
        </button>
        <button
          type="button"
          className="aurora-filetree__action aurora-filetree__action--wide"
          title="新建文件夹"
          onClick={handleNewFolder}
        >
          <Icon.folderPlus size={16} />
          <span className="aurora-filetree__action-label">新建文件夹</span>
        </button>
      </div>

      {/* 文件树区域 */}
      <div
        className="aurora-filetree__tree"
        onScroll={(e) => {
          const st = e.currentTarget.scrollTop
          // 首次滚动：仅记录基准位置（恢复滚动位置时不做方向判断，防误判）
          if (treeLastTop.current === null) { treeLastTop.current = st; return }
          const delta = st - treeLastTop.current
          treeLastTop.current = st
          // 正在输入：不打扰（方向判定挂起）
          if (search.trim()) { treePending.current = 0; return }
          // 翻转锁定期：折叠动画引发的 scrollTop 钳制非用户滚动，忽略并清零，
          // 否则收起瞬间的「伪上滑」会立刻把搜索框顶回来（底部区域反复抖动）
          if (performance.now() < treeLockUntil.current) { treePending.current = 0; return }
          // 迟滞累计：同向位移叠加，反向则回退；越过阈值才翻转一次并清零
          treePending.current += delta
          if (treePending.current > SEARCH_SCROLL_HYST) {
            treePending.current = 0
            // 累计下滑超阈值 → 收起（浏览深处）
            if (treeSearchOpen) {
              treeLockUntil.current = performance.now() + SEARCH_FLIP_LOCKOUT_MS
              setTreeSearchOpen(false)
            }
          } else if (treePending.current < -SEARCH_SCROLL_HYST) {
            treePending.current = 0
            // 累计上滑超阈值 → 展开（向列表开头）
            if (!treeSearchOpen) {
              treeLockUntil.current = performance.now() + SEARCH_FLIP_LOCKOUT_MS
              setTreeSearchOpen(true)
            }
          }
        }}
      >
        {/* 搜索时仅显示结果，不做区块折叠 */}
        {search.trim() ? (
          <>
            <div className="aurora-filetree__section-title">搜索结果 ({filtered.length})</div>
            {filtered.length === 0 && (
              <div className="aurora-filetree__section-title" style={{ opacity: 0.5 }}>
                无匹配文件
              </div>
            )}
            {filtered.map(({ node, depth }) => {
              const meta = fileTypeMeta(node)
              const isActive = node.id === activeId
              const NodeIcon = Icon[meta.icon]
              if (editing && node.id === editing.id) {
                return (
                  <div
                    key={node.id}
                    className="aurora-filetree__item aurora-filetree__item--editing"
                    style={{ paddingLeft: 6 + depth * 16 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="aurora-filetree__arrow-spacer" />
                    <span className="aurora-filetree__item-icon" style={{ color: meta.color }}>
                      <NodeIcon size={15} />
                    </span>
                    <input
                      ref={editInputRef}
                      className="aurora-filetree__rename-input"
                      value={editing.value}
                      spellCheck={false}
                      onChange={(e) => setEditing((s) => (s ? { ...s, value: e.target.value } : s))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                      }}
                      onBlur={commitEdit}
                    />
                  </div>
                )
              }
              return (
                <div
                  key={node.id}
                  className={`aurora-filetree__item ${isActive ? 'aurora-filetree__item--active' : ''}`}
                  style={{ paddingLeft: 6 + depth * 16 }}
                  onClick={() => openNode(node)}
                  onContextMenu={(e) => openMenu(node, e)}
                >
                  {isActive && <span className="aurora-filetree__active-bar" />}
                  <span className="aurora-filetree__arrow-spacer" />
                  <span className="aurora-filetree__item-icon" style={{ color: meta.color }}>
                    <NodeIcon size={15} />
                  </span>
                  <span className="aurora-filetree__item-name">{node.name}</span>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {/* 最近打开（可折叠，真实数据） */}
            {recent.length > 0 && (
              <>
                <button
                  type="button"
                  className="aurora-filetree__section-header"
                  onClick={() => setRecentOpen((v) => !v)}
                  aria-expanded={recentOpen}
                >
                  <span className="aurora-filetree__section-caret">
                    {recentOpen ? <Icon.chevronDown size={12} /> : <Icon.chevronRight size={12} />}
                  </span>
                  <span className="aurora-filetree__section-label">最近打开</span>
                </button>
                {recentOpen &&
                  recent.map((f) => (
                    <div
                      key={f.fileId}
                      className={`aurora-filetree__recent ${f.fileId === activeId ? 'aurora-filetree__item--active' : ''}`}
                      onClick={() => openFileById(f.fileId)}
                    >
                      <Icon.clock size={13} />
                      <span className="aurora-filetree__recent-name">{f.fileName}</span>
                      <span className="aurora-filetree__recent-time">{formatRelative(f.lastOpened)}</span>
                    </div>
                  ))}
              </>
            )}

            {/* 文件树（可折叠） */}
            <button
              type="button"
              className="aurora-filetree__section-header"
              onClick={() => setTreeOpen((v) => !v)}
              aria-expanded={treeOpen}
            >
              <span className="aurora-filetree__section-caret">
                {treeOpen ? <Icon.chevronDown size={12} /> : <Icon.chevronRight size={12} />}
              </span>
              <span className="aurora-filetree__section-label">文件树</span>
            </button>
            {treeOpen &&
              filtered.map(({ node, depth }) => {
                const meta = fileTypeMeta(node)
                const isFolder = node.type === 'folder'
                const isOpen = expanded.has(node.id)
                const isActive = node.id === activeId
                const NodeIcon = Icon[meta.icon]
                if (editing && node.id === editing.id) {
                  return (
                    <div
                      key={node.id}
                      className="aurora-filetree__item aurora-filetree__item--editing"
                      style={{ paddingLeft: 6 + depth * 16 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="aurora-filetree__arrow-spacer" />
                      <span className="aurora-filetree__item-icon" style={{ color: meta.color }}>
                        <NodeIcon size={15} />
                      </span>
                      <input
                        ref={editInputRef}
                        className="aurora-filetree__rename-input"
                        value={editing.value}
                        spellCheck={false}
                        onChange={(e) => setEditing((s) => (s ? { ...s, value: e.target.value } : s))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                          else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                        }}
                        onBlur={commitEdit}
                      />
                    </div>
                  )
                }
                return (
                  <div
                    key={node.id}
                    className={`aurora-filetree__item ${isActive ? 'aurora-filetree__item--active' : ''}`}
                    style={{ paddingLeft: 6 + depth * 16 }}
                  onClick={() => openNode(node)}
                  onContextMenu={(e) => openMenu(node, e)}
                >
                  {isActive && <span className="aurora-filetree__active-bar" />}
                  {isFolder ? (
                      <span
                        className="aurora-filetree__arrow"
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        <Icon.chevronRight size={12} />
                      </span>
                    ) : (
                      <span className="aurora-filetree__arrow-spacer" />
                    )}
                    <span className="aurora-filetree__item-icon" style={{ color: meta.color }}>
                      <NodeIcon size={15} />
                    </span>
                    <span className="aurora-filetree__item-name">{node.name}</span>
                  </div>
                )
              })}
          </>
        )}
      </div>

      {/* 右键上下文菜单：Portal 到 body，避免被文件树列 overflow / 外壳 backdrop-filter 裁切遮挡 */}
      {menuPresence.mounted &&
        menuPresence.value &&
        createPortal(
          <div
            className="aurora-filetree__ctxmenu"
            ref={menuRef}
            data-exiting={menuPresence.exiting || undefined}
            style={{ position: 'fixed', left: menuPresence.value.x, top: menuPresence.value.y }}
          >
            <button type="button" className="aurora-filetree__ctxmenu-item" onClick={onMenuRename}>
              <Icon.edit size={14} />
              <span>重命名</span>
            </button>
            <button
              type="button"
              className="aurora-filetree__ctxmenu-item aurora-filetree__ctxmenu-item--danger"
              onClick={onMenuDelete}
            >
              <Icon.trash size={14} />
              <span>删除</span>
            </button>
          </div>,
          document.body,
        )}

      {/* 删除确认弹层：Portal 到 body，覆盖整个界面（而非困在文件树列内） */}
      {confirming &&
        createPortal(
          <div
            className="aurora-filetree__confirm-backdrop"
            data-exiting={confirmExiting || undefined}
            onMouseDown={cancelDelete}
          >
            <div className="aurora-filetree__confirm" onMouseDown={(e) => e.stopPropagation()}>
              <div className="aurora-filetree__confirm-title">
                删除{confirming.type === 'folder' ? '文件夹' : '文件'}
              </div>
              <div className="aurora-filetree__confirm-text">
                确定要删除 <b>{confirming.name}</b> 吗？
                {confirming.type === 'folder' && '该文件夹内的所有内容也会被一并删除。'}
              </div>
              <div className="aurora-filetree__confirm-actions">
                <button type="button" className="aurora-filetree__confirm-btn" onClick={cancelDelete}>
                  取消
                </button>
                <button
                  type="button"
                  className="aurora-filetree__confirm-btn aurora-filetree__confirm-btn--danger"
                  onClick={confirmDelete}
                >
                  删除
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

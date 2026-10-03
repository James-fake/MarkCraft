import { useMemo, useState } from 'react'
import { Icon } from '../../icons'
import { fileTypeMeta } from '../../themes/categoricalColors'
import type { FileNode } from '@src/types/fileManager'
import { collectFolderIds, flattenFileTree } from '@core/files/fileTree'
// 与编辑器文件列表同源过滤内置「使用文档」（单源判定：core/files/usageDocs，
// 由本 hook 包成响应式、useMemo 保证整树只算一次；绝不在白板侧另写一份判定）。
import { useUsageDocsScope } from '@hooks/useUsageDocsScope'
import { CANVAS_FILE_DRAG_MIME, CANVAS_FILE_DRAG_NAME_MIME } from './sidebarPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 文件（拖拽生成卡片） ─────────────
// 复制编辑器文件列表：数据来自真实 rootFolder（D4 单一数据源），文件夹可展开、
// 文件可拖拽到白板生成 note-card（点击则跳转编辑器打开）。仅承载展示 + 拖拽，
// 不重复编辑器的「新建/重命名/删除」逻辑（白板侧栏专注「把文件拖上白板」）。
// 文件类型 → 图标 + 颜色 统一走 src/aurora/themes/categoricalColors（fileTypeMeta / FILE_TYPE_META）

export function FilesTab({
  rootFolder, scrolled, onOpenFile,
}: {
  rootFolder: FileNode
  scrolled: boolean
  onOpenFile?: (fileId: string) => void
}) {
  const { t } = useLanguage()
  const ct = t.canvasTab
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectFolderIds(rootFolder.children ?? [])),
  )
  // 搜索框默认隐藏，下滑（scrolled）或已输入查询时才浮现，回到顶部且查询空则收起
  const revealSearch = scrolled || search.trim().length > 0

  // 与编辑器文件列表同源过滤：内置「MarkCraft 使用文档」知识库的内置篇章（及其所在
  // 文件夹，当里面无用户内容时）**不进白板文件列表**——它们本就不在编辑功能的文件列表里，
  // 否则白板会多出一批编辑器侧看不到的内置说明文件，两者内容不同步。
  // 仅做视图层面过滤（hiddenIds），文件仍留在树里、仍属知识库，数据一个字都不动。
  const usageDocs = useUsageDocsScope()
  const rows = flattenFileTree(rootFolder, 0, expanded).filter(
    (r) => r.depth > 0 && !usageDocs.hiddenIds.has(r.node.id),
  )
  const filtered = search.trim()
    ? rows.filter((r) => r.node.name.toLowerCase().includes(search.trim().toLowerCase()))
    : rows
  const fileCount = useMemo(
    () => rows.filter((r) => r.node.type !== 'folder').length,
    [rows],
  )

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData(CANVAS_FILE_DRAG_MIME, node.id)
    e.dataTransfer.setData(CANVAS_FILE_DRAG_NAME_MIME, node.name)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const openNode = (node: FileNode) => {
    if (node.type === 'folder') { toggleFolder(node.id); return }
    onOpenFile?.(node.id)
  }

  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">{ct.filesTitle}</div>
        <div className="aurora-csp__sub">{ct.filesCount.replace(String.raw`{n}`, String(fileCount))}</div>
      </div>
      <div className={`aurora-csp__search ${revealSearch ? '' : 'aurora-csp__search--hidden'}`}>
        <Icon.search size={12} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ct.searchFiles}
        />
      </div>
      {fileCount === 0 ? (
        <div className="aurora-csp__empty">
          {ct.filesEmpty}<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>{ct.filesEmptyHint}</span>
        </div>
      ) : (
        <>
          <div className="aurora-csp__drag-hint">
            <Icon.grip size={12} />
            {ct.filesDragHint}
          </div>
          <div className="aurora-csp__list">
            {filtered.map(({ node, depth }) => {
              const meta = fileTypeMeta(node)
              const isFolder = node.type === 'folder'
              const isOpen = expanded.has(node.id)
              const NodeIcon = Icon[meta.icon as keyof typeof Icon]
              return (
                <div
                  key={node.id}
                  className={`aurora-csp__item ${isFolder ? '' : 'aurora-csp__fileitem'}`}
                  style={{ paddingLeft: 6 + depth * 16 }}
                  draggable={!isFolder}
                  onDragStart={isFolder ? undefined : (e) => onDragStart(e, node)}
                  onClick={() => openNode(node)}
                  title={isFolder ? node.name : ct.dropToCreate.replace(String.raw`{name}`, node.name)}
                >
                  {isFolder ? (
                    <span className={`aurora-csp__arrow ${isOpen ? 'aurora-csp__arrow--open' : ''}`}>
                      <Icon.chevronRight size={12} />
                    </span>
                  ) : (
                    <span className="aurora-csp__arrow-spacer" />
                  )}
                  <span className="aurora-csp__item-icon" style={{ color: meta.color }}>
                    {NodeIcon ? <NodeIcon size={14} /> : null}
                  </span>
                  <span className="aurora-csp__item-title">{node.name}</span>
                  {!isFolder && <Icon.grip size={12} className="aurora-csp__grip" />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

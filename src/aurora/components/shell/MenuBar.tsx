import React, { useCallback, useEffect, useRef, useState } from 'react'
import { commandRegistry } from '../../../features/commandPalette/commandRegistry'
import { formatShortcut } from '../../../features/commandPalette/shortcutFormat'
import { useSettings } from '../../../stores/SettingsStore'
import { useFileManager } from '../../../stores/FileStore'

/**
 * Aurora 应用菜单栏（P1-1 · macOS HIG §1 Menu Bar）
 *
 * 桌面范式（㊲ 起）：并入标题栏同一行 —— 图标 + 品牌名 → [文件/视图/前往/工具/帮助]。
 * 容器高度 100% 随标题栏伸展，无独立条带/背景/下边线；下拉面板锚定标题栏底边之下。
 *
 * 设计纪律：
 * - 动作单一数据源：菜单项 id 一律指向 commandRegistry 中已注册的真实命令
 *   （COMMAND_CATALOG + auroraActions 在 AuroraShell 注册），点击仅做
 *   `commandRegistry.getById(id)?.action?.()`，绝不在此重复定义 handler；
 * - 菜单标签用桌面短语（与命令面板的描述式文案不同语境），保留 `title`
 *   悬停提示展示命令全名；
 * - 动态菜单（HIG Rule 1.3）：focus/typewriter/主题 显示勾选态；
 *   依赖活动文件的编辑器命令在无文件时禁用；
 * - 键盘：Esc 关闭、方向键导航（↓ 进入 / ↑↓ 移动 / ←→ 切换菜单 / Enter 执行）。
 */
export interface AuroraMenuEntry {
  /** 命令 id（须已注册于 commandRegistry） */
  id: string
  /** 菜单显示标题（桌面短语） */
  label: string
  /** 是否依赖活动文件（无活动文件时禁用） */
  needsFile?: boolean
}

export type AuroraMenu = { title: string; entries: (AuroraMenuEntry | '---')[] }

/** 文件 —— 文档生命周期 */
const FILE_MENU: AuroraMenu = {
  title: '文件',
  entries: [
    { id: 'file.newFile', label: '新建笔记' },
    { id: 'file.newFolder', label: '新建文件夹' },
    '---',
    { id: 'file.openDailyNote', label: '打开今日笔记' },
    { id: 'file.quickCapture', label: '快速记一笔' },
    { id: 'file.importFile', label: '打开文件…' },
    '---',
    { id: 'file.save', label: '保存', needsFile: true },
    { id: 'file.close', label: '关闭', needsFile: true },
    '---',
    { id: 'tools.librarySync', label: '库同步…' },
    { id: 'tools.migrate', label: '迁移笔记…' },
  ],
}

/** 编辑（HIG §1.1 Edit 菜单）：撤销 / 重做 / 剪贴板 / 查找 */
const EDIT_MENU: AuroraMenu = {
  title: '编辑',
  entries: [
    { id: 'edit.undo', label: '撤销' },
    { id: 'edit.redo', label: '重做' },
    '---',
    { id: 'edit.cut', label: '剪切' },
    { id: 'edit.copy', label: '复制' },
    { id: 'edit.paste', label: '粘贴' },
    { id: 'edit.selectAll', label: '全选' },
    '---',
    { id: 'edit.delete', label: '删除' },
    { id: 'edit.find', label: '查找' },
  ],
}

/** 视图 —— 显示与模式 */
const VIEW_MENU: AuroraMenu = {
  title: '视图',
  entries: [
    { id: 'view.toggleTheme', label: '切换深色 / 浅色主题' },
    { id: 'view.focusMode', label: '专注模式' },
    { id: 'view.typewriterMode', label: '打字机模式' },
    '---',
    { id: 'view.togglePreview', label: '切换预览', needsFile: true },
    { id: 'view.toggleSidebar', label: '切换侧边栏', needsFile: true },
    { id: 'view.toggleEditorMode', label: '切换编辑模式', needsFile: true },
  ],
}

/** 前往 —— 跳转与检索 */
const GO_MENU: AuroraMenu = {
  title: '前往',
  entries: [
    { id: 'navigation.quickSwitcher', label: '快速切换文件' },
    { id: 'navigation.quickOpen', label: '快速打开' },
    { id: 'navigation.globalSearch', label: '全局搜索' },
    { id: 'navigation.goToLine', label: '跳转到行号…', needsFile: true },
    '---',
    { id: 'navigation.graphView', label: '双链图谱' },
    { id: 'tools.openCanvas', label: '白板' },
    { id: 'tools.openKnowledgeBase', label: '知识库' },
    { id: 'tools.openBlogStudio', label: '博客工作室' },
    { id: 'tools.diary', label: '日记' },
  ],
}

/** 工具 —— 内容操作与发布 */
const TOOLS_MENU: AuroraMenu = {
  title: '工具',
  entries: [
    { id: 'editor.publish', label: '发布为博客', needsFile: true },
    { id: 'editor.addToKb', label: '加入知识库', needsFile: true },
    '---',
    { id: 'tools.insertTemplate', label: '插入模板', needsFile: true },
    { id: 'tools.templateDiscovery', label: '发现模板', needsFile: true },
    { id: 'tools.openVersionHistory', label: '版本历史', needsFile: true },
    { id: 'tools.openBlockBacklinks', label: '块反链', needsFile: true },
    '---',
    { id: 'tools.crossKbSearch', label: '跨知识库搜索' },
    { id: 'tools.linkRedirect', label: '链接重定向', needsFile: true },
    { id: 'tools.generateReverseMoc', label: '生成反向 MOC', needsFile: true },
  ],
}

/** 帮助 —— 设置与入口 */
const HELP_MENU: AuroraMenu = {
  title: '帮助',
  entries: [
    { id: 'settings.switchLanguage', label: '切换中 / 英文' },
  ],
}

/** 窗口（HIG §1.1 Window 菜单）：最小化 / 缩放 / 全部前置 */
const WINDOW_MENU: AuroraMenu = {
  title: '窗口',
  entries: [
    { id: 'window.minimize', label: '最小化' },
    { id: 'window.zoom', label: '缩放' },
    '---',
    { id: 'window.bringAllToFront', label: '全部移至最前' },
  ],
}

// 七组菜单（使用优化 2026-09-10：移除最左 MarkCraft 应用菜单——关于/设置经头像→设置可达，
// 退出走 ⌘Q 与交通灯；app.hide 系列菜单专属死命令已随菜单清剿）
const MENUS: AuroraMenu[] = [FILE_MENU, EDIT_MENU, VIEW_MENU, GO_MENU, TOOLS_MENU, WINDOW_MENU, HELP_MENU]

export function MenuBar() {
  const { settings } = useSettings()
  const { getActiveFileId } = useFileManager()

  const [openIndex, setOpenIndex] = useState<number | null>(null)
  /** 键盘高亮项在条目内的索引（-1 = 无） */
  const [highlight, setHighlight] = useState(-1)
  const barRef = useRef<HTMLDivElement>(null)
  const activeFileId = getActiveFileId()

  // 条目级 disabled：无活动文件 或 命令未注册（理论上均有，防御注册时序）
  const isDisabled = (e: AuroraMenuEntry) => {
    if (e.needsFile && !activeFileId) return true
    if (!commandRegistry.getById(e.id)?.action) return true
    return false
  }

  // 勾选态
  const isChecked = (e: AuroraMenuEntry) => {
    if (e.id === 'view.focusMode') return !!settings.focusMode
    if (e.id === 'view.typewriterMode') return !!settings.typewriterMode
    return false
  }

  const close = useCallback(() => {
    setOpenIndex(null)
    setHighlight(-1)
  }, [])

  const runEntry = useCallback((e: AuroraMenuEntry) => {
    if (isDisabled(e)) return
    const cmd = commandRegistry.getById(e.id)
    if (cmd?.action) {
      close()
      cmd.action()
    }
  }, [activeFileId, close])

  // 外部点击 / Esc 关闭
  useEffect(() => {
    if (openIndex === null) return
    const onDown = (ev: MouseEvent) => {
      if (!barRef.current?.contains(ev.target as Node)) close()
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation()
        close()
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [openIndex, close])

  // 打开菜单时聚焦第一项（键盘导航起点）
  useEffect(() => {
    if (openIndex !== null) setHighlight(0)
  }, [openIndex])

  const openAt = (idx: number) => {
    setOpenIndex((cur) => (cur === idx ? null : idx))
    setHighlight(0)
  }

  // 收集「可用」条目（跳过分隔与禁用），供键盘导航
  const enabledEntries = (m: AuroraMenu) =>
    m.entries.filter((e): e is AuroraMenuEntry => e !== '---' && !isDisabled(e))

  const onMenuKeyDown = (mi: number, ev: React.KeyboardEvent) => {
    const list = enabledEntries(MENUS[mi])
    if (!list.length) return
    switch (ev.key) {
      case 'ArrowRight':
        ev.preventDefault()
        for (let i = mi + 1; i < MENUS.length; i++) {
          if (enabledEntries(MENUS[i]).length) { setOpenIndex(i); setHighlight(0); return }
        }
        return
      case 'ArrowLeft':
        ev.preventDefault()
        for (let i = mi - 1; i >= 0; i--) {
          if (enabledEntries(MENUS[i]).length) { setOpenIndex(i); setHighlight(0); return }
        }
        return
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        ev.preventDefault()
        setOpenIndex(mi)
        setHighlight(0)
        return
      default:
        return
    }
  }

  const onItemKeyDown = (mi: number, ev: React.KeyboardEvent) => {
    const list = enabledEntries(MENUS[mi])
    const cur = highlight < 0 ? 0 : Math.min(highlight, list.length - 1)
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault()
        setHighlight((cur + 1) % list.length)
        return
      case 'ArrowUp':
        ev.preventDefault()
        setHighlight((cur - 1 + list.length) % list.length)
        return
      case 'ArrowRight':
        ev.preventDefault()
        if (mi < MENUS.length - 1) { setOpenIndex(mi + 1); setHighlight(0) }
        return
      case 'ArrowLeft':
        ev.preventDefault()
        if (mi > 0) { setOpenIndex(mi - 1); setHighlight(0) }
        return
      case 'Enter':
      case ' ':
        ev.preventDefault()
        const target = list[cur]
        if (target) runEntry(target)
        return
      default:
        return
    }
  }

  return (
    <div
      className="aurora-menubar"
      role="menubar"
      ref={barRef}
      aria-label="应用菜单"
    >
      {MENUS.map((m, mi) => {
        const isOpen = openIndex === mi
        const list = m.entries.filter((e): e is AuroraMenuEntry => e !== '---')

        // 渲染某菜单的下拉面板。可点击序号只数「可用」条目（与键盘导航对齐）
        const renderItems = () => {
          let usable = -1
          return m.entries.map((entry, ei) => {
            if (entry === '---') {
              return <div key={`sep-${ei}`} className="aurora-dropdown__separator" />
            }
            const disabled = isDisabled(entry)
            const checked = isChecked(entry)
            const meta = commandRegistry.getById(entry.id)
            // accelerator 显示归一：Mac → ⌘/⌥/⇧，其余平台保留 'Ctrl+S' 字面（仅显示，键位判定在 useKeyboardShortcuts）
            const shortcut = meta?.shortcut ? formatShortcut(meta.shortcut) : undefined
            if (!disabled) usable++
            const hi = disabled ? -1 : usable
            return (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                title={meta ? `${meta.labelZh}${shortcut ? ` · ${shortcut}` : ''}` : entry.label}
                className={[
                  'aurora-dropdown__item',
                  highlight === hi ? 'aurora-dropdown__item--highlighted' : '',
                  disabled ? 'aurora-dropdown__item--disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => runEntry(entry)}
                onMouseEnter={() => { if (!disabled) setHighlight(hi) }}
                onKeyDown={(ev) => onItemKeyDown(mi, ev)}
              >
                <span className="aurora-menubar__item-check" aria-hidden="true">
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 6.2 4.9 8.6 9.5 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="aurora-dropdown__item-label">{entry.label}</span>
                {shortcut && <span className="aurora-dropdown__item-shortcut">{shortcut}</span>}
              </button>
            )
          })
        }

        return (
          <div key={m.title} className="aurora-menubar__item-wrap">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className={[
                'aurora-menubar__item',
                isOpen ? 'aurora-menubar__item--open' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => openAt(mi)}
              onMouseEnter={() => {
                // 已展开任意菜单时，横向扫过即切换（桌面菜单惯例）
                if (openIndex !== null) openAt(mi)
              }}
              onKeyDown={(ev) => onMenuKeyDown(mi, ev)}
            >
              {m.title}
            </button>

            {isOpen && (
              <div
                className="aurora-dropdown aurora-menubar__pop"
                role="menu"
                aria-label={m.title}
              >
                {renderItems()}
                {list.length === 0 && (
                  <div className="aurora-menubar__empty">无可用命令</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

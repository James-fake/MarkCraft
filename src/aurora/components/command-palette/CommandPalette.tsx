import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { CategoryLabels, type CommandCategory } from '@services/command/commandRegistry'
import { recordCommandUse, getRecentCommandIds } from './commandHistory'
import { useLanguage } from '@stores/LanguageStore'

/** 最近使用分组的内置标记（非真实分类，渲染时显示中文标题） */
const RECENT_GROUP = '__recent__'
/** 文件搜索分组的内置标记（P2-4，渲染时显示中文「文件」） */
const FILE_GROUP = '__files__'

/**
 * 内置子序列匹配（无第三方依赖）：q 的字符按序出现在 target 中（忽略空白），
 * 用于容错漏字/错序，例如 `cs` → 「切换侧边栏」。
 */
function isSubsequence(q: string, target: string): boolean {
  const t = target.replace(/\s+/g, '').toLowerCase()
  let i = 0
  for (const ch of t) {
    if (ch === q[i]) i++
    if (i === q.length) return true
  }
  return i === q.length
}

/**
 * 单条命令是否命中查询：子串（标题/描述/分组/关键字）OR 标题子序列容错。
 */
function commandMatches(cmd: CommandItem, q: string): boolean {
  if (cmd.title.toLowerCase().includes(q)) return true
  if (cmd.description?.toLowerCase().includes(q)) return true
  if (cmd.group.toLowerCase().includes(q)) return true
  if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true
  // 子序列容错仅作用于标题（去掉空白后的纯文本）
  if (isSubsequence(q, cmd.title)) return true
  return false
}

/**
 * 命令项类型
 */
export interface CommandItem {
  /** 唯一 id */
  id: string
  /** 显示标题 */
  title: string
  /** 描述 */
  description?: string
  /** 图标 */
  icon?: IconName
  /** 分组 */
  group: string
  /** 快捷键提示 */
  shortcut?: string[]
  /** 搜索关键字（全量，用于子串 + 子序列容错匹配） */
  keywords?: string[]
  /** 执行回调 */
  action: () => void
}

/** 文件搜索项（P2-4 融合文件搜索） */
export interface FileSearchItem {
  id: string
  name: string
  path: string
}

interface CommandPaletteProps {
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 命令列表 */
  commands: CommandItem[]
  /** 文件搜索项（P2-4）：查询命中文件名/路径时，在「文件」分组展示 */
  fileItems?: FileSearchItem[]
  /** 选中文件项时的打开回调 */
  onOpenFile?: (id: string) => void
}

/**
 * Aurora 命令面板
 * - 居中浮层，搜索过滤
 * - 键盘上下选择，回车执行，Esc 关闭
 * - 分组显示
 */
export function CommandPalette({ open, onClose, commands, fileItems, onOpenFile }: CommandPaletteProps) {
  const { t, language } = useLanguage()
  const cp = t.cmdPalette
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 打开时聚焦输入框、重置状态
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlightedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 过滤结果
  const filteredGroups = useMemo(() => {
    if (!query.trim()) {
      // 默认展示：按分组返回所有命令
      const groups = new Map<string, CommandItem[]>()
      commands.forEach(cmd => {
        const arr = groups.get(cmd.group) ?? []
        arr.push(cmd)
        groups.set(cmd.group, arr)
      })
      const arr = Array.from(groups.entries()).map(([title, items]) => ({ title, items }))
      // P2-1 最近使用置顶：空查询时在顶部插入「最近使用」组
      const recentIds = getRecentCommandIds()
      if (recentIds.length > 0) {
        const recentItems = recentIds
          .map((id) => commands.find((c) => c.id === id))
          .filter((c): c is CommandItem => !!c)
        if (recentItems.length > 0) {
          arr.unshift({ title: RECENT_GROUP, items: recentItems })
        }
      }
      return arr
    }

    const q = query.toLowerCase()
    const matched = commands.filter(cmd => commandMatches(cmd, q))

    const groups = new Map<string, CommandItem[]>()
    matched.forEach(cmd => {
      const arr = groups.get(cmd.group) ?? []
      arr.push(cmd)
      groups.set(cmd.group, arr)
    })

    const result = Array.from(groups.entries()).map(([title, items]) => ({ title, items }))

    // P2-4 融合文件搜索：查询命中文件名/路径时，追加「文件」分组
    if (fileItems && fileItems.length > 0) {
      const fileResults = fileItems.filter(
        f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
      )
      if (fileResults.length > 0) {
        result.push({
          title: FILE_GROUP,
          items: fileResults.map((f) => ({
            id: `file:${f.id}`,
            title: f.name,
            description: f.path,
            group: FILE_GROUP,
            action: () => {
              onOpenFile?.(f.id)
              onClose()
            },
          })),
        })
      }
    }

    return result
  }, [query, commands, fileItems, onOpenFile, onClose])

  // 扁平化所有结果，用于键盘导航
  const flatItems = useMemo(
    () => filteredGroups.flatMap(g => g.items),
    [filteredGroups]
  )

  // 唤起快捷键提示（按平台显示 ⌘K / Ctrl+K）
  const paletteShortcut = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl+K'
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl+K'
  }, [])

  // 重置高亮索引
  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  // 高亮元素滚动到可视区
  useEffect(() => {
    if (!listRef.current) return
    const highlighted = listRef.current.querySelector('.aurora-command__item--highlighted')
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, filteredGroups])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[highlightedIndex]
      if (item) {
        recordCommandUse(item.id)
        item.action()
        onClose()
      }
    }
  }, [flatItems, highlightedIndex, onClose])

  const handleItemClick = (item: CommandItem) => {
    recordCommandUse(item.id)
    item.action()
    onClose()
  }

  if (!open) return null

  // 计算每个分组的起始索引，用于判断高亮
  let runningIndex = 0
  const groupIndexMap = filteredGroups.map(g => {
    const start = runningIndex
    runningIndex += g.items.length
    return { start, end: start + g.items.length }
  })

  return (
    <div
      className="aurora-command-overlay"
      onClick={onClose}
      role="dialog"
      aria-label={cp.aria}
    >
      <div
        className="aurora-command"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* 输入框 */}
        <div className="aurora-command__input-wrap">
          <span className="aurora-command__input-icon">
            <Icon.search size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="aurora-command__input"
            placeholder={cp.placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="aurora-command__input-hint">Esc</span>
        </div>

        {/* 结果列表 */}
        <div className="aurora-command__list" ref={listRef}>
          {filteredGroups.length === 0 ? (
            <div className="aurora-command__empty">{cp.empty}</div>
          ) : (
            filteredGroups.map((group, gi) => (
              <div key={group.title} className="aurora-command__group">
                <div className="aurora-command__group-title">{group.title === RECENT_GROUP ? cp.recentGroup : group.title === FILE_GROUP ? cp.fileGroup : (language === 'en' ? (CategoryLabels[group.title as CommandCategory]?.en ?? group.title) : (CategoryLabels[group.title as CommandCategory]?.zh ?? group.title))}</div>
                {group.items.map((item, ii) => {
                  const globalIndex = groupIndexMap[gi].start + ii
                  const isHighlighted = globalIndex === highlightedIndex
                  const IconComp = item.icon ? Icon[item.icon] : null

                  return (
                    <div
                      key={item.id}
                      className={[
                        'aurora-command__item',
                        isHighlighted ? 'aurora-command__item--highlighted' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setHighlightedIndex(globalIndex)}
                    >
                      {IconComp && (
                        <span className="aurora-command__item-icon">
                          <IconComp size={18} />
                        </span>
                      )}
                      <div className="aurora-command__item-content">
                        <div className="aurora-command__item-title">{item.title}</div>
                        {item.description && (
                          <div className="aurora-command__item-desc">{item.description}</div>
                        )}
                      </div>
                      {item.shortcut && (
                        <span className="aurora-command__item-shortcut">
                          {item.shortcut.map((k, ki) => (
                            <span key={ki} className="aurora-command__item-key">{k}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="aurora-command__footer">
          <div className="aurora-command__footer-keys">
            <span className="aurora-command__footer-key">
              <kbd>{paletteShortcut}</kbd> {cp.footerOpen}
            </span>
            <span className="aurora-command__footer-key">
              <kbd>↑</kbd><kbd>↓</kbd> {cp.footerNavigate}
            </span>
            <span className="aurora-command__footer-key">
              <kbd>↵</kbd> {cp.footerRun}
            </span>
            <span className="aurora-command__footer-key">
              <kbd>Esc</kbd> {cp.footerClose}
            </span>
          </div>
          <div>{flatItems.length} 个结果</div>
        </div>
      </div>
    </div>
  )
}

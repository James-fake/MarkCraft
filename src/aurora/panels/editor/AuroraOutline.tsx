import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePresenceValue, POPOVER_EXIT_MS } from '@components/ui/usePresence'
import { Icon } from '../../icons'
import { useLanguage } from '@stores/LanguageStore'
import { parseMarkdownHeadings, findHeadingLine, type OutlineItem } from '@utils/headingIdUtils'

// 搜索框滚动显隐迟滞阈值：同向累计滚动超过该值（px）才展开/收起。
// 取值 < 单行高 26px，吸收触摸板微调/惯性/展开动画 clamp 造成的方向抖动。
const SEARCH_SCROLL_HYST = 20
// 翻转锁定窗：搜索框收起会令滚动区瞬时变高，若视口正停在列表底部附近，浏览器会把
// scrollTop 钳制回新最大值，产生一连串「反向」scroll 事件——那不是用户滚动。翻转后
// 短时忽略这些事件（须盖过 0.24s 折叠动画），否则会形成「收起→clamp 误判上滑→展开」
// 的自激振荡（搜索框反复快速抖动）。锁定期间方向累计清零，锁定期满后从零重新累计。
const SEARCH_FLIP_LOCKOUT_MS = 300

interface AuroraOutlineProps {
  /** 当前笔记的 Markdown 源码（来自编辑器 localContent，展示态） */
  content: string
  /** 重命名 / 删除章节后回写源码（展示态字符串） */
  onChange?: (next: string) => void
}

/**
 * Aurora 大纲面板（编辑器右栏 · 大纲 Tab · 换芯）
 *
 * 对齐 Aurora 设计（design-specs/04-view-editor.md §5.2 + showcase ed-out-*）：
 *  - 数据：真实 `parseMarkdownHeadings`（与预览/源码 heading id 同源）。
 *  - 界面：搜索 + "N 个标题"计数 + 折叠/展开 + 点击跳转 + 滚动联动高亮；
 *          行高 26px / 字号 12px / 圆角 3px / 每级缩进 16px / 当前项 accent + 字重 500。
 *  - 交互：右键菜单（跳转 / 折叠展开子项 / 重命名回写 / 删除章节回写）+ 键盘导航
 *          （↑↓ 选择、Enter 跳转、←→ 折叠展开、F2 重命名）。
 */

/* —— 源码变更（重命名 / 删除章节），均基于真实 heading id 反查行号 —— */
function renameHeadingInSource(md: string, id: string, newText: string): string {
  const lineNo = findHeadingLine(md, id)
  if (lineNo < 1) return md
  const lines = md.split('\n')
  const idx = lineNo - 1
  const m = lines[idx].match(/^(#{1,6})(\s+)(.*?)(#*)\s*$/)
  if (m) {
    lines[idx] = `${m[1]}${m[2]}${newText.trim()}${m[4] ? ' ' + m[4] : ''}`
  }
  return lines.join('\n')
}

function deleteHeadingSection(md: string, id: string): string {
  const lineNo = findHeadingLine(md, id)
  if (lineNo < 1) return md
  const lines = md.split('\n')
  const idx = lineNo - 1
  const level = lines[idx].match(/^#+/)?.[0].length ?? 1
  let end = lines.length
  for (let i = idx + 1; i < lines.length; i++) {
    const hm = lines[i].match(/^(#{1,6})\s/)
    if (hm && hm[1].length <= level) { end = i; break }
  }
  lines.splice(idx, end - idx)
  return lines.join('\n')
}

export function AuroraOutline({ content, onChange }: AuroraOutlineProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  // 搜索框默认收起：向列表开头方向滚动（上滑）即展开、下滑浏览即收起；已输入查询时保持可见
  const [listSearchOpen, setListSearchOpen] = useState(false)
  // 滚动方向迟滞状态机：lastTop 记录上一帧位置；pending 累计同向位移，
  // 累计超过阈值（±SEARCH_SCROLL_HYST）才翻转状态并清零——吸收微调/惯性/clamp 抖动；
  // lockUntil 为翻转锁定截止时间：布局 clamp 引发的伪滚动在锁定期内一律忽略
  const listLastTop = useRef<number | null>(null)
  const listPending = useRef(0)
  const listLockUntil = useRef(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(false)

  const outline = useMemo(() => parseMarkdownHeadings(content), [content])

  // —— 搜索过滤（保留命中节点的父链）——
  const filterOutline = useCallback((items: OutlineItem[], q: string): OutlineItem[] => {
    if (!q.trim()) return items
    const lower = q.toLowerCase()
    const walk = (list: OutlineItem[]): OutlineItem[] => {
      const out: OutlineItem[] = []
      for (const it of list) {
        const textMatch = it.text.toLowerCase().includes(lower)
        const kids = it.children ? walk(it.children) : []
        if (textMatch || kids.length > 0) {
          out.push({ ...it, children: textMatch ? it.children : kids })
        }
      }
      return out
    }
    return walk(items)
  }, [])
  const filtered = useMemo(() => filterOutline(outline, search), [outline, search, filterOutline])

  const headingCount = useMemo(() => {
    let n = 0
    const count = (list: OutlineItem[]) => list.forEach((i) => { n++; if (i.children) count(i.children) })
    count(search ? filtered : outline)
    return n
  }, [outline, filtered, search])

  const parentIds = useMemo(() => {
    const ids = new Set<string>()
    const collect = (list: OutlineItem[]) => list.forEach((i) => {
      if (i.children && i.children.length) { ids.add(i.id); collect(i.children) }
    })
    collect(search ? filtered : outline)
    return ids
  }, [outline, filtered, search])

  const hasCollapsible = parentIds.size > 0
  const allCollapsed = hasCollapsible && collapsed.size === parentIds.size
  const allExpanded = hasCollapsible && collapsed.size === 0

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const smartToggle = useCallback(() => {
    if (!hasCollapsible) return
    setCollapsed(allCollapsed || !allExpanded ? new Set() : new Set(parentIds))
  }, [hasCollapsible, allCollapsed, allExpanded, parentIds])

  // —— 点击跳转：预览 DOM 优先，源码 .cm-line 兜底 ——
  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      flash(el)
      return
    }
    const line = findHeadingLine(content, id)
    if (line > 0) {
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      const cmLine = document.querySelectorAll('.cm-line')[line - 1] as HTMLElement | null
      if (scroller && cmLine) {
        scroller.scrollTo({ top: Math.max(0, cmLine.offsetTop - 16), behavior: 'smooth' })
        flash(cmLine)
      }
    }
  }, [content])

  const flash = (el: HTMLElement) => {
    el.classList.add('heading-highlight')
    window.setTimeout(() => el.classList.remove('heading-highlight'), 3000)
  }

  const handleClick = useCallback((id: string) => {
    setActiveId(id)
    setFocusedId(id)
    scrollToHeading(id)
  }, [scrollToHeading])

  // —— 重命名 / 删除（回写源码）——
  const commitRename = useCallback((id: string, value: string) => {
    editingRef.current = true
    setEditing(null)
    const text = value.trim()
    if (!text) return
    if (onChange) onChange(renameHeadingInSource(content, id, text))
  }, [content, onChange])

  const cancelRename = useCallback(() => {
    editingRef.current = true
    setEditing(null)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setMenu(null)
    if (onChange) onChange(deleteHeadingSection(content, id))
  }, [content, onChange])

  // —— 右键菜单关闭（点外部 / Esc / 滚动）——
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    const onScroll = () => setMenu(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { capture: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [menu])

  // —— 键盘导航 ——
  const visibleIds = useMemo(() => {
    const out: string[] = []
    const walk = (list: OutlineItem[]) => list.forEach((i) => {
      out.push(i.id)
      if (i.children && i.children.length && !collapsed.has(i.id)) walk(i.children)
    })
    walk(filtered)
    return out
  }, [filtered, collapsed])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? -1 : 1
      const cur = focusedId ?? activeId
      const i = cur ? visibleIds.indexOf(cur) : -1
      const next = visibleIds[Math.min(visibleIds.length - 1, Math.max(0, (i < 0 ? 0 : i + dir)))]
      if (next) { setFocusedId(next); setActiveId(next) }
    } else if (e.key === 'Enter' && focusedId) {
      e.preventDefault(); handleClick(focusedId)
    } else if (e.key === 'ArrowLeft' && focusedId) {
      if (parentIds.has(focusedId) && !collapsed.has(focusedId)) { e.preventDefault(); toggleCollapse(focusedId) }
    } else if (e.key === 'ArrowRight' && focusedId) {
      if (parentIds.has(focusedId) && collapsed.has(focusedId)) { e.preventDefault(); toggleCollapse(focusedId) }
    } else if (e.key === 'F2' && focusedId) {
      e.preventDefault()
      setEditing({ id: focusedId, value: findText(outline, focusedId) })
    }
  }, [editing, focusedId, activeId, visibleIds, parentIds, collapsed, toggleCollapse, handleClick, outline])

  // —— 滚动联动：高亮当前可见章节 ——
  useEffect(() => {
    if (headingCount === 0) return
    let raf = 0
    const compute = () => {
      raf = 0
      const ids = getFlatIds(search ? filtered : outline)
      let current: string | null = null
      const threshold = 96
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= threshold) current = id
        else break
      }
      if (!current && ids.length) {
        const first = document.getElementById(ids[0])
        if (first && first.getBoundingClientRect().top > threshold) current = ids[0]
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(compute) }
    const targets = ['.cm-scroller', '.preview-container', '.preview-content', '.aurora-editor__main']
    const nodes = targets.map((s) => document.querySelector(s)).filter(Boolean) as HTMLElement[]
    nodes.forEach((n) => n.addEventListener('scroll', onScroll, { passive: true }))
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    compute()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      nodes.forEach((n) => n.removeEventListener('scroll', onScroll))
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [headingCount, outline, filtered, search])

  const renderItem = (item: OutlineItem, depth: number): JSX.Element => {
    const hasKids = !!item.children && item.children.length > 0
    const isCollapsed = collapsed.has(item.id)
    const isActive = activeId === item.id
    const isFocused = focusedId === item.id
    const isEditing = editing?.id === item.id
    return (
      <div key={item.id} className="aurora-outline__node">
        <div
          className={`aurora-outline__row ${isActive ? 'is-active' : ''} ${isFocused ? 'is-focused' : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => handleClick(item.id)}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id: item.id }) }}
          onDoubleClick={() => setEditing({ id: item.id, value: item.text })}
        >
          {hasKids ? (
            <button
              type="button"
              className="aurora-outline__caret"
              onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id) }}
              aria-label={isCollapsed ? t.outline.expand : t.outline.collapse}
            >
              <Icon.chevronRight size={12} className={isCollapsed ? '' : 'aurora-outline__caret-icon--open'} />
            </button>
          ) : (
            <span className="aurora-outline__caret-spacer" />
          )}
          {isEditing ? (
            <input
              autoFocus
              className="aurora-outline__rename-input"
              value={editing!.value}
              onChange={(e) => setEditing({ id: item.id, value: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(item.id, editing!.value)
                else if (e.key === 'Escape') cancelRename()
              }}
              onBlur={() => { if (!editingRef.current) commitRename(item.id, editing!.value); else editingRef.current = false }}
            />
          ) : (
            <span className="aurora-outline__text">{item.text}</span>
          )}
        </div>
        {hasKids && !isCollapsed && (
          <div className="aurora-outline__children">
            {item.children!.map((c) => renderItem(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // 右键菜单退场相位（动效审计 P0-3）：setMenu(null) 后仍保留最后一份 x/y 播完 100ms 再卸载
  const menuPresence = usePresenceValue(menu, POPOVER_EXIT_MS)
  const menuData = menuPresence.value
  const menuNode = menuData ? (() => {
    const node = findNodeById(outline, menuData.id)
    if (!node) return null
    const hasKids = !!node.children && node.children.length > 0
    const isCollapsed = collapsed.has(menuData.id)
    return createPortal(
      <div
        className="aurora-outline__ctxmenu"
        ref={menuRef}
        data-exiting={menuPresence.exiting || undefined}
        style={{ position: 'fixed', left: menuData.x, top: menuData.y }}
      >
        <button type="button" className="aurora-outline__ctxmenu-item" onClick={() => { setMenu(null); handleClick(menuData.id) }}>
          <Icon.target size={13} />
          <span>跳转</span>
        </button>
        {hasKids && (
          <button type="button" className="aurora-outline__ctxmenu-item" onClick={() => { setMenu(null); toggleCollapse(menuData.id) }}>
            {isCollapsed ? <Icon.chevronRight size={13} /> : <Icon.chevronDown size={13} />}
            <span>{isCollapsed ? '展开子项' : '折叠子项'}</span>
          </button>
        )}
        <button type="button" className="aurora-outline__ctxmenu-item" onClick={() => { setMenu(null); setEditing({ id: menuData.id, value: node.text }) }}>
          <Icon.edit size={13} />
          <span>重命名</span>
        </button>
        <button type="button" className="aurora-outline__ctxmenu-item aurora-outline__ctxmenu-item--danger" onClick={() => handleDelete(menuData.id)}>
          <Icon.trash size={13} />
          <span>删除章节</span>
        </button>
      </div>,
      document.body,
    )
  })() : null

  return (
    <div className="aurora-outline">
      <div className="aurora-outline__header">
        <div className="aurora-outline__title">
          <span className="aurora-outline__title-bar" />
          <span>{t.outline.title}</span>
          {headingCount > 0 && <span className="aurora-outline__count">{headingCount} 个标题</span>}
        </div>
        {hasCollapsible && (
          <button
            type="button"
            className="aurora-outline__toggle"
            onClick={smartToggle}
            title={allCollapsed || !allExpanded ? t.outline.expandAll : t.outline.collapseAll}
          >
            <Icon.chevronDown size={14} />
          </button>
        )}
      </div>

      {/* 搜索框：默认收起——上滑（向列表开头）展开、下滑浏览收起；已输入查询时保持可见 */}
      <div className={`aurora-outline__search ${listSearchOpen || search.trim() ? '' : 'is-hidden'}`}>
        <Icon.search size={13} className="aurora-outline__search-icon" />
        <input
          className="aurora-outline__search-input"
          type="text"
          value={search}
          tabIndex={listSearchOpen || search.trim() ? 0 : -1}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={'搜索标题…'}
        />
        {search && (
          <button type="button" className="aurora-outline__search-clear" onClick={() => setSearch('')} aria-label="清除">
            <Icon.close size={13} />
          </button>
        )}
      </div>

      <div
        className="aurora-outline__list"
        ref={listRef}
        tabIndex={0}
        aria-label="文档大纲"
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          const st = e.currentTarget.scrollTop
          // 首次滚动：仅记录基准位置（恢复滚动位置时不做方向判断，防误判）
          if (listLastTop.current === null) { listLastTop.current = st; return }
          const delta = st - listLastTop.current
          listLastTop.current = st
          // 正在输入：不打扰（方向判定挂起）
          if (search.trim()) { listPending.current = 0; return }
          // 翻转锁定期：折叠动画引发的 scrollTop 钳制非用户滚动，忽略并清零，
          // 否则收起瞬间的「伪上滑」会立刻把搜索框顶回来（底部区域反复抖动）
          if (performance.now() < listLockUntil.current) { listPending.current = 0; return }
          // 迟滞累计：同向位移叠加，反向则回退；越过阈值才翻转一次并清零
          listPending.current += delta
          if (listPending.current > SEARCH_SCROLL_HYST) {
            listPending.current = 0
            // 累计下滑超阈值 → 收起（浏览深处）
            if (listSearchOpen) {
              listLockUntil.current = performance.now() + SEARCH_FLIP_LOCKOUT_MS
              setListSearchOpen(false)
            }
          } else if (listPending.current < -SEARCH_SCROLL_HYST) {
            listPending.current = 0
            // 累计上滑超阈值 → 展开（向列表开头）
            if (!listSearchOpen) {
              listLockUntil.current = performance.now() + SEARCH_FLIP_LOCKOUT_MS
              setListSearchOpen(true)
            }
          }
        }}
      >
        {headingCount === 0 ? (
          <div className="aurora-outline__empty">
            <Icon.listTree size={28} />
            <div className="aurora-outline__empty-title">{t.outline.noHeadings}</div>
            <div className="aurora-outline__empty-sub">{t.outline.addHeadingTip}</div>
          </div>
        ) : (
          filtered.map((item) => renderItem(item, 0))
        )}
      </div>

      {menuNode}
    </div>
  )
}

/* —— 工具 —— */
function getFlatIds(items: OutlineItem[]): string[] {
  const out: string[] = []
  const walk = (list: OutlineItem[]) => list.forEach((i) => { out.push(i.id); if (i.children) walk(i.children) })
  walk(items)
  return out
}

function findNodeById(items: OutlineItem[], id: string): OutlineItem | null {
  for (const it of items) {
    if (it.id === id) return it
    if (it.children) { const f = findNodeById(it.children, id); if (f) return f }
  }
  return null
}

function findText(items: OutlineItem[], id: string): string {
  return findNodeById(items, id)?.text ?? ''
}

export default AuroraOutline

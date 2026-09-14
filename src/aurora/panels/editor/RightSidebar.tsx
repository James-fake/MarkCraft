import { useState, useCallback, useEffect, useRef } from 'react'
import { Icon } from '../../icons'
import AuroraOutline from './AuroraOutline'
import AuroraFootnotes from './AuroraFootnotes'
import AuroraBacklinks from './AuroraBacklinks'
import AuroraPublish from './AuroraPublish'

/**
 * Aurora 编辑器右栏（换芯 · Tab 式检查器）
 *
 * 对齐 Aurora 设计（design-specs/04-view-editor.md §5 + 01-desktop-shell.md §4 + showcase）：
 *   右栏为 Tab 式检查器（大纲 / 脚注 / 块级反链 / 辅助，32px Tab 栏，280px solid，可拖拽 220-400）。
 * 设计硬性要求「右栏（Inspector）可收起」（§5 + 第 160 行「右栏收起（隐藏）」 + 第 314 行展开/收起 280ms spring）。
 *
 * 折叠逻辑在本组件内闭环：collapsed 自管 + localStorage 记忆；根元素 width 走 280ms spring 过渡，
 * 拖拽时挂 is-resizing（transition:none）避免粘滞。折叠态渲染满高竖条（竖排「检查器」+ 展开箭头），
 * 与左侧文件树折叠（32px 竖条）对称。
 */

export type InspectorTab = 'outline' | 'footnote' | 'backlinks' | 'aid'

// 使用优化⑥ · 侧栏 tab 全站统一（图标+文字竖排，与白板 csp__tab 同款同源）
const TABS: { id: InspectorTab; label: string; icon: string }[] = [
  { id: 'outline', label: '大纲', icon: 'list' },
  { id: 'footnote', label: '脚注', icon: 'footnote' },
  { id: 'backlinks', label: '块级反链', icon: 'backlinks' },
  // 2026-09-13：原「辅助」（写作辅助/成稿核查/粘贴为脚注）整体退役，改为「发布 / 归集」两项动作；
  // 图标随之由 wand（AI 魔杖）换为 send（对外投递），与实际内容对齐。
  { id: 'aid', label: '辅助', icon: 'send' },
]

const WIDTH_KEY = 'mc-aurora-rightbar-w'
const COLLAPSED_KEY = 'mc-aurora-rightbar-collapsed'
const MIN_W = 220
const MAX_W = 400
const DEFAULT_W = 280
const RAIL_W = 32

interface RightSidebarProps {
  content: string
  activeFileId?: string
  /** 受控 Tab（活动栏驱动时为单一数据源；不传则使用内部 tab 状态） */
  activeTab?: InspectorTab
  /** 强制展开：忽略 collapsed（活动栏召唤的面板恒展开，收起由活动栏 toggle 控制） */
  forceExpand?: boolean
  /** Tab 切换回调（活动栏受控模式必传，使内部 Tab 栏与活动栏高亮保持同步） */
  onTabChange?: (id: InspectorTab) => void
  onOpenNote: (fileId: string) => void
  onChange?: (next: string) => void
  /** 当前笔记文件名（辅助 Tab 展示 + 新建知识库默认命名） */
  activeFileName?: string
  /** 辅助 Tab · 发布为博客（单篇发布：交给博客面板） */
  onPublishNote?: (fileId: string) => void
  /** 辅助 Tab · 知识库列表展开态（受控：⌘K 命令面板可远程召唤展开；不传则内部自管） */
  kbMenuOpen?: boolean
  /** 知识库列表作用的目标笔记（缺省取 activeFileId；标签右键菜单可指定其它文件） */
  kbMenuFileId?: string | null
  onKbMenuOpenChange?: (open: boolean) => void
}

export function RightSidebar({ content, activeFileId, activeTab, forceExpand, onTabChange, onOpenNote, onChange, activeFileName, onPublishNote, kbMenuOpen, kbMenuFileId, onKbMenuOpenChange }: RightSidebarProps) {
  const [tab, setTab] = useState<InspectorTab>('outline')
  const [activeFootnoteId, setActiveFootnoteId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    // 首次打开默认折叠（无记忆时收起）；用户手动展开/收起后以 localStorage 记忆为准
    if (typeof localStorage === 'undefined') return true
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved === null) return true
    return saved === '1'
  })
  const [width, setWidth] = useState<number>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_W
    const raw = localStorage.getItem(WIDTH_KEY)
    const n = raw ? parseInt(raw, 10) : DEFAULT_W
    return Number.isFinite(n) ? Math.min(MAX_W, Math.max(MIN_W, n)) : DEFAULT_W
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizing = useRef(false)
  // 拖拽结束时要落盘的是「拖完的宽度」，但 mouseup 监听是拖拽开始时注册的闭包，
  // 直接读 state 会拿到拖拽前的旧值（改宽后刷新即回退）。用 ref 跟随最新值。
  const widthRef = useRef(width)
  useEffect(() => { widthRef.current = width }, [width])
  // 知识库列表展开态：受控优先（⌘K 命令面板可远程召唤展开），无受控 props 时内部自管
  const [kbOpenInternal, setKbOpenInternal] = useState(false)
  const kbOpen = kbMenuOpen ?? kbOpenInternal
  const setKbOpen = onKbMenuOpenChange ?? setKbOpenInternal

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleFootnoteClick = useCallback((footnoteId: string, _line: number) => {
    const ref = document.getElementById(`footnote-ref-${footnoteId}`)
    const def = document.getElementById(`footnote-${footnoteId}`)
    const target = ref || def
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('footnote-highlight')
      setActiveFootnoteId(footnoteId)
      window.setTimeout(() => {
        target.classList.remove('footnote-highlight')
        setActiveFootnoteId((prev) => (prev === footnoteId ? null : prev))
      }, 3000)
    }
  }, [])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true
    setIsResizing(true)
    const startX = e.clientX
    const startW = width
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      setWidth(Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX))))
    }
    const onUp = () => {
      resizing.current = false
      setIsResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      try { localStorage.setItem(WIDTH_KEY, String(widthRef.current)) } catch { /* ignore */ }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width])

  // 活动栏受控模式：forceExpand 时恒展开（收起由活动栏 toggle 控制）；activeTab 优先于内部 tab 状态
  const effectiveCollapsed = collapsed && !forceExpand
  const currentTab = activeTab ?? tab
  const selectTab = useCallback(
    (id: InspectorTab) => {
      if (onTabChange) onTabChange(id)
      else setTab(id)
    },
    [onTabChange],
  )

  const rootClassName = [
    'aurora-rightbar',
    effectiveCollapsed ? 'is-collapsed' : '',
    isResizing ? 'is-resizing' : '',
  ].filter(Boolean).join(' ')
  const rootStyle = effectiveCollapsed ? { width: RAIL_W } : { width }

  // 折叠态：满高竖条（竖排「检查器」+ 展开箭头），点击展开
  if (effectiveCollapsed) {
    return (
      <div className={rootClassName} style={rootStyle}>
        <button
          type="button"
          className="aurora-rightbar__rail"
          onClick={toggleCollapse}
          aria-label="展开检查器"
          aria-expanded={false}
          title="展开检查器"
        >
          <Icon.chevronLeft size={14} />
          <span className="aurora-rightbar__rail-label">检查器</span>
        </button>
      </div>
    )
  }

  return (
    <div className={rootClassName} style={rootStyle}>
      <span className="aurora-rightbar__resizer" onMouseDown={startResize} title={`拖拽调整宽度（${width}px）`} />
      <div className="aurora-rightbar__tabs" role="tablist">
        {TABS.map((t) => {
          const IconComp = Icon[t.icon as keyof typeof Icon]
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={currentTab === t.id}
              className={`aurora-rightbar__tab ${currentTab === t.id ? 'is-active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {IconComp ? <IconComp size={14} /> : null}
              <span>{t.label}</span>
            </button>
          )
        })}
        {!forceExpand && (
          <button
            type="button"
            className="aurora-rightbar__collapse-btn"
            onClick={toggleCollapse}
            aria-label="收起检查器"
            aria-expanded={true}
            title="收起检查器"
          >
            <Icon.chevronRight size={14} />
          </button>
        )}
      </div>

      <div className="aurora-rightbar__content">
        {currentTab === 'outline' && <AuroraOutline content={content} onChange={onChange} />}
        {currentTab === 'footnote' && (
          <AuroraFootnotes
            content={content}
            onFootnoteClick={handleFootnoteClick}
            activeFootnoteId={activeFootnoteId}
          />
        )}
        {currentTab === 'backlinks' && <AuroraBacklinks activeFileId={activeFileId} onOpenNote={onOpenNote} />}
        {currentTab === 'aid' && (
          <AuroraPublish
            fileId={kbMenuFileId ?? activeFileId ?? null}
            fileName={activeFileName}
            open={kbOpen}
            onOpenChange={setKbOpen}
            onPublish={onPublishNote}
          />
        )}
      </div>
    </div>
  )
}

export default RightSidebar

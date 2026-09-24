import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import { fileTypeMeta } from '../../themes/categoricalColors'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { useNoteVersion } from '@stores/NoteVersionStore'
import { useFileManager } from '@stores/FileStore'
import type { FileNode } from '@src/types/fileManager'
import { collectFolderIds, flattenFileTree } from '@core/files/fileTree'
import { NoteHoverCardView } from '@features/editor/components/NoteHoverCard'

/**
 * Aurora 左栏（.aurora-csp）—— spec 20 §2.10 五 Tab 面板
 *   大纲（搜索 + 卡片层级树）/ 反链（选中卡片的真实 LinkIndex 入出链）
 *   标签（真实 TagIndex + AND/OR + 计数）/ 历史（真实 NoteVersion + 撤销重做）
 *   小地图（真实 engine 视口 + 元素矩形）
 * 数据全部来自真实来源，UI 沿用现有 .aurora-csp* Aurora 样式。
 */
export interface CanvasSidebarPanelProps {
  engine: CanvasEngine | null
  /** 打开关联笔记（由 CanvasPanel 提供） */
  onOpenFile?: (fileId: string) => void
  /** 由 CanvasPanel 传入的初始 Tab（如「文件便签」按钮要求直接打开到文件列表） */
  initialTab?: TabId
}

const TABS = [
  { id: 'outline', label: '大纲', icon: 'list' },
  { id: 'backlinks', label: '反链', icon: 'backlinks' },
  { id: 'tags', label: '标签', icon: 'tag' },
  { id: 'history', label: '历史', icon: 'history' },
  { id: 'files', label: '文件', icon: 'fileText' },
  { id: 'minimap', label: '小地图', icon: 'frame' },
] as const

export type TabId = (typeof TABS)[number]['id']

// 标签 Tab 推荐标签（与真实 TagIndex 合并展示，确保即便无任何标签也有可用项）
const TAG_SUGGESTIONS = ['重要', '待办', '想法', '参考资料', '设计', '紧急']

interface ParsedShape {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  text: string
  fileId: string
}

export function CanvasSidebarPanel({ engine, onOpenFile, initialTab }: CanvasSidebarPanelProps) {
  const [tab, setTab] = useState<TabId>(initialTab ?? 'outline')
  // 由 CanvasPanel 传入的初始 Tab（如「文件便签」按钮要求直接打开到文件列表）：
  // 既作为挂载初值，也在该属性变化时同步切换当前 Tab。
  useEffect(() => { if (initialTab) setTab(initialTab) }, [initialTab])
  // 下滑才显示搜索：滚动状态 + 列表滚动容器 ref。切换 Tab 时复位（列表滚回顶部、搜索收起）。
  const [scrolled, setScrolled] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setScrolled(false)
    bodyRef.current?.scrollTo?.({ top: 0 })
  }, [tab])
  const [q, setQ] = useState('')
  const [tagLogic, setTagLogic] = useState<'AND' | 'OR'>('OR')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  /* 侧栏 tab 行 = Apple 分段控件式滑块（需求 N 第四轮定案）。
     本栏是「下划线滑块」形态：沿用 `.aurora-csp__tab` 原有的下划线选中语言
     （编辑器 rightbar 与它全站同源），只把「哪一条下划线亮」从 tab 自身挪到
     一条独立滑块上 —— 于是按住 tab 拖动时**只有下划线在滑**，文字钉住不动。
     手势绑在 tab 行而非主绘图区 —— Excalidraw 的水平拖拽是画布平移/绘制，
     劫持它必然破坏绘图体验（DesignBrief §4.3）。 */
  const tabStrip = useTabStripThumb({
    index: Math.max(0, TABS.findIndex((t) => t.id === tab)),
    count: TABS.length,
    onIndexChange: (next) => setTab(TABS[next].id),
  })
  const [miniZoom, setMiniZoom] = useState(0.5)

  const { getBacklinks, getOutgoingLinks } = useLinkIndex()
  const { getAllTags, getTagCount } = useTagIndex()
  const { versions, loadVersions, deleteVersion, toggleLock } = useNoteVersion()
  const { rootFolder } = useFileManager()

// 引擎数据 → 手动订阅 'document' 变更（避开 useSyncExternalStore 对 getCurrentPageShapes
// 返回值逐帧微变的 tearing 检测；只在该引擎真实发生 document 变更时才重算）。
const [shapes, setShapes] = useState<ParsedShape[]>([])
  useEffect(() => {
    if (!engine) {
      setShapes([])
      return
    }
    const recompute = () => {
      const list = engine.getCurrentPageShapes()
      const next = list.map((s) => {
        const p = (s.props as any) ?? {}
        const w = p.w ?? p.width ?? 0
        const h = p.h ?? p.height ?? 0
        return {
          id: s.id,
          type: s.type,
          x: s.x ?? 0,
          y: s.y ?? 0,
          w,
          h,
          text: String(p.text ?? '').replace(/\n/g, ' '),
          fileId: p.fileId ?? '',
        } satisfies ParsedShape
      })
      setShapes((prev) => {
        // 浅相等：id|text 序列相同则不更新（避免无意义重渲染）
        const sig = next.map((s) => `${s.id}:${s.text}:${s.fileId}`).join('|')
        const prevSig = prev.map((s) => `${s.id}:${s.text}:${s.fileId}`).join('|')
        return sig === prevSig ? prev : next
      })
    }
    recompute()
    const unsub = engine.store.listen(recompute, { scope: 'document' })
    return () => unsub()
  }, [engine])
  const noteCards = useMemo(() => shapes.filter((s) => s.type === 'note-card'), [shapes])
  const otherCount = useMemo(() => shapes.filter((s) => s.type !== 'note-card').length, [shapes])

  const selectedIdsSig = useEngineSnapshot(
    engine,
    (e) => e.getSelectedShapeIds().join('|'),
    'session',
  ) ?? ''
  const selectedIds = selectedIdsSig ? selectedIdsSig.split('|').filter(Boolean) : []
  // 视口框：仅在 'session' emit 时刷新（与 zoom/camera 节流一致），避免逐帧 tearing
  const viewSig = useEngineSnapshot(
    engine,
    (e) => {
      const v = e.getViewportPageBounds()
      return `${Math.round(v.x)}|${Math.round(v.y)}|${Math.round(v.width)}|${Math.round(v.height)}`
    },
    'session',
  ) ?? ''

  const selectedNote = shapes.find((s) => selectedIds.includes(s.id) && s.type === 'note-card')
  const backlinks = useMemo(
    () => (selectedNote?.fileId ? getBacklinks(selectedNote.fileId) : []),
    [selectedNote?.fileId, getBacklinks, shapes],
  )
  const outgoing = useMemo(
    () => (selectedNote?.fileId ? getOutgoingLinks(selectedNote.fileId) : []),
    [selectedNote?.fileId, getOutgoingLinks, shapes],
  )

  // 标签：真实标签 + 推荐合并去重
  const allTags = useMemo(() => {
    const real = getAllTags()
    return Array.from(new Set([...real, ...TAG_SUGGESTIONS]))
  }, [getAllTags, shapes])

  // 历史：加载本白板 note-card 关联文件的版本
  const historyFileIds = useMemo(
    () => Array.from(new Set(noteCards.map((c) => c.fileId).filter(Boolean))),
    [noteCards],
  )
  useEffect(() => {
    historyFileIds.forEach((id) => void loadVersions(id))
  }, [historyFileIds, loadVersions])
  const relVersions = useMemo(
    () => (historyFileIds.length > 0 ? versions.filter((v) => historyFileIds.includes(v.fileId)) : versions),
    [versions, historyFileIds],
  )
  const groups = useMemo(() => {
    const day = 24 * 3600 * 1000
    const now = Date.now()
    const today: typeof relVersions = []
    const yesterday: typeof relVersions = []
    const earlier: typeof relVersions = []
    for (const v of relVersions) {
      const age = now - v.timestamp
      if (age < day) today.push(v)
      else if (age < 2 * day) yesterday.push(v)
      else earlier.push(v)
    }
    return { today, yesterday, earlier }
  }, [relVersions])

  const filePathById = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (n: FileNode, parents: string[]) => {
      const path = [...parents, n.name].filter(Boolean).join('/')
      if (n.id) m.set(n.id, path)
      if (n.children) for (const c of n.children) walk(c, [...parents, n.name])
    }
    walk(rootFolder, [])
    return m
  }, [rootFolder])

  const togglePick = (t: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  return (
    <div className="aurora-csp">
      <div className="aurora-csp__head">
        <div className="aurora-csp__tabs" role="tablist" data-swiping={tabStrip.dragging || undefined} {...tabStrip.bind}>
          {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中） */}
          <div className="aurora-csp__tabs-track" ref={tabStrip.trackRef}>
            {/* 滑块：选中态的视觉承载者（下划线，选中色已从 tab 迁到这里） */}
            <span className="aurora-csp__tabs-thumb" ref={tabStrip.thumbRef} aria-hidden="true" />
            {TABS.map((t) => {
              const IconComp = Icon[t.icon as keyof typeof Icon]
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  title={t.label}
                  className={`aurora-csp__tab ${tab === t.id ? 'aurora-csp__tab--active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {IconComp ? <IconComp size={14} /> : null}
                  {/* 使用优化⑥：补渲染文字（图标+文字竖排，与编辑器 rightbar__tab 全站同款） */}
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="aurora-csp__body"
        ref={bodyRef}
        onScroll={(e) => {
          const next = e.currentTarget.scrollTop > 8
          setScrolled((prev) => (prev === next ? prev : next))
        }}
      >
        {tab === 'outline' && (
          <OutlineTab
            noteCards={noteCards}
            otherCount={otherCount}
            q={q}
            setQ={setQ}
            scrolled={scrolled}
            onJump={(id) => engine?.setSelectedShapes([id])}
          />
        )}
        {tab === 'backlinks' && (
          <BacklinksTab
            selected={selectedNote}
            backlinks={backlinks}
            outgoing={outgoing}
            filePathById={filePathById}
            onOpenFile={onOpenFile}
          />
        )}
        {tab === 'tags' && (
          <TagsTab
            tags={allTags}
            getTagCount={getTagCount}
            picked={picked}
            onToggle={togglePick}
            onClear={() => setPicked(new Set())}
            tagLogic={tagLogic}
            setTagLogic={setTagLogic}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            groups={groups}
            onDelete={(vid) => void deleteVersion(vid)}
            onLock={(vid) => void toggleLock(vid)}
            filePathById={filePathById}
          />
        )}
        {tab === 'minimap' && (
          <MinimapTab shapes={shapes} viewSig={viewSig} zoom={miniZoom} setZoom={setMiniZoom} />
        )}
        {tab === 'files' && (
          <FilesTab
            rootFolder={rootFolder}
            scrolled={scrolled}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    </div>
  )
}

// ───────────── 大纲 ─────────────
function OutlineTab({
  noteCards, otherCount, q, setQ, scrolled, onJump,
}: {
  noteCards: ParsedShape[]
  otherCount: number
  q: string
  setQ: (v: string) => void
  scrolled: boolean
  onJump: (id: string) => void
}) {
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return noteCards
    return noteCards.filter((c) => c.text.toLowerCase().includes(term))
  }, [noteCards, q])
  // 搜索框默认隐藏，下滑（scrolled）或已输入查询时才浮现，回到顶部且查询空则收起
  const revealSearch = scrolled || q.trim().length > 0

  // spec 20：前 3 根、其余子 → 前 3 个展开，剩余折叠在「其他 (N)」下
  const [expanded, setExpanded] = useState(true)
  const roots = filtered.slice(0, 3)
  const others = filtered.slice(3)

  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">大纲</div>
        <div className="aurora-csp__sub">{noteCards.length} 卡片 · {otherCount} 图形</div>
      </div>
      <div className={`aurora-csp__search ${revealSearch ? '' : 'aurora-csp__search--hidden'}`}>
        <Icon.search size={12} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索卡片标题"
        />
      </div>
      {noteCards.length === 0 ? (
        <div className="aurora-csp__empty">
          白板暂无卡片<br />
          使用底部工具栏「便签」即可新建
        </div>
      ) : filtered.length === 0 ? (
        <div className="aurora-csp__empty">未匹配到「{q}」相关卡片</div>
      ) : (
        <div className="aurora-csp__list">
          {roots.map((c) => (
            <OutlineRow key={c.id} shape={c} onJump={onJump} />
          ))}
          {others.length > 0 && (
            <>
              <button
                type="button"
                className="aurora-csp__item aurora-csp__tagitem"
                onClick={() => setExpanded((v) => !v)}
                style={{ justifyContent: 'flex-start' }}
              >
                <span className={`aurora-csp__arrow ${expanded ? 'aurora-csp__arrow--open' : ''}`}>
                  <Icon.chevronRight size={12} />
                </span>
                <span className="aurora-csp__item-title">
                  其他（{others.length}）
                </span>
              </button>
              {expanded && others.map((c) => (
                <div key={c.id} style={{ paddingLeft: 14 }}>
                  <OutlineRow shape={c} onJump={onJump} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function OutlineRow({ shape, onJump }: { shape: ParsedShape; onJump: (id: string) => void }) {
  return (
    <button type="button" className="aurora-csp__item" onClick={() => onJump(shape.id)}>
      <span className="aurora-csp__arrow-ghost" />
      <span className="aurora-csp__dot" style={{ background: 'var(--mc-accent)' }} />
      <span className="aurora-csp__item-title">{shape.text || '(空卡片)'}</span>
      {shape.fileId && <Icon.fileText size={12} className="aurora-csp__filelink" />}
    </button>
  )
}

// ───────────── 反链 ─────────────
function BacklinksTab({
  selected, backlinks, outgoing, filePathById, onOpenFile,
}: {
  selected: ParsedShape | undefined
  backlinks: { sourceFileId: string; target: string; relation?: string }[]
  outgoing: { sourceFileId: string; target: string; relation?: string }[]
  filePathById: Map<string, string>
  onOpenFile?: (fileId: string) => void
}) {
  // hover 卡片（P2-3：对齐编辑器反链的悬浮预览）
  const [hover, setHover] = useState<{ x: number; y: number; fileId: string; label: string; rel?: string } | null>(null)
  const showHover = (e: React.MouseEvent, fileId: string, rel?: string) => {
    const label = filePathById.get(fileId) ?? fileId
    setHover({ x: e.clientX, y: e.clientY, fileId, label, rel })
  }
  if (!selected) {
    return (
      <div className="aurora-csp__panel">
        <div className="aurora-csp__header">
          <div className="aurora-csp__title">反链</div>
        </div>
        <div className="aurora-csp__empty">
          请选中一张卡片查看反链<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>提示：白板中点击便签即可选中</span>
        </div>
      </div>
    )
  }
  const hoverCard = hover && (
    <div
      style={{
        position: 'fixed',
        left: Math.min(hover.x + 14, window.innerWidth - 300),
        top: Math.min(hover.y + 10, window.innerHeight - 120),
        // 层级由卡片自带的 .aurora-dropdown 基底（锚定浮层带 1000）决定，
        // 定位容器不再自持 z-index（原 10002 属越带魔数，见 tokens.css §14）。
        pointerEvents: 'none',
      }}
      onMouseLeave={() => setHover(null)}
    >
      <NoteHoverCardView
        data={{
          title: hover.label,
          summary: hover.rel ?? '',
          backlinkCount: 0,
          outgoingCount: 0,
          tags: [],
          broken: false,
          fuzzy: false,
          fileId: hover.fileId,
        }}
        onOpen={onOpenFile}
        width={280}
      />
    </div>
  )
  return (
    <div className="aurora-csp__panel">
      {hoverCard}
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">反链</div>
        <div className="aurora-csp__sub">
          {(filePathById.get(selected.fileId) ?? selected.text) || '当前卡片'}
        </div>
      </div>
      <div className="aurora-csp__section-title">入链（{backlinks.length}）</div>
      {backlinks.length === 0 ? (
        <div className="aurora-csp__empty" style={{ padding: '12px' }}>暂无指向此卡片的链接</div>
      ) : (
        backlinks.slice(0, 12).map((b, i) => (
          <div key={`in-${i}`} className="aurora-csp__linkcard" onMouseEnter={(e) => showHover(e, b.sourceFileId, b.relation)} onMouseLeave={() => setHover(null)}>
            <div className="aurora-csp__linkcard-title">
              <Icon.fileText size={12} className="aurora-csp__filelink" />
              <span>{filePathById.get(b.sourceFileId) ?? b.sourceFileId}</span>
            </div>
            {b.relation && <span className="aurora-csp__realtag">{b.relation}</span>}
          </div>
        ))
      )}
      <div className="aurora-csp__section-title">出链（{outgoing.length}）</div>
      {outgoing.length === 0 ? (
        <div className="aurora-csp__empty" style={{ padding: '12px' }}>此卡片暂无出链</div>
      ) : (
        outgoing.slice(0, 12).map((o, i) => (
          <div key={`out-${i}`} className="aurora-csp__linkcard" onMouseEnter={(e) => showHover(e, o.sourceFileId, o.relation)} onMouseLeave={() => setHover(null)}>
            <div className="aurora-csp__linkcard-title">
              <Icon.link size={12} className="aurora-csp__filelink" />
              <span>{o.target}</span>
            </div>
            {o.relation && <span className="aurora-csp__realtag aurora-csp__realtag--success">{o.relation}</span>}
          </div>
        ))
      )}
    </div>
  )
}

// ───────────── 标签 ─────────────
function TagsTab({
  tags, getTagCount, picked, onToggle, onClear, tagLogic, setTagLogic,
}: {
  tags: string[]
  getTagCount: (t: string) => number
  picked: Set<string>
  onToggle: (t: string) => void
  onClear: () => void
  tagLogic: 'AND' | 'OR'
  setTagLogic: (v: 'AND' | 'OR') => void
}) {
  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">标签</div>
        <div className="aurora-csp__sub">{picked.size > 0 ? `${picked.size} 已选` : '未筛选'}</div>
      </div>
      <div className="aurora-csp__logic">
        <button
          type="button"
          className={`aurora-csp__logic-btn ${tagLogic === 'AND' ? 'aurora-csp__logic-btn--on' : ''}`}
          onClick={() => setTagLogic('AND')}
        >
          AND
        </button>
        <button
          type="button"
          className={`aurora-csp__logic-btn ${tagLogic === 'OR' ? 'aurora-csp__logic-btn--on' : ''}`}
          onClick={() => setTagLogic('OR')}
        >
          OR
        </button>
      </div>
      {tags.length === 0 ? (
        <div className="aurora-csp__empty">
          暂无标签<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>在笔记中使用 #标签 即可创建</span>
        </div>
      ) : (
        <div className="aurora-csp__list">
          {tags.map((t) => {
            const count = getTagCount(t)
            const on = picked.has(t)
            return (
              <button
                key={t}
                type="button"
                className={`aurora-csp__tagitem ${on ? 'aurora-csp__tagitem--on' : ''}`}
                onClick={() => onToggle(t)}
              >
                <span className="aurora-csp__tag-hash" style={{ color: on ? 'var(--mc-accent)' : 'var(--mc-text-tertiary)' }}>#</span>
                <span className="aurora-csp__tag-name">{t}</span>
                <span className="aurora-csp__tag-count">{count}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="aurora-csp__footer">
        <span style={{ fontSize: 11, color: 'var(--mc-text-tertiary)' }}>{tagLogic} 匹配</span>
        <button
          type="button"
          className="aurora-csp__footer-btn"
          disabled={picked.size === 0}
          onClick={onClear}
        >
          清除筛选
        </button>
      </div>
    </div>
  )
}

// ───────────── 历史 ─────────────
function HistoryTab({
  groups, onDelete, onLock, filePathById,
}: {
  groups: { today: any[]; yesterday: any[]; earlier: any[] }
  onDelete: (vid: string) => void
  onLock: (vid: string) => void
  filePathById: Map<string, string>
}) {
  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  const opLabel = (op: string) => op === 'manual' ? '手动保存' : op === 'auto' ? '自动保存' : '保存'
  const renderGroup = (title: string, list: any[]) => {
    if (list.length === 0) return null
    return (
      <>
        <div className="aurora-csp__section-title">{title}</div>
        <div className="aurora-csp__timeline">
          {list.map((v, i) => (
            <div key={v.versionId} className="aurora-csp__hist">
              <span className={`aurora-csp__hist-dot ${i === 0 && title === '今天' ? 'aurora-csp__hist-dot--new' : ''}`} />
              <span className="aurora-csp__hist-icon"><Icon.save size={12} /></span>
              <div className="aurora-csp__hist-main">
                <div className="aurora-csp__hist-label">{opLabel(v.operation)} · {v.wordCount} 字</div>
                <div className="aurora-csp__hist-time">
                  {filePathById.get(v.fileId) ?? v.fileId} · {fmtTime(v.timestamp)}
                </div>
              </div>
              <div className="aurora-csp__hist-actions">
                <button type="button" title={v.locked ? '解锁' : '锁定'} onClick={() => onLock(v.versionId)}>
                  {v.locked ? <Icon.lock size={11} /> : <Icon.star size={11} />}
                </button>
                <button type="button" title="删除版本" onClick={() => onDelete(v.versionId)}>
                  <Icon.trash size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }
  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">历史</div>
        <div className="aurora-csp__sub">{groups.today.length + groups.yesterday.length + groups.earlier.length} 版本</div>
      </div>

      {renderGroup('今天', groups.today)}
      {renderGroup('昨天', groups.yesterday)}
      {renderGroup('更早', groups.earlier)}
      {groups.today.length + groups.yesterday.length + groups.earlier.length === 0 && (
        <div className="aurora-csp__empty">
          暂无历史版本<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>对白板的操作会自动产生撤销栈</span>
        </div>
      )}
    </div>
  )
}

// ───────────── 小地图 ─────────────
function MinimapTab({
  shapes, viewSig, zoom, setZoom,
}: {
  shapes: ParsedShape[]
  viewSig: string
  zoom: number
  setZoom: (v: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx2d = cv.getContext('2d')
    if (!ctx2d) return
    const W = cv.width
    const H = cv.height

    ctx2d.clearRect(0, 0, W, H)

    if (shapes.length === 0) {
      // 空白板提示
      ctx2d.fillStyle = 'rgba(255,255,255,0.35)'
      ctx2d.font = '11px system-ui'
      ctx2d.textAlign = 'center'
      ctx2d.fillText('白板为空', W / 2, H / 2)
      return
    }

    // 元素包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const s of shapes) {
      if (s.w <= 0 || s.h <= 0) continue
      minX = Math.min(minX, s.x)
      minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + s.w)
      maxY = Math.max(maxY, s.y + s.h)
    }
    if (!isFinite(minX)) return
    const worldW = (maxX - minX) || 1
    const worldH = (maxY - minY) || 1
    const scale = Math.min((W - 8) / worldW, (H - 8) / worldH) * zoom
    const offX = (W - worldW * scale) / 2 - minX * scale
    const offY = (H - worldH * scale) / 2 - minY * scale

    for (const s of shapes) {
      const x = s.x * scale + offX
      const y = s.y * scale + offY
      const w = Math.max(2, s.w * scale)
      const h = Math.max(2, s.h * scale)
      const isNote = s.type === 'note-card'
      ctx2d.fillStyle = isNote ? 'rgba(124,140,255,0.85)' : 'rgba(167,139,250,0.75)'
      ctx2d.fillRect(x, y, w, h)
    }

    // 视口框
    if (viewSig) {
      const [vx, vy, vw, vh] = viewSig.split('|').map(Number)
      if (vw > 0 && vh > 0) {
        const x = vx * scale + offX
        const y = vy * scale + offY
        const w = Math.max(2, vw * scale)
        const h = Math.max(2, vh * scale)
        ctx2d.strokeStyle = '#7C8CFF'
        ctx2d.lineWidth = 1.5
        ctx2d.strokeRect(x, y, w, h)
        ctx2d.fillStyle = 'rgba(124,140,255,0.15)'
        ctx2d.fillRect(x, y, w, h)
      }
    }
  }, [shapes, viewSig, zoom])

  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">小地图</div>
        <div className="aurora-csp__sub">{shapes.length} 元素</div>
      </div>
      <canvas ref={canvasRef} width={248} height={200} className="aurora-csp__mini" />
      <div className="aurora-csp__mini-hint">
        {shapes.length} 卡片/图形 · 缩放 {Math.round(zoom * 100)}%
      </div>
      <div className="aurora-csp__zoomrow">
        <button type="button" className="aurora-csp__zoom-btn" onClick={() => setZoom(Math.max(0.2, +(zoom - 0.1).toFixed(2)))} title="缩小" aria-label="缩小">
          <Icon.minus size={12} />
        </button>
        <input
          type="range"
          className="aurora-csp__zoom-slider"
          min={0.2}
          max={2}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
          aria-label="小地图缩放"
        />
        <button type="button" className="aurora-csp__zoom-btn" onClick={() => setZoom(Math.min(2, +(zoom + 0.1).toFixed(2)))} title="放大" aria-label="放大">
          <Icon.plus size={12} />
        </button>
        <span className="aurora-csp__zoom-val">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  )
}

// ───────────── 文件（拖拽生成卡片） ─────────────
// 复制编辑器文件列表：数据来自真实 rootFolder（D4 单一数据源），文件夹可展开、
// 文件可拖拽到白板生成 note-card（点击则跳转编辑器打开）。仅承载展示 + 拖拽，
// 不重复编辑器的「新建/重命名/删除」逻辑（白板侧栏专注「把文件拖上白板」）。
// 文件类型 → 图标 + 颜色 统一走 src/aurora/themes/categoricalColors（fileTypeMeta / FILE_TYPE_META）

// 拖拽写入的自定义 MIME（与 CanvasPanel 的放置目标约定一致）
export const CANVAS_FILE_DRAG_MIME = 'application/x-mc-canvas-file-id'
export const CANVAS_FILE_DRAG_NAME_MIME = 'application/x-mc-canvas-file-name'

function FilesTab({
  rootFolder, scrolled, onOpenFile,
}: {
  rootFolder: FileNode
  scrolled: boolean
  onOpenFile?: (fileId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectFolderIds(rootFolder.children ?? [])),
  )
  // 搜索框默认隐藏，下滑（scrolled）或已输入查询时才浮现，回到顶部且查询空则收起
  const revealSearch = scrolled || search.trim().length > 0

  const rows = flattenFileTree(rootFolder, 0, expanded).filter((r) => r.depth > 0)
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
        <div className="aurora-csp__title">文件</div>
        <div className="aurora-csp__sub">{fileCount} 个文件</div>
      </div>
      <div className={`aurora-csp__search ${revealSearch ? '' : 'aurora-csp__search--hidden'}`}>
        <Icon.search size={12} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索文件"
        />
      </div>
      {fileCount === 0 ? (
        <div className="aurora-csp__empty">
          暂无文件<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>在编辑器中创建笔记后，可拖拽到白板</span>
        </div>
      ) : (
        <>
          <div className="aurora-csp__drag-hint">
            <Icon.grip size={12} />
            拖拽文件到白板 → 生成卡片
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
                  title={isFolder ? node.name : `拖拽到白板生成卡片 · 点击打开：${node.name}`}
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { useNoteVersion } from '@stores/NoteVersionStore'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import type { FileNode } from '@src/types/fileManager'
import { TABS, TAG_SUGGESTIONS, TAG_SUGGESTIONS_EN, type TabId, type ParsedShape } from './sidebarPanelShared'
import { OutlineTab } from './OutlineTab'
import { BacklinksTab } from './BacklinksTab'
import { TagsTab } from './TagsTab'
import { HistoryTab } from './HistoryTab'
import { MinimapTab } from './MinimapTab'
import { FilesTab } from './FilesTab'

/**
 * Aurora 左栏（.aurora-csp）—— spec 20 §2.10 五 Tab 面板
 *   大纲（搜索 + 卡片层级树）/ 反链（选中卡片的真实 LinkIndex 入出链）
 *   标签（真实 TagIndex + AND/OR + 计数）/ 历史（真实 NoteVersion + 撤销重做）
 *   小地图（真实 engine 视口 + 元素矩形）
 * 数据全部来自真实来源，UI 沿用现有 .aurora-csp* Aurora 样式。
 *
 * P4-2 拆分（2026-10）：六个 Tab 已抽为同目录子文件，共享模型（TABS / TabId /
 * ParsedShape / 拖拽 MIME）在 ./sidebarPanelShared；本文件只保留主组件的引擎订阅
 * 与 Tab 骨架。TabId 与 MIME 常量在此再导出，CanvasPanel 等外部引用路径不变。
 */
export interface CanvasSidebarPanelProps {
  engine: CanvasEngine | null
  /** 打开关联笔记（由 CanvasPanel 提供） */
  onOpenFile?: (fileId: string) => void
  /** 由 CanvasPanel 传入的初始 Tab（如「文件便签」按钮要求直接打开到文件列表） */
  initialTab?: TabId
}

// 外部（CanvasPanel / smoke 测试）自本文件引用 —— 拆分后保持再导出，消费路径不变
export type { TabId }
export { CANVAS_FILE_DRAG_MIME, CANVAS_FILE_DRAG_NAME_MIME } from './sidebarPanelShared'

export function CanvasSidebarPanel({ engine, onOpenFile, initialTab }: CanvasSidebarPanelProps) {
  const { t, language } = useLanguage()
  const cs = t.canvasSidebar
  const tagSuggestions = language === 'en' ? TAG_SUGGESTIONS_EN : TAG_SUGGESTIONS
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
        const p = s.props ?? {}
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
        // 浅相等：id|text 序列相同则不更新（避免无意义重渲染）。
        // 签名必须带上几何属性 x/y/w/h，否则拖拽 / 缩放后签名不变，
        // 缩略图与计数不刷新（审查 M4-CanvasSidebarPanel）。
        const shapeSig = (s: (typeof next)[number]) => `${s.id}:${s.x}:${s.y}:${s.w}:${s.h}:${s.text}:${s.fileId}`
        const sig = next.map(shapeSig).join('|')
        const prevSig = prev.map(shapeSig).join('|')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: shapes 变化时强制重算反链（历史修复：画布卡片内容变更后保持面板同步）
    [selectedNote?.fileId, getBacklinks, shapes],
  )
  const outgoing = useMemo(
    () => (selectedNote?.fileId ? getOutgoingLinks(selectedNote.fileId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: 同上，outgoing 与 backlinks 保持同一失效语义
    [selectedNote?.fileId, getOutgoingLinks, shapes],
  )

  // 标签：真实标签 + 推荐合并去重
  const allTags = useMemo(() => {
    const real = getAllTags()
    return Array.from(new Set([...real, ...tagSuggestions]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: shapes 变化时强制重算标签合集（getAllTags 为读取型函数）
  }, [getAllTags, shapes, tagSuggestions])

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
            {TABS.map((item) => {
              const IconComp = Icon[item.icon as keyof typeof Icon]
              const label = (cs as unknown as Record<string, string>)[item.labelKey]
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={tab === item.id}
                  title={label}
                  className={`aurora-csp__tab ${tab === item.id ? 'aurora-csp__tab--active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {IconComp ? <IconComp size={14} /> : null}
                  {/* 使用优化⑥：补渲染文字（图标+文字竖排，与编辑器 rightbar__tab 全站同款） */}
                  <span>{label}</span>
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

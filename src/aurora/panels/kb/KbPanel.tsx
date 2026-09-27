import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react'
import { Modal } from '@components/ui/Modal'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useTabStripThumb } from '../../hooks/useTabStripThumb'
import { KbFileRow } from './KbFileRow'
import { MiniGraph } from './MiniGraph'
import { useFileManager } from '@stores/FileStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { KbSearchPanel } from '@features/knowledgeBase/components/KbSearchPanel'
import { setEditorReturn } from '../../navigation/navReturn'
import { readKbTab, saveKbTab } from './kbSession'
import KbChatPanel from '@features/knowledgeBase/components/KbChatPanel'
import { KbExportMenu } from '@features/knowledgeBase/components/KbExportMenu'
import { FileDependencyPanel } from '@features/knowledgeBase/components/FileDependencyPanel'
import { generateKbMoc } from '@features/knowledgeBase'
import { findNode } from '@core/files/fileTree'
import { loadKb, getKbList, getKbFiles, renameKb, updateDescription, deleteKb } from '@stores/kbStore'
import { useKbStore } from '@stores/useKbStore'
import { getCanvasList, createCanvas, type CanvasListItem } from '@features/canvas-v2'
import { calculateKbHealth } from '@features/knowledgeBase'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'
import '../../styles/panels/kb.css'
// 使用优化④：kb-* 组件类（搜索/问答/导出/依赖内嵌 features 组件）单源样式此前从未被任何入口加载，
// 导致搜索 tab 布局裸奔（元素堆左上角）；主题差异由 kb.css 的 .aurora-kb.kb-shell 复合选择器重映射兜底。
import '@features/knowledgeBase/kb-ui.css'

/**
 * Aurora 知识库工作室面板（详情页）
 *
 * 对齐项目实际功能（src/features/knowledgeBase/）：
 * - KbManager 外壳（Topbar + 左分类导航 + 内容区）
 * - KbDashboard 概览首屏（5 KPI + 健康度 + AI 摘要 + 最近活动 + 标签体系 + 专属图谱）
 * - 11 个 Tab 可切换（概览/笔记/搜索/任务/目标/回顾/问答/依赖/MOC/盲区/导出）
 *
 * 数据层（2026-08-26 换芯）：移除 MOCK_KBS / 写死 KPI，全部由真实来源派生：
 *  - kb 文档：loadKb(kbId)（IndexedDB / canvas-v2 同款存储）
 *  - 文件集合：getKbFiles(rootFolder, kb) → 真实文件节点
 *  - KPI：字数（中文字+英文词）、标签数（TagIndex 跨 KB 文件）、白板数（kb.canvasIds）
 *  - 双链数：LinkIndex.getGraphData 中两端均在 KB 内的 wikilink 去重计数
 *  - 健康度：复用真实 calculateKbHealth（链接密度/非孤立率/标签覆盖/更新活跃 四维）
 *  - 最近活动 / 标签体系：由 KB 文件 updatedAt / TagIndex 真实派生
 *  - 专属图谱：由 getGraphData 过滤到 KB 文件子集（节点=笔记·连线=引用）
 */

export interface KbPanelProps {
  kbId?: string
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
}

export type KbTab =
  | 'overview' | 'notes' | 'search' | 'tasks' | 'goals'
  | 'review' | 'chat' | 'dependency' | 'moc' | 'blindspot' | 'export'

// 知识库模块 Tab（P1-1.5 K1 真落点：隐藏任务/目标/回顾/盲区 4 入口——从 TABS 移除，
// 避免半成品模块分散注意力；其余 7 个 Tab 全部接入真实功能组件，无占位桩）
const TABS: { id: KbTab; label: string; icon: IconName }[] = [
  { id: 'overview', label: '概览', icon: 'dashboard' },
  { id: 'notes', label: '笔记', icon: 'file' },
  { id: 'search', label: '搜索', icon: 'search' },
  { id: 'chat', label: '问答', icon: 'chat' },
  { id: 'dependency', label: '依赖', icon: 'link' },
  { id: 'moc', label: 'MOC', icon: 'layers' },
  { id: 'export', label: '导出', icon: 'download' },
]

// 健康度评分：按阈值着色（≥80 绿 / 60–79 黄 / <60 红），对齐审计 P1-5
const healthColor = (pct: number): string =>
  pct >= 80 ? 'var(--mc-success)' : pct >= 60 ? 'var(--mc-warning)' : 'var(--mc-danger)'

const pctOf = (score: number, max = 25) => Math.round((score / max) * 100)
const compactNum = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

// ---- 专属图谱迷你节点图：已抽为单源组件 ./MiniGraph（2026-09-22 哑节点修复）----
// 原实现内联在本文件，节点只有 `cursor: pointer` 而整张图无点击处理，且只给一个节点渲染名字
// （即「00 开始使用」）⇒ 用户点它毫无反应、停在知识库详情页。根因与修法见 MiniGraph.tsx 顶部。

interface OverviewData {
  fileCount: number
  canvasCount: number
  tagCount: number
  totalWords: number
  linkCount: number
  health: ReturnType<typeof calculateKbHealth> | null
  recentFiles: FileNode[]
  topTags: { tag: string; count: number }[]
  aiSummary?: string
  miniNodes: { id: string; label: string }[]
  miniEdges: [string, string][]
}

function OverviewTab({
  toast,
  data,
  onOpenFullGraph,
  onOpenNote,
  canvasSlot,
}: {
  toast?: (m: string) => void
  data: OverviewData
  /**
   * 「查看完整图谱」的动作。由 KbPanel 注入并**在此处只负责触发**：
   * 图谱入参（kbId）的拼装单源收敛在 KbPanel 的 openFullGraph 里，
   * 免得哑组件各自拼 nav 参数、把「范围」这件事散成多处真值。
   */
  onOpenFullGraph?: () => void
  /**
   * 文件行的打开动作（在编辑器中打开指定笔记）。
   * 缺省时「最近活动」退化为纯展示列表 —— 不再出现「看着可点、点了没反应」的哑行。
   */
  onOpenNote?: (id: string) => void
  /**
   * 「关联白板」区块的插槽：与「专属图谱」同排双卡（左图谱 / 右白板）。
   * 由 KbPanel 注入 KbCanvasSection——概览 Tab 保持哑组件，区块自身逻辑不内联。
   */
  canvasSlot?: ReactNode
}) {
  const kpiData = [
    { icon: 'file' as IconName, title: '笔记文件', value: String(data.fileCount), sub: '本库收录' },
    { icon: 'canvas' as IconName, title: '关联白板', value: String(data.canvasCount), sub: '跨库关联' },
    { icon: 'tag' as IconName, title: '标签', value: String(data.tagCount), sub: '去重计数' },
    { icon: 'book' as IconName, title: '总字数', value: compactNum(data.totalWords), sub: '中文字+英文词' },
    { icon: 'link' as IconName, title: '双链数', value: String(data.linkCount), sub: '库内引用' },
  ]

  const healthItems = data.health
    ? [
        { label: '链接密度', score: data.health.linkScore },
        { label: '非孤立率', score: data.health.orphanScore },
        { label: '标签覆盖', score: data.health.tagScore },
        { label: '更新活跃', score: data.health.activeScore },
      ]
    : []

  return (
    <div className="aurora-kb-overview">
      {/* KPI 行 */}
      <div className="aurora-kb-kpi-row">
        {kpiData.map((k) => {
          const I = Icon[k.icon]
          return (
            <div key={k.title} className="aurora-kb-kpi">
              <div className="aurora-kb-kpi__icon"><I size={16} /></div>
              <div className="aurora-kb-kpi__body">
                <div className="aurora-kb-kpi__title">{k.title}</div>
                <div className="aurora-kb-kpi__value">{k.value}</div>
                <div className="aurora-kb-kpi__sub">{k.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 健康度 + AI 摘要 */}
      <div className="aurora-kb-row">
        <div className="aurora-kb-card aurora-kb-card--health">
          <div className="aurora-kb-card__title">健康度</div>
          <div className="aurora-kb-health">
            {healthItems.map((h) => {
              const pct = pctOf(h.score)
              return (
                <div key={h.label} className="aurora-kb-health__item">
                  <div className="aurora-kb-health__top">
                    <span>{h.label}</span>
                    <span className="aurora-kb-health__score">{h.score}</span>
                  </div>
                  <div className="aurora-kb-health__track">
                    <div className="aurora-kb-health__fill" style={{ width: `${pct}%`, background: healthColor(pct) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="aurora-kb-card aurora-kb-card--ai">
          <div className="aurora-kb-card__title">AI 摘要<span className="aurora-kb-badge">本地</span></div>
          <div className="aurora-kb-ai__body">
            {data.aiSummary ?? '尚未生成 AI 摘要。点击「重新生成」调用本地模型对本库笔记做概括（需配置 AI 服务）。'}
          </div>
          <button className="aurora-kb-btn" onClick={() => toast?.('重新生成摘要（本地模型）')}>
            <Icon.refresh size={14} /> 重新生成
          </button>
        </div>
      </div>

      {/* 最近活动 + 标签体系 */}
      <div className="aurora-kb-row">
        <div className="aurora-kb-card aurora-kb-card--recent">
          <div className="aurora-kb-card__title">最近活动</div>
          <div className="aurora-kb-recent">
            {data.recentFiles.length === 0 ? (
              <div className="aurora-kb-recent__empty">暂无文件</div>
            ) : (
              data.recentFiles.map((f) => (
                <KbFileRow key={f.id} file={f} onSelect={onOpenNote} hint={`在编辑器中打开「${f.name}」`} />
              ))
            )}
          </div>
        </div>

        <div className="aurora-kb-card aurora-kb-card--tags">
          <div className="aurora-kb-card__title">标签体系</div>
          <div className="aurora-kb-tags">
            {data.topTags.length === 0 ? (
              <div className="aurora-kb-recent__empty">暂无标签</div>
            ) : (
              data.topTags.map((t) => (
                <span key={t.tag} className="aurora-kb-tag">
                  {t.tag}<em>{t.count}</em>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 专属图谱 + 关联白板：同排双卡（左图谱 / 右白板），免去「图谱下面还有一屏」的查找成本 */}
      <div className="aurora-kb-row aurora-kb-row--graph">
        <div className="aurora-kb-card aurora-kb-card--graph">
          <div className="aurora-kb-card__title">
            专属图谱<span className="aurora-kb-card__hint">节点=笔记 · 连线=引用</span>
            {onOpenFullGraph && (
              <button className="aurora-kb-card__link" onClick={onOpenFullGraph} title="在完整双链图谱中查看（仅本库）">
                查看完整图谱 →
              </button>
            )}
          </div>
          {/* 节点=笔记：点节点即「在编辑器中打开该笔记」，与列表行同一动作
              （此前节点只有手型没有 handler —— 点第一篇毫无反应，见 MiniGraph.tsx） */}
          {data.miniNodes.length === 0 ? (
            <div className="aurora-kb-recent__empty">库内暂无引用关系</div>
          ) : (
            <MiniGraph
              nodes={data.miniNodes}
              edges={data.miniEdges}
              currentId={data.miniNodes[0]?.id}
              onSelect={onOpenNote}
            />
          )}
        </div>
        {canvasSlot}
      </div>
    </div>
  )
}

// 笔记 Tab：由真实 KB 文件集合派生；点击在编辑器中打开，并可一键新建笔记
function NotesTab({ files, onOpen, onCreate }: { files: FileNode[]; onOpen: (id: string) => void; onCreate?: () => void }) {
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">暂无笔记</div>
        <div className="aurora-kb-placeholder__desc">本知识库尚未收录任何文件。</div>
        <div className="aurora-kb-placeholder__actions">
          {onCreate && <button className="aurora-kb-btn" onClick={onCreate}><Icon.plus size={14} /> 新建笔记</button>}
        </div>
      </div>
    )
  }
  return (
    <div className="aurora-kb-notes">
      <div className="aurora-kb-notes__head">
        <div className="aurora-kb-notes__head-left">
          <span className="aurora-kb-notes__head-title">库内笔记</span>
          <span className="aurora-kb-notes__head-count" aria-label={`共 ${files.length} 条`}>{files.length}</span>
        </div>
        {onCreate && (
          <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={onCreate}><Icon.plus size={14} /> 新建笔记</button>
        )}
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onOpen} hint={`在编辑器中打开「${f.name}」`} />
      ))}
    </div>
  )
}

export function KbPanel({ kbId, nav, toast }: KbPanelProps) {
  /**
   * Tab 现场记忆（kbSession）：KB → 编辑器（点笔记）→ 「← 返回 XX」的往返中本组件会
   * 整体卸载重挂，若不复用记忆，用户离开时所在的 Tab（如「笔记」）会复位成「概览」——
   * 报障原话「点击笔记…直接回到了知识库详细界面的概览页面中」。故初始值读记忆，
   * 每次切换写回（见 setTab）。
   */
  const [tab, setTabState] = useState<KbTab>(() => readKbTab(kbId) ?? 'overview')
  const setTab = useCallback(
    (next: KbTab) => {
      setTabState(next)
      saveKbTab(kbId, next)
    },
    [kbId],
  )
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 换库（kbId 变化）时同步该库自己记住的 Tab；无记忆则回「概览」
  useEffect(() => {
    setTabState(readKbTab(kbId) ?? 'overview')
  }, [kbId])

  /**
   * 顶栏 subbar tab 栏 = Apple 分段控件式滑块（需求 N 第四轮定案）。
   *
   * 一条**常驻滑块**覆盖在选中项上；按住 tab 拖动时**只有滑块**跟手滑，
   * tab 文字与内容区一个像素都不动；松手滑块过渡滑到最近的 tab（拖过一半就切）。
   * 形态与参数说明见 hooks/tabStripSwipe.ts。
   */
  const tabs = useTabStripThumb({
    index: Math.max(0, TABS.findIndex((t) => t.id === tab)),
    count: TABS.length,
    onIndexChange: (next) => setTab(TABS[next].id),
  })

  const { rootFolder, renameNode, deleteNode, createFile, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const { getBacklinks, getOutgoingLinks, getGraphData } = useLinkIndex()
  const { tagIndex, getTagsForFile } = useTagIndex()
  // 顶栏操作 + 覆盖层状态
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dependencyFileId, setDependencyFileId] = useState<string | null>(null)

  // 加载真实知识库文档（优先 kbId，缺省取列表首项）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let target = kbId ?? null
        if (!target) {
          const list = await getKbList()
          if (list.length) target = list[0].id
        }
        const doc = target ? await loadKb(target) : null
        if (!alive) return
        setKb(doc)
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [kbId])

  // KB 文件集合（folder + 手动 + 规则）
  const kbFileIds = useMemo(() => (kb ? getKbFiles(rootFolder, kb) : []), [kb, rootFolder])
  const kbFiles = useMemo(
    () =>
      kbFileIds
        .map((id) => findNode(rootFolder, id))
        .filter((n): n is FileNode => !!n && n.type === 'file'),
    [kbFileIds, rootFolder],
  )

  // 概览派生数据
  const data = useMemo<OverviewData>(() => {
    const totalWords = kbFiles.reduce((sum, f) => {
      const c = f.content ?? ''
      const cn = (c.match(/[一-龥]/g) || []).length
      const en = (c.replace(/[一-龥]/g, ' ').trim().split(/\s+/).filter(Boolean)).length
      return sum + cn + en
    }, 0)

    const tagCounts = new Map<string, number>()
    for (const f of kbFiles) {
      for (const t of getTagsForFile(f.id)) tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }))

    const recentFiles = [...kbFiles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

    const backlinksFn = (id: string) => getBacklinks(id).map((r) => r.sourceFileId)
    const outgoingFn = (id: string) => getOutgoingLinks(id).map((r) => r.target)
    const health = kbFiles.length ? calculateKbHealth(kbFiles, backlinksFn, outgoingFn, getTagsForFile) : null

    // 库内双链数（两端均在 KB 文件的 wikilink 去重）
    const idSet = new Set(kbFileIds)
    const g = getGraphData(tagIndex)
    const seen = new Set<string>()
    for (const e of g.edges) {
      if (e.type !== 'wikilink') continue
      if (idSet.has(e.source) && idSet.has(e.target)) {
        seen.add([e.source, e.target].sort().join('|'))
      }
    }
    const linkCount = seen.size

    // 专属图谱子集
    const subNodes = g.nodes
      .filter((n) => idSet.has(n.id))
      .slice(0, 12)
      .map((n) => ({ id: n.id, label: n.label }))
    const subIds = new Set(subNodes.map((n) => n.id))
    const miniEdges = g.edges
      .filter((e) => e.type === 'wikilink' && subIds.has(e.source) && subIds.has(e.target))
      .map((e) => [e.source, e.target] as [string, string])

    return {
      fileCount: kbFiles.length,
      canvasCount: kb?.canvasIds.length ?? 0,
      tagCount: tagCounts.size,
      totalWords,
      linkCount,
      health,
      recentFiles,
      topTags,
      aiSummary: kb?.aiSummary,
      miniNodes: subNodes,
      miniEdges,
    }
  }, [kbFiles, kb, kbFileIds, getTagsForFile, getBacklinks, getOutgoingLinks, getGraphData, tagIndex])

  const kbName = kb?.name ?? ''
  const healthTotal = data.health?.total ?? null

  // 图谱入口单源：带上本库 id，AuroraShell 据此把「双链图谱」裁到本库文件节点
  // （不带 id 的调用形态保持不变 ⇒ 侧栏 / 菜单栏 / 命令面板进入仍为全局图谱）
  const openFullGraph = useCallback(() => {
    if (kb) nav?.('graph', kb.id)
    else nav?.('graph')
  }, [kb, nav])

  const handleNav = (id: string) => {
    if (id === '图谱') {
      openFullGraph()
      return
    }
    nav?.(resolveAuroraNav(id))
  }

  // 发布博客：跳转至博客工作室界面，并带入知识库来源（仅展示该库内笔记）
  const handlePublishBlog = useCallback(() => {
    if (!kb) return
    nav?.('blog', kb.id)
  }, [kb, nav])

  // 跳转到编辑器打开指定笔记（打通 KB 笔记 → 编辑器 闭环，替代原内嵌查看器死胡同）
  const openInEditor = useCallback((id: string) => {
    if (!kb) return
    setEditorReturn({ view: 'kb', kbId: kb.id, label: kb.name })
    openFile(id)
    nav?.('editor')
  }, [kb, openFile, nav])

  // 在知识库文件夹下新建一篇笔记并直接进编辑器（解决「无处添加笔记」）
  const handleCreateNote = useCallback(() => {
    if (!kb) return
    createFile(kb.folderId, `新笔记-${Date.now()}.md`, '')
    setEditorReturn({ view: 'kb', kbId: kb.id, label: kb.name })
    nav?.('editor')
  }, [kb, createFile, nav])

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="知识库"
      onSidebarSelect={handleNav}
      breadcrumbs={['知识库', kbName || '未选择']}
      breadcrumbOnClick={(i) => { if (i === 0) nav?.('kb') }}
      statusLeftItems={[
        { content: kbName || '知识库' },
        { content: `${data.fileCount} 篇笔记` },
      ]}
      statusRightItems={[{ content: `双链 ${data.linkCount} · 标签 ${data.tagCount}` }, { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() }]}
    >
      <div className="aurora-kb kb-shell">
        {/* 顶栏下方的子栏：库名 / 功能 Tab / 操作 */}
        <div className="aurora-kb-subbar">
          <div className="aurora-kb-subbar__left">
            <button className="aurora-kb-subbar__back" onClick={() => nav?.('kb')} title="返回知识库列表">
              <Icon.chevron size={16} />
            </button>
            <div className="aurora-kb-subbar__title">
              <span className="aurora-kb-subbar__name">{kbName || '未选择知识库'}</span>
              <span className="aurora-kb-subbar__badge">健康度 {healthTotal ?? '--'}</span>
            </div>
          </div>

          <div className="aurora-kb-subbar__center">
            <div className="aurora-kb-subbar-tabs" role="tablist" aria-label="知识库功能切换" data-swiping={tabs.dragging || undefined} {...tabs.bind}>
              {/* 轨道：滑块的定位坐标系（滑块绝对定位于其中） */}
              <div className="aurora-kb-subbar-track" ref={tabs.trackRef}>
                {/* 滑块：选中态的视觉承载者（选中底色已从 tab 迁到这里） */}
                <span className="aurora-kb-subbar-thumb" ref={tabs.thumbRef} aria-hidden="true" />
                {TABS.map((t) => {
                  const I = Icon[t.icon]
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={tab === t.id}
                      className={`aurora-kb-subbar-tab ${tab === t.id ? 'is-active' : ''}`}
                      onClick={() => setTab(t.id)}
                      title={t.label}
                    >
                      <I size={15} />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="aurora-kb-subbar-actions">
            <button className="aurora-kb-btn" onClick={() => setEditOpen(true)}><Icon.edit size={14} /> 编辑</button>
            <button className="aurora-kb-btn" onClick={() => handlePublishBlog()}><Icon.blog size={14} /> 发布博客</button>
            <span className="aurora-kb-subbar-sep" />
            <button className="aurora-kb-btn aurora-kb-btn--danger" onClick={() => setDeleteOpen(true)}><Icon.trash size={14} /> 删除</button>
          </div>
        </div>

        {/* 内容区：完全不参与滑动（需求 N 第四轮：内容区零位移） */}
        <div className="aurora-kb-content">
          <div className="aurora-kb-content__body">
            {!loaded ? (
              <div className="aurora-kb-placeholder">
                <div className="aurora-kb-placeholder__title">正在加载知识库…</div>
              </div>
            ) : !kb ? (
              <div className="aurora-kb-placeholder">
                <div className="aurora-kb-placeholder__icon"><Icon.book size={28} /></div>
                <div className="aurora-kb-placeholder__title">尚未选择知识库</div>
                <div className="aurora-kb-placeholder__desc">点击左侧「知识库」返回列表，选择或新建一个知识库。</div>
              </div>
          ) : tab === 'overview' ? (
            <OverviewTab
              toast={toast}
              data={data}
              onOpenFullGraph={openFullGraph}
              onOpenNote={openInEditor}
              canvasSlot={<KbCanvasSection kb={kb} nav={nav} toast={toast} />}
            />
          ) : tab === 'notes' ? (
            <NotesTab files={kbFiles} onOpen={openInEditor} onCreate={handleCreateNote} />
          ) : tab === 'search' ? (
            <div className="aurora-kb-tabfill">
              <KbSearchPanel kbId={kb.id} files={kbFiles} onClose={() => setTab('overview')} onOpenFile={openInEditor} />
            </div>
          ) : tab === 'chat' ? (
            /* 使用优化④：问答从全屏覆盖层弹窗改为独立 tab 页面（与其他功能页一致） */
            <div className="aurora-kb-tabfill">
              <KbChatPanel kbId={kb.id} files={kbFiles} variant="page" />
            </div>
          ) : tab === 'export' ? (
            /* 使用优化④：导出从居中浮层改为独立 tab 页面 */
            <div className="aurora-kb-tabfill">
              <KbExportMenu kb={kb} files={kbFiles} variant="page" />
            </div>
          ) : tab === 'dependency' ? (
            <div className="aurora-kb-tabfill">
              <DependencyTab files={kbFiles} onSelect={(id) => setDependencyFileId(id)} />
            </div>
          ) : tab === 'moc' ? (
            <div className="aurora-kb-tabfill">
              <MocTab kb={kb} files={kbFiles} createFile={createFile} toast={toast} />
            </div>
          ) : (
            /* 问答/导出已页面化（使用优化④）；此分支仅兜底未知 tab */
            <OverviewTab toast={toast} data={data} onOpenFullGraph={openFullGraph} onOpenNote={openInEditor} />
          )}
          </div>
        </div>

        {/* 覆盖层：文件依赖（portal 到 #kb-overlay-root，继承 .kb-shell 主题 token） */}
        {dependencyFileId && (
          <FileDependencyPanel fileId={dependencyFileId} onClose={() => setDependencyFileId(null)} />
        )}

        {/* 编辑 / 删除 对话框 */}
        {kb && editOpen && (
          <EditKbModal
            kb={kb}
            open={editOpen}
            renameNode={renameNode}
            updateDescription={updateDescription}
            loadKb={loadKb}
            onClose={() => setEditOpen(false)}
            onSaved={(doc) => setKb(doc)}
            toast={toast}
          />
        )}
        {kb && deleteOpen && (
          <DeleteKbModal
            kb={kb}
            open={deleteOpen}
            deleteKb={deleteKb}
            deleteNode={deleteNode}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => { setDeleteOpen(false); nav?.('kb') }}
            toast={toast}
          />
        )}

        {/* 知识库覆盖层挂载点（供搜索/问答/导出 portal，继承 .kb-shell 主题 token） */}
        <div id="kb-overlay-root" />

      </div>

    </PageFrame>
  )
}

// ─── 依赖分析 Tab：列出库内文件，点击打开单文件依赖面板 ───

function DependencyTab({ files, onSelect }: { files: FileNode[]; onSelect: (id: string) => void }) {
  if (files.length === 0) {
    return (
      <div className="aurora-kb-placeholder">
        <div className="aurora-kb-placeholder__icon"><Icon.file size={28} /></div>
        <div className="aurora-kb-placeholder__title">暂无笔记</div>
        <div className="aurora-kb-placeholder__desc">本知识库尚未收录任何文件，无法分析依赖关系。</div>
      </div>
    )
  }
  return (
    <div className="aurora-kb-notes">
      {/* 引导标题：由 .aurora-kb-notes__lead 自带顶部留白。
          容器 `.aurora-kb-notes` 顶内边距仅 2px（为「自带 __head 的笔记 Tab」设计），
          依赖 Tab 没有 head，复用 .aurora-kb-card__title + 内联 margin 会令标题
          贴住 subbar 下沿 —— 见 kb.css 中 __lead 的说明。 */}
      <div className="aurora-kb-notes__lead">
        依赖分析 · 选择文件查看出链 / 入链 / 删除影响
      </div>
      {files.map((f) => (
        <KbFileRow key={f.id} file={f} onSelect={onSelect} hint={`查看「${f.name}」的依赖关系`} />
      ))}
    </div>
  )
}

// ─── MOC 生成 Tab：生成知识库目录索引（复用真实 generateKbMoc）───

function MocTab({
  kb,
  files,
  createFile,
  toast,
}: {
  kb: KnowledgeBase
  files: FileNode[]
  createFile: (parentId: string, name: string, content?: string, openAfterCreate?: boolean) => string
  toast?: (m: string) => void
}) {
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)

  const gen = async () => {
    setBusy(true)
    try {
      const md = await generateKbMoc(kb, files)
      setPreview(md)
      toast?.('MOC 已生成')
    } catch (err) {
      toast?.(`生成失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(preview)
      toast?.('已复制到剪贴板')
    } catch {
      toast?.('复制失败')
    }
  }

  const save = () => {
    if (!preview) return
    const id = createFile(kb.folderId, 'MOC.md', preview, false)
    if (id) toast?.('已保存为笔记：MOC.md')
  }

  return (
    <div className="aurora-kb-moc">
      <div className="aurora-kb-moc__bar">
        <span className="aurora-kb-moc__title">MOC 目录索引</span>
        <div className="aurora-kb-moc__actions">
          <button className="aurora-kb-btn aurora-kb-btn--primary" onClick={gen} disabled={busy}>
            {busy ? '生成中…' : '生成 MOC'}
          </button>
          <button className="aurora-kb-btn" onClick={copy} disabled={!preview}>复制</button>
          <button className="aurora-kb-btn" onClick={save} disabled={!preview}>保存为笔记</button>
        </div>
      </div>
      {preview ? (
        <pre className="aurora-kb-moc__preview">{preview}</pre>
      ) : (
        <div className="aurora-kb-placeholder">
          <div className="aurora-kb-placeholder__icon"><Icon.layers size={28} /></div>
          <div className="aurora-kb-placeholder__title">知识库目录（MOC）</div>
          <div className="aurora-kb-placeholder__desc">点击「生成 MOC」自动汇总本库所有笔记的标题、标签与摘要，按标签分组生成目录索引。</div>
        </div>
      )}
    </div>
  )
}

// ─── 编辑知识库对话框 ───

function EditKbModal({
  kb,
  renameNode,
  updateDescription,
  loadKb,
  onClose,
  onSaved,
  toast,
  open,
}: {
  kb: KnowledgeBase
  renameNode: (id: string, name: string) => void
  updateDescription: (id: string, desc: string) => Promise<void>
  loadKb: (id: string) => Promise<KnowledgeBase | null>
  onClose: () => void
  onSaved: (doc: KnowledgeBase | null) => void
  toast?: (m: string) => void
  open: boolean
}) {
  const [name, setName] = useState(kb.name)
  const [desc, setDesc] = useState(kb.description)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      toast?.('名称不能为空')
      return
    }
    setBusy(true)
    try {
      await renameKb(kb.id, name.trim(), renameNode)
      await updateDescription(kb.id, desc)
      onSaved(await loadKb(kb.id))
      toast?.('已保存知识库信息')
      onClose()
    } catch (err) {
      toast?.(`保存失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="编辑知识库"
      size="md"
      contentClassName="aurora-kb-modal"
      footer={
        <>
          <button className="aurora-kb-btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="aurora-kb-btn aurora-kb-btn--primary" onClick={save} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <label className="aurora-kb-label">名称</label>
      <input className="aurora-kb-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <label className="aurora-kb-label" style={{ marginTop: 12, display: 'block' }}>描述</label>
      <textarea className="aurora-kb-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
    </Modal>
  )
}

// ─── 删除知识库对话框 ───

function DeleteKbModal({
  kb,
  deleteKb,
  deleteNode,
  onClose,
  onDeleted,
  toast,
  open,
}: {
  kb: KnowledgeBase
  deleteKb: (id: string, delFolder: boolean, delNode?: (id: string) => void) => Promise<void>
  deleteNode: (id: string) => void
  onClose: () => void
  onDeleted: () => void
  toast?: (m: string) => void
  open: boolean
}) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await deleteKb(kb.id, true, deleteNode)
      toast?.(`已删除知识库「${kb.name}」`)
      onDeleted()
    } catch (err) {
      toast?.(`删除失败：${(err as Error).message}`)
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="删除知识库"
      size="md"
      contentClassName="aurora-kb-modal"
      footer={
        <>
          <button className="aurora-kb-btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="aurora-kb-btn aurora-kb-btn--danger" onClick={confirm} disabled={busy}>
            {busy ? '删除中…' : '删除'}
          </button>
        </>
      }
    >
      <p className="aurora-kb-modal__desc">
        确定要删除「{kb.name}」吗？此操作将同时删除其关联文件夹与所有收录文件，且不可撤销。
      </p>
    </Modal>
  )
}

// 关联白板区块（P1 白板串联）：列出知识库关联白板，可打开 / 取消关联 / 新建并关联 / 关联已有
// 打通 知识库 ↔ 白板：canvasIds 僵尸字段复活，双向回跳
function KbCanvasSection({
  kb,
  nav,
  toast,
}: {
  kb: KnowledgeBase
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
}) {
  const kbStore = useKbStore()
  const [canvasNames, setCanvasNames] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [candidates, setCandidates] = useState<CanvasListItem[]>([])

  // 解析已关联白板的名称（canvasIds → getCanvasList 名称）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await getCanvasList()
        const map: Record<string, string> = {}
        for (const c of list) if (kb.canvasIds.includes(c.id)) map[c.id] = c.name
        if (alive) setCanvasNames(map)
      } catch {
        /* 名称解析失败按空处理 */
      }
    })()
    return () => { alive = false }
  }, [kb.canvasIds])

  const handleOpenCanvas = useCallback((id: string) => {
    nav?.('canvas', id)
  }, [nav])

  const handleUnlink = useCallback(async (id: string) => {
    setBusy(true)
    try {
      await kbStore.removeCanvas(kb.id, id)
      toast?.('已取消关联白板')
    } catch (err) {
      toast?.(`取消关联失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [kb.id, kbStore, toast])

  const handleCreateAndLink = useCallback(async () => {
    setBusy(true)
    try {
      const doc = await createCanvas(`${kb.name} 白板`)
      await kbStore.addCanvas(kb.id, doc.id)
      toast?.(`已新建并关联白板：${doc.name}`)
    } catch (err) {
      toast?.(`新建白板失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [kb.id, kb.name, kbStore, toast])

  // 「关联已有」选择器：展开时拉全量白板列表，排除本库已关联项；关联成功后 kb.canvasIds
  // 变化驱动本 effect 重算，刚关联的那块自动从候选里消失（可连续关联多块）。
  useEffect(() => {
    if (!pickerOpen) return
    let alive = true
    ;(async () => {
      try {
        const list = await getCanvasList()
        if (alive) setCandidates(list.filter((c) => !kb.canvasIds.includes(c.id)))
      } catch {
        if (alive) setCandidates([])
      }
    })()
    return () => { alive = false }
  }, [pickerOpen, kb.canvasIds])

  const handleLinkExisting = useCallback(async (c: CanvasListItem) => {
    setBusy(true)
    try {
      await kbStore.addCanvas(kb.id, c.id)
      toast?.(`已关联白板：${c.name}`)
    } catch (err) {
      toast?.(`关联失败：${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [kb.id, kbStore, toast])

  return (
    <div className="aurora-kb-canvas">
      <div className="aurora-kb-canvas__head">
        <span className="aurora-kb-canvas__title">关联白板（{kb.canvasIds.length}）</span>
        <div className="aurora-kb-canvas__head-actions">
          <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={handleCreateAndLink} disabled={busy}>
            <Icon.plus size={14} /> 新建并关联
          </button>
          <button
            className="aurora-kb-btn aurora-kb-btn--sm aurora-kb-btn--ghost"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={busy}
          >
            {pickerOpen ? '收起' : '关联已有'}
          </button>
        </div>
      </div>
      {pickerOpen && (
        <div className="aurora-kb-canvas__picker">
          {candidates.length === 0 ? (
            <div className="aurora-kb-canvas__picker-empty">
              没有可关联的白板——现有白板均已关联本库，或先到白板视图新建。
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                className="aurora-kb-canvas__pick"
                onClick={() => handleLinkExisting(c)}
                disabled={busy}
              >
                <span className="aurora-kb-canvas__pick-name"><Icon.canvas size={14} /> {c.name}</span>
                <span className="aurora-kb-canvas__pick-meta">{c.cardCount} 元素</span>
              </button>
            ))
          )}
        </div>
      )}
      {kb.canvasIds.length === 0 ? (
        <div className="aurora-kb-canvas__empty">
          本知识库尚未关联任何白板。可「新建并关联」创建一块专属白板，或点「关联已有」把现有白板挂入本库，用于梳理该库概念关系。
        </div>
      ) : (
        <div className="aurora-kb-canvas__list">
          {kb.canvasIds.map((id) => (
            <div key={id} className="aurora-kb-canvas__item">
              <span className="aurora-kb-canvas__name"><Icon.canvas size={14} /> {canvasNames[id] ?? '未命名白板'}</span>
              <div className="aurora-kb-canvas__actions">
                <button className="aurora-kb-btn aurora-kb-btn--sm" onClick={() => handleOpenCanvas(id)}>打开</button>
                <button className="aurora-kb-btn aurora-kb-btn--sm aurora-kb-btn--ghost" onClick={() => handleUnlink(id)} disabled={busy}>取消关联</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

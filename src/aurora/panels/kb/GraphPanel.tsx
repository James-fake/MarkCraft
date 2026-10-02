import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { usePresence, usePresenceValue, POPOVER_EXIT_MS, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { GROUP_COLORS } from '../../themes/categoricalColors'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useKbStore } from '@stores/useKbStore'
import { useDashboardData } from '@features/dashboard'
import { useLanguage } from '@stores/LanguageStore'
import '../../styles/panels/graph.css'
import { setEditorReturn } from '../../navigation/navReturn'
// —— P2-3 拆分（2026-09-28）：数据模型/力模拟在 ./graph/graphModel，范围与现场隔离在 ./graph/graphScope；
//    范围数据/派生集合/引擎各自成 hook，左缘侧栏/画布区/浮层组/导出各自成文件；本文件只剩状态编排与组合。 ——
import {
  RADIUS, CURRENT_R, relTime, computeDegrees, loadGroups, GROUPS_KEY, clamp,
  type Layout, type GraphMode, type GNode, type GEdge, type GraphGroup,
} from './graph/graphModel'
import { DEFAULT_GRAPH_SCOPE, readScopedSession } from './graph/graphScope'
import { GraphSidebar } from './graph/GraphSidebar'
import { GraphCanvasArea } from './graph/GraphCanvasArea'
import { GraphOverlays } from './graph/GraphOverlays'
import { exportPNG, exportSVG, exportJSON } from './graph/graphExport'
import { useGraphScopeData } from './graph/useGraphScopeData'
import { useGraphDerived } from './graph/useGraphDerived'
import { useGraphEngine } from './graph/useGraphEngine'

/**
 * Aurora 知识图谱面板（双链图谱）· 按设计规范 28 重设计 + 补齐缺失模块
 *
 * 自研 Canvas/力模拟渲染（原 features/graph/GraphView.tsx 已作为死代码清理，P4-4.6）：
 *  - 节点类型 file / tag（孤立 = file 且 deg===0，派生态）；新增 folder 类型以呈现
 *    设计规范 §3.4 的文件夹节点（真实项目未单独建模，这里按"升级外壳原型"补入演示）。
 *  - 边类型 wiki / embed / tag / folder（folder = 同文件夹弱关联，规范 §4.3）
 *  - 布局 force / concentric / tree / grid（规范 §8.5、§11.4）
 *  - 交互：拖拽 / 缩放(光标居中) / 平移 / 悬停高亮 / 单击打开对应笔记（file 节点，拖拽不触发）
 *    / 右键菜单（含「查看详情」信息卡入口）/ 非 file 节点单击仍是信息卡
 *    ⚠️ 单击在 pointerup 上兑现而非 click：指针捕获（拖拽用）会把 click/dblclick 一并重定向到 <svg>，
 *       节点的 onClick/onDoubleClick 在真实浏览器里都收不到（jsdom 不实现捕获重定向，故单测全绿、真机无反应）；
 *       拖拽阈值 4px（NODE_CLICK_SLOP），click 与 dblclick 的重定向另由 nodeGestureRef 兜住画布清空逻辑
 *  - 图谱 → 编辑器往返：单击 file 节点 → 编辑器 + 「← 返回 双链图谱」芯片；
 *    图谱现场（坐标/视口/模式/中心/选中）由 graphSession 跨挂载复原，返回即原图原位
 *  - 搜索高亮+计数、标签多选、连接强度滑块、孤立开关、文件夹关联开关
 *  - 图谱模式：全局 / 局部(深度) / 反向 / 正向 / 标签
 *  - 节点信息卡（路径 / 标签 / 入出链 / 字数 / 修改 / 操作按钮）
 *  - 底部状态栏（统计 + 图例）、右下迷你地图、视图控制（缩小/比例/放大/适应/聚焦/全屏/导出）
 *  - 左栏导航（使用优化⑤ 重排）：视图控制（模式/布局）→ 筛选/显示（标签/连接强度/显示开关）→ 着色（分组导航/分组着色·默认收起）→ 链接健康；
 *    顶栏着色入口与左栏图例区块已删（图例职责由状态栏承担）
 *  - 左缘触发（使用优化⑦）：对齐编辑器 v7 范式——7px 隐形感应条 + hover-intent（220ms 停留滑入/180ms 延迟收起）
 *    + overlay 浮层（不挤压画布重排）+ 图钉常驻；原 18px 满高「导航」竖条按钮已删
 *  - 视口裁剪、空态、导出 PNG/SVG/JSON
 *
 * 零 src/features/* 依赖；数据/物理/渲染全部自包含。
 *
 * 🧩 P2-3（2026-09-28）：纯逻辑已拆至 graph/graphModel.ts（模型/物理/工具）与
 *    graph/graphScope.ts（三档范围/现场隔离/裁剪谓词）；本文件只剩组件本体（行为不变）。
 */

// —— 对外 API：graphScope.test / graphForce.test 已改指 graph/graphModel、graph/graphScope，
//    graphSession.ts 的 Layout/GraphMode 亦同 —— 本文件现在只导出 GraphPanel 组件本体。

export interface GraphPanelProps {
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
  /**
   * 图谱范围：来自知识库「查看完整图谱」时带入的知识库 id。
   * 带值时图谱只画**该库内的笔记节点**（及库内互链、库内笔记用到的标签）；
   * 不带值时是全局图谱（侧栏「双链图谱」/ 菜单栏 / 命令面板进入的默认形态）。
   * 见 scopeGraphToKb。
   */
  kbId?: string
}

export function GraphPanel({ nav, toast, kbId }: GraphPanelProps) {
  // —— 真实数据接入：LinkIndex 图谱 + TagIndex + FileStore（D8 续·Phase 2 第六批）——
  const { getGraphData, getFilePath } = useLinkIndex()
  const { t } = useLanguage()
  const G = t.graph
  const { tagIndex } = useTagIndex()
  const { rootFolder, getActiveFileId, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const kbStore = useKbStore()
  const activeFileId = getActiveFileId()

  // —— 数据范围与图数据（P2-3：状态族/裁剪映射下沉 useGraphScopeData）——
  const {
    scope, setScope, scopeKind, scopeKb, scopeLabel,
    scopeReady, scopeOptions, realData, allTags,
  } = useGraphScopeData({
    kbId,
    rootFolder,
    activeFileId,
    getFilePath,
    tagIndex,
    getGraphData,
    kbList: kbStore.kbList,
    kbListed: kbStore.version > 0,
  })
  const nodesRef = useRef<GNode[]>([])
  const edgesRef = useRef<GEdge[]>([])
  const [graphRev, setGraphRev] = useState(0)
  // id → 节点对象（对象引用，位置原地可变 ⇒ 该映射只在节点集合变化时需要重建，不必每帧重算）。
  // 物理步进与渲染定位都走它：把原先每帧每边一次的 `nodes.find()` 线性查找降为 O(1)，
  // 同时省掉原先按 tick 每帧重建一个 Map 的分配。
  // graphRev 是故意的失效闸：memo 体读 nodesRef.current（规则不可见），节点集合变化时 bump 触发重建
  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: graphRev 为 ref 读取型 memo 的失效闸，非冗余依赖
  const nodeById = useMemo(() => new Map(nodesRef.current.map((n) => [n.id, n])), [graphRev])

  useEffect(() => {
    // 范围数据没就绪时先不布点：否则会先按「全量」铺一版环，再收缩成子集
    if (!scopeReady) return
    // 用真实数据填充 refs，并保留已有节点的当前位置（避免每次重排归零）
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]))
    // 图谱现场（graphSession）：本次是「返回图谱」时，节点坐标沿用上次离开前的位置，
    // 于是返回即原图原位，而不是重新随机布点
    const remembered = readScopedSession(scope)?.positions
    const ns: GNode[] = realData.nodes.map((n) => {
      const old = prev.get(n.id) ?? remembered?.[n.id]
      if (old) return { ...n, x: old.x, y: old.y, vx: old.vx, vy: old.vy, tx: old.tx, ty: old.ty }
      return n
    })
    // 初始环形布局（避免全部堆叠在原点），仅对首次出现的节点生效
    ns.forEach((n, i) => {
      if (prev.has(n.id) || remembered?.[n.id]) return
      const ang = -Math.PI / 2 + (i / ns.length) * Math.PI * 2
      const r = n.type === 'tag' ? 340 : n.type === 'folder' ? 380 : n.type === 'file' && n.deg === 0 ? 260 : 240
      n.x = 580 + Math.cos(ang) * r + (Math.random() - 0.5) * 20
      n.y = 360 + Math.sin(ang) * r * 0.78 + (Math.random() - 0.5) * 20
      n.tx = n.x
      n.ty = n.y
    })
    nodesRef.current = ns
    edgesRef.current = realData.edges
    computeDegrees(ns, edgesRef.current)
    setGraphRev((v) => v + 1)
    // 中心节点默认指向当前文件（否则第一项）
    setCenterId((cur) => (ns.find((x) => x.id === cur) ? cur : ns.find((x) => x.isCurrent)?.id ?? ns[0]?.id ?? ''))
  }, [realData, scope, scopeReady])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // —— 使用优化⑦ · 左缘导航：对齐编辑器 v7 范式 ——
  // 7px 隐形感应条 + hover-intent 召唤 + overlay 浮层（不挤压画布重排）+ 图钉常驻。
  // 状态/定时器与 EditorPanel.tsx 同款同参：停留 220ms 滑入、移出 180ms 收起、快速掠过自动取消。
  const [navHover, setNavHover] = useState(false)
  const [navPinned, setNavPinned] = useState(false)
  const navShown = navHover || navPinned
  // 退场相位（动效审计 P1-5）：关闭时先播 180ms 沿左缘滑出再卸载（入场 420ms ↔ 退场 180ms）
  const navOverlay = usePresence(navShown, OVERLAY_EXIT_MS)
  const closeNav = useCallback(() => { setNavHover(false); setNavPinned(false) }, [])
  const NAV_HOVER_INTENT_MS = 220
  const NAV_CLOSE_DELAY_MS = 180
  const navHoverTimer = useRef<number | null>(null)
  const navCloseTimer = useRef<number | null>(null)
  const cancelNavClose = useCallback(() => {
    if (navCloseTimer.current) { window.clearTimeout(navCloseTimer.current); navCloseTimer.current = null }
  }, [])
  const openNavIntent = useCallback(() => {
    if (navPinned) return
    if (navHoverTimer.current) window.clearTimeout(navHoverTimer.current)
    cancelNavClose()
    navHoverTimer.current = window.setTimeout(() => setNavHover(true), NAV_HOVER_INTENT_MS)
  }, [navPinned, cancelNavClose])
  const scheduleNavClose = useCallback(() => {
    if (navPinned) return
    if (navCloseTimer.current) window.clearTimeout(navCloseTimer.current)
    navCloseTimer.current = window.setTimeout(() => setNavHover(false), NAV_CLOSE_DELAY_MS)
  }, [navPinned])
  const closeNavIntent = useCallback(() => {
    if (navHoverTimer.current) { window.clearTimeout(navHoverTimer.current); navHoverTimer.current = null }
    scheduleNavClose()
  }, [scheduleNavClose])
  // 卸载时清理挂起的 hover 定时器，避免泄漏（对齐编辑器 v7）
  useEffect(() => () => {
    if (navHoverTimer.current) window.clearTimeout(navHoverTimer.current)
    if (navCloseTimer.current) window.clearTimeout(navCloseTimer.current)
  }, [])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minConn, setMinConn] = useState(0)
  const [showNote, setShowNote] = useState(true)
  const [showTag, setShowTag] = useState(true)
  const [showFolder, setShowFolder] = useState(true)
  const [showOrphan, setShowOrphan] = useState(true)
  const [showFolderLinks, setShowFolderLinks] = useState(true)
  // P2-5 箭头方向：有向边（wiki/embed）可显示箭头，默认关（对齐 Obsidian Arrows 默认 off）
  const [showArrows, setShowArrows] = useState(false)
  // P2-3 颜色分组
  const [groups, setGroups] = useState<GraphGroup[]>(loadGroups)
  const [grpName, setGrpName] = useState('')
  const [grpMatch, setGrpMatch] = useState<'tag' | 'name'>('tag')
  const [grpKeyword, setGrpKeyword] = useState('')
  const [grpColor, setGrpColor] = useState(GROUP_COLORS[0])
  useEffect(() => {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)) } catch { /* 隐私模式忽略 */ }
  }, [groups])
  const groupFor = useCallback(
    (n: GNode): GraphGroup | undefined => {
      if (n.type !== 'file') return undefined
      for (const g of groups) {
        const hit = g.match === 'tag'
          ? n.tags.includes(g.keyword)
          : n.label.toLowerCase().includes(g.keyword.toLowerCase())
        if (hit) return g
      }
      return undefined
    },
    [groups],
  )
  const addGroup = () => {
    const name = grpName.trim()
    const kw = grpKeyword.trim()
    if (!name || !kw) return
    setGroups((prev) => [...prev, { id: `g-${Date.now()}`, name, color: grpColor, match: grpMatch, keyword: kw }])
    setGrpName('')
    setGrpKeyword('')
  }
  // 节点着色优先级：类型 > 当前笔记(accent) > 分组色 > 孤立灰 > 普通笔记
  const nodeFill = (n: GNode): string => {
    if (n.type === 'tag') return 'var(--mc-graph-tag)'
    if (n.type === 'folder') return 'var(--mc-graph-folder)'
    if (n.isCurrent) return 'var(--mc-accent)'
    const g = groupFor(n)
    if (g) return g.color
    if (n.deg === 0) return 'var(--mc-graph-orphan)'
    return 'var(--mc-graph-file)'
  }
  // 画布节点 inline 分组色（P2-3 分组着色）：无分组返回 undefined（不覆盖类型色）
  const groupColorFor = (n: GNode): string | undefined => groupFor(n)?.color

  // 方案 C · 着色分组导航：按当前着色维度聚合（聚合逻辑见 visibleIds 之后，因其依赖可见性集合）
  const groupMeta: Record<string, { name: string; color: string }> = {
    current: { name: G.typeNameCurrent, color: 'var(--mc-accent)' },
    note: { name: G.typeNameNote, color: 'var(--mc-graph-file)' },
    tag: { name: G.typeNameTag, color: 'var(--mc-graph-tag)' },
    folder: { name: G.typeNameFolder, color: 'var(--mc-graph-folder)' },
    orphan: { name: G.typeNameOrphan, color: 'var(--mc-graph-orphan)' },
  }
  const groupKeyFor = useCallback(
    (n: GNode): string => {
      if (n.isCurrent) return 'current'
      if (n.type === 'tag') return 'tag'
      if (n.type === 'folder') return 'folder'
      const g = groupFor(n)
      if (g) return `grp:${g.id}`
      if (n.deg === 0) return 'orphan'
      return 'note'
    },
    [groupFor],
  )

  // G4/I3 打通：链接健康复用 useDashboardData 单一数据源（一处检测、两处呈现）
  const dash = useDashboardData('month')
  const { linkHealth, healthScore, band } = dash
  // 布局 / 模式 / 中心 / 视口 / 选中的初始值都取「当前范围的现场」（见下方 applyScopeSession 效果）：
  // 此前写成 readScopedSession(kbId) 的惰性初值，只在挂载时读一次 —— 面板内切范围时不会重置，
  // 会把上一个范围的视口/选中串过来（用户拍板：范围可面板内切换，必须按范围各自复原）。
  const [layout, setLayout] = useState<Layout>('force')
  const [mode, setMode] = useState<GraphMode>('global')
  const [depth, setDepth] = useState(2)
  const [centerId, setCenterId] = useState('')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // P1-3 展开邻居：右键把一跳邻居并入显示（scope 之外也可见），切模式/重置时清空
  const [extraNeighbors, setExtraNeighbors] = useState<Set<string>>(new Set())
  const [infoCard, setInfoCard] = useState<{ id: string } | null>(null)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  // 浮层退场相位（动效审计 P0-3）：节点右键菜单 / 导出下拉关闭时先播 100ms 再卸载
  const menuPresence = usePresenceValue(menu, POPOVER_EXIT_MS)
  const exportPresence = usePresence(exportOpen, POPOVER_EXIT_MS)
  // 方案 C · 顶部筛选条 + 着色分组聚焦
  const [focusGroup, setFocusGroup] = useState<string | null>(null)
  const [typeOpen, setTypeOpen] = useState(false) // 顶部「节点类型」popover
  const [grpOpen, setGrpOpen] = useState(false) // 左栏分组着色区默认折叠（使用优化⑤；grp-body 仅 CSS 隐藏、始终在 DOM，测试兼容）

  const handleNav = (id: string) => {
    const target = resolveAuroraNav(id)
    // 范围内：侧栏「知识库」回到**本库详情**（与进入路径对称，形成 知识库 ⇄ 图谱 往返闭环）；
    // 想回到知识库列表，走知识库页面包屑首段「知识库」这一既有出口。
    if (scopeKb && target === 'kb') {
      nav?.('kb', scopeKb.id)
      return
    }
    nav?.(target)
  }

  // 图谱 → 编辑器：打开节点对应笔记，并登记「返回来源」上下文
  // （编辑器据此渲染「← 返回 双链图谱」芯片；现场由 graphSession 保留，返回即原图原位）
  const openNoteInEditor = (id: string) => {
    setSelectedId(id)
    // 卸载清理读的是 sceneRef（本组件不会在卸载前再渲染一次），故此处显式同步选中项
    sceneRef.current = { ...sceneRef.current, selectedId: id }
    // 返回来源带上「范围」：编辑器「← 返回」据此回到**同一范围的图谱**。
    // 「知识库」档额外带 kbId（与「查看完整图谱」入口对称，路由上就能看出回的是哪个库）；
    // 「全部文件」档只改芯片文案；默认档就是无参形态。
    setEditorReturn(
      scopeKb
        ? { view: 'graph', kbId: scopeKb.id, label: G.crumbGraphKb.replace('{n}', scopeKb.name) }
        : scopeKind === 'all'
          ? { view: 'graph', label: G.crumbGraphAll }
          : { view: 'graph', label: G.crumbGraph },
    )
    openFile(id)
    handleNav('编辑器')
  }
  // 单击节点：file → 打开对应笔记（图谱标准交互：单击即开、右键出菜单、拖拽不触发）
  // 非 file 节点（tag/folder）没有可跳转的目标，保留原「信息卡」语义
  const activateNode = (id: string) => {
    const n = nodesRef.current.find((x) => x.id === id)
    if (n?.type === 'file') {
      openNoteInEditor(id)
      return
    }
    setSelectedId(id)
    setInfoCard({ id })
    setMenu(null)
  }
  const onNodeContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = wrapRef.current!.getBoundingClientRect()
    setMenu({ id, x: e.clientX - rect.left, y: e.clientY - rect.top })
    setSelectedId(id)
  }
  const onNodeDouble = (id: string) => {
    // 注意：节点的 dblclick 与 click 一样会被指针捕获重定向到 <svg>（实测 target=svg.aurora-graph__svg），
    // 故本函数当前的实际入口是右键菜单「打开笔记」；双击对 tag 的筛选语义由左栏标签芯片兜底。
    const n = nodesRef.current.find((x) => x.id === id)
    if (!n) return
    if (n.type === 'file') {
      // 与单击同路（右键菜单「打开笔记」也走这里）：带「返回来源」上下文，不再是无来源裸跳
      openNoteInEditor(id)
    } else if (n.type === 'tag') {
      setSelectedTags((prev) => (prev.includes(n.label) ? prev : [...prev, n.label]))
      toast?.(`已筛选标签：${n.label}`)
    }
    // folder 节点：数据层当前不生成（buildGraphData 仅 file/tag），分支留空避免假功能
  }

  // 图谱 → 知识库：节点所属知识库（反向查询 canvasIds 之外的文件维度），一键打开
  const openOwningKb = useCallback(async (id: string) => {
    const ids = await kbStore.getKbsContainingFile(id)
    if (ids.length > 0) nav?.('kb', ids[0])
    else toast?.(G.kbNotJoined)
  }, [kbStore, nav, toast, G.kbNotJoined])

  // —— 导出（P2-3：实现下沉 graph/graphExport.ts，这里只注入 svg 引用与可见集合）——
  const doExportSvg = () => { if (svgRef.current) exportSVG(svgRef.current, toast) }
  const doExportJson = () => {
    if (svgRef.current) exportJSON(nodesRef.current, edgesRef.current, visibleIds, toast)
  }
  const doExportPng = () => { if (svgRef.current) exportPNG(svgRef.current, toast) }

  // —— P2-3 拆分：派生集合（邻接/模式作用域/可见性/聚合/dim）与引擎（视口/物理/手势/现场）——
  const { adjacency, visibleIds, groupAgg, matchedIds, isDim, isEdgeDim } = useGraphDerived({
    nodesRef, edgesRef, graphRev,
    mode, centerId, depth,
    hidden, showNote, showTag, showFolder, showOrphan, minConn, selectedTags, extraNeighbors, search,
    focusGroup, groups, groupKeyFor, groupMeta,
    highlightId: hoverId ?? selectedId,
  })

  const {
    wrapRef, svgRef, size, view, setView, reheat, applyLayout, sceneRef,
    panActive, dragActive,
    onBgPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    onWheel, onCanvasClick, onNodePointerDown,
    focusCenter, toggleFullscreen, cull,
  } = useGraphEngine({
    scope, layout, setLayout, mode, setMode, centerId, setCenterId, depth,
    visibleIds, adjacency, nodeById, nodesRef, edgesRef,
    setSelectedId, selectedId,
    setMenu, setInfoCard, activateNode,
  })

  const resetView = () => {
    setSearch('')
    setSelectedTags([])
    setMinConn(0)
    setShowNote(true)
    setShowTag(true)
    setShowFolder(true)
    setShowOrphan(true)
    setShowFolderLinks(true)
    setMode('global')
    setHidden(new Set())
    setExtraNeighbors(new Set())
    setView({ scale: 1, tx: 0, ty: 0 })
    applyLayout('force')
    reheat(0.8)
  }

  // ---- 渲染数据 ----
  const nodes = nodesRef.current
  // 节点定位统一走 nodeById（见文件上方声明）：位置原地可变 ⇒ 无需按帧重建映射
  const edges = edgesRef.current

  const infoNode = (infoCard ? nodeById.get(infoCard.id) : null) ?? null
  const CARD_W = 280
  const CARD_H = 240
  const infoPos = infoNode
    ? (() => {
        const nodeX = view.tx + view.scale * infoNode.x
        const nodeY = view.ty + view.scale * infoNode.y
        const nodeR = infoNode.isCurrent
          ? CURRENT_R
          : infoNode.type === 'file'
            ? RADIUS.file + Math.min(infoNode.deg, 8) * 0.8
            : RADIUS[infoNode.type]
        const placeRight = nodeX + nodeR + 14 + CARD_W <= size.w - 8
        const left = placeRight
          ? clamp(nodeX + nodeR + 14, 8, size.w - CARD_W - 8)
          : clamp(nodeX - nodeR - 14 - CARD_W, 8, size.w - CARD_W - 8)
        const top = clamp(nodeY - 20, 8, size.h - CARD_H - 8)
        return { left, top }
      })()
    : null

  const activeId = hoverId ?? selectedId
  const stats = {
    note: nodes.filter((n) => n.type === 'file').length,
    tag: nodes.filter((n) => n.type === 'tag').length,
    folder: nodes.filter((n) => n.type === 'folder').length,
    edge: edges.length,
  }
  const layoutLabel = (l: Layout) => (l === 'force' ? G.layoutForceL : l === 'concentric' ? G.layoutConcentricL : l === 'tree' ? G.layoutTreeL : G.layoutGridL)
  const modeLabel = (m: GraphMode) =>
    m === 'global' ? G.modeGlobalTitle : m === 'local' ? G.modeLocalTitle : m === 'backlinks' ? G.modeBacklinksTitle : m === 'forwardlinks' ? G.modeForwardTitle : G.modeTagTitle

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const onModeChange = (m: GraphMode) => {
    setMode(m)
    setExtraNeighbors(new Set()) // 展开邻居随模式切换清空（P1-3）
    if (m === 'tag') {
      const sel = selectedId ? nodeById.get(selectedId) : null
      if (sel?.type === 'tag') setCenterId(sel.id)
      else {
        const cur = selectedId ? nodeById.get(selectedId) : null
        if (cur?.type === 'file' && cur.tags[0]) {
          const tg = nodes.find((n) => n.type === 'tag' && n.label === cur.tags[0])
          if (tg) setCenterId(tg.id)
        } else {
          const firstTag = nodesRef.current.find((n) => n.type === 'tag')
          if (firstTag) setCenterId(firstTag.id)
        }
      }
    } else if ((m === 'backlinks' || m === 'forwardlinks' || m === 'local') && selectedId) {
      setCenterId(selectedId)
    }
  }

  return (
    <PageFrame
      sidebarGroups={AURORA_SIDEBAR_GROUPS}
      sidebarActiveId="双链图谱"
      onSidebarSelect={handleNav}
      // 范围明示：非默认档把范围名接到面包屑上（「双链图谱 › 甲库 / 全部文件」）；
      // 点首段 = 退出范围、回到默认档（文件列表）。默认档不标注（它就是默认，加了反而啰嗦）
      breadcrumbs={scopeKind === 'files' ? [G.crumbGraph] : [G.crumbGraph, scopeLabel]}
      breadcrumbOnClick={scopeKind === 'files' ? undefined : (i) => { if (i === 0) setScope(DEFAULT_GRAPH_SCOPE) }}
      statusLeftItems={[
        ...(scopeKind === 'files'
          ? []
          : [{ content: G.scopeRange.replace('{n}', scopeLabel), clickable: true, onClick: () => setScope(DEFAULT_GRAPH_SCOPE) }]),
        { content: G.statNotes.replace('{n}', String(stats.note)) },
        { content: G.statTags.replace('{n}', String(stats.tag)) },
        { content: G.statFolders.replace('{n}', String(stats.folder)) },
        { content: G.statEdges.replace('{n}', String(stats.edge)) },
      ]}
      statusRightItems={[
        { content: G.modePrefix.replace('{n}', modeLabel(mode)) },
        { content: G.layoutPrefix.replace('{n}', layoutLabel(layout)) },
        { content: G.zoomPrefix.replace('{n}', String(Math.round(view.scale * 100))) },
        { content: t.welcome.cmdPalette, clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-graph">
        <GraphSidebar
          navOverlay={navOverlay}
          navPinned={navPinned}
          setNavPinned={setNavPinned}
          openNavIntent={openNavIntent}
          closeNavIntent={closeNavIntent}
          cancelNavClose={cancelNavClose}
          scheduleNavClose={scheduleNavClose}
          closeNav={closeNav}
          scope={scope}
          setScope={setScope}
          scopeOptions={scopeOptions}
          scopeKind={scopeKind}
          scopeLabel={scopeLabel}
          mode={mode}
          onModeChange={onModeChange}
          depth={depth}
          setDepth={setDepth}
          layout={layout}
          applyLayout={applyLayout}
          allTags={allTags}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          minConn={minConn}
          setMinConn={setMinConn}
          showOrphan={showOrphan}
          setShowOrphan={setShowOrphan}
          showFolderLinks={showFolderLinks}
          setShowFolderLinks={setShowFolderLinks}
          showArrows={showArrows}
          setShowArrows={setShowArrows}
          focusGroup={focusGroup}
          setFocusGroup={setFocusGroup}
          groupAgg={groupAgg}
          grpOpen={grpOpen}
          setGrpOpen={setGrpOpen}
          groups={groups}
          setGroups={setGroups}
          grpName={grpName}
          setGrpName={setGrpName}
          grpMatch={grpMatch}
          setGrpMatch={setGrpMatch}
          grpKeyword={grpKeyword}
          setGrpKeyword={setGrpKeyword}
          grpColor={grpColor}
          setGrpColor={setGrpColor}
          addGroup={addGroup}
          band={band}
          healthScore={healthScore}
          linkHealth={linkHealth}
          resetView={resetView}
        />
        <div className="aurora-graph__canvas" ref={wrapRef}>
          <GraphCanvasArea
            scopeKind={scopeKind}
            scopeLabel={scopeLabel}
            setScope={setScope}
            defaultScope={DEFAULT_GRAPH_SCOPE}
            search={search}
            setSearch={setSearch}
            matchedIds={matchedIds}
            typeOpen={typeOpen}
            setTypeOpen={setTypeOpen}
            showNote={showNote}
            setShowNote={setShowNote}
            showTag={showTag}
            setShowTag={setShowTag}
            showFolder={showFolder}
            setShowFolder={setShowFolder}
            size={size}
            svgRef={svgRef}
            panActive={panActive}
            dragActive={dragActive}
            view={view}
            nodes={nodes}
            edges={edges}
            nodeById={nodeById}
            visibleIds={visibleIds}
            showFolderLinks={showFolderLinks}
            showArrows={showArrows}
            activeId={activeId}
            hoverId={hoverId}
            setHoverId={setHoverId}
            isDim={isDim}
            isEdgeDim={isEdgeDim}
            cull={cull}
            groupColorOf={groupColorFor}
            onBgPointerDown={onBgPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onCanvasClick={onCanvasClick}
            onWheel={onWheel}
            onNodePointerDown={onNodePointerDown}
            onNodeDouble={onNodeDouble}
            onNodeContext={onNodeContext}
          />


          <GraphOverlays
            view={view}
            setView={setView}
            reheat={reheat}
            focusCenter={focusCenter}
            toggleFullscreen={toggleFullscreen}
            exportOpen={exportOpen}
            setExportOpen={setExportOpen}
            exportPresence={exportPresence}
            exportPng={doExportPng}
            exportSvg={doExportSvg}
            exportJson={doExportJson}
            infoNode={infoNode}
            infoFill={infoNode ? nodeFill(infoNode) : ''}
            infoModified={infoNode ? relTime(infoNode.modifiedAt) : ''}
            infoPos={infoPos}
            setInfoCard={setInfoCard}
            openNoteInEditor={openNoteInEditor}
            setMode={setMode}
            setCenterId={setCenterId}
            menuPresence={menuPresence}
            setMenu={setMenu}
            nodeById={nodeById}
            adjacency={adjacency}
            onNodeDouble={onNodeDouble}
            openOwningKb={openOwningKb}
            setHidden={setHidden}
            setExtraNeighbors={setExtraNeighbors}
            setSelectedId={setSelectedId}
            stats={stats}
            visibleCount={visibleIds.size}
            scopeKind={scopeKind}
            scopeLabel={scopeLabel}
            setScope={setScope}
            defaultScope={DEFAULT_GRAPH_SCOPE}
          />
        </div>
      </div>
    </PageFrame>
  )
}

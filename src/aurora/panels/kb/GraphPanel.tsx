import { useState, useRef, useMemo, useEffect, useReducer, useCallback } from 'react'
import { PageFrame } from '../../components/shell/PageFrame'
import { useCommandPalette } from '../../components/command-palette/CommandPaletteContext'
import { Icon } from '../../icons'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { usePresence, usePresenceValue, POPOVER_EXIT_MS, OVERLAY_EXIT_MS } from '@components/ui/usePresence'
import { GROUP_COLORS } from '../../themes/categoricalColors'
import { resolveAuroraNav, AURORA_SIDEBAR_GROUPS } from '../aurora-nav'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useKbStore } from '@stores/useKbStore'
import { useDashboardData } from '@features/dashboard'
import { findNode } from '@core/files/fileTree'
import type { FileNode } from '@src/types/fileManager'
import type { GraphData } from '@stores/LinkIndexStore'
import '../../styles/panels/graph.css'
// —— 字数统计：复用真实 features/editor/stats 单一数据源（D4，不维护平行实现）——
import { countWords } from '@features/editor/stats'
import { setEditorReturn } from '../../navigation/navReturn'
import { readGraphSession, saveGraphSession, type GraphNodePos } from './graphSession'

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
 */

type NodeType = 'file' | 'tag' | 'folder'
type EdgeKind = 'wiki' | 'embed' | 'tag' | 'folder'
// 布局/模式由 graphSession 复用（图谱现场跨挂载复原），故对外导出
export type Layout = 'force' | 'concentric' | 'tree' | 'grid'
export type GraphMode = 'global' | 'local' | 'backlinks' | 'forwardlinks' | 'tag'

interface GNode {
  id: string
  label: string
  type: NodeType
  tags: string[]
  x: number
  y: number
  vx: number
  vy: number
  tx: number // 目标位置（非力导向布局用）
  ty: number
  inLinks: number
  outLinks: number
  deg: number
  wordCount?: number
  filePath?: string
  modifiedAt?: number
  isCurrent?: boolean
  hidden: boolean
}

interface GEdge {
  source: string
  target: string
  kind: EdgeKind
}

const RADIUS: Record<NodeType, number> = { file: 13, tag: 9, folder: 11 }
// 节点拖拽阈值（px）：位移小于此值仍判为单击——对齐桌面端习惯，避免手抖被判成拖拽而点不开笔记
const NODE_CLICK_SLOP = 4
const CURRENT_R = 19
const H = 3600_000 // 毫秒/小时

// ---- 真实数据接入（Phase 2 第六批·GraphPanel 换芯）----
// 直接复用真实 LinkIndex 的 getGraphData(tagIndex)：其返回结构
//   nodes: { id, label, links }[]  +  edges: { source, target, type:'wikilink'|'embed'|'tag' }[]
// 与 Aurora 图谱模型一一对应（file 节点 + tag 节点 + wiki/embed/tag 边），无需自造 mock。

function buildGraphData(
  graph: GraphData,
  rootFolder: FileNode,
  activeFileId: string | null,
  getFilePath: (id: string) => string,
  tagIndex: Map<string, Set<string>>,
): { nodes: GNode[]; edges: GEdge[] } {
  // 文件 → 标签（用于信息卡与标签筛选）
  const fileTags = new Map<string, string[]>()
  for (const [tagPath, fileIds] of tagIndex) {
    const tagName = tagPath.includes('/') ? tagPath.split('/').pop()! : tagPath
    for (const fid of fileIds) {
      if (!fileTags.has(fid)) fileTags.set(fid, [])
      fileTags.get(fid)!.push(tagName)
    }
  }

  const nodes: GNode[] = graph.nodes.map((n) => {
    if (n.id.startsWith('tag:')) {
      return {
        id: n.id, label: n.label, type: 'tag', tags: [],
        x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
        inLinks: 0, outLinks: 0, deg: 0, hidden: false,
      }
    }
    const file = findNode(rootFolder, n.id)
    return {
      id: n.id, label: n.label, type: 'file',
      tags: fileTags.get(n.id) ?? [],
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
      inLinks: 0, outLinks: 0, deg: 0,
      wordCount: file?.content ? countWords(file.content) : undefined,
      filePath: getFilePath(n.id) || undefined,
      modifiedAt: file?.updatedAt,
      isCurrent: n.id === activeFileId,
      hidden: false,
    }
  })

  const edges: GEdge[] = graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: e.type === 'wikilink' ? 'wiki' : e.type,
  }))

  return { nodes, edges }
}

function computeDegrees(nodes: GNode[], edges: GEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  nodes.forEach((n) => {
    n.inLinks = 0
    n.outLinks = 0
    n.deg = 0
  })
  edges.forEach((e) => {
    const s = byId.get(e.source)
    const t = byId.get(e.target)
    if (s && t) {
      if (e.kind !== 'tag' && e.kind !== 'folder') {
        s.outLinks++
        t.inLinks++
      }
      s.deg++
      t.deg++
    }
  })
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function relTime(ts?: number): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const h = Math.floor(diff / H)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  const m = Math.floor(d / 30)
  return `${m} 个月前`
}

interface GraphPanelProps {
  nav?: (id: string, param?: string) => void
  toast?: (msg: string) => void
}

// P2-3 颜色分组：标签或名称关键词匹配 → 节点着色（localStorage 持久化）
interface GraphGroup {
  id: string
  name: string
  color: string
  match: 'tag' | 'name'
  keyword: string
}
const GROUPS_KEY = 'markcraft-graph-groups'
function loadGroups(): GraphGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr)
      ? arr.filter((g) => g && typeof g === 'object' && g.id && g.name && g.color && (g.match === 'tag' || g.match === 'name') && g.keyword)
      : []
  } catch {
    return []
  }
}

// 六边形顶点（尖顶朝右上，用于标签节点）
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

export function GraphPanel({ nav, toast }: GraphPanelProps) {
  // —— 真实数据接入：LinkIndex 图谱 + TagIndex + FileStore（D8 续·Phase 2 第六批）——
  const { getGraphData, getFilePath } = useLinkIndex()
  const { tagIndex } = useTagIndex()
  const { rootFolder, getActiveFileId, openFile } = useFileManager()
  const { openCommandPalette } = useCommandPalette()
  const kbStore = useKbStore()
  const activeFileId = getActiveFileId()

  const graph = useMemo(() => getGraphData(tagIndex), [getGraphData, tagIndex])
  const realData = useMemo(
    () => buildGraphData(graph, rootFolder, activeFileId, getFilePath, tagIndex),
    [graph, rootFolder, activeFileId, getFilePath, tagIndex],
  )
  const allTags = useMemo(
    () => Array.from(tagIndex.keys()).map((p) => (p.includes('/') ? p.split('/').pop()! : p)),
    [tagIndex],
  )

  const nodesRef = useRef<GNode[]>([])
  const edgesRef = useRef<GEdge[]>([])
  const [graphRev, setGraphRev] = useState(0)

  useEffect(() => {
    // 用真实数据填充 refs，并保留已有节点的当前位置（避免每次重排归零）
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]))
    // 图谱现场（graphSession）：本次是「返回图谱」时，节点坐标沿用上次离开前的位置，
    // 于是返回即原图原位，而不是重新随机布点
    const remembered = readGraphSession()?.positions
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
  }, [realData])

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 1200, h: 800 })

  const [view, setView] = useState(() => readGraphSession()?.view ?? { scale: 1, tx: 0, ty: 0 })
  const viewRef = useRef(view)
  viewRef.current = view

  const [tick, bump] = useReducer((x: number) => (x + 1) % 1_000_000, 0)

  const [selectedId, setSelectedId] = useState<string | null>(() => readGraphSession()?.selectedId ?? null)
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

  // 方案 C · 着色分组导航：按当前着色维度聚合（聚合逻辑见 visibleIds 之后，因其依赖可见性集合）
  const groupMeta: Record<string, { name: string; color: string }> = {
    current: { name: '当前笔记', color: 'var(--mc-accent)' },
    note: { name: '笔记', color: 'var(--mc-graph-file)' },
    tag: { name: '标签', color: 'var(--mc-graph-tag)' },
    folder: { name: '文件夹', color: 'var(--mc-graph-folder)' },
    orphan: { name: '孤立笔记', color: 'var(--mc-graph-orphan)' },
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
  const [layout, setLayout] = useState<Layout>(() => readGraphSession()?.layout ?? 'force')
  const [mode, setMode] = useState<GraphMode>(() => readGraphSession()?.mode ?? 'global')
  const [depth, setDepth] = useState(2)
  const [centerId, setCenterId] = useState(() => readGraphSession()?.centerId ?? '')
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

  const alphaRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const dragRef = useRef<{ id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null)
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  // 本次手势是否始于节点：setPointerCapture 会把节点的 click 也重定向到 <svg>，
  // 画布的「点空白处清空选中」必须据此区分，否则点完节点立刻被自己清掉
  const nodeGestureRef = useRef(false)

  // —— 图谱现场写回：每次渲染刷新快照（5 个字段，开销可忽略），卸载时连同节点坐标存入 graphSession ——
  // 卸载清理对「任何离开方式」都成立（侧栏切换 / ⌘K 跳编辑器 / 节点跳转），
  // 因此不必在每个出口手动登记；返回图谱时由上面的 restore 读取。
  const sceneRef = useRef({ view, layout, mode, centerId, selectedId })
  sceneRef.current = { view, layout, mode, centerId, selectedId }
  useEffect(
    () => () => {
      const positions: Record<string, GraphNodePos> = {}
      for (const n of nodesRef.current) positions[n.id] = { x: n.x, y: n.y, vx: n.vx, vy: n.vy, tx: n.tx, ty: n.ty }
      saveGraphSession({ ...sceneRef.current, positions })
    },
    [],
  )

  const handleNav = (id: string) => nav?.(resolveAuroraNav(id))

  // ---- 尺寸 ----
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      setSize({ w: cr.width, h: cr.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- 邻接 ----
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const add = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set())
      m.get(a)!.add(b)
    }
    edgesRef.current.forEach((e) => {
      if (e.kind === 'tag' || e.kind === 'folder') return
      add(e.source, e.target)
      add(e.target, e.source)
    })
    return m
  }, [graphRev])

  const neighborsOf = useCallback(
    (id: string) => {
      const s = new Set<string>([id])
      ;(adjacency.get(id) || []).forEach((n) => s.add(n))
      return s
    },
    [adjacency],
  )

  // ---- 图谱模式作用域 ----
  const scope = useMemo(() => {
    if (mode === 'global') return null
    const set = new Set<string>([centerId])
    if (mode === 'local') {
      let frontier = [centerId]
      for (let d = 0; d < depth; d++) {
        const next: string[] = []
        frontier.forEach((id) =>
          (adjacency.get(id) || []).forEach((n) => {
            if (!set.has(n)) {
              set.add(n)
              next.push(n)
            }
          }),
        )
        frontier = next
      }
    } else if (mode === 'backlinks') {
      edgesRef.current.forEach((e) => {
        if (e.kind !== 'tag' && e.kind !== 'folder' && e.target === centerId) set.add(e.source)
      })
    } else if (mode === 'forwardlinks') {
      edgesRef.current.forEach((e) => {
        if (e.kind !== 'tag' && e.kind !== 'folder' && e.source === centerId) set.add(e.target)
      })
    } else if (mode === 'tag') {
      // 以标签节点为中心，纳入与其相连的笔记
      edgesRef.current.forEach((e) => {
        if (e.kind === 'tag') {
          if (e.target === centerId) set.add(e.source)
          if (e.source === centerId) set.add(e.target)
        }
      })
    }
    return set
  }, [mode, centerId, depth, adjacency, graphRev])

  // ---- 可见性（组合所有筛选）----
  const visibleIds = useMemo(() => {
    const set = new Set<string>()
    nodesRef.current.forEach((n) => {
      if (hidden.has(n.id)) return
      if (n.type === 'file' && !showNote) return
      if (n.type === 'tag' && !showTag) return
      if (n.type === 'folder' && !showFolder) return
      if (n.type === 'file' && n.deg === 0 && !showOrphan) return
      if (n.deg < minConn) return
      if (selectedTags.length > 0) {
        const ok =
          (n.type === 'file' && n.tags.some((t) => selectedTags.includes(t))) ||
          (n.type === 'tag' && selectedTags.includes(n.label)) ||
          n.type === 'folder'
        if (!ok) return
      }
      if (scope && !scope.has(n.id) && !extraNeighbors.has(n.id)) return
      set.add(n.id)
    })
    return set
  }, [hidden, showNote, showTag, showFolder, showOrphan, minConn, selectedTags, scope, graphRev, extraNeighbors])

  // 方案 C · 着色分组导航聚合：依赖 visibleIds，置于其声明之后
  const groupAgg = useMemo(() => {
    const map = new Map<string, { key: string; name: string; color: string; count: number }>()
    nodesRef.current.forEach((n) => {
      if (!visibleIds.has(n.id)) return
      const key = groupKeyFor(n)
      let meta: { name: string; color: string }
      if (key.startsWith('grp:')) {
        const g = groups.find((x) => `grp:${x.id}` === key)
        meta = g ? { name: g.name, color: g.color } : groupMeta.note
      } else {
        meta = groupMeta[key]
      }
      if (!map.has(key)) map.set(key, { key, name: meta.name, color: meta.color, count: 0 })
      map.get(key)!.count++
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [visibleIds, groupKeyFor, groups, graphRev])

  // 搜索匹配
  const matchedIds = useMemo(() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    const s = new Set<string>()
    nodesRef.current.forEach((n) => {
      if (n.label.toLowerCase().includes(q)) s.add(n.id)
    })
    return s
  }, [search, graphRev])

  const highlightId = hoverId ?? selectedId
  const highlightSet = highlightId ? neighborsOf(highlightId) : null

  const isDim = (id: string): boolean => {
    if (matchedIds) return !matchedIds.has(id)
    if (focusGroup) {
      const n = nodesRef.current.find((x) => x.id === id)
      return n ? groupKeyFor(n) !== focusGroup : false
    }
    if (highlightSet) return !highlightSet.has(id)
    if (scope) return !scope.has(id)
    return false
  }
  const isEdgeDim = (s: string, t: string): boolean => {
    if (matchedIds) return !(matchedIds.has(s) || matchedIds.has(t))
    if (focusGroup) {
      const ns = nodesRef.current.find((x) => x.id === s)
      const nt = nodesRef.current.find((x) => x.id === t)
      const ks = ns ? groupKeyFor(ns) : ''
      const kt = nt ? groupKeyFor(nt) : ''
      return ks !== focusGroup && kt !== focusGroup
    }
    if (highlightSet) return !(highlightSet.has(s) || highlightSet.has(t))
    if (scope) return !(scope.has(s) || scope.has(t))
    return false
  }

  // ---- 布局目标计算 ----
  const computeTargets = useCallback(
    (lay: Layout) => {
      const nodes = nodesRef.current
      const W = size.w || 1200
      const Hh = size.h || 800
      const cx = W / 2
      const cy = Hh / 2
      const byId = new Map(nodes.map((n) => [n.id, n]))
      const visIds = nodes.filter((n) => visibleIds.has(n.id))
      if (lay === 'force') {
        nodes.forEach((n) => {
          n.tx = n.x
          n.ty = n.y
        })
        return
      }
      if (lay === 'grid') {
        const cols = Math.max(1, Math.ceil(Math.sqrt(visIds.length)))
        const rows = Math.ceil(visIds.length / cols)
        const gx = W / (cols + 1)
        const gy = Hh / (rows + 1)
        visIds.forEach((n, i) => {
          const c = i % cols
          const r = Math.floor(i / cols)
          n.tx = gx * (c + 1)
          n.ty = gy * (r + 1)
        })
        return
      }
      // concentric / tree 都以 centerId 为根做 BFS 分层
      const root = byId.get(centerId) || visIds[0]
      const depthMap = new Map<string, number>([[root.id, 0]])
      let frontier = [root.id]
      for (let d = 0; d < 8; d++) {
        const next: string[] = []
        frontier.forEach((id) =>
          (adjacency.get(id) || []).forEach((nid) => {
            if (!depthMap.has(nid) && visibleIds.has(nid)) {
              depthMap.set(nid, d + 1)
              next.push(nid)
            }
          }),
        )
        frontier = next
      }
      visIds.forEach((n) => {
        if (!depthMap.has(n.id)) depthMap.set(n.id, 1)
      })
      const maxD = Math.max(1, ...Array.from(depthMap.values()))
      const perLayer: Record<number, number> = {}
      visIds.forEach((n) => {
        const d = depthMap.get(n.id)!
        perLayer[d] = (perLayer[d] || 0) + 1
      })
      const counters: Record<number, number> = {}
      const ringR = Math.min(W, Hh) * 0.34
      visIds.forEach((n) => {
        const d = depthMap.get(n.id)!
        const count = perLayer[d]
        const idx = counters[d] || 0
        counters[d] = idx + 1
        if (lay === 'concentric') {
          const a = (idx / count) * Math.PI * 2 - Math.PI / 2
          const rr = d === 0 ? 0 : ringR * (d / maxD)
          n.tx = cx + Math.cos(a) * rr
          n.ty = cy + Math.sin(a) * rr
        } else {
          const y = 70 + d * ((Hh - 140) / Math.max(1, maxD))
          const x = ((idx + 1) / (count + 1)) * W
          n.tx = x
          n.ty = y
        }
      })
    },
    [size, visibleIds, centerId, adjacency],
  )

  // 布局切换 → 计算目标并轻微 reheat
  const applyLayout = (lay: Layout) => {
    setLayout(lay)
    computeTargets(lay)
    alphaRef.current = Math.max(alphaRef.current, lay === 'force' ? 0.4 : 0.4)
    if (!runningRef.current) loop()
  }

  // ---- 力模拟 ----
  const step = useCallback(() => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const a = alphaRef.current
    if (layout === 'force') {
      const rep = 24000
      const linkDist = 140
      const linkK = 0.035
      const gravity = 0.012
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        n.vx += (size.w / 2 - n.x) * gravity * 0.02
        n.vy += (size.h / 2 - n.y) * gravity * 0.02
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j]
          let dx = n.x - m.x
          let dy = n.y - m.y
          let d2 = dx * dx + dy * dy
          if (d2 < 1) d2 = 1
          const f = (rep / d2) * a
          const d = Math.sqrt(d2)
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          n.vx += fx
          n.vy += fy
          m.vx -= fx
          m.vy -= fy
        }
      }
      edges.forEach((e) => {
        if (e.kind === 'tag' || e.kind === 'folder') return
        const s = nodes.find((x) => x.id === e.source)
        const t = nodes.find((x) => x.id === e.target)
        if (!s || !t) return
        let dx = t.x - s.x
        let dy = t.y - s.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = (d - linkDist) * linkK * a
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        s.vx += fx
        s.vy += fy
        t.vx -= fx
        t.vy -= fy
      })
      nodes.forEach((n) => {
        if (dragRef.current?.id === n.id) return
        n.vx *= 0.86
        n.vy *= 0.86
        n.x += n.vx
        n.y += n.vy
      })
    } else {
      let maxd = 0
      nodes.forEach((n) => {
        const dx = n.tx - n.x
        const dy = n.ty - n.y
        n.x += dx * 0.14
        n.y += dy * 0.14
        maxd = Math.max(maxd, Math.abs(dx) + Math.abs(dy))
      })
      if (maxd < 0.6) alphaRef.current = 0
    }
    alphaRef.current *= 0.94
    if (alphaRef.current < 0.025 && !dragRef.current) alphaRef.current = 0
    void a
  }, [layout, size])

  const loop = useCallback(() => {
    runningRef.current = true
    step()
    bump()
    if (alphaRef.current > 0.01 || dragRef.current) {
      rafRef.current = requestAnimationFrame(loop)
    } else {
      runningRef.current = false
    }
  }, [step])

  const reheat = useCallback(
    (a = 0.6) => {
      alphaRef.current = Math.max(alphaRef.current, a)
      if (!runningRef.current) loop()
    },
    [loop],
  )

  useEffect(() => {
    // 不自动启动力模拟；保留初始环形布局。用户交互（拖拽/切布局）时再 reheat
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      runningRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 可见性/模式/布局相关变化 → 重新计算目标并 reheat（非力导向时平滑过渡）
  useEffect(() => {
    if (layout !== 'force') {
      computeTargets(layout)
      reheat(0.5)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, mode, centerId, depth, layout])

  // ---- 坐标转换 ----
  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const v = viewRef.current
    return { x: (sx - v.tx) / v.scale, y: (sy - v.ty) / v.scale, sx, sy }
  }

  // ---- 平移 ----
  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    nodeGestureRef.current = false // 画布手势：随后的 click 属于「点空白处」，应清空选中
    setMenu(null)
    setInfoCard(null)
    panRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (drag) {
      // 拖拽阈值：小于 4px 的抖动仍算单击（否则手一抖就被判成拖拽、节点被挪动且点不开）
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) <= NODE_CLICK_SLOP) return
      drag.moved = true
      const w = toWorld(e.clientX, e.clientY)
      const n = nodesRef.current.find((x) => x.id === drag.id)
      if (n) {
        n.x = w.x - drag.dx
        n.y = w.y - drag.dy
        reheat(0.35)
      }
      return
    }
    if (panRef.current) {
      const start = panRef.current
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      // 捕获 start（非 null），避免 setState 延迟执行时 panRef 已被 onPointerUp 置空
      setView((v) => ({ ...v, tx: start.tx + dx, ty: start.ty + dy }))
    }
  }
  // 节点「单击」必须在 pointerup 上兑现，不能挂在 click 上：
  // onNodePointerDown 会把指针捕获到 <svg>（拖拽时指针移出画布仍收得到事件），
  // 而捕获会把随后的 click 重定向到捕获元素（svg）→ 节点的 onClick 在真实浏览器里永不触发
  // （jsdom 不实现捕获重定向，于是单测全绿、真机点击无反应；2026-09-13 CDP 实测确认）。
  const onPointerUp = () => {
    const drag = dragRef.current
    panRef.current = null
    dragRef.current = null
    if (drag && !drag.moved) activateNode(drag.id)
  }
  const onPointerCancel = () => {
    panRef.current = null
    dragRef.current = null
  }

  // ---- 滚轮缩放（光标居中）----
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = svgRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const v = viewRef.current
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const ns = clamp(v.scale * factor, 0.2, 3)
    const wx = (sx - v.tx) / v.scale
    const wy = (sy - v.ty) / v.scale
    setView({ scale: ns, tx: sx - wx * ns, ty: sy - wy * ns })
  }

  // ---- 节点指针 ----
  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    // 仅主键拖拽：右键要留给 contextmenu（抢了指针捕获会把 contextmenu 也重定向到 svg）
    if (e.button !== 0) return
    e.stopPropagation()
    nodeGestureRef.current = true
    const w = toWorld(e.clientX, e.clientY)
    const n = nodesRef.current.find((x) => x.id === id)!
    dragRef.current = { id, dx: w.x - n.x, dy: w.y - n.y, startX: e.clientX, startY: e.clientY, moved: false }
    ;(svgRef.current as Element).setPointerCapture?.(e.pointerId)
  }
  // 图谱 → 编辑器：打开节点对应笔记，并登记「返回来源」上下文
  // （编辑器据此渲染「← 返回 双链图谱」芯片；现场由 graphSession 保留，返回即原图原位）
  const openNoteInEditor = (id: string) => {
    setSelectedId(id)
    // 卸载清理读的是 sceneRef（本组件不会在卸载前再渲染一次），故此处显式同步选中项
    sceneRef.current = { ...sceneRef.current, selectedId: id }
    setEditorReturn({ view: 'graph', label: '双链图谱' })
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
    else toast?.('该笔记尚未加入任何知识库')
  }, [kbStore, nav, toast])

  // ---- 导出 ----
  const download = (url: string, name: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const serializeGraph = () => {
    const svg = svgRef.current!
    const clone = svg.cloneNode(true) as SVGSVGElement
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    // 解析为具体值：导出为独立 SVG 文件后脱离文档 :root，var() 无法解析
    const rootStyle = getComputedStyle(document.documentElement)
    const resolve = (name: string): string => {
      let val = rootStyle.getPropertyValue(name).trim()
      let guard = 0
      while (val.includes('var(') && guard++ < 5) {
        const inner = val.slice(val.indexOf('(') + 1, val.indexOf(')')).trim()
        val = rootStyle.getPropertyValue(inner).trim()
      }
      return val
    }
    style.textContent = `
      .aurora-graph__edge{stroke:${resolve('--mc-graph-edge')};stroke-width:1.3}
      .aurora-graph__edge--tag{stroke:${resolve('--mc-graph-edge-tag')};stroke-dasharray:3 3;opacity:.4}
      .aurora-graph__edge--folder{stroke:${resolve('--mc-graph-edge-folder')};stroke-dasharray:2 3;opacity:.3}
      .aurora-graph__dot--file{fill:${resolve('--mc-graph-file')};stroke:${resolve('--mc-graph-file-stroke')}}
      .aurora-graph__dot--tag{fill:${resolve('--mc-graph-tag')};stroke:${resolve('--mc-graph-tag-stroke')}}
      .aurora-graph__dot--folder{fill:${resolve('--mc-graph-folder')};stroke:${resolve('--mc-graph-folder-stroke')}}
      .aurora-graph__dot--orphan{fill:${resolve('--mc-graph-orphan')};stroke:${resolve('--mc-graph-orphan-stroke')}}
      .aurora-graph__dot--current{fill:${resolve('--mc-accent')};stroke:${resolve('--mc-graph-current-stroke')}}
      .aurora-graph__label{fill:${resolve('--mc-text-secondary')};font-size:11px;text-anchor:middle}`
    clone.insertBefore(style, clone.firstChild)
    return new XMLSerializer().serializeToString(clone)
  }
  const exportSVG = () => {
    const data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializeGraph())
    download(data, 'knowledge-graph.svg')
    toast?.('已导出 SVG')
  }
  const exportJSON = () => {
    const data = {
      nodes: nodesRef.current
        .filter((n) => visibleIds.has(n.id))
        .map((n) => ({ id: n.id, label: n.label, type: n.type, tags: n.tags })),
      edges: edgesRef.current.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    }
    download(
      URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
      'knowledge-graph.json',
    )
    toast?.('已导出 JSON')
  }
  const exportPNG = () => {
    try {
      const svg = svgRef.current!
      const xml = serializeGraph()
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = svg.clientWidth || 1200
        c.height = svg.clientHeight || 800
        const ctx = c.getContext('2d')!
        // P2-1 背景主题化：读内容区背景变量（亮/暗主题自适应），替代原硬编码 #0A0B0F
        const rootStyle = getComputedStyle(document.documentElement)
        const bg = rootStyle.getPropertyValue('--mc-bg-content').trim() || '#101218'
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((b) => {
          if (b) download(URL.createObjectURL(b), 'knowledge-graph.png')
        })
      }
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      toast?.('已导出 PNG')
    } catch {
      toast?.('导出失败')
    }
  }

  const toggleFullscreen = () => {
    const el = wrapRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }

  const focusCenter = () => {
    const n = nodesRef.current.find((x) => x.id === centerId)
    if (!n) return
    const v = viewRef.current
    setView({ scale: clamp(Math.max(v.scale, 1.2), 0.2, 3), tx: size.w / 2 - n.x * v.scale, ty: size.h / 2 - n.y * v.scale })
    reheat(0.4)
  }

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
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [tick, nodes])
  const edges = edgesRef.current

  const cull = (x: number, y: number) => {
    const v = view
    const sx = v.tx + v.scale * x
    const sy = v.ty + v.scale * y
    return sx < -60 || sx > size.w + 60 || sy < -60 || sy > size.h + 60
  }

  const infoNode = infoCard ? byId.get(infoCard.id) : null
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
  const layoutLabel = (l: Layout) => (l === 'force' ? '力导向' : l === 'concentric' ? '同心圆' : l === 'tree' ? '树形' : '网格')
  const modeLabel = (m: GraphMode) =>
    m === 'global' ? '全局图谱' : m === 'local' ? '局部图谱' : m === 'backlinks' ? '反向链接' : m === 'forwardlinks' ? '正向链接' : '标签图谱'

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const onModeChange = (m: GraphMode) => {
    setMode(m)
    setExtraNeighbors(new Set()) // 展开邻居随模式切换清空（P1-3）
    if (m === 'tag') {
      const sel = selectedId ? byId.get(selectedId) : null
      if (sel?.type === 'tag') setCenterId(sel.id)
      else {
        const cur = selectedId ? byId.get(selectedId) : null
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
      breadcrumbs={['双链图谱']}
      statusLeftItems={[
        { content: `笔记 ${stats.note}` },
        { content: `标签 ${stats.tag}` },
        { content: `文件夹 ${stats.folder}` },
        { content: `连线 ${stats.edge}` },
      ]}
      statusRightItems={[
        { content: `模式：${modeLabel(mode)}` },
        { content: `布局：${layoutLabel(layout)}` },
        { content: `缩放 ${Math.round(view.scale * 100)}%` },
        { content: '⌘K 命令面板', clickable: true, onClick: () => openCommandPalette() },
      ]}
    >
      <div className="aurora-graph">
        {/* 使用优化⑦ · 左缘 hoverzone（对齐编辑器 v7 范式）：7px 隐形感应条，hover 召唤导航浮层（不挤压画布重排）；图钉可钉成常驻栏。 */}
        <div
          className={`aurora-graph__hoverzone ${navPinned ? 'is-pinned' : ''}`}
          onMouseEnter={openNavIntent}
          onMouseLeave={closeNavIntent}
        >
          <div className="aurora-graph__edge" aria-hidden />
          {navOverlay.mounted && (
            <div
              className="aurora-graph__overlay"
              data-exiting={navOverlay.exiting || undefined}
              onMouseEnter={cancelNavClose}
              onMouseLeave={scheduleNavClose}
            >
              <div className="aurora-graph__overlay-head">
                <span className="aurora-graph__overlay-title">图谱导航</span>
                <div className="aurora-graph__overlay-actions">
                  <button
                    type="button"
                    className={`aurora-graph__pin ${navPinned ? 'is-on' : ''}`}
                    onClick={() => setNavPinned((p) => !p)}
                    aria-label={navPinned ? '取消钉住图谱导航' : '钉住图谱导航'}
                    title={navPinned ? '取消钉住' : '钉住常驻'}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
                  </button>
                  <button
                    type="button"
                    className="aurora-graph__overlay-close"
                    onClick={closeNav}
                    aria-label="收起图谱导航"
                    title="收起"
                  >
                    <Icon.chevronLeft size={14} />
                  </button>
                </div>
              </div>
              <div className="aurora-graph__overlay-body">
              {/* 使用优化⑤ · 重排：视图控制（模式/布局）置顶——高频操作优先 */}
              <div className="aurora-graph__group">
                <div className="aurora-graph__group-title">图谱模式</div>
                <div className="aurora-graph__seg">
                  {([
                    ['global', '全局'],
                    ['local', '局部'],
                    ['backlinks', '反向'],
                    ['forwardlinks', '正向'],
                    ['tag', '标签'],
                  ] as const).map(([m, label]) => (
                    <button key={m} className={mode === m ? 'is-active' : ''} onClick={() => onModeChange(m)}>
                      {label}
                    </button>
                  ))}
                </div>
                {mode === 'local' && (
                  <div className="aurora-graph__depth">
                    深度
                    <input type="range" min={1} max={3} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
                    <span>{depth}</span>
                  </div>
                )}
              </div>

              <div className="aurora-graph__group">
                <div className="aurora-graph__group-title">布局方式</div>
                <div className="aurora-graph__seg">
                  {([
                    ['force', '力导向'],
                    ['concentric', '同心圆'],
                    ['tree', '树形'],
                    ['grid', '网格'],
                  ] as const).map(([l, label]) => (
                    <button key={l} className={layout === l ? 'is-active' : ''} onClick={() => applyLayout(l)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="aurora-graph__divider" />

              <div className="aurora-graph__group">
                <div className="aurora-graph__group-title">标签筛选（多选）</div>
                <div className="aurora-graph__chips">
                  {allTags.map((t) => (
                    <button
                      key={t}
                      className={`aurora-graph__chip${selectedTags.includes(t) ? ' is-active' : ''}`}
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="aurora-graph__group">
                <div className="aurora-graph__group-title">
                  连接强度 <span className="val">最小 {minConn}</span>
                </div>
                <input
                  className="aurora-graph__slider"
                  type="range"
                  min={0}
                  max={10}
                  value={minConn}
                  onChange={(e) => setMinConn(Number(e.target.value))}
                />
              </div>

              <div className="aurora-graph__group">
                <div className="aurora-graph__group-title">显示</div>
                <label className="aurora-graph__check">
                  <input type="checkbox" checked={showOrphan} onChange={(e) => setShowOrphan(e.target.checked)} />
                  显示孤立节点
                </label>
                <label className="aurora-graph__check">
                  <input type="checkbox" checked={showFolderLinks} onChange={(e) => setShowFolderLinks(e.target.checked)} />
                  显示文件夹关联
                </label>
                <label className="aurora-graph__check">
                  <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} />
                  显示箭头
                </label>
              </div>

              <div className="aurora-graph__divider" />

              {/* 方案 C · 着色分组导航：点分组聚焦该色节点（dim 其余），既是导航也是图例（使用优化⑤：随分组着色一并后置） */}
              <div className="aurora-graph__nav">
                <div className="aurora-graph__group-title">
                  着色分组 <span className="val">{focusGroup ? '聚焦中' : `${groupAgg.length} 组`}</span>
                </div>
                {groupAgg.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className={`aurora-graph__nav-row${focusGroup === g.key ? ' is-active' : ''}`}
                    onClick={() => setFocusGroup((cur) => (cur === g.key ? null : g.key))}
                    title={`聚焦 ${g.name} 分组`}
                  >
                    <i className="aurora-graph__nav-dot" style={{ background: g.color }} />
                    <span className="aurora-graph__nav-name">{g.name}</span>
                    <span className="aurora-graph__nav-count">{g.count}</span>
                  </button>
                ))}
                {focusGroup && (
                  <button type="button" className="aurora-graph__nav-clear" onClick={() => setFocusGroup(null)}>
                    清除聚焦
                  </button>
                )}
              </div>

              {/* P2-3 分组着色（对标 Obsidian Groups）· 方案 C：可折叠，默认收起（grp-form 始终在 DOM，测试兼容） */}
              <div className={`aurora-graph__group aurora-graph__grp${grpOpen ? '' : ' is-fold'}`}>
                <div className="aurora-graph__group-title aurora-graph__grp-head" onClick={() => setGrpOpen((o) => !o)}>
                  分组着色 <span className="val">{grpOpen ? '收起' : '展开'}</span>
                </div>
                <div className="aurora-graph__grp-body">
                  {groups.length > 0 && (
                    <div className="aurora-graph__grp-list">
                      {groups.map((g) => (
                        <div key={g.id} className="aurora-graph__grp-row">
                          <i className="aurora-graph__grp-dot" style={{ background: g.color }} />
                          <span className="aurora-graph__grp-name">{g.name}</span>
                          <span className="aurora-graph__grp-rule">{g.match === 'tag' ? `#${g.keyword}` : g.keyword}</span>
                          <button
                            type="button"
                            className="aurora-graph__grp-del"
                            title="删除分组"
                            onClick={() => setGroups((prev) => prev.filter((x) => x.id !== g.id))}
                          >
                            <Icon.close size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="aurora-graph__grp-form">
                    <input
                      className="aurora-graph__grp-input"
                      value={grpName}
                      onChange={(e) => setGrpName(e.target.value)}
                      placeholder="分组名"
                      aria-label="分组名"
                    />
                    <div className="aurora-graph__grp-row">
                      <AuroraSelect
                        ariaLabel="匹配方式"
                        value={grpMatch}
                        onChange={(v) => setGrpMatch(v as 'tag' | 'name')}
                        options={[
                          { value: 'tag', label: '标签' },
                          { value: 'name', label: '名称' },
                        ]}
                      />
                      <input
                        className="aurora-graph__grp-input"
                        value={grpKeyword}
                        onChange={(e) => setGrpKeyword(e.target.value)}
                        placeholder={grpMatch === 'tag' ? '标签名' : '关键词'}
                        aria-label="匹配关键词"
                      />
                    </div>
                    <div className="aurora-graph__grp-colors">
                      {GROUP_COLORS.map((c, i) => (
                        <button
                          key={c}
                          type="button"
                          className={`aurora-graph__grp-swatch${grpColor === c ? ' is-on' : ''}`}
                          style={{ background: c }}
                          title={`分组色 ${i + 1}`}
                          onClick={() => setGrpColor(c)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="aurora-graph__grp-add"
                      onClick={addGroup}
                      disabled={!grpName.trim() || !grpKeyword.trim()}
                    >
                      添加分组
                    </button>
                  </div>
                  <div className="aurora-graph__grp-hint">匹配的笔记节点将按分组着色（标签或名称匹配；当前笔记与类型色优先）</div>
                </div>
              </div>

              <div className="aurora-graph__divider" />

              {/* G4/I3 链接健康（复用 useDashboardData 单一数据源） */}
              <div className="aurora-graph__group aurora-graph__health">
                <div className="aurora-graph__group-title">
                  链接健康 <span className={`val band band--${band}`}>{healthScore} 分</span>
                </div>
                <div className="aurora-graph__health-row">
                  <span className="aurora-graph__health-item">
                    断链 <b className={linkHealth.brokenList.length ? 'bad' : 'ok'}>{linkHealth.brokenList.length}</b>
                  </span>
                  <span className="aurora-graph__health-item">
                    孤立 <b className={linkHealth.orphan.length ? 'bad' : 'ok'}>{linkHealth.orphan.length}</b>
                  </span>
                </div>
                {linkHealth.brokenList.length > 0 && (
                  <ul className="aurora-graph__health-list">
                    {linkHealth.brokenList.slice(0, 3).map((b) => (
                      <li key={b.target} title={`被 ${b.count} 处引用`}>
                        <span className="tgt">{b.target.length > 16 ? b.target.slice(0, 15) + '…' : b.target}</span>
                        <em>×{b.count}</em>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button className="aurora-graph__reset" onClick={resetView}>
                重置视图
              </button>
              </div>
            </div>
          )}
        </div>

        <div className="aurora-graph__canvas" ref={wrapRef}>
          {/* 方案 C · 顶部筛选条：搜索 + 节点类型 + 着色（高频操作提升，告别左栏长列表混排） */}
          <div className="aurora-graph__topbar">
            <div className="aurora-graph__search">
              <Icon.search size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索节点…" />
              {matchedIds && <span className="count">{matchedIds.size} 个</span>}
            </div>
            <span className="aurora-graph__topbar-sep" />
            <div className="aurora-graph__topbar-type">
              <button
                type="button"
                className={`aurora-graph__topbar-btn${typeOpen ? ' is-open' : ''}`}
                onClick={() => setTypeOpen((o) => !o)}
              >
                <Icon.filter size={14} /> 节点类型
                <Icon.chevronDown size={12} />
              </button>
              {typeOpen && (
                <div className="aurora-graph__pop" onPointerLeave={() => setTypeOpen(false)}>
                  <label className="aurora-graph__check">
                    <input type="checkbox" checked={showNote} onChange={(e) => setShowNote(e.target.checked)} />
                    笔记
                  </label>
                  <label className="aurora-graph__check">
                    <input type="checkbox" checked={showTag} onChange={(e) => setShowTag(e.target.checked)} />
                    标签
                  </label>
                  <label className="aurora-graph__check">
                    <input type="checkbox" checked={showFolder} onChange={(e) => setShowFolder(e.target.checked)} />
                    文件夹
                  </label>
                </div>
              )}
            </div>
          </div>

          <svg
            ref={svgRef}
            className={`aurora-graph__svg${panRef.current ? ' is-panning' : ''}`}
            width={size.w}
            height={size.h}
            onPointerDown={onBgPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={(e) => {
              // 节点手势的 click 会被 setPointerCapture 重定向到这里（target 也是 svg），
              // 若只看 target 会把「点节点」误判成「点空白」→ 刚选中的节点/信息卡被立刻清空，
              // 故以手势来源（nodeGestureRef）为准
              if (nodeGestureRef.current) {
                nodeGestureRef.current = false
                return
              }
              if (e.target === svgRef.current) {
                setSelectedId(null)
                setInfoCard(null)
                setMenu(null)
              }
            }}
            onWheel={onWheel}
          >
            <g transform={`translate(${view.tx}, ${view.ty}) scale(${view.scale})`}>
              <defs>
                <marker
                  id="graph-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" className="aurora-graph__arrow" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const s = byId.get(e.source)
                const t = byId.get(e.target)
                if (!s || !t) return null
                if (!visibleIds.has(s.id) || !visibleIds.has(t.id)) return null
                if (e.kind === 'folder' && !showFolderLinks) return null
                if (cull(s.x, s.y) && cull(t.x, t.y)) return null
                const dim = isEdgeDim(s.id, t.id)
                const act = activeId && (s.id === activeId || t.id === activeId)
                const arrow = showArrows && (e.kind === 'wiki' || e.kind === 'embed')
                return (
                  <line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    markerEnd={arrow ? 'url(#graph-arrow)' : undefined}
                    className={`aurora-graph__edge aurora-graph__edge--${e.kind}${act ? ' is-active' : ''}${dim ? ' is-dim' : ''}`}
                  />
                )
              })}
              {nodes.map((n) => {
                if (!visibleIds.has(n.id)) return null
                if (cull(n.x, n.y)) return null
                // P2-4 度数权重：file 节点半径随连接数增大（核心笔记一眼可见）；当前笔记放大强调保留
                const r = n.isCurrent
                  ? CURRENT_R
                  : n.type === 'file'
                    ? RADIUS.file + Math.min(n.deg, 8) * 0.8
                    : RADIUS[n.type]
                const dim = isDim(n.id)
                const act = activeId === n.id
                const hov = hoverId === n.id
                const hot = n.type === 'file' && n.deg >= 4
                const isOrphan = n.type === 'file' && n.deg === 0
                const cls = n.isCurrent ? 'current' : n.type === 'folder' ? 'folder' : isOrphan ? 'orphan' : n.type
                const gColor = groupFor(n)?.color // P2-3 分组着色（inline 覆盖类型色）
                const showLabel =
                  n.isCurrent || n.type === 'folder' || isOrphan || hot || hov || act || (matchedIds?.has(n.id) ?? false)
                return (
                  <g
                    key={n.id}
                    className={`aurora-graph__node${act ? ' is-active' : ''}${hov ? ' is-hover' : ''}${dim ? ' is-dim' : ''}`}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      onNodeDouble(n.id)
                    }}
                    onContextMenu={(e) => onNodeContext(e, n.id)}
                    onPointerEnter={() => setHoverId(n.id)}
                    onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                  >
                    {n.type === 'tag' ? (
                      <polygon points={hexPoints(n.x, n.y, r)} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                    ) : n.type === 'folder' ? (
                      <rect x={n.x - r * 0.85} y={n.y - r * 0.85} width={r * 1.7} height={r * 1.7} rx={4} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                    ) : (
                      <circle cx={n.x} cy={n.y} r={r} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                    )}
                    {showLabel && (
                      <text x={n.x} y={n.y + r + 13} className="aurora-graph__label">
                        {n.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>


          {/* 视图控制（右上）*/}
          <div className="aurora-graph__float aurora-graph__controls">
            <button onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale / 1.2, 0.2, 3) }))} title="缩小">
              <Icon.minus size={15} />
            </button>
            <button
              className="aurora-graph__zoom"
              onClick={() => {
                setView({ scale: 1, tx: 0, ty: 0 })
                reheat(0.5)
              }}
              title="点击重置为 100%"
            >
              {Math.round(view.scale * 100)}%
            </button>
            <button onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale * 1.2, 0.2, 3) }))} title="放大">
              <Icon.plus size={15} />
            </button>
            <span className="divider" />
            <button
              onClick={() => {
                setView({ scale: 1, tx: 0, ty: 0 })
                reheat(0.6)
              }}
              title="适应视图"
            >
              <Icon.frame size={15} />
            </button>
            <button onClick={focusCenter} title="聚焦当前笔记">
              <Icon.target size={15} />
            </button>
            <button onClick={toggleFullscreen} title="全屏">
              <Icon.maximize size={15} />
            </button>
            <span className="divider" />
            <button onClick={() => setExportOpen((o) => !o)} title="导出">
              <Icon.download size={15} />
            </button>
          </div>

          {exportPresence.mounted && (
            <div
              className="aurora-graph__float aurora-graph__menu"
              data-exiting={exportPresence.exiting || undefined}
            >
              <button onClick={() => { exportPNG(); setExportOpen(false) }}>
                <Icon.download size={14} /> 导出 PNG
              </button>
              <button onClick={() => { exportSVG(); setExportOpen(false) }}>
                <Icon.download size={14} /> 导出 SVG
              </button>
              <button onClick={() => { exportJSON(); setExportOpen(false) }}>
                <Icon.copy size={14} /> 导出 JSON
              </button>
            </div>
          )}

          {/* 节点信息卡 */}
          {infoNode && infoPos && (
            <div className="aurora-graph__float aurora-graph__infocard" style={{ left: infoPos.left, top: infoPos.top }}>
              <div className="aurora-graph__ic-head">
                <div className="aurora-graph__ic-title">
                  <span className="aurora-graph__ic-dot" style={{ background: nodeFill(infoNode) }} />
                  {infoNode.label}
                </div>
                <button className="aurora-graph__ic-close" onClick={() => setInfoCard(null)}>
                  <Icon.close size={14} />
                </button>
              </div>
              <span className="aurora-graph__ic-type">
                {infoNode.isCurrent ? '当前笔记' : infoNode.type === 'tag' ? '标签' : infoNode.type === 'folder' ? '文件夹' : infoNode.deg === 0 ? '孤立笔记' : '笔记'}
              </span>
              {infoNode.filePath && <div className="aurora-graph__ic-path">{infoNode.filePath}</div>}
              {infoNode.tags.length > 0 && (
                <div className="aurora-graph__ic-tags">
                  {infoNode.tags.map((t) => (
                    <em key={t}>{t}</em>
                  ))}
                </div>
              )}
              <div className="aurora-graph__ic-stats">
                <div className="aurora-graph__ic-stat"><div className="v">{infoNode.inLinks}</div><div className="k">入链</div></div>
                <div className="aurora-graph__ic-stat"><div className="v">{infoNode.outLinks}</div><div className="k">出链</div></div>
                <div className="aurora-graph__ic-stat"><div className="v">{infoNode.wordCount ?? '—'}</div><div className="k">字数</div></div>
                <div className="aurora-graph__ic-stat"><div className="v sm">{relTime(infoNode.modifiedAt)}</div><div className="k">修改</div></div>
              </div>
              <div className="aurora-graph__ic-actions">
                {infoNode.type === 'file' && (
                  <button
                    className="primary"
                    onClick={() => {
                      openNoteInEditor(infoNode.id)
                      setInfoCard(null)
                    }}
                  >
                    <Icon.arrowR size={13} /> 打开笔记
                  </button>
                )}
                <button onClick={() => { setMode('local'); setCenterId(infoNode.id); setInfoCard(null); reheat(0.4) }}>
                  <Icon.target size={13} /> 在图谱中聚焦
                </button>
                <button onClick={() => { setMode('backlinks'); setCenterId(infoNode.id); setInfoCard(null); reheat(0.4) }}>
                  <Icon.link size={13} /> 查看反向链接
                </button>
              </div>
            </div>
          )}

          {/* 右键菜单 */}
          {menuPresence.mounted && menuPresence.value && (() => {
            // 退场窗口内沿用最后一份非空载荷（usePresenceValue 已保证），坐标不丢
            const menu = menuPresence.value!
            const m = byId.get(menu.id)
            if (!m) return null
            return (
              <div
                className="aurora-graph__float aurora-graph__ctx"
                data-exiting={menuPresence.exiting || undefined}
                style={{ left: menu.x, top: menu.y }}
                onPointerLeave={() => setMenu(null)}
              >
                <button onClick={() => { onNodeDouble(m.id); setMenu(null) }}>
                  <Icon.arrowR size={14} /> 打开笔记
                </button>
                {m.type === 'file' && (
                  <button onClick={() => { void openOwningKb(m.id); setMenu(null) }}>
                    <Icon.book size={14} /> 打开所属知识库
                  </button>
                )}
                <button onClick={() => { setMode('local'); setCenterId(m.id); setMenu(null); reheat(0.4) }}>
                  <Icon.frame size={14} /> 局部视图
                </button>
                <button onClick={() => { setMode('backlinks'); setCenterId(m.id); setMenu(null) }}>
                  <Icon.link size={14} /> 查看反向链接
                </button>
                <button onClick={() => { setMode('forwardlinks'); setCenterId(m.id); setMenu(null) }}>
                  <Icon.share size={14} /> 查看正向链接
                </button>
                <button onClick={() => { setCenterId(m.id); setMenu(null); reheat(0.4) }}>
                  <Icon.refresh size={14} /> 设为中心
                </button>
                <div className="sep" />
                <button
                  onClick={() => {
                    setHidden((h) => new Set(h).add(m.id))
                    setMenu(null)
                    setInfoCard(null)
                  }}
                >
                  <Icon.eyeOff size={14} /> 隐藏节点
                </button>
                <button
                  onClick={() => {
                    // 展开邻居：把该节点一跳邻居并入显示（真实实现，替换原 toast 桩）
                    setExtraNeighbors((prev) => {
                      const next = new Set(prev)
                      ;(adjacency.get(m.id) || []).forEach((nid) => next.add(nid))
                      return next
                    })
                    setMenu(null)
                    setInfoCard(null)
                    reheat(0.4)
                  }}
                >
                  <Icon.share size={14} /> 展开邻居
                </button>
                <button onClick={() => { setSelectedId(m.id); setInfoCard({ id: m.id }); setMenu(null) }}>
                  <Icon.info size={14} /> 查看详情
                </button>
              </div>
            )
          })()}

          {/* 底部状态栏（居中）*/}
          <div className="aurora-graph__statusbar">
            <div className="aurora-graph__sb-stats">
              <span className="lg-current">{stats.note}</span>
              <span className="lg-tag">{stats.tag}</span>
              <span className="lg-folder">{stats.folder}</span>
              <span><i className="lg-wiki" />{stats.edge}</span>
            </div>
            <span className="aurora-graph__sb-sep" />
            <div className="aurora-graph__sb-legend">
              <span className="lg-current">当前</span>
              <span className="lg-file">笔记</span>
              <span className="lg-folder">文件夹</span>
              <span className="lg-tag">标签</span>
              <span><i className="lg-wiki" />引用</span>
              <span><i className="lg-taglink" />标签关联</span>
            </div>
            <span className="aurora-graph__sb-sep" />
            {/* 布局切换已在左侧栏「视图·布局方式」提供，状态栏去重，避免与左栏重复 */}
          </div>

          {/* 空态 */}
          {visibleIds.size === 0 && (
            <div className="aurora-graph__empty">
              <Icon.graph size={32} />
              <div className="title">没有匹配的节点</div>
              <div className="sub">调整筛选条件、标签选择或图谱模式，图谱将重新显现。</div>
            </div>
          )}
        </div>
      </div>
    </PageFrame>
  )
}

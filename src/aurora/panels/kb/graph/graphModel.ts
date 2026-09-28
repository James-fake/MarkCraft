import { findNode } from '@core/files/fileTree'
import type { FileNode } from '@src/types/fileManager'
import type { GraphData } from '@stores/LinkIndexStore'
import { countWords } from '@features/editor/stats'

/**
 * 双链图谱 · 数据模型与力模拟（P2-3 从 GraphPanel.tsx 拆出，2026-09-28）
 * ==========================================================================
 * 承载：节点/边模型、建图（真实 LinkIndex → 图模型）、度数统计、范围裁剪共享核心、
 * 力模拟步进（simulateStep）、几何/时间小工具、着色分组持久化。
 *
 * **纯逻辑层**：无 React、无 store 依赖（buildGraphData 入参显式传 graph/rootFolder 等），
 * 可直接单测——simulateStep / MAX_STEP 不变式即回归锁（graphSim.test.ts）。
 * 渲染与交互留在 GraphPanel.tsx，范围裁剪与现场持久化在 ./graphScope.ts。
 */

export type NodeType = 'file' | 'tag' | 'folder'
export type EdgeKind = 'wiki' | 'embed' | 'tag' | 'folder'
// 布局/模式由 graphSession 复用（图谱现场跨挂载复原），故对外导出
export type Layout = 'force' | 'concentric' | 'tree' | 'grid'
export type GraphMode = 'global' | 'local' | 'backlinks' | 'forwardlinks' | 'tag'

// 图谱节点/边模型：scopeGraphToKb（知识库范围裁剪）需要以类型形式对外暴露，故导出
export interface GNode {
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

export interface GEdge {
  source: string
  target: string
  kind: EdgeKind
}

export const RADIUS: Record<NodeType, number> = { file: 13, tag: 9, folder: 11 }
// 节点拖拽阈值（px）：位移小于此值仍判为单击——对齐桌面端习惯，避免手抖被判成拖拽而点不开笔记
export const NODE_CLICK_SLOP = 4
export const CURRENT_R = 19
export const H = 3600_000 // 毫秒/小时

/* —— 力导向参数（2026-09-23 拖拽体验调优）——
 * 原实现有两个会让节点「飞出去」的缺陷，这里用三个下限/上限兜住：
 *  ① `MIN_SEP`：两节点重合时旧代码把 d² 夹到 1 后仍用原始 dx/dy 归一化，
 *     等效冲量可达万级 → 被撞节点炸飞。改为「距离下限」：方向用真实位移取单位向量，
 *     幅值按 max(d, MIN_SEP) 计算，重合时再给一个确定方向拆开。
 *  ② `MAX_STEP`：单帧位移上限。任何极端力都不可能让节点一帧瞬移，兜底防甩飞。
 *  ③ 拖拽中的节点「钉住」（速度恒 0，见 step）：旧代码只跳过它的位移积分，
 *     速度却仍在累积且不受阻尼 → 快速滑动松手时把累计速度一次性释放，正是报障现象。 */
export const REP = 24000 // 斥力强度
export const LINK_DIST = 140 // 弹簧自然长度
export const LINK_K = 0.035 // 弹簧刚度
export const GRAVITY = 0.012 // 向心力系数
export const MIN_SEP = 36 // 最小分离距离（px）：消除 d→0 的斥力奇点
export const VEL_DECAY = 0.86 // 速度阻尼（每帧）
export const MAX_STEP = 16 // 单帧最大位移（px）：禁止任何节点瞬移（对外导出供回归测试断言该不变式）
export const DRAG_ALPHA = 0.2 // 拖拽期间 alpha 下限：邻居持续让位，但不再每次 pointermove 打满

// ---- 真实数据接入（Phase 2 第六批·GraphPanel 换芯）----
// 直接复用真实 LinkIndex 的 getGraphData(tagIndex)：其返回结构
//   nodes: { id, label, links }[]  +  edges: { source, target, type:'wikilink'|'embed'|'tag' }[]
// 与 Aurora 图谱模型一一对应（file 节点 + tag 节点 + wiki/embed/tag 边），无需自造 mock。

export function buildGraphData(
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

export function computeDegrees(nodes: GNode[], edges: GEdge[]) {
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

/**
 * 图谱裁剪的**共享核心**：按「文件谓词」保留节点与边（两步法，单源）。
 *
 * 判据：
 *  ① file 节点：仅保留 keepFile(id) 为真的；
 *  ② 标签：先取「有一端是保留文件」的边，其 tag 端点即「这批文件用到的标签」——
 *     只被被剔除文件使用的标签不会进入候选（不残留成孤岛）；
 *  ③ 边：两端都在（保留文件 ∪ 上述标签）集合内才保留（一端出界即整条丢弃 ——
 *     不允许「线还在、对面是鬼」，也不允许「被剔除的笔记挂在保留标签上」）；
 *  ④ folder 节点：数据层当前不生成（见 buildGraphData 注），故无需分支。
 *
 * ⚠️ ②③ 必须分两步：不能直接用「文件 id 集合」过滤边 ——
 * 那样「文件 → 标签」的边会因 tag 端点不在集合内而被整条误删，
 * 标签节点随之全部消失（graphScope.test.ts 的用例锁这一层）。
 *
 * 纯函数：无 React、无 store 依赖，可直接单测。deg/inLinks/outLinks 由调用方
 * computeDegrees 在裁剪后的边上重算，故此处不维护派生字段。
 *
 * 导出说明：仅 graphScope.ts 的 scopeGraphToKb / excludeGraphFiles 复用，勿在别处消费。
 */
export function keepFilesByPredicate(
  data: { nodes: GNode[]; edges: GEdge[] },
  keepFile: (id: string) => boolean,
): { nodes: GNode[]; edges: GEdge[] } {
  const files = data.nodes.filter((n) => n.type === 'file' && keepFile(n.id))
  const fileKeep = new Set(files.map((n) => n.id))
  // 第 1 步：一端落在保留文件上的边 → 其 tag 端点就是「这批文件用到的标签」
  const touched = data.edges.filter((e) => fileKeep.has(e.source) || fileKeep.has(e.target))
  const tagKeep = new Set<string>()
  for (const e of touched) {
    if (e.kind !== 'tag') continue
    tagKeep.add(e.source)
    tagKeep.add(e.target)
  }
  // 第 2 步：真值集合 = 保留文件 ∪ 这批文件用到的标签，边两端都必须在其中
  const keep = new Set<string>([...fileKeep, ...tagKeep])
  const edges = data.edges.filter((e) => keep.has(e.source) && keep.has(e.target))
  const tags = data.nodes.filter((n) => n.type === 'tag' && tagKeep.has(n.id))
  return { nodes: [...files, ...tags], edges }
}

/** 拖拽载荷（纯函数入参）：被拖拽节点的 id 与「指针到节点中心的偏移」 */
export interface SimDrag {
  id: string
  dx: number
  dy: number
}

export interface SimStepParams {
  nodes: GNode[]
  edges: GEdge[]
  nodeById: Map<string, GNode>
  layout: Layout
  size: { w: number; h: number }
  alpha: number
  drag: SimDrag | null
  /** 被拖拽指针的**世界坐标**（调用方按视口 + 缓存的 rect 换算好） */
  dragWorld: { x: number; y: number } | null
}

/**
 * 一次力模拟步进（纯计算：原地修改 nodes 的 x/y/vx/vy，无 React / 无 store 依赖，可直接单测）。
 *
 * 2026-09-23 拖拽体验调优抽成纯函数，以便用单测锁定两个缺陷：
 *  ① 斥力奇点：旧版把 d² 夹到 1 却仍用原始 dx/dy 归一化 ⇒ 两节点重合瞬间冲量上万倍，
 *     被撞到的节点直接「飞出去」。现改为距离取 max(d, MIN_SEP)，幅值有界。
 *  ② 拖拽速度残留：被拖拽节点全程「钉住」（位置由指针决定、速度恒 0），
 *     松手瞬间不再释放拖拽期累积的速度 —— 这正是「快速滑动松手后节点飞很远」的根因。
 * 另加单帧位移上限 MAX_STEP，任何极端力都不可能让节点一帧瞬移。
 *
 * 返回 maxTargetDelta：非力导向布局下「离各自目标位的最大曼哈顿距离」，供调用方判断是否已收敛。
 */
export function simulateStep(p: SimStepParams): { maxTargetDelta: number } {
  const { nodes, edges, nodeById, layout, size, alpha, drag, dragWorld } = p

  // ① 钉住被拖拽节点到最新指针位置（每帧一次；速度同时清零，是 ⑤ 闭环的前提）
  if (drag && dragWorld) {
    const dn = nodeById.get(drag.id)
    if (dn) {
      dn.x = dragWorld.x - drag.dx
      dn.y = dragWorld.y - drag.dy
      dn.vx = 0
      dn.vy = 0
    }
  }

  if (layout !== 'force') {
    let maxd = 0
    for (const n of nodes) {
      if (drag && drag.id === n.id) continue // 拖拽中不吸附回目标位，松手后再缓动归位
      const dx = n.tx - n.x
      const dy = n.ty - n.y
      n.x += dx * 0.14
      n.y += dy * 0.14
      maxd = Math.max(maxd, Math.abs(dx) + Math.abs(dy))
    }
    return { maxTargetDelta: maxd }
  }

  const cx = size.w / 2
  const cy = size.h / 2
  // ② 向心力
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    n.vx += (cx - n.x) * GRAVITY * 0.02
    n.vy += (cy - n.y) * GRAVITY * 0.02
  }
  // ③ 两两斥力：距离取 max(d, MIN_SEP) 消除 d→0 奇点（见函数头注 ①）
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j]
      let dx = n.x - m.x
      let dy = n.y - m.y
      let d = Math.sqrt(dx * dx + dy * dy)
      if (d < 1e-3) { dx = 0.6; dy = -0.6; d = Math.sqrt(dx * dx + dy * dy) } // 完全重合：给确定方向拆开
      const eff = d < MIN_SEP ? MIN_SEP : d
      const f = (REP / (eff * eff)) * alpha
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      n.vx += fx
      n.vy += fy
      m.vx -= fx
      m.vy -= fy
    }
  }
  // ④ 弹簧（wiki / embed 边）
  for (const e of edges) {
    if (e.kind === 'tag' || e.kind === 'folder') continue
    const s = nodeById.get(e.source)
    const t = nodeById.get(e.target)
    if (!s || !t) continue
    const dx = t.x - s.x
    const dy = t.y - s.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const f = (d - LINK_DIST) * LINK_K * alpha
    const fx = (dx / d) * f
    const fy = (dy / d) * f
    s.vx += fx
    s.vy += fy
    t.vx -= fx
    t.vy -= fy
  }
  // ⑤ 阻尼 + 单帧位移上限 + 积分。被拖拽节点速度归零、不累积（见函数头注 ②）
  for (const n of nodes) {
    if (drag && drag.id === n.id) { n.vx = 0; n.vy = 0; continue }
    n.vx *= VEL_DECAY
    n.vy *= VEL_DECAY
    if (n.vx > MAX_STEP) n.vx = MAX_STEP
    else if (n.vx < -MAX_STEP) n.vx = -MAX_STEP
    if (n.vy > MAX_STEP) n.vy = MAX_STEP
    else if (n.vy < -MAX_STEP) n.vy = -MAX_STEP
    n.x += n.vx
    n.y += n.vy
  }
  return { maxTargetDelta: 0 }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function relTime(ts?: number): string {
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

// P2-3 颜色分组：标签或名称关键词匹配 → 节点着色（localStorage 持久化）
export interface GraphGroup {
  id: string
  name: string
  color: string
  match: 'tag' | 'name'
  keyword: string
}
export const GROUPS_KEY = 'markcraft-graph-groups'
export function loadGroups(): GraphGroup[] {
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
export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

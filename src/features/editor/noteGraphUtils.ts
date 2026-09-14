/**
 * P1-4 编辑器内反链 / 迷你图谱 — 纯函数工具
 *
 * 全部为纯函数，便于单元测试，且不依赖 React / DOM / 外部存储。
 * 组件层复用 LinkIndexStore 的已索引数据（getBacklinks / getGraphData），
 * 这里只提供 wikilink 解析、邻居子图提取与确定的圆形布局计算。
 */

export interface WikiLink {
  /** 链接目标（页面名，可能带扩展名） */
  target: string
  /** 显示别名（[[target|alias]] 中的 alias） */
  alias?: string
  /** 是否为嵌入（![[...]]） */
  embed: boolean
  /** 原始匹配串 */
  raw: string
}

/** 解析 markdown 中的 [[wikilink]]（支持 ! 嵌入、| 别名、空目标跳过） */
export function parseWikiLinks(content: string): WikiLink[] {
  const re = /(!?)\[\[([^\]]+)\]\]/g
  const out: WikiLink[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content || ''))) {
    const inner = m[2]
    const embed = m[1] === '!'
    const [target, alias] = inner.split('|').map(s => s.trim())
    if (!target) continue
    out.push({ target, alias: alias || undefined, embed, raw: m[0] })
  }
  return out
}

export interface MiniGraphNode {
  id: string
  label: string
  isCenter: boolean
}

export interface MiniGraph {
  nodes: MiniGraphNode[]
  edges: { source: string; target: string }[]
}

/**
 * 从全量图谱中提取「当前节点 + 直接邻居」子图。
 * 边只要有一端为 currentId 即保留。若 currentId 在节点集中不存在，
 * 仍会补一个孤立中心节点，保证面板有可渲染内容。
 */
export function extractNeighborhood(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ source: string; target: string }>,
  currentId: string,
): MiniGraph {
  const neighborIds = new Set<string>()
  const keptEdges = edges.filter(e => {
    if (e.source === currentId) {
      neighborIds.add(e.target)
      return true
    }
    if (e.target === currentId) {
      neighborIds.add(e.source)
      return true
    }
    return false
  })

  const keptNodes: MiniGraphNode[] = nodes
    .filter(n => n.id === currentId || neighborIds.has(n.id))
    .map(n => ({ id: n.id, label: n.label, isCenter: n.id === currentId }))

  const centerExists = keptNodes.some(n => n.id === currentId)
  if (!centerExists) {
    const center = nodes.find(n => n.id === currentId)
    if (center) keptNodes.push({ id: center.id, label: center.label, isCenter: true })
  }

  return { nodes: keptNodes, edges: keptEdges }
}

export interface PositionedNode {
  id: string
  label: string
  x: number
  y: number
  isCenter: boolean
}

/**
 * 将迷你子图按「中心 + 环形邻居」做确定性布局（同输入必得同输出，便于测试）。
 * 邻居均匀分布在一个圆上，半径随画布尺寸自适应，留白避免贴边。
 */
export function layoutMiniGraph(
  mini: MiniGraph,
  width: number,
  height: number,
): PositionedNode[] {
  const cx = width / 2
  const cy = height / 2
  const neighbors = mini.nodes.filter(n => !n.isCenter)
  const radius = Math.max(0, Math.min(width, height) / 2 - 28)

  const positions: PositionedNode[] = []
  const center = mini.nodes.find(n => n.isCenter)
  if (center) {
    positions.push({ id: center.id, label: center.label, x: cx, y: cy, isCenter: true })
  }

  const count = Math.max(1, neighbors.length)
  neighbors.forEach((n, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2
    positions.push({
      id: n.id,
      label: n.label,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      isCenter: false,
    })
  })

  return positions
}

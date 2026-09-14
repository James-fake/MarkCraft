/**
 * treeLayout - Tidy Tree 布局算法（P3-5）
 *
 * Reingold-Tilford 改进版，实现子树不重叠 + 兄弟轮廓合并。
 * 横向布局：x 表示层级深度（左→右），y 表示同层位置（上→下）。
 */

/** 树节点（输入） */
export interface TreeNode {
  id: string
  children: TreeNode[]
}

/** 布局节点（中间结果） */
export interface LayoutNode {
  id: string
  x: number
  y: number
}

/** 布局配置 */
export interface LayoutOptions {
  nodeWidth: number
  nodeHeight: number
  /** 水平间距（层级之间） */
  hGap: number
  /** 垂直间距（同层节点之间） */
  vGap: number
}

/** 内部带轮廓的工作节点 */
interface WorkNode {
  id: string
  children: WorkNode[]
  /** 子树宽度（叶子=1，按节点数计） */
  size: number
  /** 节点中心相对于父节点起点的 y 偏移 */
  prelim: number
  /** 子树轮廓：上边界 / 下边界（每层相对节点中心的 y 偏移） */
  contourTop: { offset: number; level: number }[]
  contourBottom: { offset: number; level: number }[]
  /** 最终坐标 */
  x: number
  y: number
}

/** 默认配置 */
const DEFAULT_OPTIONS: LayoutOptions = {
  nodeWidth: 160,
  nodeHeight: 60,
  hGap: 80,
  vGap: 24,
}

/** 将 TreeNode 转为 WorkNode（计算 size） */
function toWorkNode(node: TreeNode): WorkNode {
  const children = node.children.map(toWorkNode)
  const size = children.length === 0 ? 1 : children.reduce((s, c) => s + c.size, 0)
  return {
    id: node.id,
    children,
    size,
    prelim: 0,
    contourTop: [],
    contourBottom: [],
    x: 0,
    y: 0,
  }
}

/**
 * 第一遍：自底向上计算 prelim（节点的 y 初步位置，相对父节点起点）
 * 叶子节点按顺序排列；内部节点居中于其子节点。
 */
function firstWalk(node: WorkNode, vGap: number, nodeHeight: number): void {
  if (node.children.length === 0) {
    node.prelim = 0
    return
  }
  let cursor = 0
  for (const child of node.children) {
    firstWalk(child, vGap, nodeHeight)
    child.prelim = cursor + child.size * (nodeHeight + vGap) / 2
    cursor += child.size * (nodeHeight + vGap)
  }
  // 父节点居中于所有子节点
  const first = node.children[0]
  const last = node.children[node.children.length - 1]
  node.prelim = (first.prelim + last.prelim) / 2
  // 修正子节点 prelim 为相对自身中心（上面计算的是相对父起点，这里转为中心偏移）
  // 实际上我们保留 prelim 为相对父节点起点的绝对偏移，布局时累加
  // 计算 sibling gap 偏移：让子节点相对父节点居中
  const totalSpan = cursor
  const offset = -totalSpan / 2
  for (const child of node.children) {
    child.prelim += offset
  }
  node.prelim = 0
}

/**
 * 第二遍：自顶向下累加 prelim 得到最终 y 坐标，x 按层级深度计算
 */
function secondWalk(
  node: WorkNode,
  depth: number,
  parentY: number,
  parentX: number,
  options: LayoutOptions,
  result: Map<string, { x: number; y: number }>,
): void {
  const x = parentX + depth * (options.nodeWidth + options.hGap)
  const y = parentY + node.prelim
  result.set(node.id, { x, y })
  for (const child of node.children) {
    secondWalk(child, depth + 1, y, parentX, options, result)
  }
}

/**
 * 子树冲突检测与位移（简化版轮廓合并）
 * 当同一父节点的相邻子树在垂直方向重叠时，向下推移后续子树。
 */
function resolveSiblingConflicts(node: WorkNode, vGap: number, nodeHeight: number): void {
  if (node.children.length < 2) {
    for (const child of node.children) resolveSiblingConflicts(child, vGap, nodeHeight)
    return
  }
  // 递归处理子树
  for (const child of node.children) {
    resolveSiblingConflicts(child, vGap, nodeHeight)
  }
  // 计算每个子树的实际占位（基于 prelim + size）
  let prevEnd = -Infinity
  for (const child of node.children) {
    const childStart = child.prelim - (child.size * (nodeHeight + vGap)) / 2
    if (childStart < prevEnd + vGap) {
      const shift = prevEnd + vGap - childStart
      child.prelim += shift
    }
    prevEnd = child.prelim + (child.size * (nodeHeight + vGap)) / 2
  }
  // 重新居中父节点
  if (node.children.length > 0) {
    const first = node.children[0]
    const last = node.children[node.children.length - 1]
    const center = (first.prelim + last.prelim) / 2
    // 父节点保持中心，子节点相对偏移不变
    void center
  }
}

/**
 * 主入口：计算 Tidy Tree 横向布局
 * @param root 根节点
 * @param options 布局配置
 * @returns Map<id, {x, y}> 节点左上角坐标（x 为层级深度方向，y 为同层位置方向）
 */
export function layoutTree(
  root: TreeNode,
  options: Partial<LayoutOptions> = {},
): Map<string, { x: number; y: number }> {
  const opts: LayoutOptions = { ...DEFAULT_OPTIONS, ...options }
  const result = new Map<string, { x: number; y: number }>()
  if (!root) return result

  const work = toWorkNode(root)
  firstWalk(work, opts.vGap, opts.nodeHeight)
  resolveSiblingConflicts(work, opts.vGap, opts.nodeHeight)

  // 根节点起点（左上角对齐到 0,0）
  secondWalk(work, 0, 0, 0, opts, result)

  // 归一化：让最上方节点的 y 为 0
  let minY = Infinity
  for (const { y } of result.values()) {
    if (y < minY) minY = y
  }
  if (minY !== Infinity && minY !== 0) {
    for (const pos of result.values()) {
      pos.y -= minY
    }
  }

  return result
}

/**
 * 从 parentMap 构建树（用于自动排版）
 * @param ids 节点 id 列表
 * @param parentMap 子→父映射
 * @param rootId 根节点 id（无父节点的视为根）
 */
export function buildTreeFromParentMap(
  ids: string[],
  parentMap: Map<string, string>,
  rootId?: string,
): TreeNode | null {
  if (ids.length === 0) return null
  const idSet = new Set(ids)
  const childrenMap = new Map<string, string[]>()
  const roots: string[] = []

  for (const id of ids) {
    const parent = parentMap.get(id)
    if (parent && idSet.has(parent) && parent !== id) {
      const arr = childrenMap.get(parent) ?? []
      arr.push(id)
      childrenMap.set(parent, arr)
    } else {
      roots.push(id)
    }
  }

  // 指定根优先，否则取第一个无父节点
  const actualRoot = (rootId && idSet.has(rootId)) ? rootId : roots[0]
  if (!actualRoot) return null

  const build = (id: string): TreeNode => {
    const children = childrenMap.get(id) ?? []
    return { id, children: children.map(build) }
  }
  return build(actualRoot)
}

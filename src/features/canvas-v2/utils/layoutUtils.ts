/**
 * layoutUtils - 布局对齐/分布工具（P2-8）
 *
 * 提供 6 种对齐 + 2 种分布算法。
 */
import type { Editor, TLShape, TLShapeId } from '../engine/engineTypes'
import type { AlignType, DistributeType } from '../types'
import { layoutTree as tidyLayout, buildTreeFromParentMap } from './treeLayout'

/**
 * 对齐选中的形状
 * - left / right / center-h：水平对齐
 * - top / bottom / center-v：垂直对齐
 */
export function alignShapes(editor: Editor, ids: TLShapeId[], type: AlignType): void {
  const shapes = ids
    .map(id => editor.getShape(id))
    .filter((s): s is TLShape => s != null)
  if (shapes.length < 2) return

  const bounds = shapes
    .map(s => editor.getShapePageBounds(s.id))
    .filter((b): b is NonNullable<ReturnType<Editor['getShapePageBounds']>> => b != null)
  if (bounds.length < 2) return

  const updates = shapes.map((shape, i) => {
    const b = bounds[i]
    let x = shape.x
    let y = shape.y
    switch (type) {
      case 'left':
        x = shape.x + (Math.min(...bounds.map(bd => bd.minX)) - b.minX)
        break
      case 'right':
        x = shape.x + (Math.max(...bounds.map(bd => bd.maxX)) - b.maxX)
        break
      case 'center-h': {
        const minCenter = Math.min(...bounds.map(bd => bd.midX))
        x = shape.x + (minCenter - b.midX)
        break
      }
      case 'top':
        y = shape.y + (Math.min(...bounds.map(bd => bd.minY)) - b.minY)
        break
      case 'bottom':
        y = shape.y + (Math.max(...bounds.map(bd => bd.maxY)) - b.maxY)
        break
      case 'center-v': {
        const minCenter = Math.min(...bounds.map(bd => bd.midY))
        y = shape.y + (minCenter - b.midY)
        break
      }
    }
    return { id: shape.id, type: shape.type, x, y }
  })

  editor.updateShapes(updates)
}

/**
 * 分布选中的形状（需 ≥ 3 个）
 * - horizontal：水平等距分布
 * - vertical：垂直等距分布
 */
export function distributeShapes(editor: Editor, ids: TLShapeId[], type: DistributeType): void {
  const shapes = ids
    .map(id => editor.getShape(id))
    .filter((s): s is TLShape => s != null)
  if (shapes.length < 3) return

  const bounds = shapes
    .map(s => editor.getShapePageBounds(s.id))
    .filter((b): b is NonNullable<ReturnType<Editor['getShapePageBounds']>> => b != null)
  if (bounds.length < 3) return

  // 按位置排序
  const indexed = shapes.map((s, i) => ({ shape: s, bounds: bounds[i] }))
  if (type === 'horizontal') {
    indexed.sort((a, b) => a.bounds.midX - b.bounds.midX)
    const first = indexed[0]
    const last = indexed[indexed.length - 1]
    const totalGap = last.bounds.minX - first.bounds.maxX
    const gap = totalGap / (indexed.length - 1)
    let currentX = first.bounds.maxX
    const updates = []
    for (let i = 1; i < indexed.length - 1; i++) {
      const { shape, bounds: b } = indexed[i]
      const newX = currentX + gap
      const dx = newX - b.minX
      updates.push({ id: shape.id, type: shape.type, x: shape.x + dx, y: shape.y })
      currentX = newX + b.width
    }
    editor.updateShapes(updates)
  } else {
    indexed.sort((a, b) => a.bounds.midY - b.bounds.midY)
    const first = indexed[0]
    const last = indexed[indexed.length - 1]
    const totalGap = last.bounds.minY - first.bounds.maxY
    const gap = totalGap / (indexed.length - 1)
    let currentY = first.bounds.maxY
    const updates = []
    for (let i = 1; i < indexed.length - 1; i++) {
      const { shape, bounds: b } = indexed[i]
      const newY = currentY + gap
      const dy = newY - b.minY
      updates.push({ id: shape.id, type: shape.type, x: shape.x, y: shape.y + dy })
      currentY = newY + b.height
    }
    editor.updateShapes(updates)
  }
}

/**
 * 网格吸附：将坐标吸附到最近的网格点
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

// ─── P3-15：自动排版扩展 ───

/** 获取形状的宽高（兼容自定义卡片 shape） */
function getShapeSize(shape: TLShape): { w: number; h: number } {
  const props = (shape.props ?? {}) as Record<string, unknown>
  if (typeof props.w === 'number' && typeof props.h === 'number') {
    return { w: props.w, h: props.h }
  }
  return { w: 200, h: 120 }
}

/**
 * P3-15：树形布局
 * 基于 parentMap（子→父）构建树，使用 Tidy Tree 算法计算位置。
 * @param shapes 待布局的形状
 * @param parentMap 子→父 id 映射
 * @returns Map<shapeId, {x, y}> 形状左上角坐标
 */
export function layoutTree(
  shapes: TLShape[],
  parentMap: Map<string, string>,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (shapes.length === 0) return result

  // 取平均尺寸作为节点尺寸
  const sizes = shapes.map(getShapeSize)
  const avgW = Math.round(sizes.reduce((s, sz) => s + sz.w, 0) / sizes.length)
  const avgH = Math.round(sizes.reduce((s, sz) => s + sz.h, 0) / sizes.length)

  const ids = shapes.map(s => s.id)
  const rootId = shapes.find(s => !parentMap.has(s.id))?.id
  const tree = buildTreeFromParentMap(ids, parentMap, rootId)
  if (!tree) {
    // 退化为网格
    return layoutGrid(shapes, Math.ceil(Math.sqrt(shapes.length)), 40)
  }

  const positions = tidyLayout(tree, {
    nodeWidth: avgW,
    nodeHeight: avgH,
    hGap: 80,
    vGap: 32,
  })

  // 复制结果（归一化已在 tidyLayout 内完成）
  for (const [id, pos] of positions.entries()) {
    result.set(id, { x: pos.x, y: pos.y })
  }
  // 未在树中的孤立节点，排在底部
  let orphanY = 0
  for (const s of shapes) {
    if (!result.has(s.id)) {
      result.set(s.id, { x: 0, y: orphanY })
      orphanY += avgH + 32
    }
  }
  return result
}

/**
 * P3-15：网格布局
 * 按行排列，每行 cols 个，间距 gap
 */
export function layoutGrid(
  shapes: TLShape[],
  cols: number,
  gap: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (shapes.length === 0 || cols <= 0) return result

  let rowMaxH = 0
  let currentX = 0
  let currentY = 0

  shapes.forEach((shape, i) => {
    if (i > 0 && i % cols === 0) {
      // 换行
      currentX = 0
      currentY += rowMaxH + gap
      rowMaxH = 0
    }
    const { w, h } = getShapeSize(shape)
    result.set(shape.id, { x: currentX, y: currentY })
    currentX += w + gap
    if (h > rowMaxH) rowMaxH = h
  })
  return result
}

/**
 * P3-15：圆形布局
 * 形状均匀分布在以 center 为圆心、radius 为半径的圆周上
 */
export function layoutCircle(
  shapes: TLShape[],
  center: { x: number; y: number },
  radius: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (shapes.length === 0) return result
  if (shapes.length === 1) {
    const { w, h } = getShapeSize(shapes[0])
    result.set(shapes[0].id, { x: center.x - w / 2, y: center.y - h / 2 })
    return result
  }
  const angleStep = (Math.PI * 2) / shapes.length
  // 起始角度从顶部开始（-π/2）
  shapes.forEach((shape, i) => {
    const angle = -Math.PI / 2 + i * angleStep
    const { w, h } = getShapeSize(shape)
    result.set(shape.id, {
      x: center.x + Math.cos(angle) * radius - w / 2,
      y: center.y + Math.sin(angle) * radius - h / 2,
    })
  })
  return result
}

/**
 * P3-15：流程图分层布局（Sugiyama 风格简化版）
 * 按拓扑层级分层，同层节点水平排列。
 * @param shapes 节点
 * @param edges 边（source/target 为 shapeId）
 */
export function layoutFlow(
  shapes: TLShape[],
  edges: { source: string; target: string }[],
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (shapes.length === 0) return result

  const idSet = new Set<string>(shapes.map(s => String(s.id)))
  // 计算每个节点的层级（最长路径 from sources）
  const inDegree = new Map<string, number>()
  const outAdj = new Map<string, string[]>()
  for (const id of idSet) {
    inDegree.set(id, 0)
    outAdj.set(id, [])
  }
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      outAdj.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }
  }

  // BFS 分层：source 为第 0 层
  const layer = new Map<string, number>()
  const queue: string[] = []
  for (const id of idSet) {
    if ((inDegree.get(id) ?? 0) === 0) {
      layer.set(id, 0)
      queue.push(id)
    }
  }
  // 处理孤立/成环节点（无入边但未被覆盖）
  for (const id of idSet) {
    if (!layer.has(id)) {
      layer.set(id, 0)
      queue.push(id)
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!
    const curLayer = layer.get(cur) ?? 0
    for (const next of outAdj.get(cur) ?? []) {
      const nextLayer = curLayer + 1
      if ((layer.get(next) ?? -1) < nextLayer) {
        layer.set(next, nextLayer)
        queue.push(next)
      }
    }
  }

  // 按层分组
  const byLayer = new Map<number, string[]>()
  for (const [id, l] of layer.entries()) {
    const arr = byLayer.get(l) ?? []
    arr.push(id)
    byLayer.set(l, arr)
  }

  const maxLayer = Math.max(...Array.from(byLayer.keys()), 0)
  // 取平均尺寸
  const sizes = shapes.map(getShapeSize)
  const avgW = Math.round(sizes.reduce((s, sz) => s + sz.w, 0) / sizes.length)
  const avgH = Math.round(sizes.reduce((s, sz) => s + sz.h, 0) / sizes.length)
  const hGap = 80
  const vGap = 60

  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? []
    const totalW = ids.length * avgW + (ids.length - 1) * hGap
    let x = -totalW / 2
    const y = l * (avgH + vGap)
    for (const id of ids) {
      result.set(id, { x, y })
      x += avgW + hGap
    }
  }
  return result
}

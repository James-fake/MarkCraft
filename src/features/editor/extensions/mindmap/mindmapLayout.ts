import type { MindmapNode, MindmapNodeShape } from './MindmapParser'

export type LayoutDirection = 'radial' | 'right' | 'down'

export interface LayoutNode {
  id: string
  text: string
  shape: MindmapNodeShape
  x: number       // center x
  y: number       // center y
  width: number
  height: number
  depth: number
  parentId: string | null
}

const H_GAP = 130       // horizontal gap between depth levels
const V_GAP = 48        // vertical space per leaf node (right/radial)
const LEVEL_H = 70      // vertical gap between depth levels (down)
const LEAF_W = 120      // horizontal space per leaf node (down)
const MIN_W = 80
const NODE_H = 36
const CHAR_W = 11
const PADDING = 80

function measureWidth(text: string): number {
  return Math.max(MIN_W, text.length * CHAR_W + 20)
}

/** Count leaf nodes in a subtree */
function leafCount(node: MindmapNode): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((s, c) => s + leafCount(c), 0)
}

/**
 * Radial layout: root at center, children split left/right.
 * First half of children go right, second half go left (mirrored).
 */
function radialLayout(root: MindmapNode): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = []
  const rootW = measureWidth(root.text)
  const rootX = 0
  const rootY = 0

  nodes.push({
    id: root.id, text: root.text, shape: root.shape,
    x: rootX, y: rootY, width: rootW, height: NODE_H,
    depth: 0, parentId: null,
  })

  if (root.children.length === 0) {
    return { nodes, width: rootW + PADDING * 2, height: NODE_H + PADDING * 2 }
  }

  // Split children: first half goes right, second half goes left
  const mid = Math.ceil(root.children.length / 2)
  const rightChildren = root.children.slice(0, mid)
  const leftChildren = root.children.slice(mid)

  // Layout right side
  const rightLeaves = rightChildren.reduce((s, c) => s + leafCount(c), 0)
  const rightH = rightLeaves * V_GAP
  let cy = -rightH / 2
  for (const child of rightChildren) {
    const cl = leafCount(child)
    const ch = (cl / rightLeaves) * rightH
    layoutRight(child, rootX + rootW / 2 + H_GAP, cy, cy + ch, 1, root.id, nodes)
    cy += ch
  }

  // Layout left side (mirrored)
  const leftLeaves = leftChildren.reduce((s, c) => s + leafCount(c), 0)
  const leftH = leftLeaves * V_GAP
  cy = -leftH / 2
  for (const child of leftChildren) {
    const cl = leafCount(child)
    const ch = (cl / leftLeaves) * leftH
    layoutLeft(child, rootX - rootW / 2 - H_GAP, cy, cy + ch, 1, root.id, nodes)
    cy += ch
  }

  return normalize(nodes)
}

/** Layout subtree expanding to the right */
function layoutRight(node: MindmapNode, x: number, yStart: number, yEnd: number, depth: number, parentId: string, nodes: LayoutNode[]) {
  const w = measureWidth(node.text)
  const yCenter = (yStart + yEnd) / 2
  nodes.push({
    id: node.id, text: node.text, shape: node.shape,
    x: x + w / 2, y: yCenter, width: w, height: NODE_H,
    depth, parentId,
  })

  if (node.children.length === 0) return
  const childX = x + w + H_GAP
  const totalLeaves = leafCount(node)
  const totalH = yEnd - yStart
  let cy = yStart
  for (const child of node.children) {
    const cl = leafCount(child)
    const ch = (cl / totalLeaves) * totalH
    layoutRight(child, childX, cy, cy + ch, depth + 1, node.id, nodes)
    cy += ch
  }
}

/** Layout subtree expanding to the left (mirrored) */
function layoutLeft(node: MindmapNode, x: number, yStart: number, yEnd: number, depth: number, parentId: string, nodes: LayoutNode[]) {
  const w = measureWidth(node.text)
  const yCenter = (yStart + yEnd) / 2
  nodes.push({
    id: node.id, text: node.text, shape: node.shape,
    x: x - w / 2, y: yCenter, width: w, height: NODE_H,
    depth, parentId,
  })

  if (node.children.length === 0) return
  const childX = x - w - H_GAP
  const totalLeaves = leafCount(node)
  const totalH = yEnd - yStart
  let cy = yStart
  for (const child of node.children) {
    const cl = leafCount(child)
    const ch = (cl / totalLeaves) * totalH
    layoutLeft(child, childX, cy, cy + ch, depth + 1, node.id, nodes)
    cy += ch
  }
}

/**
 * Right layout: root at left, all children expand to the right.
 */
function rightLayout(root: MindmapNode): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = []
  const totalLeaves = leafCount(root)
  const totalH = totalLeaves * V_GAP

  function layout(node: MindmapNode, x: number, yStart: number, yEnd: number, depth: number, parentId: string | null) {
    const w = measureWidth(node.text)
    const yCenter = (yStart + yEnd) / 2
    nodes.push({
      id: node.id, text: node.text, shape: node.shape,
      x: x + w / 2, y: yCenter, width: w, height: NODE_H,
      depth, parentId,
    })
    if (node.children.length === 0) return
    const childX = x + w + H_GAP
    const tl = leafCount(node)
    const th = yEnd - yStart
    let cy = yStart
    for (const child of node.children) {
      const cl = leafCount(child)
      const ch = (cl / tl) * th
      layout(child, childX, cy, cy + ch, depth + 1, node.id)
      cy += ch
    }
  }

  layout(root, 0, 0, totalH, 0, null)
  return normalize(nodes)
}

/**
 * Down layout: root at top, children expand downward.
 */
function downLayout(root: MindmapNode): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = []
  const totalLeaves = leafCount(root)
  const totalW = totalLeaves * LEAF_W

  function layout(node: MindmapNode, y: number, xStart: number, xEnd: number, depth: number, parentId: string | null) {
    const w = measureWidth(node.text)
    const xCenter = (xStart + xEnd) / 2
    nodes.push({
      id: node.id, text: node.text, shape: node.shape,
      x: xCenter, y: y + NODE_H / 2, width: w, height: NODE_H,
      depth, parentId,
    })
    if (node.children.length === 0) return
    const childY = y + NODE_H + LEVEL_H
    const tl = leafCount(node)
    const tw = xEnd - xStart
    let cx = xStart
    for (const child of node.children) {
      const cl = leafCount(child)
      const cw = (cl / tl) * tw
      layout(child, childY, cx, cx + cw, depth + 1, node.id)
      cx += cw
    }
  }

  layout(root, 0, 0, totalW, 0, null)
  return normalize(nodes)
}

/** Normalize positions so all nodes have positive coordinates with padding */
function normalize(nodes: LayoutNode[]): { nodes: LayoutNode[]; width: number; height: number } {
  if (nodes.length === 0) return { nodes, width: PADDING * 2, height: PADDING * 2 }

  const minX = Math.min(...nodes.map(n => n.x - n.width / 2))
  const minY = Math.min(...nodes.map(n => n.y - n.height / 2))
  const offsetX = PADDING - minX
  const offsetY = PADDING - minY
  for (const n of nodes) {
    n.x += offsetX
    n.y += offsetY
  }

  const maxX = Math.max(...nodes.map(n => n.x + n.width / 2)) + PADDING
  const maxY = Math.max(...nodes.map(n => n.y + n.height / 2)) + PADDING

  return { nodes, width: maxX, height: maxY }
}

export function computeLayout(
  root: MindmapNode,
  direction: LayoutDirection = 'radial'
): { nodes: LayoutNode[]; width: number; height: number } {
  switch (direction) {
    case 'radial': return radialLayout(root)
    case 'right': return rightLayout(root)
    case 'down': return downLayout(root)
    default: return radialLayout(root)
  }
}

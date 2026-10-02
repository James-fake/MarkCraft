import { CARD_TYPES, genId, distToSegment, segmentIntersectsRect } from './engineUtils'
import { scheduleHistory } from './engineHistory'
import type { ExElementLike } from './engineTypes'
import type { CanvasEngine } from './CanvasEngine'

/**
 * CanvasEngine 橡皮擦方法组（P5-3 自类体拆出，实现逐字未动）。
 */

/**
 * 局部橡皮擦：擦除 from→to 线段「半径 capsule」范围内的内容。
 * - free-draw（画笔）笔画：仅剔除被擦到的点，存活点重新分段成多条子路径（局部擦除）。
 * - 其它图元（矩形/椭圆/箭头/文本等，非卡片代理）：与 capsule 相交则整元素删除。
 * - 卡片代理矩形不参与擦除（由卡片系统管理）。
 */
export function eraseSegment(e: CanvasEngine, from: { x: number; y: number }, to: { x: number; y: number }, radius: number): void {
  if (!e.api) return
  const els = e.api.getSceneElements() as ExElementLike[]
  if (!els.length) return
  const next: ExElementLike[] = []
  let changed = false

  for (const el of els) {
    if (!el || el.isDeleted) { next.push(el); continue }
    // 卡片代理矩形不擦
    if (el.customData?.cardType && CARD_TYPES.has(el.customData.cardType)) { next.push(el); continue }

    // 画笔笔画：局部剔除 + 重新分段
    if (el.type === 'freedraw') {
      const pts = (el.points as number[][]) || []
      if (pts.length < 2) { next.push(el); continue }
      const abs = pts.map((p: number[]) => ({ x: el.x + p[0], y: el.y + p[1] }))
      const erased = abs.map((pt: { x: number; y: number }) => distToSegment(pt, from, to) <= radius)
      const runs: number[][] = []
      let cur: number[] = []
      for (let j = 0; j < abs.length; j++) {
        if (erased[j]) { if (cur.length) { runs.push(cur); cur = [] } }
        else cur.push(j)
      }
      if (cur.length) runs.push(cur)
      // 完全未触碰：保持原样
      if (runs.length === 1 && runs[0].length === abs.length) { next.push(el); continue }
      changed = true
      for (let k = 0; k < runs.length; k++) {
        const run = runs[k]
        if (run.length < 2) continue // 残留 <2 点无法成笔，丢弃
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const j of run) {
          const pt = abs[j]
          if (pt.x < minX) minX = pt.x
          if (pt.y < minY) minY = pt.y
          if (pt.x > maxX) maxX = pt.x
          if (pt.y > maxY) maxY = pt.y
        }
        const newPoints = run.map((j: number) => {
          const op = pts[j]
          const np: number[] = [abs[j].x - minX, abs[j].y - minY]
          if (op.length > 2) np.push(op[2] as number)
          return np
        })
        next.push({
          ...el,
          id: k === 0 ? el.id : genId('fd'),
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
          points: newPoints,
          version: (el.version || 1) + 1,
          versionNonce: Math.floor(Math.random() * 2 ** 31),
          updated: Date.now(),
        })
      }
      continue
    }

    // 其它图元：胶囊与（按半径外扩的）包围盒相交则整删
    const minX = el.x ?? 0
    const minY = el.y ?? 0
    const maxX = minX + (el.width ?? 0)
    const maxY = minY + (el.height ?? 0)
    if (segmentIntersectsRect(from, to, minX - radius, minY - radius, maxX + radius, maxY + radius)) {
      changed = true
      continue // 不放入 next → 删除
    }
    next.push(el)
  }

  if (!changed) return
  // 经 updateScene 写回场景；标记 applyingRemote 跳过本次 onChange 的同步回写，避免重入
  e.applyingRemote = true
  try {
    e.api.updateScene({ elements: next })
    scheduleHistory(e)
  } finally {
    e.applyingRemote = false
  }
}

/**
 * 一键清除白板上所有「画笔笔迹」（free-draw 元素）。
 * 卡片代理矩形与其它矢量图元（矩形/椭圆/箭头/文本…）保留。
 */
export function clearBrushStrokes(e: CanvasEngine): void {
  if (!e.api) return
  const els = e.api.getSceneElements() as ExElementLike[]
  if (!els.length) return
  const next = els.filter((el) => {
    if (el.isDeleted) return true
    // 仅移除画笔笔迹，其余（含卡片代理矩形）全部保留
    return el.type !== 'freedraw'
  })
  if (next.length === els.length) return // 没有任何画笔笔迹，无需变更
  e.applyingRemote = true
  try {
    e.api.updateScene({ elements: next })
    scheduleHistory(e)
  } finally {
    e.applyingRemote = false
  }
}

import { describe, it, expect } from 'vitest'
import { simulateStep, MAX_STEP, type GNode } from './graph/graphModel'

/**
 * 双链图谱「节点拖拽」回归锁（2026-09-23 用户报障）
 *
 * 报障原话：「优化图谱功能的节点推拽，现在抓住阶段进行快速滑动，松手后，
 * 会有个别单独一个的节点飞的很远，而且要求优化阶段拖拽的性能，不够丝滑」。
 *
 * 归结为两个缺陷，本文件各锁一层（力模拟已抽成纯函数 simulateStep，可直接单测）：
 *  ① 斥力奇点：旧版 `if (d² < 1) d² = 1` 后仍按原始 dx/dy 归一化 ⇒ 两节点重合瞬间
 *     冲量上万倍，被撞到的节点直接「飞出去」。修法 = 距离取 max(d, MIN_SEP)（幅值有界）。
 *  ② 拖拽速度残留：旧版只跳过被拖拽节点的**位移积分**，它的速度仍在累积且不受阻尼 ⇒
 *     快速滑动松手时把累积速度一次性释放。修法 = 拖拽期把该节点速度恒置 0（钉住）。
 *
 * 断言纪律：每条都先给出「扫描面非空 / 确实发生了位移」的正向事实，避免「本来就没动」的假绿。
 */

function node(id: string, x: number, y: number, over: Partial<GNode> = {}): GNode {
  return {
    id,
    label: id,
    type: 'file',
    tags: [],
    x,
    y,
    vx: 0,
    vy: 0,
    tx: x,
    ty: y,
    inLinks: 0,
    outLinks: 0,
    deg: 0,
    hidden: false,
    ...over,
  }
}

const mapOf = (ns: GNode[]) => new Map(ns.map((n) => [n.id, n]))

const SIZE = { w: 1200, h: 800 }

describe('simulateStep · 节点拖拽（力模拟纯函数）', () => {
  it('① 斥力奇点已消除：两节点完全重合，单步后速度仍有界，且确实被拆开', () => {
    const a = node('a', 500, 400)
    const b = node('b', 500, 400) // 与 a 完全重合（旧版这里会算出上万倍冲量）
    const nodes = [a, b]

    simulateStep({
      nodes,
      edges: [],
      nodeById: mapOf(nodes),
      layout: 'force',
      size: SIZE,
      alpha: 1, // 最大能量：最容易暴露爆炸
      drag: null,
      dragWorld: null,
    })

    // 幅值有界（不变式）：任何节点单帧速度都不超过 MAX_STEP
    for (const n of [a, b]) {
      expect(Math.abs(n.vx)).toBeLessThanOrEqual(MAX_STEP)
      expect(Math.abs(n.vy)).toBeLessThanOrEqual(MAX_STEP)
    }
    // 正向事实：不是「零力死锁」——重合的两人确实被推开了
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0)
  })

  it('① 极端：三个近重合节点连续 30 步，全程速度与单帧位移都有界（不会有人被甩飞）', () => {
    const nodes = [node('a', 300, 300), node('b', 300, 300), node('c', 301, 300)]
    const m = mapOf(nodes)
    const seen = new Set<number>()

    for (let f = 0; f < 30; f++) {
      simulateStep({
        nodes,
        edges: [],
        nodeById: m,
        layout: 'force',
        size: SIZE,
        alpha: 1,
        drag: null,
        dragWorld: null,
      })
      for (const n of nodes) {
        expect(Math.abs(n.vx)).toBeLessThanOrEqual(MAX_STEP)
        expect(Math.abs(n.vy)).toBeLessThanOrEqual(MAX_STEP)
        seen.add(Math.round(n.x))
      }
    }
    // 正向事实：确实动过（否则「有界」是 trivial 的假绿）
    expect(seen.size).toBeGreaterThan(1)
  })

  it('② 拖拽钉住：快速滑动 20 帧，被拖拽节点速度恒为 0（不累积 ⇒ 松手不飞），位置严格跟随指针', () => {
    const a = node('a', 100, 100)
    const b = node('b', 105, 100) // 与 a 近重合，制造最大斥力（旧版会把它推进 a 的速度累积里）
    const nodes = [a, b]
    const m = mapOf(nodes)

    for (let f = 0; f < 20; f++) {
      simulateStep({
        nodes,
        edges: [],
        nodeById: m,
        layout: 'force',
        size: SIZE,
        alpha: 0.35, // 拖拽期的实际 alpha
        drag: { id: 'a', dx: 0, dy: 0 },
        // 每帧位移远超单帧上限，模拟「快速甩动」
        dragWorld: { x: 200 + f * 50, y: 300 + f * 30 },
      })
      // 核心不变式：拖拽中的节点速度恒 0（旧版此处会是非 0 的累积值）
      expect(a.vx).toBe(0)
      expect(a.vy).toBe(0)
    }

    // 位置严格等于最后一帧指针落点（offset 为 0）
    expect(a.x).toBe(200 + 19 * 50)
    expect(a.y).toBe(300 + 19 * 30)
  })

  it('② 甩动后松手：拖拽期零速度残留，松手后每帧位移都不超过单帧上限（不会延续甩动飞出）', () => {
    const a = node('a', 200, 200)
    const b = node('b', 205, 200)
    const nodes = [a, b]
    const m = mapOf(nodes)

    for (let f = 0; f < 15; f++) {
      simulateStep({
        nodes,
        edges: [],
        nodeById: m,
        layout: 'force',
        size: SIZE,
        alpha: 0.35,
        drag: { id: 'a', dx: 0, dy: 0 },
        dragWorld: { x: 200 + f * 60, y: 200 },
      })
    }
    // 拖拽期从未累积速度 ⇒ 松手瞬间速度为 0（旧版此处是累积出的大速度）
    expect(a.vx).toBe(0)
    expect(a.vy).toBe(0)

    const releaseX = a.x
    // 正向事实：确实被「甩」到了远处（不是没动的假绿）
    expect(releaseX).toBe(200 + 14 * 60)

    // 松手后连续 30 帧：逐帧位移有界（防飞出的核心不变式）
    for (let f = 0; f < 30; f++) {
      const px = a.x
      const py = a.y
      simulateStep({ nodes, edges: [], nodeById: m, layout: 'force', size: SIZE, alpha: 0.35, drag: null, dragWorld: null })
      expect(Math.abs(a.x - px)).toBeLessThanOrEqual(MAX_STEP)
      expect(Math.abs(a.y - py)).toBeLessThanOrEqual(MAX_STEP)
    }
    // 总漂移远小于一次甩动的跨度（≈840px），证明没有「松手后继续飞」
    expect(Math.abs(a.x - releaseX)).toBeLessThan(200)
  })

  it('非力导向布局：拖拽中的节点不被吸附回目标位，松手后才朝目标缓动', () => {
    const a = node('a', 100, 100, { tx: 800, ty: 600 })
    const nodes = [a]
    const m = mapOf(nodes)

    // 拖拽中：停在被指针钉住的位置，不向 tx/ty 移动
    simulateStep({
      nodes,
      edges: [],
      nodeById: m,
      layout: 'grid',
      size: SIZE,
      alpha: 1,
      drag: { id: 'a', dx: 0, dy: 0 },
      dragWorld: { x: 250, y: 250 },
    })
    expect(a.x).toBe(250)
    expect(a.y).toBe(250)

    // 松手：朝目标缓动，且返回「离目标位的最大曼哈顿距离」用于收敛判定
    const { maxTargetDelta } = simulateStep({
      nodes,
      edges: [],
      nodeById: m,
      layout: 'grid',
      size: SIZE,
      alpha: 1,
      drag: null,
      dragWorld: null,
    })
    expect(a.x).toBeGreaterThan(250)
    expect(maxTargetDelta).toBeGreaterThan(0)
  })
})

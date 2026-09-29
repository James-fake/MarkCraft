/**
 * useSwipeTabs 纯逻辑层契约测试
 *
 * 覆盖：方向判定 / 阈值边界 / 吸附与回弹 / 甩掷 / 边界不越界 / 单步约束 /
 *       wheel 节流与方向反转 / 横滚祖先探测
 *
 * 参数依据：.workbuddy/artifacts/DESIGNBRIEF-SWIPE-TABS-01.md §3.2
 */
import { describe, it, expect } from 'vitest'
import {
  DIRECTION_SLOP,
  SNAP_PERCENT,
  FLICK_SAMPLE_WINDOW,
  EDGE_RESISTANCE,
  OVERSCROLL_MAX,
  VISUAL_CLAMP,
  WHEEL_SNAP_THRESHOLD,
  WHEEL_COOLDOWN,
  WHEEL_IDLE_RESET,
  resolveAxis,
  applyEdgeResistance,
  mapTrackOffset,
  decideSnap,
  computeEndVelocity,
  toVisualOffset,
  createWheelState,
  stepWheel,
  isHorizontallyScrollable,
} from './swipeTabsCore'

/* ================================================================== *
 * resolveAxis · 方向判定
 * ================================================================== */

describe('resolveAxis · 方向判定', () => {
  it('x 模式：横移 30 竖移 2 → horizontal', () => {
    expect(resolveAxis(30, 2, 'x')).toBe('horizontal')
  })

  it('x 模式：竖移 30 横移 2 → vertical（放行原生滚动）', () => {
    expect(resolveAxis(2, 30, 'x')).toBe('vertical')
  })

  it('y 模式：竖移 30 横移 2 → vertical（白板左栏）', () => {
    expect(resolveAxis(2, 30, 'y')).toBe('vertical')
  })

  it('y 模式：横移 30 竖移 2 → horizontal（放行）', () => {
    expect(resolveAxis(30, 2, 'y')).toBe('horizontal')
  })

  it(`两轴均未超过 SLOP(${DIRECTION_SLOP}px) → undecided（不抢占点击）`, () => {
    expect(resolveAxis(5, 5, 'x')).toBe('undecided')
    expect(resolveAxis(0, 0, 'x')).toBe('undecided')
    expect(resolveAxis(-7, 7, 'x')).toBe('undecided')
  })

  it('刚好等于 SLOP → 仍 undecided（须严格大于）', () => {
    expect(resolveAxis(DIRECTION_SLOP, 0, 'x')).toBe('undecided')
  })

  it('斜向且未分出主次（1.2 倍以内）→ 保持 undecided', () => {
    // 20 / 18 = 1.11 < 1.2 → 不分主次
    expect(resolveAxis(20, 18, 'x')).toBe('undecided')
  })

  it('主轴刚过 1.2 倍 → 锁定', () => {
    // 25 / 20 = 1.25 > 1.2
    expect(resolveAxis(25, 20, 'x')).toBe('horizontal')
  })

  it('主轴为负值时同样按绝对值判定', () => {
    expect(resolveAxis(-30, 2, 'x')).toBe('horizontal')
  })
})

/* ================================================================== *
 * applyEdgeResistance · 边界阻尼
 * ================================================================== */

describe('applyEdgeResistance · 边界阻尼', () => {
  it('中间位置（非首末）→ 原样返回', () => {
    expect(applyEdgeResistance(-100, 1, 3, 800)).toBe(-100)
  })

  it('首 tab 继续左滑（上一个方向）→ 施加阻尼', () => {
    const out = applyEdgeResistance(-100, 0, 3, 800)
    expect(out).toBeCloseTo(-100 * EDGE_RESISTANCE)
  })

  it('首 tab 右滑（下一个方向）→ 不阻尼', () => {
    expect(applyEdgeResistance(100, 0, 3, 800)).toBe(100)
  })

  it('末 tab 继续右滑（下一个方向）→ 施加阻尼', () => {
    const out = applyEdgeResistance(100, 2, 3, 800)
    expect(out).toBeCloseTo(100 * EDGE_RESISTANCE)
  })

  it('末 tab 左滑（上一个方向）→ 不阻尼', () => {
    expect(applyEdgeResistance(-100, 2, 3, 800)).toBe(-100)
  })

  it('仅 1 个 tab → 两个方向都阻尼', () => {
    expect(applyEdgeResistance(100, 0, 1, 800)).toBeCloseTo(100 * EDGE_RESISTANCE)
    expect(applyEdgeResistance(-100, 0, 1, 800)).toBeCloseTo(-100 * EDGE_RESISTANCE)
  })
})

/* ================================================================== *
 * mapTrackOffset · 轨道连续性位移映射（需求 N 第六轮：连续滑动）
 * ================================================================== */

describe('mapTrackOffset · 落点在轨道内严格 1:1（可跨多格）', () => {
  // 三格轨道：中心 35 / 107 / 179（宽 70、间距 2）→ 首中心 35、末中心 179
  const MIN = 35
  const MAX = 179

  it('单格内 1:1（从**中间格**起手时两侧都还在轨道内）', () => {
    expect(mapTrackOffset(0, 107, MIN, MAX)).toBe(0)
    expect(mapTrackOffset(30, 107, MIN, MAX)).toBe(30)
    expect(mapTrackOffset(-30, 107, MIN, MAX)).toBe(-30)
  })

  it('**跨格仍严格 1:1** —— 这是"连续滑动"的全部意义（旧公式第二格起就几乎不动）', () => {
    // 从首格一路拖到末格中心：位移 144px，落点恰好 179
    expect(mapTrackOffset(144, 35, MIN, MAX)).toBe(144)
    // 途中任意位置都不得被打折
    expect(mapTrackOffset(100, 35, MIN, MAX)).toBe(100)
  })

  it('从中间格起手向两端都 1:1（不是"只有从第一格起手才能连着拖"）', () => {
    expect(mapTrackOffset(72, 107, MIN, MAX)).toBe(72)    // 到末中心
    expect(mapTrackOffset(-72, 107, MIN, MAX)).toBe(-72)  // 到首中心
  })

  it('恰好落在两端中心 → 仍算"在轨道内"（边界不外溢）', () => {
    expect(mapTrackOffset(MAX - 35, 35, MIN, MAX)).toBe(MAX - 35)
    expect(mapTrackOffset(MIN - 35, 35, MIN, MAX)).toBe(MIN - 35)
  })
})

describe('mapTrackOffset · 越界阻尼（橡胶 + 绝对上限）', () => {
  const MIN = 35
  const MAX = 179

  it('越界部分按 EDGE_RESISTANCE 衰减（未触顶时）', () => {
    // 首格往左拖 50 → 越界 50 × 0.28 = 14
    expect(mapTrackOffset(-50, 35, MIN, MAX)).toBeCloseTo(-50 * EDGE_RESISTANCE, 5)
  })

  it('**首格往左 / 末格往右立即算越界**（滑块不许滑到轨道外一格），阻尼而非 1:1', () => {
    // 旧公式以「一格槽距」为限幅 → 首格往左仍能 1:1 走一格（滑块跑到轨道外空白处）。
    // 连续滑动后判据是「落点是否在轨道内」，所以这里立刻阻尼。
    expect(mapTrackOffset(-30, 35, MIN, MAX)).toBeCloseTo(-30 * EDGE_RESISTANCE, 5)
    expect(mapTrackOffset(30, 179, MIN, MAX)).toBeCloseTo(30 * EDGE_RESISTANCE, 5)
  })

  it('越界增量**绝对封顶 OVERSCROLL_MAX** —— 不能用"到端点距离 × 比例"，中间起手会冲出轨道', () => {
    // 首格往左拖 150 → 未封顶时 42px > 28 → 封顶
    expect(mapTrackOffset(-150, 35, MIN, MAX)).toBeCloseTo(-OVERSCROLL_MAX, 5)
    // 末格往右拖 1000
    expect(mapTrackOffset(1000, 179, MIN, MAX)).toBeCloseTo(OVERSCROLL_MAX, 5)
  })

  it('中间格起手拖到端外：停在末中心 + 封顶增量（不会一路拖出轨道）', () => {
    // base 107 → 到末中心 72；越界部分封顶 28 → 100
    expect(mapTrackOffset(1000, 107, MIN, MAX)).toBeCloseTo(72 + OVERSCROLL_MAX, 5)
    expect(mapTrackOffset(-1000, 107, MIN, MAX)).toBeCloseTo(-72 - OVERSCROLL_MAX, 5)
  })

  it('只有一个 tab（min === max）→ 两侧都按越界处理，滑块只能晃出封顶量', () => {
    expect(mapTrackOffset(1000, 35, 35, 35)).toBeCloseTo(OVERSCROLL_MAX, 5)
    expect(mapTrackOffset(-1000, 35, 35, 35)).toBeCloseTo(-OVERSCROLL_MAX, 5)
  })
})

/* ================================================================== *
 * decideSnap · 吸附判定
 * ================================================================== */

describe('decideSnap · 吸附判定', () => {
  const base = { size: 800, index: 1, count: 5 }

  it('向右滑过 32%（下一个方向）→ 通过，目标 +1', () => {
    const r = decideSnap({ ...base, offset: 300, elapsed: 500 })
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(2)
  })

  it('位移不足 32% 且慢速（末段速度低）→ 回弹（不通过）', () => {
    // 慢速拖 200px / 500ms：全程均速 0.4px/ms，但末段已几乎停住 → 不甩掷
    const r = decideSnap({ ...base, offset: -200, elapsed: 500, endVelocity: 0.05 })
    expect(r.passed).toBe(false)
    expect(r.targetIndex).toBe(1)
  })

  it('⚠️ 回归护栏：慢速长拖若误用全程均速会被误判为甩掷', () => {
    // 200px / 500ms 的全程均速 = 0.4 > 0.3，若不传末段速度会误通过
    const naive = decideSnap({ ...base, offset: -200, elapsed: 500 })
    expect(naive.passed).toBe(true) // 说明「均速」路径确实会误判

    // 传入真实末段速度后正确回弹
    const fixed = decideSnap({ ...base, offset: -200, elapsed: 500, endVelocity: 0.05 })
    expect(fixed.passed).toBe(false)
  })

  it('刚好等于 32% → 不通过（须严格大于）', () => {
    const r = decideSnap({ ...base, offset: -800 * SNAP_PERCENT, elapsed: 1000 })
    expect(r.passed).toBe(false)
  })

  it('位移不足但快速甩掷 → 通过', () => {
    // 60px / 100ms = 0.6 px/ms > 0.3，且 60 > 20
    const r = decideSnap({ ...base, offset: 60, elapsed: 100 })
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(2)
  })

  it('速度快但位移过小（<20px）→ 不通过', () => {
    // 15px / 10ms = 1.5 px/ms 但位移不足
    const r = decideSnap({ ...base, offset: -15, elapsed: 10 })
    expect(r.passed).toBe(false)
  })

  it('速度刚好等于阈值 → 不通过（须严格大于）', () => {
    // 30px / 100ms = 0.3 px/ms
    const r = decideSnap({ ...base, offset: -30, elapsed: 100 })
    expect(r.passed).toBe(false)
  })

  it('单步约束：位移远超一屏 → 仍只移动 1 个', () => {
    const r = decideSnap({ ...base, offset: 1600, elapsed: 500 })
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(2)
  })

  it('向左滑 → 目标 index - 1（**方向与位移同号**，滑块跟手到哪就选中哪）', () => {
    const r = decideSnap({ ...base, offset: -300, elapsed: 500 })
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(0)
  })

  it('首 tab 继续向左滑（越界方向）→ 不通过', () => {
    const r = decideSnap({ ...base, index: 0, offset: -400, elapsed: 300 })
    expect(r.passed).toBe(false)
    expect(r.targetIndex).toBe(0)
  })

  it('末 tab 继续向右滑（越界方向）→ 不通过', () => {
    const r = decideSnap({ ...base, index: 4, offset: 400, elapsed: 300 })
    expect(r.passed).toBe(false)
    expect(r.targetIndex).toBe(4)
  })

  it('位移近似 0 → 不通过', () => {
    expect(decideSnap({ ...base, offset: 0.5, elapsed: 10 }).passed).toBe(false)
  })

  it('elapsed 为 0 时不产生 Infinity 误判', () => {
    const r = decideSnap({ ...base, offset: 10, elapsed: 0 })
    expect(r.passed).toBe(false)
  })
})

/* ================================================================== *
 * computeEndVelocity · 末段速度采样
 * ================================================================== */

describe('computeEndVelocity · 末段瞬时速度', () => {
  it('样本不足 2 个 → 0', () => {
    expect(computeEndVelocity([])).toBe(0)
    expect(computeEndVelocity([{ offset: 10, time: 0 }])).toBe(0)
  })

  it('匀速拖拽 → 速度等于均速', () => {
    // 每 20ms 移动 20px → 1.0 px/ms
    const samples = [
      { offset: 0, time: 0 },
      { offset: 20, time: 20 },
      { offset: 40, time: 40 },
      { offset: 60, time: 60 },
      { offset: 80, time: 80 },
    ]
    expect(computeEndVelocity(samples)).toBeCloseTo(1.0)
  })

  it('先快后慢（松手前已停住）→ 末段速度接近 0', () => {
    // 前 100ms 走了 200px，最后 80ms 只走 2px
    const samples = [
      { offset: 0, time: 0 },
      { offset: 100, time: 50 },
      { offset: 200, time: 100 },
      { offset: 201, time: 150 },
      { offset: 202, time: 180 },
    ]
    const v = computeEndVelocity(samples)
    // 末段窗口 ≈ [100,180]：位移 2 / 80ms = 0.025
    expect(Math.abs(v)).toBeLessThan(0.1)
  })

  it('先慢后快（甩掷）→ 末段速度显著大于均速', () => {
    const samples = [
      { offset: 0, time: 0 },
      { offset: 5, time: 100 },
      { offset: 10, time: 200 },
      { offset: 30, time: 250 },
      { offset: 60, time: 280 },
    ]
    const endV = computeEndVelocity(samples)
    const avg = 60 / 280
    expect(Math.abs(endV)).toBeGreaterThan(avg * 2)
  })

  it(`采样窗口为 ${FLICK_SAMPLE_WINDOW}ms：只看末段`, () => {
    // 长按 500ms 不动，最后 80ms 快速甩出 80px
    const samples = [
      { offset: 0, time: 0 },
      { offset: 0, time: 500 },
      { offset: 80, time: 580 },
    ]
    const v = computeEndVelocity(samples)
    // 末段窗口 ≈ [500,580]：80px / 80ms = 1.0
    expect(v).toBeCloseTo(1.0)
  })

  it('时间戳相同（dt=0）→ 0（不产生 Infinity）', () => {
    const samples = [
      { offset: 0, time: 100 },
      { offset: 50, time: 100 },
    ]
    expect(computeEndVelocity(samples)).toBe(0)
  })

  it('反向移动 → 速度为负', () => {
    const samples = [
      { offset: 0, time: 0 },
      { offset: -50, time: 50 },
      { offset: -100, time: 100 },
    ]
    expect(computeEndVelocity(samples)).toBeLessThan(0)
  })
})

/* ================================================================== *
 * toVisualOffset · 视觉位移钳制
 * ================================================================== */

describe('toVisualOffset · 视觉位移钳制', () => {
  it(`阈值内（≤${VISUAL_CLAMP}px）原样返回`, () => {
    expect(toVisualOffset(0)).toBe(0)
    expect(toVisualOffset(10)).toBe(10)
    expect(toVisualOffset(-10)).toBe(-10)
    expect(toVisualOffset(VISUAL_CLAMP)).toBe(VISUAL_CLAMP)
  })

  it('超出阈值 → 位移被明显压缩', () => {
    const raw = -400
    const vis = toVisualOffset(raw)
    expect(Math.abs(vis)).toBeLessThan(Math.abs(raw) / 5)
    expect(Math.sign(vis)).toBe(Math.sign(raw))
  })

  it('保号：正负方向不翻转', () => {
    expect(toVisualOffset(200)).toBeGreaterThan(0)
    expect(toVisualOffset(-200)).toBeLessThan(0)
  })

  it('单调递增：位移越大视觉位移越大（但不线性）', () => {
    const a = Math.abs(toVisualOffset(-100))
    const b = Math.abs(toVisualOffset(-500))
    expect(b).toBeGreaterThan(a)
  })

  it('有硬上限（不会无限增长）', () => {
    const huge = Math.abs(toVisualOffset(-100000))
    expect(huge).toBeLessThanOrEqual(VISUAL_CLAMP * 1.4 + 0.01)
  })

  it('关键约束：视觉位移始终小于内容区内边距 40px（首字不被裁）', () => {
    for (const raw of [-50, -100, -300, -800, -2000]) {
      expect(Math.abs(toVisualOffset(raw))).toBeLessThan(40)
    }
  })
})

/* ================================================================== *
 * stepWheel · 触控板累积 + 节流
 * ================================================================== */

describe('stepWheel · 触控板累积与节流', () => {
  it('累积不足阈值 → 不切换', () => {
    const s = createWheelState()
    const r = stepWheel({ state: s, delta: -30, now: 1000, index: 1, count: 5 })
    expect(r.targetIndex).toBeNull()
    expect(r.state.acc).toBe(-30)
  })

  it('累积超过 60（正向 = 下一个）→ 切到 +1', () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: 30, now: 1000, index: 1, count: 5 })
    r = stepWheel({ state: r.state, delta: 35, now: 1020, index: 1, count: 5 })
    expect(r.targetIndex).toBe(2)
  })

  it('累积超过 60（负向 = 上一个）→ 切到 -1', () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: -30, now: 1000, index: 2, count: 5 })
    r = stepWheel({ state: r.state, delta: -35, now: 1020, index: 2, count: 5 })
    expect(r.targetIndex).toBe(1)
  })

  it('冷却期内继续滚动 → 不再切换（一次扫动只切一次）', () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: 70, now: 1000, index: 1, count: 5 })
    expect(r.targetIndex).toBe(2)
    // 冷却期内再来一大波
    r = stepWheel({ state: r.state, delta: 200, now: 1000 + WHEEL_COOLDOWN - 50, index: 2, count: 5 })
    expect(r.targetIndex).toBeNull()
  })

  it('冷却结束后恢复响应', () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: 70, now: 1000, index: 1, count: 5 })
    expect(r.targetIndex).toBe(2)
    r = stepWheel({ state: r.state, delta: 70, now: 1000 + WHEEL_COOLDOWN + 10, index: 2, count: 5 })
    expect(r.targetIndex).toBe(3)
  })

  it('方向反转 → 清空累积量，不叠加', () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: -50, now: 1000, index: 1, count: 5 })
    expect(r.state.acc).toBe(-50)
    // 反向 +50：应清空后再累加 → 50，而非 0
    r = stepWheel({ state: r.state, delta: 50, now: 1020, index: 1, count: 5 })
    expect(r.state.acc).toBe(50)
    expect(r.targetIndex).toBeNull()
  })

  it(`静默超过 ${WHEEL_IDLE_RESET}ms → 重新起算`, () => {
    const s = createWheelState()
    let r = stepWheel({ state: s, delta: -50, now: 1000, index: 1, count: 5 })
    // 静默 200ms 后 +20：应清空 -50，acc = 20
    r = stepWheel({ state: r.state, delta: -20, now: 1200, index: 1, count: 5 })
    expect(r.state.acc).toBe(-20)
  })

  it('末 tab 继续下一个方向（向右/正）→ 切换取消且不进冷却', () => {
    const s = createWheelState()
    const r = stepWheel({ state: s, delta: 200, now: 1000, index: 4, count: 5 })
    expect(r.targetIndex).toBeNull()
    expect(r.state.cooldownUntil).toBe(0)
    expect(r.state.acc).toBe(0)
  })

  it('首 tab 继续上一个方向（向左/负）→ 切换取消', () => {
    const s = createWheelState()
    const r = stepWheel({ state: s, delta: -200, now: 1000, index: 0, count: 5 })
    expect(r.targetIndex).toBeNull()
  })

  it('阈值边界：刚好等于 WHEEL_SNAP_THRESHOLD → 不切换', () => {
    const s = createWheelState()
    const r = stepWheel({ state: s, delta: -WHEEL_SNAP_THRESHOLD, now: 1000, index: 1, count: 5 })
    expect(r.targetIndex).toBeNull()
  })
})

/* ================================================================== *
 * isHorizontallyScrollable · 横滚祖先探测
 * ================================================================== */

describe('isHorizontallyScrollable · 横滚容器探测', () => {
  it('无横滚余量 → false', () => {
    expect(
      isHorizontallyScrollable({
        scrollWidth: 300,
        clientWidth: 300,
        getComputedStyle: () => ({ overflowX: 'auto' }),
      }),
    ).toBe(false)
  })

  it('有余量且 overflow-x:auto → true（应让出手势）', () => {
    expect(
      isHorizontallyScrollable({
        scrollWidth: 600,
        clientWidth: 300,
        getComputedStyle: () => ({ overflowX: 'auto' }),
      }),
    ).toBe(true)
  })

  it('有余量且 overflow-x:scroll → true', () => {
    expect(
      isHorizontallyScrollable({
        scrollWidth: 600,
        clientWidth: 300,
        getComputedStyle: () => ({ overflowX: 'scroll' }),
      }),
    ).toBe(true)
  })

  it('有余量但 overflow-x:hidden → false（不可滚，手势仍可用）', () => {
    expect(
      isHorizontallyScrollable({
        scrollWidth: 600,
        clientWidth: 300,
        getComputedStyle: () => ({ overflowX: 'hidden' }),
      }),
    ).toBe(false)
  })

  it('余量在容差内（<=4px）→ false', () => {
    expect(
      isHorizontallyScrollable({
        scrollWidth: 304,
        clientWidth: 300,
        getComputedStyle: () => ({ overflowX: 'auto' }),
      }),
    ).toBe(false)
  })
})

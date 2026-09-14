/**
 * useSwipeTabs · 纯逻辑层
 *
 * 将「滑动切 Tab」的手势判定抽成不依赖 React / DOM 的纯函数，
 * 便于 vitest 直接单测（jsdom 不实现指针捕获重定向，真机交互走 CDP）。
 *
 * 参数依据见 .workbuddy/artifacts/DESIGNBRIEF-SWIPE-TABS-01.md §3.2
 */

/** 手势主轴：x = 横滑（设置/知识库/博客），y = 纵滑（白板左栏 tab 行） */
export type SwipeAxis = 'x' | 'y'

/* ------------------------------------------------------------------ *
 * 冻结参数（DesignBrief §3.2）
 * ------------------------------------------------------------------ */

/** 方向判定最小位移：低于此值保持 undecided（消除点击抖动） */
export const DIRECTION_SLOP = 8

/** 方向判定主副轴比：主轴须超过副轴的 1.2 倍才锁定 */
export const DIRECTION_RATIO = 1.2

/** 吸附位移阈值：超过容器宽/高的 32% 即视为通过 */
export const SNAP_PERCENT = 0.32

/** 甩掷最小速度（px/ms）：Hammer.js / RN 双源一致 */
export const FLICK_VELOCITY = 0.3

/** 甩掷最小位移（px）：即使速度快，也必须真的移动过（slip.js 阈值） */
export const FLICK_MIN_DISTANCE = 20

/**
 * 甩掷速度采样窗口（ms）。
 *
 * 关键：甩掷判定必须用**末段瞬时速度**，不能用全程平均速度。
 * 反例：慢速拖 200px 耗时 500ms → 全程均速 0.4px/ms > 0.3 会被误判为甩掷。
 * 正确做法是看松手前最后 ~80ms 的速度 —— 那才代表"甩"的意图。
 * 依据：slip.js 每 100ms 采样 previousPosition 计算速度窗口。
 */
export const FLICK_SAMPLE_WINDOW = 80

/** 边界阻尼系数：首/末 tab 越界时的位移衰减 */
export const EDGE_RESISTANCE = 0.28

/** 触控板 wheel 路径：累积 deltaX 触发阈值 */
export const WHEEL_SNAP_THRESHOLD = 60

/** wheel 节流冷却（ms）：一次扫动只允许切一次 */
export const WHEEL_COOLDOWN = 400

/** wheel 扫动结束判定（ms）：静默超过此值即清空累积量 */
export const WHEEL_IDLE_RESET = 120

/* ------------------------------------------------------------------ *
 * 方向判定
 * ------------------------------------------------------------------ */

export type AxisResolution = 'horizontal' | 'vertical' | 'undecided'

/**
 * 依据累计位移判定手势主轴。
 *
 * - 主轴位移 > SLOP 且 > 副轴 × RATIO → 锁定该轴
 * - 两轴都未超过 SLOP → undecided（继续观察）
 * - 副轴先越过 SLOP 且超过主轴 → 锁定另一轴（放弃手势）
 *
 * @param axis 配置的目标主轴（x 模式关心 horizontal，y 模式关心 vertical）
 */
export function resolveAxis(
  dx: number,
  dy: number,
  axis: SwipeAxis = 'x',
): AxisResolution {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  // 目标主轴方向
  const primaryMoved = axis === 'x' ? adx : ady
  const secondaryMoved = axis === 'x' ? ady : adx

  if (primaryMoved <= DIRECTION_SLOP && secondaryMoved <= DIRECTION_SLOP) {
    return 'undecided'
  }

  // 主轴明确领先
  if (primaryMoved > DIRECTION_SLOP && primaryMoved > secondaryMoved * DIRECTION_RATIO) {
    return axis === 'x' ? 'horizontal' : 'vertical'
  }

  // 副轴明确领先 → 交还原生滚动
  if (secondaryMoved > DIRECTION_SLOP && secondaryMoved > primaryMoved * DIRECTION_RATIO) {
    return axis === 'x' ? 'vertical' : 'horizontal'
  }

  // 斜向且未分出主次 → 保持观察（不抢占）
  return 'undecided'
}

/* ------------------------------------------------------------------ *
 * 边界阻尼
 * ------------------------------------------------------------------ */

/**
 * 首/末 tab 越界时施加橡胶阻尼。
 *
 * @param offset 原始位移（px，带符号）
 * @param index 当前索引
 * @param count 总数
 * @param size 容器尺寸（宽或高，px）
 * @param axis 手势主轴（决定符号语义：x 模式向左为负=下一个）
 */
export function applyEdgeResistance(
  offset: number,
  index: number,
  count: number,
  _size: number,
  _axis: SwipeAxis = 'x',
): number {
  if (count <= 1) return offset * EDGE_RESISTANCE

  // 「下一个」方向的符号：x 轴向左滑为负 → 下一个；y 轴向上滑为负 → 下一个
  const nextSign = -1
  const movingToNext = Math.sign(offset) === nextSign

  const atFirst = index <= 0
  const atLast = index >= count - 1

  // 在首 tab 却往「上一个」方向、在末 tab 却往「下一个」方向 → 越界
  const outOfRange = (!movingToNext && atFirst) || (movingToNext && atLast)

  return outOfRange ? offset * EDGE_RESISTANCE : offset
}

/* ------------------------------------------------------------------ *
 * 吸附判定
 * ------------------------------------------------------------------ */

export interface SnapDecisionInput {
  /** 松手时的位移（px，带符号，已含阻尼则传阻尼前原始值） */
  offset: number
  /** 手势耗时（ms） */
  elapsed: number
  /** 容器尺寸（宽或高，px） */
  size: number
  /** 当前索引 */
  index: number
  /** 总数 */
  count: number
  /**
   * 末段瞬时速度（px/ms，可选）。
   *
   * 由调用方按 FLICK_SAMPLE_WINDOW 采样最后若干 ms 的位移算出。
   * 未提供时退化为「全程平均速度」（但更易误判，见 FLICK_SAMPLE_WINDOW 注释）。
   */
  endVelocity?: number
}

export interface SnapDecision {
  /** 是否发生切换 */
  passed: boolean
  /** 目标索引（未切换时等于当前 index） */
  targetIndex: number
}

/**
 * 松手瞬间的吸附判定。
 *
 * 两条独立路径，满足任一即通过：
 *   A. 位移比例：|offset| > size × 0.32
 *   B. 甩掷：末段速度 > 0.3 px/ms 且 |offset| > 20px
 *
 * 一次手势最多移动 ±1 个 tab（单步约束）。
 */
export function decideSnap(input: SnapDecisionInput): SnapDecision {
  const { offset, elapsed, size, index, count, endVelocity } = input
  const stay: SnapDecision = { passed: false, targetIndex: index }

  const absOffset = Math.abs(offset)
  if (absOffset < 1) return stay

  // 越界方向直接不通过（阻尼已把位移压小，这里做语义护栏）
  const direction = Math.sign(offset)
  const nextSign = -1
  if (direction === nextSign && index >= count - 1) return stay
  if (direction !== nextSign && index <= 0) return stay

  // 优先用末段瞬时速度；未提供时才退化为全程均速
  const velocity = typeof endVelocity === 'number'
    ? Math.abs(endVelocity)
    : (elapsed > 0 ? absOffset / elapsed : 0)

  const byDistance = absOffset > size * SNAP_PERCENT
  const byFlick = velocity > FLICK_VELOCITY && absOffset > FLICK_MIN_DISTANCE

  if (!byDistance && !byFlick) return stay

  // 单步约束：只移动一个 tab
  const targetIndex = direction === nextSign
    ? Math.min(index + 1, count - 1)
    : Math.max(index - 1, 0)

  if (targetIndex === index) return stay

  return { passed: true, targetIndex }
}

/* ------------------------------------------------------------------ *
 * 末段速度采样器
 * ------------------------------------------------------------------ */

export interface VelocitySample {
  /** 采样时的位移（px） */
  offset: number
  /** 采样时间（ms） */
  time: number
}

/**
 * 从位移采样序列计算末段瞬时速度（px/ms）。
 *
 * 取「最后一个时间戳减去 SAMPLE_WINDOW 之前的位置」作为窗口，
 * 用窗口内位移 / 窗口时长。窗口内样本不足时回退到最早的样本。
 *
 * @param samples 按时间升序的采样序列
 * @returns 末段速度（px/ms，带符号）；样本不足 2 个时返回 0
 */
export function computeEndVelocity(samples: VelocitySample[]): number {
  if (samples.length < 2) return 0

  const last = samples[samples.length - 1]
  const cutoff = last.time - FLICK_SAMPLE_WINDOW

  // 找到窗口起点：第一个 time >= cutoff 的样本
  let startIdx = 0
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].time <= cutoff) {
      startIdx = i
      break
    }
  }

  const first = samples[startIdx]
  const dt = last.time - first.time
  if (dt <= 0) return 0

  return (last.offset - first.offset) / dt
}

/* ------------------------------------------------------------------ *
 * 视觉位移钳制
 * ------------------------------------------------------------------ */

/**
 * 视觉位移上限（px）。
 *
 * 桌面端翻页感主要来自「边缘压暗 + 顶栏指示器联动」，内容位移只作辅助暗示。
 * 位移过大反而会把行内文字推向/推出容器边缘（视觉上像"内容跑出去了"）。
 *
 * 取 18px：足够被感知为"在挪动"，又远小于 40px 内容内边距 → 首字永不贴边/被裁。
 * 判定仍用真实未钳制位移，不影响手感阈值。
 */
export const VISUAL_CLAMP = 18

/** 把真实手势位移映射到克制的视觉位移（保号、强递减增益） */
export function toVisualOffset(raw: number): number {
  const abs = Math.abs(raw)
  if (abs <= VISUAL_CLAMP) return raw
  // 超出部分按 1/14 增益继续增长，明确"拉不动"的阻力感
  const extra = (abs - VISUAL_CLAMP) / 14
  return Math.sign(raw) * Math.min(VISUAL_CLAMP + extra, VISUAL_CLAMP * 1.4)
}

/* ------------------------------------------------------------------ *
 * 触控板 wheel 累积器
 * ------------------------------------------------------------------ */

export interface WheelAccumulatorState {
  /** 累积位移 */
  acc: number
  /** 上次事件时间（ms） */
  lastTime: number
  /** 冷却截止时间（ms），期间不响应 */
  cooldownUntil: number
  /** 上次累积方向（+1 / -1 / 0），用于方向反转清空 */
  lastSign: number
}

export function createWheelState(): WheelAccumulatorState {
  return { acc: 0, lastTime: 0, cooldownUntil: 0, lastSign: 0 }
}

export interface WheelStepInput {
  state: WheelAccumulatorState
  /** 本次事件的 deltaX（x 轴模式用 deltaX；y 轴模式传 deltaY） */
  delta: number
  /** 当前时间（ms） */
  now: number
  /** 当前索引 */
  index: number
  /** 总数 */
  count: number
}

/**
 * 推进触控板 wheel 累积状态，返回是否应切换及目标索引。
 *
 * 规则：
 *   - 冷却期内忽略（一次扫动只切一次）
 *   - 静默超过 WHEEL_IDLE_RESET 重新起算
 *   - 方向反转立即清空累积
 *   - |acc| > WHEEL_SNAP_THRESHOLD 触发，并进入冷却
 */
export function stepWheel(input: WheelStepInput): { state: WheelAccumulatorState; targetIndex: number | null } {
  const { state, delta, now, index, count } = input

  // 冷却期：不改状态、不切换
  if (now < state.cooldownUntil) {
    return { state: { ...state, lastTime: now }, targetIndex: null }
  }

  // 静默过久 → 重新起算
  let acc = state.acc
  let lastSign = state.lastSign
  if (state.lastTime > 0 && now - state.lastTime > WHEEL_IDLE_RESET) {
    acc = 0
    lastSign = 0
  }

  const sign = Math.sign(delta)
  if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
    // 方向反转 → 清空
    acc = 0
  }

  acc += delta
  // 触控板「自然滚动」方向：双指左滑 deltaX 为负 → 下一个 tab
  const nextSign = -1
  const movingToNext = Math.sign(acc) === nextSign

  if (Math.abs(acc) <= WHEEL_SNAP_THRESHOLD) {
    return {
      state: { acc, lastTime: now, cooldownUntil: state.cooldownUntil, lastSign: sign },
      targetIndex: null,
    }
  }

  // 边界：无可去方向 → 清空累积但不切换、不进冷却
  const atFirst = index <= 0
  const atLast = index >= count - 1
  if ((movingToNext && atLast) || (!movingToNext && atFirst)) {
    return {
      state: { acc: 0, lastTime: now, cooldownUntil: state.cooldownUntil, lastSign: sign },
      targetIndex: null,
    }
  }

  const targetIndex = movingToNext
    ? Math.min(index + 1, count - 1)
    : Math.max(index - 1, 0)

  return {
    state: {
      acc: 0,
      lastTime: now,
      cooldownUntil: now + WHEEL_COOLDOWN,
      lastSign: 0,
    },
    targetIndex,
  }
}

/* ------------------------------------------------------------------ *
 * 横向滚动祖先探测（DesignBrief §3.3）
 * ------------------------------------------------------------------ */

/**
 * 判断元素自身是否是可横向滚动的容器（尚有滚动余量）。
 * 用于在 pointerdown 时决定是否让出，避免与内部横滚条冲突。
 */
export function isHorizontallyScrollable(el: {
  scrollWidth: number
  clientWidth: number
  getComputedStyle?: () => { overflowX: string }
}): boolean {
  if (el.scrollWidth <= el.clientWidth + 4) return false
  const style = el.getComputedStyle?.()
  if (!style) return true
  return style.overflowX === 'auto' || style.overflowX === 'scroll'
}

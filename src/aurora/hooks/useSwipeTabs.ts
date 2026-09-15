/**
 * useSwipeTabs · React 壳层
 *
 * 提供「跟手拖拽 + 松手吸附」的内容区滑动切 Tab 能力，
 * 同时支持触控板双指横滑（wheel deltaX）。
 *
 * 设计依据：.workbuddy/artifacts/DESIGNBRIEF-SWIPE-TABS-01.md
 *
 * ## 关键实现约束（对齐项目既有铁律）
 *
 * 1. **位移写入走 ref + 直接改 `style.transform`，不走 React state**
 *    —— 跟手期间每帧 setState 会引发 re-render 风暴，掉帧。
 * 2. **pointerup 落盘读 `offsetRef.current`，不读 state 闭包旧值**
 *    —— 项目已知坑：拖拽闭包陷阱（mouseup 监听是拖拽开始时注册的闭包）。
 * 3. **不使用 `setPointerCapture`**
 *    —— 项目铁律「指针捕获吞 click」：捕获到容器会让内部所有按钮 click 失效。
 *    改为在 `document` 上注册 `pointermove` / `pointerup`。
 * 4. **只处理主键**：`e.button !== 0` 直接返回。
 * 5. **touch-action 由 CSS 控制**：x 轴模式设 `pan-y`，y 轴模式设 `pan-x`，
 *    让浏览器代管正交轴滚动，避免 `preventDefault` 全禁导致内容滚不动。
 *
 * ## 用法
 *
 * ```tsx
 * const swipe = useSwipeTabs({
 *   index: idx,
 *   count: TABS.length,
 *   onIndexChange: (next) => setTab(TABS[next].id),
 * })
 * return (
 *   <div className="aurora-x__content" {...swipe.bind} data-swiping={swipe.dragging || undefined}>
 *     {children}
 *   </div>
 * )
 * ```
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  DIRECTION_SLOP,
  FLICK_SAMPLE_WINDOW,
  applyEdgeResistance,
  computeEndVelocity,
  createWheelState,
  decideSnap,
  isHorizontallyScrollable,
  resolveAxis,
  stepWheel,
  toVisualOffset,
  type SwipeAxis,
  type VelocitySample,
} from './swipeTabsCore'

export type { SwipeAxis }

export interface UseSwipeTabsOptions {
  /** 当前索引（受控，与面板 tab 状态单一数据源） */
  index: number
  /** 总数 */
  count: number
  /** 切换回调（面板自己 setState） */
  onIndexChange: (next: number) => void
  /** 手势主轴：x = 横滑（设置/知识库/博客），y = 纵滑（白板左栏 tab 行） */
  axis?: SwipeAxis
  /** 是否启用 */
  enabled?: boolean
  /** 是否启用触控板 wheel 路径（默认 true） */
  wheel?: boolean
  /**
   * 拖拽中的位移回调（px，已含边界阻尼）。
   * 用于外部（如顶栏 tab 指示器）按位移比例做联动插值。
   * 注意：此回调在每帧触发，内部实现必须避免 setState / 重活。
   */
  onOffsetChange?: (offset: number) => void
  /**
   * 吸附阶段结束后的回调（动画完成或立即）。
   * 用于清理指示器内联样式等。
   */
  onSettle?: (targetIndex: number) => void
  /**
   * 位移应用的目标元素（可选）。
   *
   * 未提供时位移写在绑定容器自身；提供时写在指定元素上。
   * 用途：绑定容器带 padding（如设置页 `padding: 32px 40px`）时，
   * 若直接位移容器会把 padding 一起推走导致内容从边缘漏出，
   * 此时应把位移落到**内层无 padding 的包裹层**。
   */
  targetRef?: React.RefObject<HTMLElement>
  /**
   * 吸附判定基准元素（可选）。
   *
   * 手势可能从窄小的 tab 栏起手（如设置页 nav-tabs 宽 676px，
   * 而内容区宽 1350px）。32% 吸附阈值必须恒定按**内容区**算，
   * 否则从 tab 栏起手时「划 216px」就被判翻页，手感过灵。
   */
  measureRef?: React.RefObject<HTMLElement>
  /**
   * 覆盖「视觉位移映射」函数（可选，默认 `toVisualOffset`：钳制 18px）。
   *
   * 用途：tab 轨道跟手模式需要位移与手指 1:1（限幅到「一个槽距」），
   * 而不是内容层那种克制到 18px 的微位移。
   */
  visualMapper?: (raw: number) => number
  /**
   * 覆盖「位移比例」吸附阈值（px）。
   *
   * 默认按 measure 尺寸 × 32% 算（内容区 1358px → 需拖 435px，鼠标慢拖几乎够不到）。
   * tab 轨道跟手模式传「半个槽距」→「拖过一半就切」，与视觉位移一致。
   * 传函数则每次松手惰性取值（几何可能在拖动中被重新量取）。
   */
  snapThresholdPx?: number | (() => number)
}

export interface UseSwipeTabsResult {
  /** 展开到内容区容器上 */
  bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onWheel: (e: React.WheelEvent) => void
  }
  /**
   * 生成一组可挂到**任意元素**上的手势绑定。
   *
   * 用途：同一面板里「tab 栏」与「内容区」是两棵并列的 DOM 子树，
   * 用户可能在任一处起手滑动 —— 需要把同一套手势同时挂到两处。
   * 多份绑定共享同一 `gestureRef` / `offsetRef`，因此不会互相干扰
   * （pointerup 一旦结束，activeRef 复位，另一处不会接着跑）。
   */
  makeBind: () => {
    onPointerDown: (e: React.PointerEvent) => void
    onWheel: (e: React.WheelEvent) => void
    onClickCapture: (e: React.MouseEvent) => void
  }
  /** 是否正在跟手（供 CSS 加类名降级） */
  dragging: boolean
}

/** 拖拽中给容器加的类名（CSS 同批交付） */
export const SWIPING_CLASS = 'is-swiping'

export function useSwipeTabs(options: UseSwipeTabsOptions): UseSwipeTabsResult {
  const {
    index,
    count,
    onIndexChange,
    axis = 'x',
    enabled = true,
    wheel = true,
    onOffsetChange,
    onSettle,
    targetRef,
    measureRef,
    visualMapper,
    snapThresholdPx,
  } = options

  const [dragging, setDragging] = useState(false)

  /** 实时位移（px）。跟手期间只改这个 ref + 直写 style，不触发 re-render。 */
  const offsetRef = useRef(0)
  /** 手势进行中标志（同步判定，不依赖 state） */
  const activeRef = useRef(false)

  /** 最新 props 快照，供 document 监听器（闭包）读取，避免闭包陷阱 */
  const latestRef = useRef({ index, count, onIndexChange, axis, onOffsetChange, onSettle, targetRef, measureRef, visualMapper, snapThresholdPx })
  latestRef.current = { index, count, onIndexChange, axis, onOffsetChange, onSettle, targetRef, measureRef, visualMapper, snapThresholdPx }

  /** 手势元数据 */
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    axisLocked: 'undecided' as 'horizontal' | 'vertical' | 'undecided',
    samples: [] as VelocitySample[],
    /** 事件绑定容器（用于取尺寸 / 探测滚祖先） */
    container: null as HTMLElement | null,
    /** 衡量容器（取 clientWidth/Height 做吸附判定的基准） */
    measure: null as HTMLElement | null,
    /** 位移应用目标（默认与 measure 相同） */
    target: null as HTMLElement | null,
  })

  /** 触控板累积状态 */
  const wheelStateRef = useRef(createWheelState())

  /**
   * 刚发生过位移型手势的标记。
   *
   * 手势挂在 tab 栏容器上（子节点是 tab `<button>`），松手后浏览器仍会
   * 在按钮上派发一次 click → 会把刚滑到的 tab 又点回去。此标记让
   * `onClickCapture` 捕获阶段吃掉那一次 click。
   */
  const suppressClickRef = useRef(false)

  /** 位移应用目标元素（优先 targetRef，否则退回 measure） */
  const applyTarget = useCallback((): HTMLElement | null => {
    return latestRef.current.targetRef?.current ?? gestureRef.current.measure
  }, [])

  /* ---------------------------------------------------------------- *
   * 位移落盘：写 ref + 直写 style + 通知外部
   * ---------------------------------------------------------------- */
  const applyOffset = useCallback((px: number) => {
    offsetRef.current = px
    const el = applyTarget()
    if (el) {
      // 视觉位移钳制：判定用真实位移（px），渲染用克制后的位移
      // （tab 轨道跟手模式由 visualMapper 覆盖：1:1 跟手，限幅到一个槽距）
      const visual = latestRef.current.visualMapper
        ? latestRef.current.visualMapper(px)
        : toVisualOffset(px)
      const t = latestRef.current.axis === 'x'
        ? `translate3d(${visual}px, 0, 0)`
        : `translate3d(0, ${visual}px, 0)`
      el.style.transform = t
    }
    latestRef.current.onOffsetChange?.(px)
  }, [applyTarget])

  /** 清空内联位移（吸附动画交给 CSS 过渡） */
  const clearOffset = useCallback(() => {
    offsetRef.current = 0
    const el = applyTarget()
    if (el) {
      el.style.transform = ''
      el.style.transition = ''
    }
    latestRef.current.onOffsetChange?.(0)
  }, [applyTarget])

  /* ---------------------------------------------------------------- *
   * 指针路径
   * ---------------------------------------------------------------- */

  /** 沿 target 向上探测可横向滚动的祖先 → 命中则让出手势 */
  const hasScrollableAncestor = useCallback((target: EventTarget | null): boolean => {
    if (latestRef.current.axis !== 'x') return false
    let el = target as HTMLElement | null
    const stop = gestureRef.current.container
    while (el && el !== stop && el.parentElement) {
      if (isHorizontallyScrollable({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        getComputedStyle: () => {
          const cs = window.getComputedStyle(el as HTMLElement)
          return { overflowX: cs.overflowX }
        },
      })) {
        return true
      }
      el = el.parentElement
    }
    return false
  }, [])

  const endGesture = useCallback((commit: boolean) => {
    if (!activeRef.current) return
    activeRef.current = false

    const { samples, startTime, measure } = gestureRef.current
    const offset = offsetRef.current
    const elapsed = performance.now() - startTime
    const endVelocity = computeEndVelocity(samples)

    const next = latestRef.current

    // 吸附：清掉内联 displacement，交回 CSS（过渡由 is-swiping 类移除后生效）
    if (commit) {
      clearOffset()
    } else {
      // 快捷路径：直接回弹
      clearOffset()
      next.onSettle?.(next.index)
      setDragging(false)
      return
    }

    // 边界判定基准 = 内容区可视尺寸
    const size = next.axis === 'x'
      ? (measure?.clientWidth ?? window.innerWidth)
      : (measure?.clientHeight ?? window.innerHeight)

    // 位移比例阈值：默认 size × 32%；tab 轨道跟手模式惰性取「半个槽距」
    const thresholdPx = typeof next.snapThresholdPx === 'function'
      ? next.snapThresholdPx()
      : next.snapThresholdPx

    const decision = decideSnap({
      offset,
      elapsed,
      size,
      index: next.index,
      count: next.count,
      endVelocity,
      thresholdPx,
    })

    // 发生过真实位移型手势 → 吃掉随后由同一按键序列派发的 click，
    // 否则 tab 按钮的 onClick 会把刚滑到的 tab 又拉回去。
    if (Math.abs(offset) > DIRECTION_SLOP) {
      suppressClickRef.current = true
    }

    if (decision.passed && decision.targetIndex !== next.index) {
      next.onIndexChange(decision.targetIndex)
    }
    next.onSettle?.(decision.targetIndex)
    setDragging(false)
  }, [clearOffset])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return
    if (e.button !== 0) return // 只处理主键
    if (activeRef.current) return

    // 命中横滚祖先 → 让出（保护内部横滚条）
    if (hasScrollableAncestor(e.target)) return

    const el = e.currentTarget as HTMLElement
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      axisLocked: 'undecided',
      samples: [{ offset: 0, time: 0 }],
      container: el,
      // 吸附判定基准始终用**内容区**尺寸：手势可能从窄 tab 栏起手，
      // 若用 tab 栏宽度做 32% 阈值会把"轻微一划"误判为翻页。
      measure: latestRef.current.measureRef?.current ?? el,
      target: latestRef.current.targetRef?.current ?? el,
    }
    // 先不置 active，等方向判定明确后再抢占
  }, [enabled, hasScrollableAncestor])

  // document 级监听（拖拽开始时注册 / 结束时移除）
  useEffect(() => {
    if (!enabled) return

    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g.container) return

      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY

      // 方向还未锁定 → 判定
      if (g.axisLocked === 'undecided') {
        const res = resolveAxis(dx, dy, latestRef.current.axis)
        if (res === 'undecided') {
          // 仍在观察期：记录采样但不动
          if (Math.abs(dx) > DIRECTION_SLOP || Math.abs(dy) > DIRECTION_SLOP) {
            g.samples.push({ offset: 0, time: performance.now() - g.startTime })
          }
          return
        }
        if (res !== (latestRef.current.axis === 'x' ? 'horizontal' : 'vertical')) {
          // 副轴方向 → 放弃本次手势（放行原生滚动）
          gestureRef.current.container = null
          return
        }
        // 锁定主轴 → 正式启动
        g.axisLocked = res
        activeRef.current = true
        setDragging(true)
        // 跟手期间必须零过渡；同时把起点对齐到按下位置，避免抖动
        const t = applyTarget()
        if (t) t.style.transition = 'none'
        g.startTime = performance.now()
        g.samples = [{ offset: 0, time: 0 }]
      }

      if (!activeRef.current) return

      const raw = latestRef.current.axis === 'x' ? dx : dy
      const measureEl = g.measure
      const damped = applyEdgeResistance(
        raw,
        latestRef.current.index,
        latestRef.current.count,
        latestRef.current.axis === 'x' ? (measureEl?.clientWidth ?? 0) : (measureEl?.clientHeight ?? 0),
        latestRef.current.axis,
      )

      applyOffset(damped)

      const now = performance.now() - g.startTime
      g.samples.push({ offset: damped, time: now })
      // 只保留末段窗口所需样本，避免长手势无限增长
      if (g.samples.length > 20) {
        const cutoff = now - FLICK_SAMPLE_WINDOW * 2
        g.samples = g.samples.filter((s, i) => i === 0 || s.time >= cutoff)
      }
    }

    const onUp = () => {
      endGesture(true)
    }

    const onCancel = () => {
      endGesture(false)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [enabled, applyOffset, endGesture])

  /* ---------------------------------------------------------------- *
   * 触控板 wheel 路径
   * ---------------------------------------------------------------- */
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!enabled || !wheel) return
    if (activeRef.current) return // 指针拖拽中，wheel 不参与

    const delta = axis === 'x' ? e.deltaX : e.deltaY
    if (delta === 0) return

    // 只有明确横向的触控板手势才消费（避免普通纵向滚动误触）
    if (axis === 'x' && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

    const now = performance.now()
    const result = stepWheel({
      state: wheelStateRef.current,
      delta,
      now,
      index,
      count,
    })
    wheelStateRef.current = result.state

    if (result.targetIndex != null && result.targetIndex !== index) {
      onIndexChange(result.targetIndex)
      // 消费了本次 deltaX → 阻止触控板后撤导航 / 页面横滚
      e.preventDefault()
    }
  }, [enabled, wheel, axis, index, count, onIndexChange])

  /* ---------------------------------------------------------------- *
   * 卸载清理
   * ---------------------------------------------------------------- */
  useEffect(() => () => {
    const el = applyTarget()
    if (el) {
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [applyTarget])

  /* ---------------------------------------------------------------- *
   * 多点位绑定工厂
   * ---------------------------------------------------------------- */
  const makeBind = useCallback((): {
    onPointerDown: (e: React.PointerEvent) => void
    onWheel: (e: React.WheelEvent) => void
    onClickCapture: (e: React.MouseEvent) => void
  } => ({
    onPointerDown,
    onWheel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }), [onPointerDown, onWheel])

  return {
    bind: { onPointerDown, onWheel },
    makeBind,
    dragging,
  }
}

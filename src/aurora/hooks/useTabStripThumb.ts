/**
 * useTabStripThumb · 「分段控件滑块」React 壳
 * ---------------------------------------------------------------------------
 * 把 `createTabStripThumb`（纯逻辑）与 `useSwipeTabs`（手势）接成一条线，
 * 面板侧只需一行接入（见文件底部用法），四条 tab 栏共用同一套行为。
 *
 * 为什么单独有这一层：滑块要同时在三个时机落位 ——
 *   ① 选中项变化（点击 / 外部跳转 / 松手切换）→ 带过渡滑过去；
 *   ② 松手（不论是否切换）→ 带过渡吸附到目标 tab；
 *   ③ 首帧与尺寸变化（窗口 resize / 文案变宽 / 字体加载）→ **瞬时**落位（不能动画）。
 * 时机③尤其重要：漏了它滑块会从 x=0 滑进来，像"加载时飘一下"。
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import type React from 'react'
import { createTabStripThumb } from './tabStripSwipe'
import { useSwipeTabs, type SwipeAxis } from './useSwipeTabs'

export interface UseTabStripThumbOptions {
  /** 当前索引（受控，与面板 tab 状态单一数据源） */
  index: number
  /** 总数 */
  count: number
  /** 切换回调 */
  onIndexChange: (next: number) => void
  /** 是否启用手势（默认 true） */
  enabled?: boolean
  /** 手势主轴（默认 x） */
  axis?: SwipeAxis
  /** tab 选择器（默认 [role="tab"]） */
  tabSelector?: string
  /** 兜底槽距（px，量不到几何时用） */
  fallbackSlot?: number
}

export interface UseTabStripThumbResult {
  /** 挂到轨道元素（滑块与 tab 的共同父级，需 position: relative） */
  trackRef: React.RefObject<HTMLDivElement>
  /** 挂到滑块元素 */
  thumbRef: React.RefObject<HTMLSpanElement>
  /** 展开到 tab 栏容器：含 onClickCapture（吃掉横滑松手后误触的那次 click） */
  bind: {
    onPointerDown: (e: React.PointerEvent) => void
    onWheel: (e: React.WheelEvent) => void
    onClickCapture: (e: React.MouseEvent) => void
  }
  /** 是否正在跟手（供 CSS 加 data-swiping） */
  dragging: boolean
}

export function useTabStripThumb(options: UseTabStripThumbOptions): UseTabStripThumbResult {
  const { index, count, onIndexChange, enabled, axis, tabSelector, fallbackSlot } = options

  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  /** 惰性索引：handleOffset 首次位移时读的是**手势起点**的 index */
  const indexRef = useRef(index)
  indexRef.current = index

  const motion = useMemo(
    () => createTabStripThumb({
      trackRef,
      thumbRef,
      getIndex: () => indexRef.current,
      tabSelector,
      fallbackSlot,
    }),
    [tabSelector, fallbackSlot],
  )

  const swipe = useSwipeTabs({
    index,
    count,
    onIndexChange,
    axis,
    enabled,
    // 手动位移模式：滑块位置 = 基准 + 手势位移，必须在同一个 transform 里合成
    manualOffset: true,
    onOffsetChange: motion.handleOffset,
    // 松手统一在此落位（含"没切"的情况 → 滑回原 tab）
    onSettle: (target) => motion.place(target, true),
    snapThresholdPx: motion.snapThresholdPx,
  })

  /** 时机①：选中项变化 → 带过渡落位；首帧瞬时（否则从 x=0 飘进来） */
  const placedRef = useRef(false)
  useLayoutEffect(() => {
    motion.place(index, placedRef.current)
    placedRef.current = true
  }, [index, motion])

  /** 时机③：尺寸变化 → 瞬时重新落位（tab 增删 / 换组 / 窗口 resize / 字体加载） */
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => motion.place(indexRef.current, false))
    ro.observe(track)
    for (const el of track.querySelectorAll('[role="tab"]')) ro.observe(el)
    return () => ro.disconnect()
  }, [motion])

  const bind = useMemo(() => swipe.makeBind(), [swipe])

  return { trackRef, thumbRef, bind, dragging: swipe.dragging }
}

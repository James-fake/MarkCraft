/**
 * tabStripSwipe · 「整排 tab 跟手滑动」共享层
 * ---------------------------------------------------------------------------
 * 需求 N 第三轮（用户原话）：
 *   「在 tab 栏本身内横滑的效果还是没有显示出来，我要的效果鼠标按住 tab 方框
 *     左或右可以滑动」
 *
 * 第二轮已经把**手势**挂到 tab 栏上（能识别），但视觉上等于没动 ——
 * 2026-09-15 CDP 实测（`probe-swipe-drag-amplitude.mjs`）：
 *
 * | 拖动 | 手势 | 内容层位移 | tab 方块位移 | 松手 |
 * |------|------|-----------|-------------|------|
 * | 按住方块慢拖 150px | ✅ 识别 | 25.2px | **0.7px** | ❌ 不切换 |
 * | 快速甩 150px       | ✅ 识别 | 25.2px | **0.7px** | ❌ 不切换 |
 * | 大幅拖 420px       | ✅ 识别 | 25.2px | **2.0px** | ❌ 不切换 |
 *
 * 两个坏点：
 *   1. 「方块位移 = `--swipe-progress` × 6px」，而 progress = offset / 内容区宽(1358px)
 *      → 拖 150px 只有 0.11 × 6px = 0.7px，**人眼判定为完全没动**；
 *   2. 松手阈值 = 内容区宽 × 32% = **435px**，鼠标慢拖根本够不到。
 *
 * 本层把「按住的那个方块自己也跟着走」做成主反馈，并让阈值与视觉一致：
 *   - **整排跟手位移 = 1:1**，限幅到「一个槽距」（相邻 tab 中心距），越界橡胶；
 *   - **松手阈值 = 半个槽距** →「拖过一半就切」，与看得见的位移一致；
 *   - **进度归一化按槽距**（而非内容区宽）→ 边缘压暗真正可见（原来最多 0.3 不透明度）。
 *
 * 为什么必须限幅：桌面端不预渲染相邻页，无限平移会让整排 tab 出框漏白。
 * 为什么用**平均**槽距：逐对相邻距会让限幅随方向反转跳变（方块 70/82px 不等），
 * 平均槽距与方向无关，拖动中途反向不会突跳。
 */
import type React from 'react'
import { averageSlot, mapStripOffset, toVisualOffset } from './swipeTabsCore'

/**
 * 内容层跟手位移上限（px）。
 *
 * 必须远小于内容区左右内边距（设置页 40px），否则首字会被推到贴边/裁切。
 * 取 22：越界阻尼后硬顶 22 × 1.4 = 30.8px，仍留 9px 余量。
 */
export const CONTENT_FOLLOW_CLAMP = 22

/** 量不到轨道几何时的兜底槽距（px）：约等于一个中等宽度 tab + 间距 */
export const FALLBACK_SLOT = 72

export interface TabStripMotionOptions {
  /** tab 轨道元素（其子元素即 tab 方块，用于量槽距） */
  trackRef: React.RefObject<HTMLElement>
  /** 面板根节点（承载 `--swipe-progress`，供边缘压暗消费） */
  rootRef: React.RefObject<HTMLElement>
  /** 内容层（可选）：同步做克制的跟手位移（无 padding 的内层包裹件） */
  contentRef?: React.RefObject<HTMLElement>
  /** 内容层位移上限（px，默认 {@link CONTENT_FOLLOW_CLAMP}） */
  contentClamp?: number
  /** 槽距兜底值（px） */
  fallbackSlot?: number
}

export interface TabStripMotion {
  /** 交给 `useSwipeTabs({ visualMapper })`：整排 1:1 跟手（限幅一个槽距） */
  visualMapper: (raw: number) => number
  /** 交给 `useSwipeTabs({ snapThresholdPx })`：松手阈值 = 半个槽距 */
  snapThresholdPx: () => number
  /** 交给 `useSwipeTabs({ onOffsetChange })`：内容层位移 + 进度归一化 */
  handleOffset: (raw: number) => void
  /** 跟手开始：内容层零过渡 */
  begin: () => void
  /** 手势结束 / 未拖拽：清空内联位移（归位动画交回 CSS 过渡） */
  reset: () => void
}

/**
 * 量取轨道内各 tab 方块的**中心 x**（相对轨道左缘）。
 *
 * 轨道自身可能正被内联 transform 位移 → 所有子元素同量平移，
 * 而本函数只用于求「中心距」（差值），常量偏移自动抵消，无需先清位移。
 */
export function measureTabCenters(track: HTMLElement | null): number[] {
  if (!track) return []
  const origin = track.getBoundingClientRect().left
  return [...track.children].map((el) => {
    const r = el.getBoundingClientRect()
    return r.left - origin + r.width / 2
  })
}

/**
 * 组装一块面板的「整排 tab 跟手」行为。
 *
 * 槽距**惰性量取并缓存**：一次手势内几何不变，避免每帧 `getBoundingClientRect`
 * 强制同步布局；`reset()` 清缓存，下次手势重新量（tab 增删 / 换组后仍准）。
 */
export function createTabStripMotion(o: TabStripMotionOptions): TabStripMotion {
  const fallback = o.fallbackSlot ?? FALLBACK_SLOT
  const contentClamp = o.contentClamp ?? CONTENT_FOLLOW_CLAMP
  let slot: number | null = null

  const slotOf = (): number => {
    if (slot == null) {
      const measured = averageSlot(measureTabCenters(o.trackRef.current), 0)
      slot = measured > 0 ? measured : fallback
    }
    return slot
  }

  return {
    visualMapper: (raw) => mapStripOffset(raw, slotOf()),
    snapThresholdPx: () => slotOf() / 2,
    handleOffset: (raw) => {
      const s = slotOf()
      const content = o.contentRef?.current
      if (content) {
        content.style.transform = `translate3d(${toVisualOffset(raw, contentClamp)}px, 0, 0)`
      }
      // 进度按**槽距**归一化：拖满一格即 -1 / 1，边缘压暗与位移同步到位
      const progress = Math.max(-1, Math.min(1, mapStripOffset(raw, s) / s))
      o.rootRef.current?.style.setProperty('--swipe-progress', String(progress))
    },
    begin: () => {
      // 跟手期间内容层必须零过渡，否则位移滞后于指针
      const content = o.contentRef?.current
      if (content) content.style.transition = 'none'
    },
    reset: () => {
      slot = null
      const content = o.contentRef?.current
      if (content) {
        content.style.transform = ''
        content.style.transition = ''
      }
      o.rootRef.current?.style.setProperty('--swipe-progress', '0')
    },
  }
}

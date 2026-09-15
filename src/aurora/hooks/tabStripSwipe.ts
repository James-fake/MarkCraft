/**
 * tabStripSwipe · 「分段控件滑块」纯逻辑层
 * ---------------------------------------------------------------------------
 * 需求 N 第四轮（用户原话）：
 *   「滑动只有功能 tab 栏中的功能 tab 进行滑动 …… 摁住这个功能 tab，就有一个
 *     显示一个方块的感觉，然后可以进行一个滑动 …… 内容区域不要 …… 工具 tab
 *     栏也是不需要进行滚动的」
 *
 * 形态定案（AskUserQuestion 二选一确认）：**Apple 分段控件（Segmented Control）**
 *   - 一条**常驻**方块（滑块）盖在当前选中项上；
 *   - 按住 tab 拖动 → **只有滑块**跟手滑，**文字一个像素都不动**；
 *   - 松手 → 滑块过渡滑到最近的 tab（拖过一半就切）；
 *   - **内容区零位移**（第三轮留的 22px「呼应位移」已删）；
 *   - tab 栏**不滚动**（所有 tab 恒在可视区，横滑只是切换手势）。
 *
 * ⚠️ 与第三轮（整排跟手位移）的本质区别：那一轮动的是**整排轨道**
 * （文字 + 方块一起被拉走），本轮动的是**一个独立滑块**。所以选中态的
 * 视觉承载者从「tab 自身的底色」**迁移**到「滑块元素」—— 这不是加个动画，
 * 而是把"谁在体现选中"这件事搬了家（tab 只留文字色 + 字重）。
 *
 * 位移模型（为什么需要 hook 的 manualOffset）：
 *   滑块位置 = **基准定位**（随选中项变化，量 tab 的几何）+ **手势位移**（跟手）
 *   两者必须写进**同一个 transform**，否则松手瞬间「基准跳变 + 位移清零」
 *   会被浏览器拆成两段动画（先弹回旧 tab 再滑向新 tab）。
 */
import type React from 'react'
import { mapStripOffset } from './swipeTabsCore'

/** 量不到几何时的兜底槽距（px）：约一个中等宽度 tab + 间距 */
export const FALLBACK_SLOT = 72

/** tab 元素默认选择器（四条栏的 tab 都带 role="tab"，滑块自身无 role） */
export const TAB_SELECTOR = '[role="tab"]'

/** tab（或滑块）在轨道内的盒子，坐标系 = 轨道 padding box（与绝对定位的 left:0 对齐） */
export interface TabBox {
  /** 左缘（px） */
  x: number
  /** 宽（px） */
  w: number
}

/** 取轨道内所有 tab 元素 */
export function tabElements(track: HTMLElement | null, selector: string = TAB_SELECTOR): HTMLElement[] {
  if (!track) return []
  return [...track.querySelectorAll<HTMLElement>(selector)]
}

/**
 * 把元素盒子换算到「轨道 padding box」坐标系。
 *
 * 用 `getBoundingClientRect` 差值 + `clientLeft`（= border-left 宽）扣掉边框，
 * 而不是 `el.offsetLeft` —— 后者依赖 `offsetParent`，一旦轨道本身不是
 * positioned 祖先就会跳到别的参照系上，静默量错。
 */
function boxInTrack(track: HTMLElement, el: HTMLElement): TabBox {
  const t = track.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - t.left - track.clientLeft, w: r.width }
}

/** 量取轨道内第 index 个 tab 的盒子；越界 / 未挂载返回 null */
export function measureTabBox(
  track: HTMLElement | null,
  index: number,
  selector: string = TAB_SELECTOR,
): TabBox | null {
  if (!track) return null
  const el = tabElements(track, selector)[index]
  return el ? boxInTrack(track, el) : null
}

/** 量取轨道内所有 tab 的中心（相对轨道 padding box） */
export function measureTabCenters(track: HTMLElement | null, selector: string = TAB_SELECTOR): number[] {
  if (!track) return []
  return tabElements(track, selector).map((el) => {
    const b = boxInTrack(track, el)
    return b.x + b.w / 2
  })
}

/** 平均槽距（首末中心距 / (n-1)）；几何退化时返回 null */
function averageSlotOf(centers: number[]): number | null {
  if (centers.length < 2) return null
  const avg = (centers[centers.length - 1] - centers[0]) / (centers.length - 1)
  return avg > 0 ? avg : null
}

export interface TabStripThumbOptions {
  /** tab 轨道元素（其内第一个孩子是滑块，其余是 role="tab" 的按钮） */
  trackRef: React.RefObject<HTMLElement>
  /** 滑块元素（绝对定位在轨道内） */
  thumbRef: React.RefObject<HTMLElement>
  /** 当前索引（惰性读取：手势起点用） */
  getIndex: () => number
  /** tab 选择器 */
  tabSelector?: string
  /** 兜底槽距（px） */
  fallbackSlot?: number
}

export interface TabStripThumb {
  /**
   * 交给 `useSwipeTabs({ onOffsetChange })`：把「基准 + 跟手位移」合成为滑块位置。
   * 每帧调用，内部不触发 React re-render，仅直写 style。
   */
  handleOffset: (raw: number) => void
  /** 交给 `useSwipeTabs({ snapThresholdPx })`：松手阈值 = 半个「本方向真实中心距」 */
  snapThresholdPx: () => number
  /**
   * 把滑块落到第 index 个 tab 上（宽度也换成该 tab 的宽度）。
   *
   * @param animated true = 交回 CSS 过渡（点击切换 / 松手吸附）；
   *                 false = 瞬时落位（首帧、窗口尺寸变化）
   */
  place: (index: number, animated?: boolean) => void
}

/**
 * 组装一条 tab 栏的「分段控件滑块」行为。
 *
 * 几何**惰性量取并在一次手势内缓存**：一次手势内布局不变，避免每帧
 * `getBoundingClientRect` 强制同步布局；`place()` 清缓存，下次手势重量
 * （tab 增删 / 换组后仍准）。
 */
export function createTabStripThumb(o: TabStripThumbOptions): TabStripThumb {
  const fallback = o.fallbackSlot ?? FALLBACK_SLOT
  const selector = o.tabSelector ?? TAB_SELECTOR

  /** 本次手势的基准盒（手势首次位移时量取，松手后清空） */
  let base: TabBox | null = null
  /** 本次手势的中心位缓存 */
  let centers: number[] | null = null
  /** 松手前最后一次位移（用于按方向算阈值） */
  let lastRaw = 0

  const centersOf = (): number[] => {
    if (!centers) centers = measureTabCenters(o.trackRef.current, selector)
    return centers
  }

  /**
   * 当前位移方向到相邻 tab 的**真实中心距**。
   *
   * 为什么不能用平均槽距：滑块跟手一格的视觉距离就是这两个 tab 的中心距，
   * 用平均值会让「限幅到不了目标中心」（滑块滑一半就被阻尼卡住），阈值也
   * 与视觉不符。方向由位移符号决定 —— 符号穿越 0 时位移本身≈0，无跳变。
   * 边界（该方向没有相邻 tab）退回平均槽距，让越界仍有可感知的橡胶阻尼。
   */
  const distanceOf = (offset: number): number => {
    const cs = centersOf()
    const idx = o.getIndex()
    const cur = cs[idx]
    if (cur == null) return fallback
    const tgt = cs[offset <= 0 ? idx + 1 : idx - 1]
    const d = tgt == null ? 0 : Math.abs(tgt - cur)
    return d > 0 ? d : (averageSlotOf(cs) ?? fallback)
  }

  return {
    handleOffset: (raw) => {
      lastRaw = raw
      const thumb = o.thumbRef.current
      if (!thumb) return

      // 手势首次位移：量基准（此时 index 仍是手势起点，正确）
      if (!base) {
        base = measureTabBox(o.trackRef.current, o.getIndex(), selector) ?? { x: 0, w: 0 }
        // 跟手期间必须零过渡，否则位移滞后于指针
        thumb.style.transition = 'none'
        thumb.style.width = `${base.w}px`
      }

      const shift = mapStripOffset(raw, distanceOf(raw))
      thumb.style.transform = `translate3d(${base.x + shift}px, 0, 0)`
    },

    snapThresholdPx: () => distanceOf(lastRaw) / 2,

    place: (index, animated = true) => {
      base = null
      centers = null
      lastRaw = 0
      const thumb = o.thumbRef.current
      const box = measureTabBox(o.trackRef.current, index, selector)
      if (!thumb || !box) return

      const apply = () => {
        thumb.style.width = `${box.w}px`
        thumb.style.transform = `translate3d(${box.x}px, 0, 0)`
      }

      if (animated) {
        // 恢复过渡 + 强制一次样式重算：把「过渡已生效 + 当前位移」记成 before-change，
        // 否则「恢复过渡 + 改 transform」同帧提交会被浏览器当成跳变，吸附动画不播（松手即瞬移）。
        thumb.style.transition = ''
        void thumb.offsetWidth
        apply()
      } else {
        // 瞬时落位（首帧 / 尺寸变化）：关过渡 → 写值 → 强制重算 → **立刻恢复**。
        // ⚠️ 不能把内联 `transition: none` 留在元素上 —— 它会一直压着 CSS 过渡，
        // 之后所有「点击 / 松手落位」都会变成瞬移（且静止态 computed transition 也不对）。
        thumb.style.transition = 'none'
        apply()
        void thumb.offsetWidth
        thumb.style.transition = ''
      }
    },
  }
}

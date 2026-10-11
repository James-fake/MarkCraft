/**
 * 专注模式 / 打字机模式的共享契约（P0 一致性补齐）
 *
 * 源码模式（CodeMirror 6）与所见即所得模式（Tiptap）是两个不同的编辑器引擎，
 * 但「专注 / 打字机」对用户可见的行为必须一致。为避免两边各写一份实现导致漂移，
 * 本模块只承载两引擎共用的「事实」——淡化类名、居中算法、滚动容器探测，
 * 以及能力的契约接口。各引擎只需实现自己的适配器。
 */

/** 非活动内容淡化的类名（CM6 加在 `.cm-line`，Tiptap 加在块节点 DOM 上） */
export const MC_FOCUS_DIM_CLASS = 'mc-focus-dimmed'

/** 淡化透明度（两引擎保持一致） */
export const MC_FOCUS_DIM_OPACITY = 0.35

/**
 * 专注 / 打字机能力的引擎契约。
 * 上层（设置 → 编辑器）只依赖本接口；每个编辑器引擎实现一个适配器即可。
 */
export interface EditorFocusController {
  /** 行/段聚焦：淡化非活动内容 */
  setFocusMode(enabled: boolean): void
  /** 打字机：活动行/块垂直居中 */
  setTypewriterMode(enabled: boolean): void
}

/**
 * 把一个矩形滚动到滚动容器的垂直中央（打字机模式的共用算法）。
 *
 * @param container 滚动容器（其 scrollTop 会被调整）
 * @param rect 目标内容相对视口的矩形（如光标行 / 活动块）
 */
export function centerRectInContainer(
  container: HTMLElement,
  rect: { top: number; height: number },
): void {
  const containerTop = container.getBoundingClientRect().top
  const offsetTop = rect.top - containerTop
  const target = container.scrollTop + offsetTop + rect.height / 2 - container.clientHeight / 2
  container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
}

/**
 * 从给定元素向上寻找可滚动的祖先容器。
 * 所见即所得模式下内容块在 `.tiptap-wrapper`（overflow-y:auto）内滚动，
 * 需要由此定位真正的滚动宿主，而非编辑器自身 DOM。
 */
export function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null
  while (cur) {
    const oy = window.getComputedStyle(cur).overflowY
    if (oy === 'auto' || oy === 'scroll') return cur
    cur = cur.parentElement
  }
  return null
}

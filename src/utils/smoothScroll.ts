/**
 * 自实现的平滑滚动：用 requestAnimationFrame 逐帧推进
 *
 * 每帧重新读取目标位置（通过 getTarget），应对虚拟滚动
 * （如 CodeMirror 6 / Tiptap）下 scrollHeight / 行坐标动态变化
 * 导致动画中途失效的问题
 *
 * 缓动曲线：easeInOutQuint —— 起步与收尾都极缓，中段加速，
 * 比纯 ease-out 更具"丝滑缓慢"的质感
 */
export const SMOOTH_SCROLL_DURATION = 900

/**
 * 平滑滚动到目标位置（easeInOutQuint）。返回取消函数：
 * 调用后停止后续 rAF 并清掉已排程的帧，组件卸载或重新发起滚动时务必调用，
 * 否则卸载后仍会持续写入 el.scrollTop（资源/生命周期审查 M3-ScrollButtons）。
 */
export function smoothScrollTo(el: HTMLElement, getTarget: () => number): () => void {
  const startScroll = el.scrollTop
  const startTime = performance.now()
  let rafId = 0
  let cancelled = false

  const tick = (now: number) => {
    if (cancelled) return
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / SMOOTH_SCROLL_DURATION)
    // easeInOutQuint：progress < 0.5 ? 16*p^5 : 1 - pow(-2p+2, 5)/2
    const eased =
      progress < 0.5
        ? 16 * progress * progress * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 5) / 2

    // 每帧重新读取目标位置，应对虚拟滚动下坐标动态变化
    const finalTarget = getTarget()
    const current = startScroll + (finalTarget - startScroll) * eased
    el.scrollTop = current

    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      // 确保最终位置精确
      el.scrollTop = finalTarget
    }
  }
  rafId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(rafId)
  }
}

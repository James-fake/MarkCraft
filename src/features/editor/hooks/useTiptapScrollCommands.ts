import { useCallback } from 'react'
import { smoothScrollTo } from '../../../utils/smoothScroll'

/**
 * 编辑器滚动命令（P5-1 自 TiptapEditor.tsx 的 imperative handle 拆出，逻辑逐字未动）：
 * - scrollToHeading：rAF 平滑滚动到指定标题顶部（每帧重读元素位置，应对渲染期位置漂移）
 * - restoreScroll：rAF 延迟 + 多帧重试恢复 scrollTop（应对内容/图片异步渲染导致 scrollHeight
 *   偏小、scrollTop 被 clamp 到错误位置）
 */
export function useTiptapScrollCommands(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const scrollToHeading = useCallback((headingId: string) => {
    // 使用真正的滚动容器 .tiptap-wrapper（scrollContainerRef）
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    // 用 rAF 平滑滚动到标题顶部，每帧重读 heading 元素位置
    // 应对 Tiptap 内容渲染过程中位置动态变化
    smoothScrollTo(scrollContainer, () => {
      const headingEl = scrollContainer.querySelector(`[id="${headingId}"]`) as HTMLElement | null
      if (!headingEl) return scrollContainer.scrollTop
      const containerRect = scrollContainer.getBoundingClientRect()
      const headingRect = headingEl.getBoundingClientRect()
      // margin 0：标题精准对齐编辑区顶部，不露上一行
      return headingRect.top - containerRect.top + scrollContainer.scrollTop
    })
  }, [scrollContainerRef])

  const restoreScroll = useCallback((scrollTop: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    // 用 rAF 延迟 + 多帧重试，应对 Tiptap 内容/图片异步渲染
    // 导致 scrollHeight 偏小、scrollTop 被 clamp 到错误位置
    let attempts = 0
    const maxAttempts = 30 // 约 500ms
    const tryRestore = () => {
      const sc = scrollContainerRef.current
      if (!sc) return
      sc.scrollTop = scrollTop
      // 如果还没达到目标（被 clamp），继续重试
      if (Math.abs(sc.scrollTop - scrollTop) > 1 && attempts++ < maxAttempts) {
        requestAnimationFrame(tryRestore)
      }
    }
    requestAnimationFrame(tryRestore)
  }, [scrollContainerRef])

  return { scrollToHeading, restoreScroll }
}

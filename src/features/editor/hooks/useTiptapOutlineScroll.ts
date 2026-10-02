import { useEffect, useRef } from 'react'
import type { Editor as TiptapEditorType } from '@tiptap/react'
import { saveEditorScroll } from '../../../services/scrollPositionManager'

/**
 * WYSIWYG 滚动 → 大纲高亮联动（P5-1 自 TiptapEditor.tsx 的 effect 拆出，逻辑逐字未动）。
 * 监听真正的滚动容器（.tiptap-wrapper），rAF 节流探测视口内当前标题并回报；
 * 顺带保存编辑器滚动位置（供切换标签页后恢复）。
 * 容器可能晚于 effect 挂载，用 rAF 重试最多 60 帧完成接线。
 */
export function useTiptapOutlineScroll(
  editor: TiptapEditorType | null,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  fileId: string | undefined,
  onActiveHeadingChange?: (headingId: string | null) => void,
) {
  const onActiveHeadingChangeRef = useRef(onActiveHeadingChange)
  onActiveHeadingChangeRef.current = onActiveHeadingChange

  useEffect(() => {
    if (!editor) return

    let scrollContainer: HTMLElement | null = null
    let raf = 0
    let attempts = 0
    let cleanup: (() => void) | null = null

    const setup = () => {
      // 真正滚动的容器是 .tiptap-wrapper（scrollContainerRef）
      scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        if (attempts++ < 60) {
          raf = requestAnimationFrame(setup)
        }
        return
      }
      const sc = scrollContainer

      let ticking = false
      const handleScroll = () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          ticking = false
          // headings 实时查询，应对内容渲染延迟
          const headings = sc.querySelectorAll('[id^="heading-"]')
          let activeId: string | null = null
          for (let i = headings.length - 1; i >= 0; i--) {
            const el = headings[i] as HTMLElement
            const rect = el.getBoundingClientRect()
            const containerRect = sc.getBoundingClientRect()
            if (rect.top <= containerRect.top + containerRect.height * 0.3) {
              activeId = el.id
              break
            }
          }
          if (!activeId && headings.length > 0) {
            const first = headings[0] as HTMLElement
            const rect = first.getBoundingClientRect()
            const containerRect = sc.getBoundingClientRect()
            if (rect.top < containerRect.bottom) {
              activeId = first.id
            }
          }
          onActiveHeadingChangeRef.current?.(activeId)
        })
        // 保存编辑器滚动位置（用于切换标签页后恢复）
        // saveEditorScroll 内部只在 scrollTop > 0 时更新，
        // 避免文件切换时 setTextSelection(0) 触发的 scroll-to-top 覆盖正确位置
        if (fileId) {
          saveEditorScroll(fileId, sc.scrollTop, sc.scrollHeight)
        }
      }

      sc.addEventListener('scroll', handleScroll, { passive: true })
      cleanup = () => {
        // 卸载前保存最终滚动位置
        if (fileId && sc) {
          saveEditorScroll(fileId, sc.scrollTop, sc.scrollHeight)
        }
        sc.removeEventListener('scroll', handleScroll)
      }
    }

    setup()
    return () => {
      cancelAnimationFrame(raf)
      cleanup?.()
    }
  }, [editor, fileId, scrollContainerRef])
}

import React, { useState, useEffect, useRef } from 'react'
import { smoothScrollTo, SMOOTH_SCROLL_DURATION } from '@utils/smoothScroll'

interface ScrollButtonsProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>
  scrollToTopLabel: string
  scrollToBottomLabel: string
}

const ScrollButtons: React.FC<ScrollButtonsProps> = ({ scrollContainerRef, scrollToTopLabel, scrollToBottomLabel }) => {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  // 跟踪 container 是否就绪；ref.current 可能在 mount 后才被赋值
  // （例如 CodeMirror view 在 useEffect 中创建），需要轮询重试绑定
  const [container, setContainer] = useState<HTMLElement | null>(() => scrollContainerRef.current)
  // 标记是否处于程序触发的滚动中，避免动画过程中被 scroll 同步逻辑打断
  const animatingRef = useRef(false)

  useEffect(() => {
    if (container) return
    let raf = 0
    let attempts = 0
    const check = () => {
      const el = scrollContainerRef.current
      if (el) {
        setContainer(el)
        return
      }
      if (attempts++ < 60) {
        raf = requestAnimationFrame(check)
      }
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [container, scrollContainerRef])

  useEffect(() => {
    if (!container) return

    const handleScroll = () => {
      // 动画进行中时不更新按钮可见性，避免抖动
      if (animatingRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowScrollTop(scrollTop > 100)
      setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 100)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll, { passive: true })
    const resizeObserver = new ResizeObserver(handleScroll)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [container])

  const scrollToTop = () => {
    const el = scrollContainerRef.current ?? container
    if (!el) return
    animatingRef.current = true
    // 目标永远是顶部（0），scrollHeight 变化不影响
    smoothScrollTo(el, () => 0)
    // 动画结束后刷新按钮状态
    setTimeout(() => {
      animatingRef.current = false
      setShowScrollTop(false)
      setShowScrollBottom(el.scrollHeight - el.clientHeight > 100)
    }, SMOOTH_SCROLL_DURATION + 50)
  }

  const scrollToBottom = () => {
    const el = scrollContainerRef.current ?? container
    if (!el) return
    animatingRef.current = true
    // 目标位置在每帧重新读取，应对虚拟滚动下 scrollHeight 动态变化
    smoothScrollTo(el, () => el.scrollHeight - el.clientHeight)
    setTimeout(() => {
      animatingRef.current = false
      setShowScrollBottom(false)
      setShowScrollTop(el.scrollTop > 100)
    }, SMOOTH_SCROLL_DURATION + 50)
  }

  const hasButtons = showScrollTop || showScrollBottom

  return (
    <div className={`scroll-buttons-container${hasButtons ? '' : ' hidden'}`}>
      <button
        className={`scroll-btn scroll-btn-up${showScrollTop ? '' : ' hidden'}`}
        onClick={scrollToTop}
        aria-label={scrollToTopLabel}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 4L3 9h10L8 4z" fill="currentColor" />
        </svg>
      </button>
      <button
        className={`scroll-btn scroll-btn-down${showScrollBottom ? '' : ' hidden'}`}
        onClick={scrollToBottom}
        aria-label={scrollToBottomLabel}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 12L3 7h10L8 12z" fill="currentColor" />
        </svg>
      </button>
    </div>
  )
}

export default ScrollButtons

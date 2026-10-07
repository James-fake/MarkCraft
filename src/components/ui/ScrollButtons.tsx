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
  // 跟踪进行中的平滑滚动动画与结束回调定时器，便于卸载或重新发起时取消
  // （资源/生命周期审查 M3-ScrollButtons：否则卸载后仍写 scrollTop / 调 setState）
  const animRef = useRef<{ cancel: () => void; timer: ReturnType<typeof setTimeout> } | null>(null)

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
    // 先取消可能进行中的动画与回调，避免叠加
    if (animRef.current) {
      animRef.current.cancel()
      clearTimeout(animRef.current.timer)
      animRef.current = null
    }
    // 目标永远是顶部（0），scrollHeight 变化不影响
    const cancel = smoothScrollTo(el, () => 0)
    // 动画结束后刷新按钮状态
    const timer = setTimeout(() => {
      animatingRef.current = false
      setShowScrollTop(false)
      setShowScrollBottom(el.scrollHeight - el.clientHeight > 100)
      animRef.current = null
    }, SMOOTH_SCROLL_DURATION + 50)
    animRef.current = { cancel, timer }
  }

  const scrollToBottom = () => {
    const el = scrollContainerRef.current ?? container
    if (!el) return
    animatingRef.current = true
    if (animRef.current) {
      animRef.current.cancel()
      clearTimeout(animRef.current.timer)
      animRef.current = null
    }
    // 目标位置在每帧重新读取，应对虚拟滚动下 scrollHeight 动态变化
    const cancel = smoothScrollTo(el, () => el.scrollHeight - el.clientHeight)
    const timer = setTimeout(() => {
      animatingRef.current = false
      setShowScrollBottom(false)
      setShowScrollTop(el.scrollTop > 100)
      animRef.current = null
    }, SMOOTH_SCROLL_DURATION + 50)
    animRef.current = { cancel, timer }
  }

  // 卸载时取消进行中的滚动动画与结束回调，避免卸载后写 scrollTop / setState
  useEffect(() => {
    return () => {
      if (animRef.current) {
        animRef.current.cancel()
        clearTimeout(animRef.current.timer)
        animRef.current = null
      }
    }
  }, [])

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

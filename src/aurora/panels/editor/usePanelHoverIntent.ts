import { useCallback, useEffect, useRef } from 'react'

/**
 * 边缘 hover 防误触（hover-intent）：鼠标靠到缘侧需“停留”约 220ms 才滑入面板；
 * 快速掠过 / 误触会在到期前离开而被取消，不再一碰边缘就弹出。
 * 已钉住（pinned）时无需 hover，离开也不收起。
 * 卸载时清理挂起的定时器，避免泄漏。
 *
 * 注：动效相位（usePresence / data-exiting）由宿主组件持有——motionExit.test
 * 直接扫描宿主源码断言接线存在，故本 hook 只收编定时器逻辑，不碰相位机。
 */
export function usePanelHoverIntent(pinned: boolean, setHover: (v: boolean) => void) {
  const HOVER_INTENT_MS = 220
  const HOVER_CLOSE_DELAY_MS = 180
  const hoverTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  const openIntent = useCallback(() => {
    if (pinned) return
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    cancelClose()
    hoverTimer.current = window.setTimeout(() => setHover(true), HOVER_INTENT_MS)
  }, [pinned, cancelClose, setHover])

  const scheduleClose = useCallback(() => {
    if (pinned) return
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHover(false), HOVER_CLOSE_DELAY_MS)
  }, [pinned, setHover])

  const closeIntent = useCallback(() => {
    if (hoverTimer.current) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null }
    scheduleClose()
  }, [scheduleClose])

  // 卸载时清理挂起的 hover 定时器，避免泄漏
  useEffect(() => () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  return { openIntent, closeIntent, cancelClose, scheduleClose }
}

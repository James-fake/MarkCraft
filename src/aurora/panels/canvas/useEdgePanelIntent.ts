import { useCallback, useEffect, useRef } from 'react'

/**
 * 边缘悬停召唤面板的 hover-intent 手势（P4-5 自 CanvasPanel.tsx 抽离，左右栏各挂一份）。
 *
 * 鼠标靠到缘侧需「停留」约 HOVER_INTENT_MS 才滑入面板；快速掠过 / 误触会在到期前离开而被取消，
 * 不再一碰边缘就弹出。浮层覆盖区允许从容跨入：离开触发条/浮层延迟 HOVER_CLOSE_DELAY_MS 才收起，
 * 期间回到任一处即取消收起，打断「收起→触发条重现→再展开」的抖动循环。
 * 已钉住（pinned）时无需 hover，离开也不收起；空白板引导锁定（locked）时整组交互停用。
 *
 * @param setHover 该侧 hover 布尔 state 的 setter（setState 稳定引用）
 * @param locked   首启锁定（true 时手势整体停用）
 * @param pinned   该侧是否已钉住常驻
 */
export function useEdgePanelIntent(
  setHover: (v: boolean) => void,
  locked: boolean,
  pinned: boolean,
) {
  const HOVER_INTENT_MS = 220
  const HOVER_CLOSE_DELAY_MS = 180
  const hoverTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  const openIntent = useCallback(() => {
    if (locked || pinned) return
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    cancelClose()
    hoverTimer.current = window.setTimeout(() => setHover(true), HOVER_INTENT_MS)
  }, [locked, pinned, cancelClose, setHover])

  const scheduleClose = useCallback(() => {
    if (locked || pinned) return
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHover(false), HOVER_CLOSE_DELAY_MS)
  }, [locked, pinned, setHover])

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

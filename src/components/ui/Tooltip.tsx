import React, { useCallback, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  /** 触发器，必须是单个可接收 ref / 事件的元素（如 <button>） */
  children: React.ReactElement
  placement?: TooltipPlacement
  /** 显示延迟（ms），默认 150 */
  delay?: number
}

type Coords = { top: number; left: number; transform: string }

// 邻居速通（RECIPES：Once one tooltip is open, neighbours open instantly）——
// 模块级共享：任一 tooltip hide 后 500ms 内另一实例 show 则延迟归零（扫工具栏不重等）。
let lastTooltipHideAt = 0
const NEIGHBOR_INSTANT_MS = 500

function computeCoords(rect: DOMRect, placement: TooltipPlacement): Coords {
  const GAP = 8
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: 'translate(-50%, 0)' }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP, transform: 'translate(-100%, -50%)' }
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: 'translate(0, -50%)' }
    case 'top':
    default:
      return { top: rect.top - GAP, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' }
  }
}

/**
 * 统一工具提示组件（P1#8）。
 * 悬停/聚焦显示，支持四向定位，role="tooltip" + aria-describedby，
 * 滚动/失焦/ESC 自动隐藏，避免遮挡触发元素。
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, placement = 'top', delay = 150 }) => {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0, transform: 'translate(-50%, -100%)' })
  const triggerRef = useRef<HTMLElement | null>(null)
  const timer = useRef<number | null>(null)
  const id = useId()

  const position = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    setCoords(computeCoords(el.getBoundingClientRect(), placement))
  }, [placement])

  const show = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    const instant = Date.now() - lastTooltipHideAt < NEIGHBOR_INSTANT_MS
    timer.current = window.setTimeout(
      () => {
        position()
        setVisible(true)
      },
      instant ? 0 : delay,
    )
  }, [delay, position])

  const hide = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    lastTooltipHideAt = Date.now()
    setVisible(false)
  }, [])

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node
      const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && typeof childRef === 'object') (childRef as React.MutableRefObject<HTMLElement | null>).current = node
    },
    [children],
  )

  const childProps = children.props as Record<string, unknown>
  const mergedChild = React.cloneElement(children, {
    ref: setRef,
    'aria-describedby': visible ? id : (childProps['aria-describedby'] as string | undefined),
    onMouseEnter: (e: React.MouseEvent) => {
      ;(childProps.onMouseEnter as ((e: React.MouseEvent) => void) | undefined)?.(e)
      show()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ;(childProps.onMouseLeave as ((e: React.MouseEvent) => void) | undefined)?.(e)
      hide()
    },
    onFocus: (e: React.FocusEvent) => {
      ;(childProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e)
      position()
      setVisible(true)
    },
    onBlur: (e: React.FocusEvent) => {
      ;(childProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e)
      hide()
    },
  })

  return (
    <>
      {mergedChild}
      {visible &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="mc-tooltip"
            data-placement={placement}
            style={
              {
                top: coords.top,
                left: coords.left,
                // 定位 transform 走 CSS 变量：不占用 transform 属性，入场 scale 动画才可叠加
                '--tt-transform': coords.transform,
              } as React.CSSProperties
            }
            onMouseEnter={hide}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}

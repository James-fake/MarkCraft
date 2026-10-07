import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DateWheelPicker } from './DateWheelPicker'
import { usePresence, POPOVER_EXIT_MS } from './usePresence'
import { useUiLabels } from './UiLabels'
import type { UiLabels } from './UiLabels'

export interface DateWheelInputProps {
  /** 当前日期，ISO 短格式 'YYYY-MM-DD'（空 → 未设置） */
  value: string
  onChange: (v: string) => void
  minYear?: number
  maxYear?: number
  /** 透传 class（如 aurora-settings__input--date 控制宽度） */
  className?: string
  disabled?: boolean
  id?: string
}

function formatDate(v: string, ui: UiLabels): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return ui.unset
  return ui.dateYmd
    .replace(String.raw`{y}`, m[1])
    .replace(String.raw`{m}`, String(+m[2]))
    .replace(String.raw`{d}`, String(+m[3]))
}

/**
 * 生日 / 日期输入：右侧按钮点击弹出苹果风格年月日滚轮鼓。
 * 与 ScrollNumberInput 同层、同交互范式（portal 浮层 + 点外部 / Esc 关闭）。
 */
export function DateWheelInput({
  value,
  onChange,
  minYear,
  maxYear,
  className,
  disabled,
  id,
}: DateWheelInputProps) {
  const ui = useUiLabels()
  const innerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-4）；rect 每帧从触发器实时读取，退场窗口内仍可定位
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (innerRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  let popover: React.ReactNode = null
  if (mounted && !disabled) {
    const rect = innerRef.current?.getBoundingClientRect()
    if (rect) {
      const width = 264
      const height = 5 * 34 + 16
      let top = rect.bottom + 6
      if (top + height > window.innerHeight) top = rect.top - height - 6
      let left = rect.left
      if (left + width > window.innerWidth) left = window.innerWidth - width - 8
      popover = createPortal(
        <div
          ref={popoverRef}
          className="aurora-wheel-popover aurora-datewheel-popover"
          data-exiting={exiting || undefined}
          style={{ position: 'fixed', top, left, width }}
          role="dialog"
          aria-label={ui.birthdaySelect}
        >
          <DateWheelPicker
            value={value}
            minYear={minYear}
            maxYear={maxYear}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        </div>,
        document.body,
      )
    }
  }

  return (
    <>
      <button
        type="button"
        id={id}
        ref={innerRef}
        className={`aurora-datewheel-trigger${className ? ' ' + className : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? '' : 'is-placeholder'}>{formatDate(value, ui)}</span>
        <svg className="aurora-datewheel-trigger__chev" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {popover}
    </>
  )
}

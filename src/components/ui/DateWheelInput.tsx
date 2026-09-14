import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DateWheelPicker } from './DateWheelPicker'

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

function formatDate(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return '未设置'
  return `${m[1]} 年 ${+m[2]} 月 ${+m[3]} 日`
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
  const innerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

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
  if (open && !disabled) {
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
          style={{ position: 'fixed', top, left, width }}
          role="dialog"
          aria-label="选择生日"
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
        <span className={value ? '' : 'is-placeholder'}>{formatDate(value)}</span>
        <svg className="aurora-datewheel-trigger__chev" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {popover}
    </>
  )
}

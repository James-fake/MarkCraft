import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NumberWheelPicker } from './NumberWheelPicker'
import { usePresence, POPOVER_EXIT_MS } from './usePresence'
import { useUiLabels } from './UiLabels'

export interface ScrollNumberInputProps {
  /** 当前数值（数字或字符串；空字符串表示未填写） */
  value: number | string
  /** 值变化回调，始终回传 number（滚轮鼓内部已按 min/max 钳制） */
  onChange: (value: number) => void
  min?: number
  max?: number
  /** 步进，默认 1 */
  step?: number
  /** 透传类名（用于尺寸 / 主题，如 aurora-settings__number、aurora-cip__input） */
  className?: string
  disabled?: boolean
  /** 透传内联样式（作用于触发器按钮） */
  style?: React.CSSProperties
  /** 空值占位文案 */
  placeholder?: string
}

type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max' | 'step' | 'disabled' | 'style' | 'className'
>

const WHEEL_GLYPH = (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <rect x="4.4" y="2.2" width="7.2" height="11.6" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <line x1="4.4" y1="8" x2="11.6" y2="8" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" />
  </svg>
)

/**
 * 苹果风格数字滚轮输入（共享 UI 层，Aurora 与 features 均可使用，不触发分层守卫）。
 * 不可键入——渲染为触发器按钮，鼠标悬停即自动展开苹果风格数字滚轮鼓，
 * 支持拖拽 / 滚轮 / 点按调节，松手惯性吸附；点外部 / Esc 收起。
 */
export function ScrollNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  disabled,
  style,
  placeholder,
  ...rest
}: ScrollNumberInputProps & NativeButtonProps) {
  const ui = useUiLabels()
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [open, setOpen] = useState(false)
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-4）
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  const cancelClose = () => {
    if (closeTimer.current != null) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }
  const openNow = () => {
    if (disabled) return
    cancelClose()
    setOpen(true)
  }

  // 点外部 / Esc 关闭弹出
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => cancelClose(), [])

  const coercedValue: number | '' =
    typeof value === 'number'
      ? value
      : value === '' || value == null
        ? ''
        : Number.isFinite(parseFloat(value))
          ? parseFloat(value)
          : ''

  const handleWheelChange = (v: number) => {
    onChangeRef.current(v)
  }

  const buildPopover = () => {
    if (!mounted || disabled) return null
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return null
    const width = 156
    const height = 5 * 34 + 16
    let top = rect.bottom + 6
    if (top + height > window.innerHeight) top = rect.top - height - 6
    let left = rect.left
    if (left + width > window.innerWidth) left = window.innerWidth - width - 8
    return createPortal(
      <div
        ref={popoverRef}
        className="aurora-wheel-popover"
        data-exiting={exiting || undefined}
        style={{ position: 'fixed', top, left, width }}
        role="dialog"
        aria-label={ui.numberWheel}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <NumberWheelPicker
          value={coercedValue}
          min={min}
          max={max}
          step={step}
          onChange={handleWheelChange}
          onClose={() => setOpen(false)}
        />
      </div>,
      document.body,
    )
  }

  const display = value === '' || value == null ? placeholder ?? '' : String(value)
  return (
    <div
      className={`aurora-number aurora-number--wheel${open ? ' is-open' : ''}`}
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        ref={anchorRef}
        className={`aurora-number__trigger${className ? ' ' + className : ''}`}
        style={style}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ui.numberWheel}
        onClick={() => setOpen((o) => !o)}
        {...rest}
      >
        <span className="aurora-number__value">{display}</span>
        <span className="aurora-number__hint" aria-hidden="true">
          {WHEEL_GLYPH}
        </span>
      </button>
      {buildPopover()}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import { usePresence, POPOVER_EXIT_MS } from '@components/ui/usePresence'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 主题化下拉选择器（替代原生 <select>，避免 Windows 下 option 弹层由 OS 接管、无法套用主题）。
 * 触发器沿用 .aurora-cip__input 外观；展开菜单用 portal + fixed 定位，避免被检视浮层滚动容器裁切。
 * 交互：点击触发器开/关、点选项选中并关闭（onMouseDown 防止 trigger 失焦闪烁）、点外部/Esc 关闭、滚动/缩放自动收起。
 */
export interface InspectorSelectOption { value: string; label: string }

export function InspectorSelect({
  value, options, placeholder, onChange, ariaLabel,
}: {
  value: string
  options: InspectorSelectOption[]
  placeholder?: string
  onChange: (v: string) => void
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  const cs = useLanguage().t.canvasTab
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-3）；rect 是 state，退场窗口内仍可定位
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  const toggle = () => {
    if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`aurora-cip__select ${open ? 'aurora-cip__select--open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`aurora-cip__select-value ${selected ? '' : 'aurora-cip__select-value--ph'}`}>
          {selected ? selected.label : (placeholder ?? cs.selectPlaceholder)}
        </span>
        <Icon.chevronDown size={12} className="aurora-cip__select-chevron" />
      </button>
      {mounted && rect && createPortal(
        <div
          ref={menuRef}
          className="aurora-cip__menu"
          data-exiting={exiting || undefined}
          role="listbox"
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, minWidth: rect.width }}
        >
          {options.map((o) => {
            const on = o.value === value
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={on}
                className={`aurora-cip__option ${on ? 'aurora-cip__option--on' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false) }}
              >
                <span className="aurora-cip__option-check">{on ? <Icon.check size={12} /> : null}</span>
                <span className="aurora-cip__option-label">{o.label}</span>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

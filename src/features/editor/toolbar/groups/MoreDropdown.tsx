import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePresence, POPOVER_EXIT_MS } from '@components/ui/usePresence'

export interface MoreDropdownItem {
  label: string
  icon: React.ReactNode
  action: (e?: React.MouseEvent) => void
  type?: 'button' | 'toggle'
  checked?: boolean
  separator?: boolean
}

interface MoreDropdownProps {
  items: MoreDropdownItem[]
  buttonRef?: React.Ref<HTMLButtonElement>
}

export default function MoreDropdown({ items, buttonRef }: MoreDropdownProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  // 同步内部 ref 和外部传入的 buttonRef
  useEffect(() => {
    if (buttonRef && typeof buttonRef === 'object' && btnRef.current) {
      (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = btnRef.current
    }
  }, [buttonRef])
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-2）
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open])

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          border: 'none',
          borderRadius: 'var(--mc-radius-sm, 4px)',
          backgroundColor: open ? 'var(--mc-bg-pressed)' : 'transparent',
          color: open ? 'var(--mc-text-primary)' : 'var(--mc-text-secondary)',
          cursor: 'pointer',
          transition: 'background-color 0.15s, color 0.15s',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = 'var(--mc-bg-hover)'
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title={'更多'}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>

      {mounted && createPortal(
        <div
          ref={menuRef}
          className="aurora-dropdown"
          data-exiting={exiting || undefined}
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            zIndex: 9999,
            minWidth: '180px',
          }}
        >
          {items.map((item, idx) => {
            if (item.separator) {
              return <div key={idx} className="aurora-dropdown__separator" />
            }
            return (
              <div
                key={idx}
                onClick={(e) => {
                  if (item.type === 'toggle') {
                    item.action(e)
                  } else {
                    item.action(e)
                    setOpen(false)
                  }
                }}
                className="aurora-dropdown__item"
              >
                <span style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.type === 'toggle' && (
                  <span style={{
                    fontSize: '11px',
                    color: item.checked ? 'var(--mc-accent)' : 'var(--mc-text-secondary)',
                    opacity: item.checked ? 1 : 0.4,
                    fontWeight: 600,
                  }}>
                    {item.checked ? '✓' : '✗'}
                  </span>
                )}
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

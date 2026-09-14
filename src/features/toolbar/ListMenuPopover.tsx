import type { Translations } from '../../types/translations'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ListMenuPopoverProps {
  t: Translations
  isOpen: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
  onInsertUnordered: () => void
  onInsertOrdered: () => void
  onInsertTask: () => void
  onIndent: () => void
  onOutdent: () => void
}

export default function ListMenuPopover({
  t,
  isOpen,
  onClose,
  anchorEl,
  onInsertUnordered,
  onInsertOrdered,
  onInsertTask,
  onIndent,
  onOutdent,
}: ListMenuPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen || !anchorEl) return

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect()
      const popoverWidth = 200
      const popoverHeight = 260
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = rect.left
      if (left + popoverWidth > viewportWidth - 12) {
        left = viewportWidth - popoverWidth - 12
      }
      if (left < 12) left = 12

      let top = rect.bottom + 4
      if (top + popoverHeight > viewportHeight - 12) {
        top = rect.top - popoverHeight - 4
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, anchorEl])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        anchorEl && !anchorEl.contains(target)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, anchorEl])

  if (!isOpen) return null

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  const menuItems = [
    {
      label: t.listMenu.unorderedList,
      shortcut: '- ',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <line x1="9" y1="6" x2="20" y2="6" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          <line x1="9" y1="18" x2="20" y2="18" />
        </svg>
      ),
      action: onInsertUnordered,
    },
    {
      label: t.listMenu.orderedList,
      shortcut: '1. ',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <text x="2" y="9" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
          <line x1="10" y1="6" x2="20" y2="6" />
          <text x="2" y="15" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
          <line x1="10" y1="12" x2="20" y2="12" />
          <text x="2" y="21" fontSize="8" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
          <line x1="10" y1="18" x2="20" y2="18" />
        </svg>
      ),
      action: onInsertOrdered,
    },
    {
      label: t.listMenu.taskList,
      shortcut: '- [ ] ',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="5" width="4" height="4" rx="0.5" />
          <line x1="10" y1="7" x2="20" y2="7" />
          <path d="M4.5 7L5.5 8L7.5 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
          <rect x="3" y="13" width="4" height="4" rx="0.5" />
          <line x1="10" y1="15" x2="20" y2="15" />
        </svg>
      ),
      action: onInsertTask,
    },
    { type: 'separator' as const },
    {
      label: t.listMenu.indent,
      shortcut: 'Tab',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4 4-4 4" />
          <line x1="11" y1="12" x2="21" y2="12" />
        </svg>
      ),
      action: onIndent,
    },
    {
      label: t.listMenu.outdent,
      shortcut: 'Shift+Tab',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8l-4 4 4 4" />
          <line x1="11" y1="12" x2="21" y2="12" />
        </svg>
      ),
      action: onOutdent,
    },
  ]

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      className="rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[200px] py-1 bg-white dark:bg-gray-800"
      role="menu"
      aria-label={t.listMenu.unorderedList}
    >
      {menuItems.map((item, index) => {
        if ('type' in item && item.type === 'separator') {
          return (
            <div
              key={`sep-${index}`}
              className="my-1 mx-2"
              style={{ height: '1px', backgroundColor: 'var(--editor-border)' }}
            />
          )
        }

        const menuItem = item as { label: string; shortcut: string; icon: React.ReactNode; action: () => void }

        return (
          <button
            key={menuItem.label}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(59, 130, 246, 0.1))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => handleAction(menuItem.action)}
            role="menuitem"
          >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-70">
              {menuItem.icon}
            </span>
            <span className="flex-1">{menuItem.label}</span>
            <span
              className="text-xs opacity-40 font-mono"
              style={{ fontFamily: "'Fira Code', 'Consolas', monospace" }}
            >
              {menuItem.shortcut}
            </span>
          </button>
        )
      })}
    </div>,
    document.body
  )
}

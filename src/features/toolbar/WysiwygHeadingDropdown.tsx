import type { Translations } from '../../types/translations'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import WysiwygToolbarButton from './WysiwygToolbarButton'
import useDropdownPosition from './useDropdownPosition'

const HEADING_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const

export default function WysiwygHeadingDropdown({ editor, t }: { editor: Editor; t: Translations }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pos = useDropdownPosition(open, btnRef)

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

  const currentLevel = HEADING_LEVELS.find(l =>
    l === 0 ? editor.isActive('paragraph') : editor.isActive('heading', { level: l })
  )

  const label = currentLevel === 0 ? 'P' : currentLevel ? `H${currentLevel}` : 'H'

  const handleSelect = useCallback((level: number) => {
    if (level === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1|2|3|4|5|6 }).run()
    }
    setOpen(false)
  }, [editor])

  return (
    <div style={{ position: 'relative' }}>
      <WysiwygToolbarButton
        onClick={() => setOpen(!open)}
        title={t.toolbar.heading}
        active={currentLevel !== undefined && currentLevel > 0}
        buttonRef={btnRef}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Inter', sans-serif", minWidth: '20px', textAlign: 'center' }}>
          {label}
        </span>
      </WysiwygToolbarButton>

      {open && createPortal(
        <div
          ref={menuRef}
          className="aurora-dropdown"
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            zIndex: 9999,
            minWidth: '120px',
          }}
        >
          {HEADING_LEVELS.map(level => {
            const isActive = currentLevel === level
            const text = level === 0 ? '正文' : `标题 ${level}`
            const fontSize = level === 0 ? 13 : Math.max(11, 17 - level * 1.2)
            return (
              <div
                key={level}
                onClick={() => handleSelect(level)}
                className={`aurora-dropdown__item${isActive ? ' aurora-dropdown__item--highlighted' : ''}`}
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: level === 0 ? 400 : 600,
                }}
              >
                {text}
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

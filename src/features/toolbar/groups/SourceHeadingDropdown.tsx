import type { Translations } from '@src/types/translations'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ToolbarButton, GroupProps, applyFormatToCM6 } from './shared'

const HEADING_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const

export default function SourceHeadingDropdown({ t, editorViewRef, onChange, onPushUndo }: GroupProps & { t: Translations }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const applyFormat = useCallback((
    formatter: (text: string, selectionStart: number, selectionEnd: number) => {
      newText: string
      newCursorStart: number
      newCursorEnd: number
    }
  ) => {
    if (!editorViewRef.current) return
    applyFormatToCM6(editorViewRef.current, formatter, onChange, onPushUndo)
  }, [editorViewRef, onChange, onPushUndo])

  const setHeadingLevel = useCallback((level: number) => {
    applyFormat((text, selectionStart, _selectionEnd) => {
      const lines = text.split('\n')
      let charCount = 0
      let currentLineIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length
        if (lineStart <= selectionStart && lineEnd >= selectionStart) {
          currentLineIndex = i
          break
        }
        charCount += lines[i].length + 1
      }

      const line = lines[currentLineIndex]
      const headingMatch = line.match(/^(#{1,6})\s/)
      let cursorOffset = 0

      if (level === 0) {
        // Remove heading
        if (headingMatch) {
          lines[currentLineIndex] = line.substring(headingMatch[0].length)
          cursorOffset = -headingMatch[0].length
        }
      } else if (headingMatch) {
        // Change heading level
        const prefix = '#'.repeat(level) + ' '
        lines[currentLineIndex] = prefix + line.substring(headingMatch[0].length)
        cursorOffset = prefix.length - headingMatch[0].length
      } else {
        // Add heading
        const prefix = '#'.repeat(level) + ' '
        lines[currentLineIndex] = prefix + line
        cursorOffset = prefix.length
      }

      return {
        newText: lines.join('\n'),
        newCursorStart: selectionStart + cursorOffset,
        newCursorEnd: selectionStart + cursorOffset
      }
    })
    setOpen(false)
  }, [applyFormat])

  // Detect current heading level
  const currentLevel = editorViewRef.current ? (() => {
    const view = editorViewRef.current
    const { from } = view.state.selection.main
    const doc = view.state.doc.toString()
    const lines = doc.split('\n')
    let charCount = 0
    for (const line of lines) {
      const lineStart = charCount
      const lineEnd = charCount + line.length
      if (lineStart <= from && lineEnd >= from) {
        const match = line.match(/^(#{1,6})\s/)
        return match ? match[1].length : 0
      }
      charCount += line.length + 1
    }
    return 0
  })() : 0

  const label = currentLevel === 0 ? 'P' : `H${currentLevel}`

  // Calculate dropdown position
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open])

  return (
    <div style={{ position: 'relative' }}>
      <ToolbarButton
        onClick={() => setOpen(!open)}
        title={t.toolbar.heading}
        ariaLabel={t.toolbarAria.heading}
        buttonRef={btnRef}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Inter', sans-serif", minWidth: '20px', textAlign: 'center' }}>
          {label}
        </span>
      </ToolbarButton>

      {open && createPortal(
        <div
          ref={menuRef}
          className="aurora-dropdown"
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
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
                onClick={() => setHeadingLevel(level)}
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

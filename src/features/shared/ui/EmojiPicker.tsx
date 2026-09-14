import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { EMOJI_DATA } from '../utils/emojiData'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorEl?: HTMLElement | null
}

export default function EmojiPicker({ onSelect, onClose, anchorEl }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('常用')
  const containerRef = useRef<HTMLDivElement>(null)

  // Position the picker directly below the anchor button
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect()
      const pickerWidth = 320
      const pickerHeight = 360
      // Align left edge of picker with left edge of button
      let left = rect.left
      // If picker overflows right edge, shift left
      if (left + pickerWidth > window.innerWidth - 8) {
        left = window.innerWidth - pickerWidth - 8
      }
      let top = rect.bottom + 4
      // If picker overflows bottom, show above the button instead
      if (top + pickerHeight > window.innerHeight - 8) {
        top = rect.top - pickerHeight - 4
      }
      setPosition({ top, left })
    }
  }, [anchorEl])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA[activeCategory] || []
    const q = search.toLowerCase()
    const all = Object.values(EMOJI_DATA).flat()
    return all.filter(e => e.name.toLowerCase().includes(q) || e.keywords.toLowerCase().includes(q) || e.emoji.includes(q))
  }, [search, activeCategory])

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: position?.top,
        left: position?.left,
        width: 320,
        maxHeight: 360,
        backgroundColor: 'var(--editor-bg, #fff)',
        border: '1px solid var(--editor-border, #e5e7eb)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        zIndex: 10000,
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--editor-border, #e5e7eb)' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索 Emoji..."
          autoFocus
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--editor-border, #e5e7eb)',
            borderRadius: 4,
            fontSize: 13,
            backgroundColor: 'var(--editor-bg, #fff)',
            color: 'var(--editor-text, #333)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {/* Category tabs */}
      {!search && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--editor-border, #e5e7eb)' }}>
          {Object.keys(EMOJI_DATA).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: activeCategory === cat ? 'var(--button-primary, #3b82f6)' : 'var(--editor-text, #333)',
                borderBottom: activeCategory === cat ? '2px solid var(--button-primary, #3b82f6)' : '2px solid transparent',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      {/* Emoji grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 2,
          padding: 8,
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {filteredEmojis.map((e, i) => (
          <button
            key={`${e.name}-${i}`}
            onClick={() => { onSelect(e.emoji); onClose() }}
            title={`${e.name} ${e.keywords}`}
            style={{
              width: 36,
              height: 36,
              border: 'none',
              background: 'none',
              fontSize: 22,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = 'var(--editor-border, #e5e7eb)' }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = 'none' }}
          >
            {e.emoji}
          </button>
        ))}
      </div>
      {filteredEmojis.length === 0 && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--editor-text, #666)',
          opacity: 0.6,
        }}>
          未找到匹配的 Emoji
        </div>
      )}
    </div>,
    document.body
  )
}

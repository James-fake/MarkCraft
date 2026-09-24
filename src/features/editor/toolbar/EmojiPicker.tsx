import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { EMOJI_DATA } from '@utils/emojiData'

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

  // 锚定浮层：回归 aurora 单源基底（材质/边框/圆角/阴影/z-index 1000 全由 .aurora-dropdown 承担）。
  // portal 到 body 后已脱离 #aurora-root 作用域，内部一律引用全局 --mc-* token，不得用 --editor-*。
  return createPortal(
    <div
      ref={containerRef}
      className="aurora-dropdown"
      style={{
        position: 'fixed',
        top: position?.top,
        left: position?.left,
        width: 320,
        maxHeight: 360,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--mc-border-subtle)' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索 Emoji..."
          autoFocus
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--mc-border-medium)',
            borderRadius: 'var(--mc-radius-sm)',
            fontSize: 'var(--mc-font-sm)',
            backgroundColor: 'var(--mc-bg-content)',
            color: 'var(--mc-text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {/* Category tabs */}
      {!search && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--mc-border-subtle)' }}>
          {Object.keys(EMOJI_DATA).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 'var(--mc-font-xs)',
                color: activeCategory === cat ? 'var(--mc-accent-text)' : 'var(--mc-text-secondary)',
                borderBottom: activeCategory === cat ? '2px solid var(--mc-accent)' : '2px solid transparent',
                transition: 'border-color var(--mc-dur-micro) ease-out, color var(--mc-dur-micro) ease-out',
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
            className="aurora-dropdown__item"
            style={{
              width: 36,
              height: 36,
              padding: 0,
              gap: 0,
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {e.emoji}
          </button>
        ))}
      </div>
      {filteredEmojis.length === 0 && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: 'var(--mc-font-xs)',
          color: 'var(--mc-text-tertiary)',
          opacity: 0.6,
        }}>
          未找到匹配的 Emoji
        </div>
      )}
    </div>,
    document.body
  )
}

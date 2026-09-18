import type { Translations } from '@src/types/translations'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { type MindmapTemplate, type LayoutType, type ColorTheme, colorThemes, templates } from '@features/editor/toolbar/mindmapTemplates'
import { applyLayout, applyColorTheme } from '@features/editor/toolbar/mindmapUtils'

interface MindmapPopoverProps {
  t: Translations
  language: string
  isOpen: boolean
  onClose: () => void
  anchorEl?: HTMLElement | null
  anchorPosition?: { x: number; y: number } | null
  onInsert: (template: string) => void
}

export default function MindmapPopover({
  t: _t,
  language,
  isOpen,
  onClose,
  anchorEl,
  anchorPosition,
  onInsert,
}: MindmapPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [layout, setLayout] = useState<LayoutType>('radial')
  const [colorTheme, setColorTheme] = useState<ColorTheme>('default')

  useEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      const popoverWidth = 420
      const popoverHeight = 520
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top: number
      let left: number

      if (anchorPosition) {
        left = anchorPosition.x
        top = anchorPosition.y
      } else if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        left = rect.left
        top = rect.bottom + 4
      } else {
        return
      }

      if (left + popoverWidth > viewportWidth - 12) {
        left = viewportWidth - popoverWidth - 12
      }
      if (left < 12) left = 12

      if (!anchorPosition && anchorEl) {
        // anchorEl 模式下 top 已设置为 rect.bottom + 4
      } else if (anchorPosition) {
        top = top + 4 // anchorPosition 模式下稍微偏移
      }

      if (top + popoverHeight > viewportHeight - 12) {
        if (anchorEl) {
          const rect = anchorEl.getBoundingClientRect()
          top = rect.top - popoverHeight - 4
        } else {
          top = viewportHeight - popoverHeight - 12
        }
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [isOpen, anchorEl, anchorPosition])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        (!anchorEl || !anchorEl.contains(target))
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

  useEffect(() => {
    if (isOpen) {
      setLayout('radial')
      setColorTheme('default')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelect = (tpl: MindmapTemplate) => {
    let code = language === 'en' ? tpl.templateEn : tpl.templateZh
    code = applyLayout(code, layout)
    code = applyColorTheme(code, colorTheme)
    onInsert(code)
    onClose()
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--editor-text)',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  }

  const optionBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: '4px',
    border: active ? '1px solid var(--button-primary, #3b82f6)' : '1px solid var(--editor-border)',
    background: active ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
    color: 'var(--editor-text)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        backgroundColor: 'var(--editor-bg, #fff)',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        border: '1px solid var(--editor-border)',
        minWidth: '380px',
        maxWidth: '420px',
        maxHeight: '540px',
        overflowY: 'auto',
      }}
      role="menu"
    >
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--editor-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>🧠</span>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--editor-text)',
        }}>
          {language === 'en' ? 'Mindmap Templates' : '思维导图模板'}
        </span>
      </div>

      <div style={{ padding: '6px' }}>
        {templates.map(tpl => (
          <button
            key={tpl.id}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '7px 10px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(59, 130, 246, 0.1))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => handleSelect(tpl)}
            role="menuitem"
          >
            <div style={{
              width: '80px',
              height: '44px',
              flexShrink: 0,
              borderRadius: '4px',
              border: '1px solid var(--editor-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'var(--code-bg, rgba(30,30,40,0.4))',
            }}>
              {tpl.preview}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--editor-text)',
                marginBottom: '2px',
              }}>
                {language === 'en' ? tpl.labelEn : tpl.labelZh}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--editor-text)',
                opacity: 0.5,
                lineHeight: 1.4,
              }}>
                {language === 'en' ? tpl.descEn : tpl.descZh}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid var(--editor-border)',
        padding: '10px 14px',
      }}>
        <div style={sectionLabelStyle}>
          {language === 'en' ? 'Layout' : '布局'}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <button
            style={optionBtnStyle(layout === 'radial')}
            onClick={() => setLayout('radial')}
          >
            {language === 'en' ? 'Radial' : '径向发散'}
          </button>
          <button
            style={optionBtnStyle(layout === 'right')}
            onClick={() => setLayout('right')}
          >
            {language === 'en' ? 'Left → Right' : '从左往右'}
          </button>
          <button
            style={optionBtnStyle(layout === 'down')}
            onClick={() => setLayout('down')}
          >
            {language === 'en' ? 'Top → Down' : '从上往下'}
          </button>
        </div>

        <div style={sectionLabelStyle}>
          {language === 'en' ? 'Color Theme' : '颜色主题'}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.entries(colorThemes) as [ColorTheme, typeof colorThemes[ColorTheme]][]).map(([key, val]) => (
            <button
              key={key}
              style={{
                ...optionBtnStyle(colorTheme === key),
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
              }}
              onClick={() => setColorTheme(key)}
            >
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: val.color,
                flexShrink: 0,
                border: key === 'default' ? '1px solid var(--editor-border)' : 'none',
              }} />
              <span>{language === 'en' ? val.labelEn : val.labelZh}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

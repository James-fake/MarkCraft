import { useMemo, useState, useCallback } from 'react'
import { extractFootnotes, FootnoteItem } from '../footnote'
import { useLanguage } from '@stores/LanguageStore'

interface FootnoteSidebarProps {
  content: string
  onFootnoteClick?: (footnoteId: string, line: number) => void
  activeFootnoteId?: string | null
}

function FootnoteSidebar({ content, onFootnoteClick, activeFootnoteId }: FootnoteSidebarProps) {
  const { t } = useLanguage()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const footnotes = useMemo(() => extractFootnotes(content), [content])

  const handleToggle = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const handleClick = useCallback((footnote: FootnoteItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFootnoteClick) {
      onFootnoteClick(footnote.id, footnote.line)
    }
  }, [onFootnoteClick])

  const getFootnoteColor = (index: number): string => {
    const colors = ['#3b82f6', '#a78bfa', '#f472b6', '#34d399', '#fbbf24']
    return colors[index % colors.length]
  }

  return (
    <div style={{
      flexShrink: 0,
      maxHeight: '40%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--mc-bg-panel)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(to right, transparent, var(--button-primary))',
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: 'var(--button-primary)',
          }} />
          <span style={{
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: '0.03em',
            color: 'var(--mc-text-secondary)',
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            {t.footnote.title}
          </span>
          {footnotes.length > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--button-primary)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              padding: '1px 6px',
              borderRadius: 10,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}>
              {footnotes.length}
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            border: '1px solid var(--mc-border-subtle)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--mc-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.06)'
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.borderColor = 'var(--mc-border-subtle)'
          }}
          title={isCollapsed ? t.footnote.expand : t.footnote.collapse}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: 12,
              height: 12,
              transition: 'transform 0.2s ease',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(to right, var(--button-primary), transparent)',
        }} />
      </div>

      {!isCollapsed && (
        <div style={{
          overflowY: 'auto',
          padding: '6px 8px',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(to bottom, var(--mc-bg-panel), transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }} />

          {footnotes.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              color: 'var(--mc-text-secondary)',
              opacity: 0.4,
              gap: 6,
            }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: 24, height: 24, opacity: 0.4 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <span style={{ fontSize: 12, fontFamily: "'Inter', -apple-system, sans-serif" }}>{t.footnote.noFootnotes}</span>
              <span style={{ fontSize: 10, opacity: 0.6, fontFamily: "'Inter', -apple-system, sans-serif" }}>{t.footnote.addFootnoteTip}</span>
            </div>
          ) : (
            footnotes.map((footnote, index) => {
              const isActive = activeFootnoteId === footnote.id
              const isHovered = hoveredId === footnote.id
              const color = getFootnoteColor(index)

              return (
                <button
                  key={footnote.id}
                  onClick={(e) => handleClick(footnote, e)}
                  onMouseEnter={() => setHoveredId(footnote.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    width: '100%',
                    padding: '6px 8px',
                    border: 'none',
                    background: isActive
                      ? 'rgba(59, 130, 246, 0.08)'
                      : isHovered
                        ? 'rgba(59, 130, 246, 0.04)'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    borderRadius: 6,
                    position: 'relative',
                    marginBottom: 2,
                  }}
                  title={footnote.fullContent}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 2,
                      height: 14,
                      borderRadius: 1,
                      background: `linear-gradient(to bottom, ${color}, ${getFootnoteColor(index + 1)})`,
                    }} />
                  )}

                  <div style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 6,
                    backgroundColor: isActive
                      ? `${color}18`
                      : isHovered
                        ? `${color}0a`
                        : 'rgba(128, 128, 128, 0.06)',
                    color: isActive ? color : 'var(--mc-text-secondary)',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    border: isActive ? `1px solid ${color}30` : '1px solid transparent',
                  }}>
                    {index + 1}
                  </div>

                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    paddingTop: 1,
                  }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 11,
                      fontWeight: 500,
                      color: isActive ? color : (isHovered ? color : 'var(--link-color)'),
                      transition: 'color 0.15s ease',
                    }}>
                      [^{footnote.id.split('-')[0] || footnote.id}]
                    </span>
                    {' '}
                    <span style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'var(--mc-text-secondary)',
                      opacity: isActive ? 0.85 : 0.65,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {footnote.content}
                    </span>
                  </div>

                  <div style={{
                    flexShrink: 0,
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    backgroundColor: color,
                    opacity: isActive ? 0.8 : 0.2,
                    marginTop: 7,
                    transition: 'opacity 0.15s ease',
                  }} />
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default FootnoteSidebar

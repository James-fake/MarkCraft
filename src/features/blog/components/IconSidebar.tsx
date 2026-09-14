import { useState } from 'react'
import { useLanguage } from '@stores/LanguageStore'

export type PanelKey = 'style' | 'color' | 'content' | 'features' | 'css' | 'export'

interface IconSidebarProps {
  activePanel: PanelKey | null
  onPanelChange: (panel: PanelKey | null) => void
  isDark?: boolean
}

const ICONS: Array<{ key: PanelKey; path: string; labelKey: string; accent: string }> = [
  {
    key: 'style',
    path: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    labelKey: 'styleTab',
    accent: '#a78bfa',
  },
  {
    key: 'color',
    path: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z',
    labelKey: 'colorTab',
    accent: '#f472b6',
  },
  {
    key: 'content',
    path: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    labelKey: 'contentTab',
    accent: '#38bdf8',
  },
  {
    key: 'features',
    path: 'M13 10V3L4 14h7v7l9-11h-7z',
    labelKey: 'featuresTab',
    accent: '#fb923c',
  },
  {
    key: 'css',
    path: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
    labelKey: 'customCss',
    accent: '#34d399',
  },
  {
    key: 'export',
    path: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
    labelKey: 'generateBlog',
    accent: '#fbbf24',
  },
]

export default function IconSidebar({ activePanel, onPanelChange, isDark = true }: IconSidebarProps) {
  const { t } = useLanguage()
  const [hoveredKey, setHoveredKey] = useState<PanelKey | null>(null)

  const d = isDark
  const sidebarBg = d ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)'
  const sidebarBorder = d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
  const separatorColor = d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const tooltipBg = d ? 'rgba(15,15,20,0.95)' : 'rgba(255,255,255,0.97)'
  const tooltipBorder = d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const tooltipColor = d ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
  const tooltipShadow = d ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
  const btnHoverBg = d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const btnHoverColor = d ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'
  const btnIdleColor = d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)'

  return (
    <div style={{
      width: 52,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 10,
      borderRight: `1px solid ${sidebarBorder}`,
      background: sidebarBg,
      gap: 2,
    }}>
      {ICONS.map((icon, idx) => {
        const isActive = activePanel === icon.key
        const isHovered = hoveredKey === icon.key
        const label = (t.blogStudio as Record<string, string>)[icon.labelKey] || icon.key

        return (
          <div key={icon.key}>
            {idx === 4 && (
              <div style={{
                width: 22, height: 1,
                background: separatorColor,
                margin: '6px auto 8px',
              }} />
            )}

            <div style={{ position: 'relative' }}>
              {/* Tooltip */}
              {isHovered && !isActive && (
                <div style={{
                  position: 'absolute',
                  left: 48,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  color: tooltipColor,
                  fontSize: 11,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  zIndex: 100,
                  pointerEvents: 'none',
                  boxShadow: tooltipShadow,
                }}>
                  {label}
                  <div style={{
                    position: 'absolute',
                    left: -4,
                    top: '50%',
                    transform: 'translateY(-50%) rotate(45deg)',
                    width: 8,
                    height: 8,
                    background: tooltipBg,
                    borderLeft: `1px solid ${tooltipBorder}`,
                    borderBottom: `1px solid ${tooltipBorder}`,
                  }} />
                </div>
              )}

              <button
                onClick={() => onPanelChange(isActive ? null : icon.key)}
                onMouseEnter={() => setHoveredKey(icon.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: 12,
                  background: isActive
                    ? `${icon.accent}18`
                    : isHovered
                      ? btnHoverBg
                      : 'transparent',
                  color: isActive
                    ? icon.accent
                    : isHovered
                      ? btnHoverColor
                      : btnIdleColor,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  position: 'relative',
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                </svg>

                {isActive && (
                  <div style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 13,
                    border: `1.5px solid ${icon.accent}50`,
                    boxShadow: `0 0 12px ${icon.accent}20`,
                    pointerEvents: 'none',
                  }} />
                )}
              </button>

              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: -7,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 18,
                  borderRadius: 2,
                  background: icon.accent,
                  boxShadow: `0 0 8px ${icon.accent}60`,
                }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

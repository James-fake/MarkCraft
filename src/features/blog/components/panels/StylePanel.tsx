import { PanelProps, useLabels } from './shared'
import { SectionLabel, useStudioTheme } from '../StudioControls'
import { ThemePanel } from './ThemePanel'
import { useDensity, scaleGap } from '@hooks/useDensity'

interface StylePanelProps extends PanelProps {}

export function StylePanel({ designConfig, handleDesignChange }: StylePanelProps) {
  const { t } = useLabels()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(20, density)

  // Theme-aware color tokens for cards & controls
  const card = {
    border: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
    bg: d ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)',
    color: d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)',
    activeColor: d ? '#e4e4e7' : '#1a1a1a',
  }
  const seg = {
    bg: d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    border: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
    idle: d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      {/* Blog Style — Theme Marketplace */}
      <ThemePanel
        currentThemeStyle={designConfig.themeStyle}
        onThemeChange={(themeStyle) => {
          handleDesignChange('themeStyle', themeStyle)
          if (themeStyle === 'magazine' || themeStyle === 'minimal' || themeStyle === 'classic') {
            handleDesignChange('layout', themeStyle)
          }
        }}
      />

      {/* Theme Mode — Segmented control */}
      <div>
        <SectionLabel>{t.blogStudio.themeMode}</SectionLabel>
        <div style={{
          display: 'flex', padding: 3, gap: 2,
          background: seg.bg,
          borderRadius: 10, border: `1px solid ${seg.border}`,
        }}>
          {[
            { key: 'light' as const, label: t.blogStudio.lightTheme, icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' },
            { key: 'dark' as const, label: t.blogStudio.darkTheme, icon: 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z' },
          ].map(opt => {
            const isActive = designConfig.theme === opt.key
            return (
              <button key={opt.key} onClick={() => handleDesignChange('theme', opt.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0',
                  border: 'none',
                  borderRadius: 8,
                  background: isActive ? 'rgba(167,139,250,0.12)' : 'transparent',
                  color: isActive ? card.activeColor : seg.idle,
                  cursor: 'pointer',
                  fontSize: 11, fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(167,139,250,0.15)' : 'none',
                }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}

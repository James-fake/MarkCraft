import { PanelProps, useLabels, COLOR_SCHEMES, THEME_STYLE_OPTIONS } from './shared'
import { adjustColorLightness } from '../../templates/utils'
import { SectionLabel, useStudioTheme } from '../StudioControls'
import ColorPicker from '../ColorPicker'
import { useDensity, scaleGap } from '@hooks/useDensity'

export function ColorPanel({ designConfig, handleDesignChange }: PanelProps) {
  const { colorSchemeLabels, themeStyleLabels, t } = useLabels()
  const { isDark } = useStudioTheme()
  const d = isDark
  const density = useDensity()
  const panelGap = scaleGap(16, density)
  const swatchBg = d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
  const previewBorder = d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)'
  const previewBg = d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'

  // Get current active color hex
  const activeScheme = COLOR_SCHEMES.find(c => c.key === designConfig.colorScheme)
  const currentColor = designConfig.colorScheme === 'custom'
    ? designConfig.customColor
    : (activeScheme?.color || '#d97706')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: panelGap }}>
      {/* 12 Basic Color Swatches */}
      <div>
        <SectionLabel>{t.blogStudio.colorScheme}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
          {COLOR_SCHEMES.map(scheme => {
            const isActive = designConfig.colorScheme === scheme.key
            return (
              <button key={scheme.key}
                onClick={() => {
                  handleDesignChange('colorScheme', scheme.key)
                  handleDesignChange('customColor', scheme.color)
                }}
                title={colorSchemeLabels[scheme.key]}
                style={{
                  width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isActive ? `2px solid ${scheme.color}` : '2px solid transparent',
                  borderRadius: 10, background: isActive ? `${scheme.color}18` : swatchBg,
                  cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
                }}
              >
                <div style={{
                  width: '70%', aspectRatio: '1', borderRadius: 6, background: scheme.color,
                  boxShadow: isActive
                    ? `0 0 0 1px rgba(10,10,16,0.8), 0 0 8px ${scheme.color}40`
                    : 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  transition: 'box-shadow 0.2s ease',
                }} />
              </button>
            )
          })}
          {/* Custom color button — its border/background stay FIXED (swatchBg) so the
              menu doesn't recolor while dragging the palette. The picked custom color is
              shown only inside the small swatch dot, like the 12 preset swatches. */}
          <button
            onClick={() => {
              handleDesignChange('colorScheme', 'custom')
            }}
            title={t.blogStudio.customColor}
            style={{
              width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid transparent',
              borderRadius: 10,
              background: swatchBg,
              cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
            }}
          >
            <div style={{
              width: '70%', aspectRatio: '1', borderRadius: 6,
              background: designConfig.colorScheme === 'custom'
                ? designConfig.customColor
                : 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              boxShadow: designConfig.colorScheme === 'custom'
                ? `0 0 0 1px rgba(10,10,16,0.8), 0 0 8px ${designConfig.customColor}40`
                : 'inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'box-shadow 0.2s ease',
            }} />
          </button>
        </div>
      </div>

      {/* Professional Color Picker */}
      <div>
        <SectionLabel>{t.blogStudio.colorPalette}</SectionLabel>
        <ColorPicker
          color={designConfig.customColor}
          lightness={designConfig.colorLightness}
          saturation={designConfig.colorSaturation}
          sharpness={designConfig.colorSharpness}
          onColorChange={(hex) => {
            handleDesignChange('customColor', hex)
            if (designConfig.colorScheme !== 'custom') {
              handleDesignChange('colorScheme', 'custom')
            }
          }}
          onLightnessChange={(v) => handleDesignChange('colorLightness', v)}
          onSaturationChange={(v) => handleDesignChange('colorSaturation', v)}
          onSharpnessChange={(v) => handleDesignChange('colorSharpness', v)}
        />
      </div>

      {/* Preview Card */}
      <div>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${previewBorder}` }}>
          {(() => {
            const activeStyle = THEME_STYLE_OPTIONS.find(s => s.key === designConfig.themeStyle)
            const lightness = designConfig.colorLightness
            const accentColor = adjustColorLightness(currentColor, lightness)
            const dynamicGradient = activeStyle ? `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` : 'linear-gradient(135deg, #666, #999)'
            return (
              <div style={{ position: 'relative' }}>
                <div style={{ height: 64, background: dynamicGradient, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(to top, rgba(10,10,16,0.9), transparent)' }} />
                  <div style={{ position: 'absolute', top: 10, right: 14, width: 20, height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.15)', filter: 'blur(4px)' }} />
                </div>
                <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: previewBg }}>
                  <span style={{ fontSize: 10, fontWeight: 500, opacity: d ? 0.5 : 0.65 }}>
                    {themeStyleLabels[designConfig.themeStyle]} · {designConfig.colorScheme === 'custom' ? t.blogStudio.customColor : colorSchemeLabels[designConfig.colorScheme]}
                  </span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 4, background: accentColor, boxShadow: `0 0 8px ${accentColor}40` }} />
                    <div style={{ width: 10, height: 10, borderRadius: 4, background: designConfig.theme === 'dark' ? '#1a1a2e' : '#f8f8f8', border: `1px solid ${d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'}` }} />
                  </div>
                </div>
                <div style={{ display: 'flex', height: 3 }}>
                  <div style={{ flex: 3, background: accentColor }} />
                  <div style={{ flex: 2, background: designConfig.theme === 'dark' ? '#1a1a2e' : '#f5f3ef' }} />
                  <div style={{ flex: 1, background: accentColor, opacity: 0.3 }} />
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

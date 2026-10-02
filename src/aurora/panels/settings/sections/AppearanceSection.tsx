import { useSettings } from '@stores/SettingsStore'
import { useDensitySetting, setDensitySetting } from '@stores/densityStore'
import { getThemes, EditorTheme } from '@features/themes'
import { CODE_THEMES } from '@features/themes'
import { useSettingsQuery } from '../settingsSearch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { Switch } from '@components/ui/Switch'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { useLanguage } from '@stores/LanguageStore'
import type { Translations } from '../../../../locales/zh'

type SAKey = keyof Translations['settingsAppearance']

const FONT_OPTIONS: { value: string; label?: string; labelKey?: SAKey }[] = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: 'System Default' },
  { value: "'Georgia', 'Noto Serif SC', serif", label: 'Georgia / Noto Serif' },
  { value: "'Source Han Sans SC', 'Noto Sans SC', sans-serif", labelKey: 'fontSourceHanSans' },
  { value: "'Source Han Serif SC', 'Noto Serif SC', serif", labelKey: 'fontSourceHanSerif' },
  { value: "'LXGW WenKai', sans-serif", labelKey: 'fontLxgw' },
]

const CODE_FONT_OPTIONS = [
  { value: "'Fira Code', 'Consolas', monospace", label: 'Fira Code' },
  { value: "'JetBrains Mono', 'Consolas', monospace", label: 'JetBrains Mono' },
  { value: "'Source Code Pro', 'Consolas', monospace", label: 'Source Code Pro' },
  { value: "'Cascadia Code', 'Consolas', monospace", label: 'Cascadia Code' },
  { value: "'Consolas', 'Monaco', monospace", label: 'Consolas' },
]

/**
 * 外观设置分组 —— 接真实 useSettings() + 真实主题/代码主题/密度来源
 */
export function AppearanceSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { t } = useLanguage()
  const A = t.settingsAppearance
  const density = useDensitySetting()
  const allThemes: EditorTheme[] = getThemes()
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    [A.themeMode, ''],
    [A.density, A.densityDesc],
    [A.uiFont, A.uiFontDesc],
    [A.uiFontSize, A.uiFontSizeDesc],
    [A.lineHeight, ''],
    [A.codeFont, ''],
    [A.codeTheme, ''],
    [A.sidebarWidth, A.sidebarWidthDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const fontIsCustom = !FONT_OPTIONS.some(o => o.value === settings.fontFamily)
  const codeFontIsCustom = !CODE_FONT_OPTIONS.some(o => o.value === settings.codeFontFamily)

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{A.themeTitle}</div>
        <div className="aurora-settings__section-desc">{A.themeDesc}</div>
        {match(A.themeMode, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.themeMode}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={A.themeMode}
                value={settings.theme}
                onChange={(v) => updateSetting('theme', v)}
                options={allThemes.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{A.densityTitle}</div>
        <div className="aurora-settings__section-desc">{A.densityDesc}</div>
        {match(A.density, A.densityDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.density}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={A.density}
                value={density}
                onChange={(v) => setDensitySetting(v as 'compact' | 'comfortable')}
                options={[
                  { value: 'comfortable', label: A.comfortable },
                  { value: 'compact', label: A.compact },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{A.a11yTitle}</div>
        <div className="aurora-settings__section-desc">{A.a11yDesc}</div>
        {match(A.highContrast, A.highContrastDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.highContrast}</div>
              <div className="aurora-settings__item-desc">{A.highContrastDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch
                checked={settings.contrast === 'high'}
                onChange={(v) => updateSetting('contrast', v ? 'high' : 'normal')}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{A.fontTitle}</div>
        {match(A.uiFont, A.uiFontDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.uiFont}</div>
              <div className="aurora-settings__item-desc">{A.uiFontDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={A.uiFont}
                value={fontIsCustom ? '__custom__' : settings.fontFamily}
                onChange={(v) => { if (v !== '__custom__') updateSetting('fontFamily', v) }}
                options={[
                  ...FONT_OPTIONS.map(o => ({ value: o.value, label: o.labelKey ? A[o.labelKey] : (o.label as string) })),
                  ...(fontIsCustom ? [{ value: '__custom__', label: 'Custom' }] : []),
                ]}
              />
              {fontIsCustom && (
                <input
                  type="text"
                  className="aurora-settings__text"
                  value={settings.fontFamily}
                  onChange={e => updateSetting('fontFamily', e.target.value)}
                />
              )}
            </div>
          </div>
        )}
        {match(A.uiFontSize, A.uiFontSizeDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.uiFontSize}</div>
              <div className="aurora-settings__item-desc">{A.uiFontSizeDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <ScrollNumberInput
                className="aurora-settings__number"
                value={settings.fontSize}
                min={10}
                max={28}
                onChange={(n) => { if (!Number.isNaN(n)) updateSetting('fontSize', Math.min(28, Math.max(10, n))) }}
              />
            </div>
          </div>
        )}
        {match(A.lineHeight, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.lineHeight}</div>
            </div>
            <div className="aurora-settings__item-control">
              <ScrollNumberInput
                className="aurora-settings__number"
                value={settings.lineHeight}
                min={1}
                max={3}
                step={0.1}
                onChange={(n) => { if (!Number.isNaN(n)) updateSetting('lineHeight', Math.min(3, Math.max(1, n))) }}
              />
            </div>
          </div>
        )}
        {match(A.codeFont, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.codeFont}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={A.codeFont}
                value={codeFontIsCustom ? '__custom__' : settings.codeFontFamily}
                onChange={(v) => { if (v !== '__custom__') updateSetting('codeFontFamily', v) }}
                options={[
                  ...CODE_FONT_OPTIONS.map(o => ({ value: o.value, label: o.label })),
                  ...(codeFontIsCustom ? [{ value: '__custom__', label: 'Custom' }] : []),
                ]}
              />
              {codeFontIsCustom && (
                <input
                  type="text"
                  className="aurora-settings__text"
                  value={settings.codeFontFamily}
                  onChange={e => updateSetting('codeFontFamily', e.target.value)}
                />
              )}
            </div>
          </div>
        )}
        {match(A.codeTheme, '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.codeTheme}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={A.codeTheme}
                value={settings.codeTheme}
                onChange={(v) => updateSetting('codeTheme', v)}
                options={CODE_THEMES.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
          </div>
        )}
        {match(A.sidebarWidth, A.sidebarWidthDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{A.sidebarWidth}</div>
              <div className="aurora-settings__item-desc">{A.sidebarWidthDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <ScrollNumberInput
                className="aurora-settings__number"
                value={settings.sidebarWidth}
                min={160}
                max={400}
                step={10}
                onChange={(n) => { if (!Number.isNaN(n)) updateSetting('sidebarWidth', Math.min(400, Math.max(160, n))) }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

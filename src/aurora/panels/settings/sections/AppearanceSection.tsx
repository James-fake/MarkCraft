import { useSettings } from '@stores/SettingsStore'
import { useDensitySetting, setDensitySetting } from '@stores/densityStore'
import { getThemes, EditorTheme } from '@features/themes'
import { CODE_THEMES } from '@features/themes'
import { useSettingsQuery } from '../settingsSearch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { Switch } from '@components/ui/Switch'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'

const FONT_OPTIONS = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: 'System Default' },
  { value: "'Georgia', 'Noto Serif SC', serif", label: 'Georgia / Noto Serif' },
  { value: "'Source Han Sans SC', 'Noto Sans SC', sans-serif", label: '思源黑体' },
  { value: "'Source Han Serif SC', 'Noto Serif SC', serif", label: '思源宋体' },
  { value: "'LXGW WenKai', sans-serif", label: '霞鹜文楷' },
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
  const density = useDensitySetting()
  const allThemes: EditorTheme[] = getThemes()
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    ['主题模式', ''],
    ['密度', '调整界面元素的紧凑程度'],
    ['界面字体', '正文与 UI 文字字体'],
    ['界面字号', '调整整体界面文字大小'],
    ['行高', ''],
    ['代码字体', ''],
    ['代码主题', ''],
    ['侧边栏宽度', '文件导航栏的默认宽度'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const fontIsCustom = !FONT_OPTIONS.some(o => o.value === settings.fontFamily)
  const codeFontIsCustom = !CODE_FONT_OPTIONS.some(o => o.value === settings.codeFontFamily)

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">主题</div>
        <div className="aurora-settings__section-desc">选择应用的外观主题</div>
        {match('主题模式', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">主题模式</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="主题模式"
                value={settings.theme}
                onChange={(v) => updateSetting('theme', v)}
                options={allThemes.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">布局密度</div>
        <div className="aurora-settings__section-desc">调整界面元素的紧凑程度（与侧边栏切换按钮共享同一来源）</div>
        {match('密度', '调整界面元素的紧凑程度') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">密度</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="密度"
                value={density}
                onChange={(v) => setDensitySetting(v as 'compact' | 'comfortable')}
                options={[
                  { value: 'comfortable', label: '舒适' },
                  { value: 'compact', label: '紧凑' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">辅助功能</div>
        <div className="aurora-settings__section-desc">提高文本与分隔线的对比度（Increase Contrast）</div>
        {match('高对比度', '提高文本与分隔线的对比度') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">高对比度</div>
              <div className="aurora-settings__item-desc">提亮文本、加粗发丝分隔线，改善低视力可读性</div>
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
        <div className="aurora-settings__section-title">字体</div>
        {match('界面字体', '正文与 UI 文字字体') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">界面字体</div>
              <div className="aurora-settings__item-desc">正文与 UI 文字字体</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="界面字体"
                value={fontIsCustom ? '__custom__' : settings.fontFamily}
                onChange={(v) => { if (v !== '__custom__') updateSetting('fontFamily', v) }}
                options={[
                  ...FONT_OPTIONS.map(o => ({ value: o.value, label: o.label })),
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
        {match('界面字号', '调整整体界面文字大小') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">界面字号</div>
              <div className="aurora-settings__item-desc">调整整体界面文字大小</div>
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
        {match('行高', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">行高</div>
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
        {match('代码字体', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">代码字体</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="代码字体"
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
        {match('代码主题', '') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">代码主题</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="代码主题"
                value={settings.codeTheme}
                onChange={(v) => updateSetting('codeTheme', v)}
                options={CODE_THEMES.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
          </div>
        )}
        {match('侧边栏宽度', '文件导航栏的默认宽度') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">侧边栏宽度</div>
              <div className="aurora-settings__item-desc">文件导航栏的默认宽度（像素）</div>
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

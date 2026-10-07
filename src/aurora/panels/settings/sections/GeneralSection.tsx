import { useSettings } from '@stores/SettingsStore'
import { useLanguage } from '@stores/LanguageStore'
import { Switch } from '@components/ui/Switch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { useSettingsQuery } from '../settingsSearch'

/**
 * 通用设置分组 —— 接真实 useSettings()
 * 仅暴露真实 AppSettings 中属于「启动与恢复」语义的字段；
 * 不实现真实代码无对应 key 的字段（autoUpdate / openLastFile / sendAnalytics / language）。
 */
export function GeneralSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { t, language, setLanguage } = useLanguage()
  const G = t.settingsGeneral
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    [G.language, G.languageDesc],
    [G.autoSave, G.autoSaveDesc],
    [G.showSidebar, G.showSidebarDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{G.sectionTitle}</div>
        {match(G.language, G.languageDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{G.language}</div>
              <div className="aurora-settings__item-desc">{G.languageDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={G.language}
                value={language}
                onChange={(v) => setLanguage(v as 'zh' | 'en')}
                options={[
                  { value: 'zh', label: G.langZh },
                  { value: 'en', label: G.langEn },
                ]}
              />
            </div>
          </div>
        )}
        {match(G.autoSave, G.autoSaveDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{G.autoSave}</div>
              <div className="aurora-settings__item-desc">{G.autoSaveDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <ScrollNumberInput
                className="aurora-settings__number"
                value={settings.autoSaveInterval}
                min={5}
                max={300}
                onChange={(n) => { if (!Number.isNaN(n)) updateSetting('autoSaveInterval', Math.min(300, Math.max(5, n))) }}
              />
            </div>
          </div>
        )}
        {match(G.showSidebar, G.showSidebarDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{G.showSidebar}</div>
              <div className="aurora-settings__item-desc">{G.showSidebarDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch
                checked={settings.defaultSidebarVisible}
                onChange={v => updateSetting('defaultSidebarVisible', v)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

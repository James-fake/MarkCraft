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
  const { language, setLanguage } = useLanguage()
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    ['界面语言', '应用界面显示语言'],
    ['自动保存间隔', '编辑时按此间隔自动保存更改到本地'],
    ['启动时显示侧边栏', '应用启动时默认展开左侧文件导航'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">启动与恢复</div>
        {match('界面语言', '应用界面显示语言') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">界面语言</div>
              <div className="aurora-settings__item-desc">应用界面显示语言</div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel="界面语言"
                value={language}
                onChange={(v) => setLanguage(v as 'zh' | 'en')}
                options={[
                  { value: 'zh', label: '简体中文' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
          </div>
        )}
        {match('自动保存间隔', '编辑时按此间隔自动保存更改到本地') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">自动保存间隔（秒）</div>
              <div className="aurora-settings__item-desc">编辑时按此间隔自动保存更改到本地</div>
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
        {match('启动时显示侧边栏', '应用启动时默认展开左侧文件导航') && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">启动时显示侧边栏</div>
              <div className="aurora-settings__item-desc">应用启动时默认展开左侧文件导航</div>
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

import { useSettings } from '@stores/SettingsStore'
import type { AppSettings } from '@stores/SettingsStore'
import { Switch } from '@components/ui/Switch'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useSettingsQuery } from '../settingsSearch'
import { useLanguage } from '@stores/LanguageStore'

/**
 * 图片设置分组 —— 接真实 useSettings()
 * 映射真实 AppSettings 的 Image 区字段：
 * - imageHostType: 'none' | 'picgo' | 'custom'
 * - useRelativeImagePath: boolean
 * - imageHostPicgoPath / imageHostCustomUrl / imageHostCustomToken：图床配置
 */
export function ImageSection({ query }: { query?: string; toast?: (msg: string) => void }) {
  const { settings, updateSetting } = useSettings()
  const { t } = useLanguage()
  const I = t.settingsImage
  const { q, match } = useSettingsQuery(query)

  const hasAny = !q || [
    [I.hostType, I.hostTypeDesc],
    [I.relPath, I.relPathDesc],
    [I.picgoPath, I.picgoPathDesc],
    [I.customUrl, I.customUrlDesc],
    [I.token, I.tokenDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{I.imgTitle}</div>
        {match(I.hostType, I.hostTypeDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{I.hostType}</div>
              <div className="aurora-settings__item-desc">
                {I.hostTypeDesc}
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <AuroraSelect
                ariaLabel={I.hostType}
                value={settings.imageHostType}
                onChange={(v) => updateSetting('imageHostType', v as AppSettings['imageHostType'])}
                options={[
                  { value: 'none', label: I.hostNone },
                  { value: 'picgo', label: 'PicGo' },
                  { value: 'custom', label: I.hostCustom },
                ]}
              />
            </div>
          </div>
        )}
        {match(I.relPath, I.relPathDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{I.relPath}</div>
              <div className="aurora-settings__item-desc">
                {I.relPathDesc}
              </div>
            </div>
            <div className="aurora-settings__item-control">
              <Switch
                checked={settings.useRelativeImagePath}
                onChange={v => updateSetting('useRelativeImagePath', v)}
              />
            </div>
          </div>
        )}
        {settings.imageHostType === 'picgo' && match(I.picgoPath, I.picgoPathDesc) && (
          <div className="aurora-settings__item">
            <div className="aurora-settings__item-info">
              <div className="aurora-settings__item-label">{I.picgoPath}</div>
              <div className="aurora-settings__item-desc">{I.picgoPathDesc}</div>
            </div>
            <div className="aurora-settings__item-control">
              <input
                type="text"
                className="aurora-settings__text"
                placeholder="picgo upload"
                value={settings.imageHostPicgoPath}
                onChange={e => updateSetting('imageHostPicgoPath', e.target.value)}
              />
            </div>
          </div>
        )}
        {settings.imageHostType === 'custom' && (
          <>
            {match(I.customUrl, I.customUrlDesc) && (
              <div className="aurora-settings__item">
                <div className="aurora-settings__item-info">
                  <div className="aurora-settings__item-label">{I.customUrl}</div>
                  <div className="aurora-settings__item-desc">{I.customUrlDesc}</div>
                </div>
                <div className="aurora-settings__item-control">
                  <input
                    type="text"
                    className="aurora-settings__text"
                    placeholder="https://your-cdn.com/upload"
                    value={settings.imageHostCustomUrl}
                    onChange={e => updateSetting('imageHostCustomUrl', e.target.value)}
                  />
                </div>
              </div>
            )}
            {match(I.token, I.tokenDesc) && (
              <div className="aurora-settings__item">
                <div className="aurora-settings__item-info">
                  <div className="aurora-settings__item-label">{I.token}</div>
                  <div className="aurora-settings__item-desc">{I.tokenDesc}</div>
                </div>
                <div className="aurora-settings__item-control">
                  <input
                    type="text"
                    className="aurora-settings__text"
                    placeholder={I.tokenPlaceholder}
                    value={settings.imageHostCustomToken}
                    onChange={e => updateSetting('imageHostCustomToken', e.target.value)}
                  />
                </div>
              </div>
            )}
            {!settings.imageHostCustomUrl.trim() && match(I.customUrl, '') && (
              <div className="aurora-settings__item-hint">{I.customUrlHint}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useSettings } from '@stores/SettingsStore'
import { useLanguage } from '@stores/LanguageStore'
import { Switch } from '@components/ui/Switch'
import { Button } from '@components/ui/Button'
import { useSettingsQuery } from '../settingsSearch'
import { PrivacyPolicyModal } from '@features/telemetry/PrivacyPolicyModal'

/**
 * 隐私与数据设置分区 —— 匿名体验改善计划的开关 + 隐私政策查看。
 * 默认关闭（opt-in）；关闭后停止上报且清空缓冲（由 telemetry 模块保证）。
 */
export function PrivacySection({ query }: { query?: string }) {
  const { settings, updateSetting } = useSettings()
  const { t } = useLanguage()
  const SP = t.settingsPanel
  const { q, match } = useSettingsQuery(query)
  const [showPolicy, setShowPolicy] = useState(false)
  const enabled = settings.telemetryConsent === 'granted'

  const hasAny = !q || [SP.enabledLabel, SP.enabledDesc, SP.viewPolicy].some((s) => match(s, ''))
  if (!hasAny) return null

  return (
    <div>
      <div className="aurora-settings__section">
        <div className="aurora-settings__section-title">{SP.privacyTitle}</div>

        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">{SP.enabledLabel}</div>
            <div className="aurora-settings__item-desc">{SP.enabledDesc}</div>
          </div>
          <div className="aurora-settings__item-control">
            <Switch
              checked={enabled}
              onChange={(v) => updateSetting('telemetryConsent', v ? 'granted' : 'denied')}
            />
          </div>
        </div>

        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">
              {enabled ? SP.statusOn : SP.statusOff}
            </div>
          </div>
          <div className="aurora-settings__item-control">
            <Button variant="ghost" onClick={() => setShowPolicy(true)}>
              {SP.viewPolicy}
            </Button>
          </div>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        title={SP.privacyTitle}
      />
    </div>
  )
}

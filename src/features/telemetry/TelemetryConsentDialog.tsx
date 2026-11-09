import { useState } from 'react'
import { Modal } from '@components/ui/Modal'
import { Button } from '@components/ui/Button'
import { useLanguage } from '@stores/LanguageStore'

export interface TelemetryConsentDialogProps {
  /** 用户做出选择后回调；'granted' = 加入，'denied' = 拒绝/暂不 */
  onResolve: (consent: 'granted' | 'denied') => void
}

/**
 * 首次运行（consent === 'unset'）时的匿名统计授权弹窗。
 *
 * 关键：复选框**默认不勾选**（opt-in）；两个按钮都明确给出选择，不通过遮罩误关来决策。
 *
 * ⚠️ 隐私政策已在首启引导（OnboardingScreen 第 3 步）完整呈现并需勾选确认，
 *    故此处**不再重复提供「查看隐私政策」入口**——否则「过完引导界面隐私又出现」会形成重复打扰。
 *    隐私政策仍可在「设置 → 关于 → 隐私政策」随时查看。
 */
export function TelemetryConsentDialog({ onResolve }: TelemetryConsentDialogProps) {
  const { t } = useLanguage()
  const SP = t.settingsPanel
  const [checked, setChecked] = useState(false)

  return (
    <Modal
      isOpen
      onClose={() => onResolve('denied')}
      title={SP.consentTitle}
      size="md"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => onResolve('denied')}>
            {SP.consentDecline}
          </Button>
          <Button variant="primary" onClick={() => onResolve(checked ? 'granted' : 'denied')}>
            {SP.consentJoin}
          </Button>
        </>
      }
    >
      <p className="aurora-telemetry__desc">{SP.consentDesc}</p>
      <label className="aurora-telemetry__check" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span>{SP.consentCheckbox}</span>
      </label>
    </Modal>
  )
}

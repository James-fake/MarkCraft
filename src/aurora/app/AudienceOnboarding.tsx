import { useState } from 'react'
import { applyAudienceDefaults, useSettings } from '../../stores/SettingsStore'
import type { AppSettings } from '../../stores/SettingsStore'

/**
 * 受众首启引导（P1 · 2.3）
 *
 * 首次进入 Aurora 时展示受众身份选择，调用真实 applyAudienceDefaults(audience)
 * 逐键套用默认设置，并标记 localStorage['markcraft.onboarding.seen']=1，二次进入不再弹出。
 */
interface AudienceOption {
  id: NonNullable<AppSettings['audience']>
  label: string
  desc: string
}

const OPTIONS: AudienceOption[] = [
  { id: 'writer', label: '知识型写作者', desc: '适合 PKM 笔记与长文写作，默认开启大纲' },
  { id: 'blogger', label: '独立博主', desc: '适合博客创作与发布，默认开启大纲' },
  { id: 'student', label: '学生 · 终身学习者', desc: '适合课堂笔记与资料整理，默认开启大纲' },
]

export interface AudienceOnboardingProps {
  /** 完成选择后的回调（父级负责收起浮层） */
  onDone: () => void
}

export function AudienceOnboarding({ onDone }: AudienceOnboardingProps) {
  const { updateSetting } = useSettings()
  const [selected, setSelected] = useState<AudienceOption['id']>('writer')

  const handleConfirm = () => {
    const defaults = applyAudienceDefaults(selected)
    for (const [key, value] of Object.entries(defaults)) {
      updateSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
    }
    try {
      localStorage.setItem('markcraft.onboarding.seen', '1')
    } catch {}
    onDone()
  }

  return (
    <div className="aurora-audience">
      <div className="aurora-audience__backdrop" />
      <div className="aurora-audience__panel">
        <div className="aurora-audience__title">欢迎使用 MarkCraft</div>
        <div className="aurora-audience__desc">
          选择你的使用身份，MarkCraft 将据此调整默认设置（可随时在「设置」中更改）
        </div>
        <div className="aurora-audience__options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={[
                'aurora-audience__option',
                selected === opt.id ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelected(opt.id)}
            >
              <span className="aurora-audience__option-label">{opt.label}</span>
              <span className="aurora-audience__option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
        <div className="aurora-audience__actions">
          <button type="button" className="aurora-audience__btn" onClick={handleConfirm}>
            开始使用
          </button>
        </div>
      </div>
    </div>
  )
}

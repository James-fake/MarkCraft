import { useMemo, useState } from 'react'
import { commandRegistry } from '@services/command/commandRegistry'
import { useLanguage } from '@stores/LanguageStore'
import { useSettings } from '@stores/SettingsStore'
import { useUserProfile } from '@stores/UserProfileStore'
import { markProfileOnboardingDone } from '@features/onboarding/profileOnboarding'
import { markdownToHtml } from '@features/editor/mdToHtml'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import { Icon } from '../icons'
import { TitleBar } from '../components/shell/TitleBar'
import { useToast } from '../../components/ui/ToastProvider'
import { ProfileForm } from './ProfileForm'
import '../styles/onboarding.css'
import policyZh from '../../../docs/PRIVACY_POLICY_zh.md?raw'
import policyEn from '../../../docs/PRIVACY_POLICY_en.md?raw'
import { BrandLogo } from '../components/BrandLogo'

const noopImageStore = {
  getBase64Image: () => null,
  hasImage: () => false,
  saveImage: () => '',
} as unknown as ImageStoreAPI

export interface OnboardingScreenProps {
  /** 走完（或跳过）—— 交给外壳切到主界面 */
  onDone: () => void
}

/**
 * 首启独立引导界面（Apple Setup Assistant 范式）。
 *
 * 设计要点（对齐 macOS HIG §9 视觉 / §5 键盘）：
 * - **无卡片框**：内容直接排在窗口背景上 —— 框住内容是「对话框思维」，Apple 的
 *   首启向导从来不给内容套壳；两团极淡的强调色径向光负责把舞台从「表单页」
 *   拉回「开场仪式」。
 * - **Return = 默认操作，Esc = 退出/回退**（HIG Rule 5.3 / 5.4）：首步 Return 继续、
 *   Esc 等同「以后再说」；后续步骤 Esc 回退一步；输入框里 Return 进入下一步。
 *   Esc 结束与标题栏关闭都会落下「已问过」标记，避免下次启动被强制重走引导。
 * - 步进动效尊重 `prefers-reduced-motion`（HIG Rule 11.3）。
 *
 * 流程（4 步）：欢迎 → 认识你（档案）→ 隐私政策（独立页）→ 体验改善计划（opt-in）。
 *
 * ⚠️ 必须保留 TitleBar：Electron 窗口是 `frame: false`（无系统标题栏），
 *    去掉它用户就没法最小化 / 关闭窗口。
 */
export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { t, language, toggleLanguage } = useLanguage()
  const O = t.onboarding
  const SP = t.settingsPanel
  const { updateSetting } = useSettings()
  const profile = useUserProfile()
  const toast = useToast()
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [ack, setAck] = useState(false)
  // 体验改善计划（匿名统计）授权：复选框默认不勾选（opt-in）
  const [consent, setConsent] = useState(false)

  const privacyHtml = useMemo(() => {
    const md = language === 'zh' ? policyZh : policyEn
    return markdownToHtml(md, noopImageStore)
  }, [language])

  // 窗口控制与 PageFrame 同源：走 commandRegistry 的真实命令，避免两套实现漂移
  const runCommand = (id: string) => commandRegistry.getById(id)?.action?.()

  /**
   * 结束引导。「是否已问过」的知识留在这里（而不是外壳），外壳只负责切界面。
   * - 进入：给一句确认（界面直接消失会让人怀疑「填的存住了吗」）
   * - 跳过：安静离开（用户已表达不想被打扰，再弹提示就是打扰）
   */
  const finish = (withToast: boolean) => {
    markProfileOnboardingDone()
    if (withToast) {
      const name = profile.nickname.trim()
      toast.show(name ? O.remembered.replace('{name}', name) : O.rememberedLater)
    }
    onDone()
  }

  // 体验改善计划：写入授权状态并结束引导（复选框未勾选时按「拒绝」处理，保持 opt-in）
  const resolveConsent = (join: boolean) => {
    updateSetting('telemetryConsent', join && consent ? 'granted' : 'denied')
    finish(true)
  }

  return (
    <div
      className="aurora-onboarding"
      onKeyDown={(e) => {
        // HIG Rule 5.3：Esc 回退一步；首步没有上一步，等同「以后再说」安静结束。
        // 必须走 finish()（而非只切界面），否则未填昵称的用户下次启动会被强制重走引导。
        if (e.key === 'Escape') {
          if (step === 0) finish(false)
          else if (step === 1) setStep(0)
          else if (step === 2) setStep(1)
          else if (step === 3) setStep(2)
        }
      }}
    >
      <TitleBar
        appName="MarkCraft"
        onMinimize={() => runCommand('window.minimize')}
        onMaximize={() => runCommand('window.zoom')}
        onClose={() => {
          // 直接退出也要记住「已经问过」，否则下次启动又被引导拦住
          markProfileOnboardingDone()
          runCommand('app.quit')
        }}
      />

      <div className="aurora-onboarding__stage">
        {/* 语言切换：引导界面挡住了设置入口，英文用户否则要走完流程才能改语言 */}
        <button
          type="button"
          className="aurora-onboarding__lang"
          onClick={toggleLanguage}
          title={language === 'zh' ? 'Switch to English' : '切换到中文'}
        >
          {language === 'zh' ? 'EN' : '中文'}
        </button>

        {/* key 驱动步进动效：换步即重放入场动画 */}
        <div className="aurora-onboarding__inner" key={step}>
          <div className="aurora-onboarding__dots" aria-hidden="true">
            <span className={step === 0 ? 'is-active' : ''} />
            <span className={step === 1 ? 'is-active' : ''} />
            <span className={step === 2 ? 'is-active' : ''} />
            <span className={step === 3 ? 'is-active' : ''} />
          </div>

          {step === 0 ? (
            <>
              <BrandLogo size={76} className="aurora-onboarding__brand" aria-hidden="true" />
              <h1 className="aurora-onboarding__title">{O.welcomeTitle}</h1>
              <p className="aurora-onboarding__subtitle">{O.welcomeSubtitle}</p>

              <ul className="aurora-onboarding__points">
                <li>
                  <span className="aurora-onboarding__point-icon" aria-hidden="true">
                    <Icon.file size={15} />
                  </span>
                  <span>{O.pointLocal}</span>
                </li>
                <li>
                  <span className="aurora-onboarding__point-icon" aria-hidden="true">
                    <Icon.export size={15} />
                  </span>
                  <span>{O.pointExport}</span>
                </li>
                <li>
                  <span className="aurora-onboarding__point-icon" aria-hidden="true">
                    <Icon.globe size={15} />
                  </span>
                  <span>{O.pointPublish}</span>
                </li>
              </ul>

              <button
                type="button"
                autoFocus
                className="aurora-onboarding__primary aurora-onboarding__primary--center"
                onClick={() => setStep(1)}
              >
                {O.next} →
              </button>
            </>
          ) : step === 1 ? (
            <>
              <h1 className="aurora-onboarding__title aurora-onboarding__title--sm">{O.title}</h1>
              <p className="aurora-onboarding__subtitle">{O.subtitle}</p>

              <ProfileForm onEnter={() => setStep(2)} />

              <div className="aurora-onboarding__actions">
                {/* 跳过是安静的：用户已经表达过不想被打扰，仍会进入隐私页 */}
                <button type="button" className="aurora-onboarding__ghost" onClick={() => setStep(2)}>
                  {O.skip}
                </button>
                <button type="button" className="aurora-onboarding__primary" onClick={() => setStep(2)}>
                  {O.next} →
                </button>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <h1 className="aurora-onboarding__title aurora-onboarding__title--sm">{O.privacyTitle}</h1>
              <p className="aurora-onboarding__subtitle">{O.privacyDesc}</p>

              <div className="aurora-onboarding__privacy">
                {/* 文档为产品自带的静态内容，无外部输入，安全 */}
                <div
                  className="aurora-prose aurora-privacy-policy"
                  dangerouslySetInnerHTML={{ __html: privacyHtml }}
                />
              </div>

              <label className="aurora-onboarding__ack">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                <span>{O.privacyAcknowledge}</span>
              </label>

              <div className="aurora-onboarding__actions">
                <button type="button" className="aurora-onboarding__ghost" onClick={() => setStep(1)}>
                  {O.privacyBack}
                </button>
                <button
                  type="button"
                  className="aurora-onboarding__primary"
                  disabled={!ack}
                  onClick={() => setStep(3)}
                >
                  {O.next} →
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="aurora-onboarding__title aurora-onboarding__title--sm">{SP.consentTitle}</h1>
              <p className="aurora-onboarding__subtitle">{SP.consentDesc}</p>

              <label className="aurora-onboarding__ack">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{SP.consentCheckbox}</span>
              </label>

              <div className="aurora-onboarding__actions">
                <button type="button" className="aurora-onboarding__ghost" onClick={() => setStep(2)}>
                  {O.privacyBack}
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="aurora-onboarding__ghost" onClick={() => resolveConsent(false)}>
                    {SP.consentDecline}
                  </button>
                  <button type="button" className="aurora-onboarding__primary" onClick={() => resolveConsent(true)}>
                    {SP.consentJoin}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

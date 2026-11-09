import { useRef, useState } from 'react'
import { useLanguage } from '@stores/LanguageStore'
import {
  getConstellationKey,
  updateUserProfile,
  useUserProfile,
} from '@stores/UserProfileStore'
import { DateWheelInput } from '@components/ui/DateWheelInput'
import { AvatarPicker, type AvatarPatch } from '../components/AvatarPicker'
import { UserAvatar } from '../components/UserAvatar'
import { useToast } from '../../components/ui/ToastProvider'

export interface ProfileFormProps {
  /** 在名字输入框按 Return —— macOS 惯例：Return 触发默认操作（HIG Rule 5.4） */
  onEnter?: () => void
}

/**
 * 首启引导第二步的档案表单（名字 / 生日 / 头像）。
 *
 * 所有字段**输入即写入**（`updateUserProfile` 实时持久化），所以「以后再说」不会丢掉
 * 已经填的内容 —— 也没有「保存」按钮要理解。
 *
 * 头像改用统一的 AvatarPicker 气泡浮层：点头像即从下方展开（macOS 新用户头像设置同款），
 * 照片 / 表情 / 背景自由搭配，点选即时生效，点外部或 Esc 收起。
 *
 * 隐私取舍：生日明确标注可选，并写清用途（只在你生日那天说句话、不上传）。
 * 这是收集它的唯一正当理由；不写清用途就是在索取隐私。
 */
export function ProfileForm({ onEnter }: ProfileFormProps) {
  const { t } = useLanguage()
  const O = t.onboarding
  const profile = useUserProfile()
  const toast = useToast()
  const [pickerOpen, setPickerOpen] = useState(false)
  const avatarAnchorRef = useRef<HTMLButtonElement>(null)

  const constellationKey = getConstellationKey(profile.birthday)
  const constellation = constellationKey ? t.zodiac[constellationKey] : ''
  const hasAvatar = Boolean(profile.avatarUrl || profile.avatarEmoji)

  const applyAvatar = (patch: AvatarPatch) => {
    updateUserProfile(patch)
  }

  return (
    <div className="aurora-onboarding__fields">
      {/* 名字：最高价值字段 —— 问候语、侧栏头像、导出署名都会用到 */}
      <div className="aurora-onboarding__field">
        <label className="aurora-onboarding__label" htmlFor="mc-onboarding-name">
          {O.nameLabel}
        </label>
        <input
          id="mc-onboarding-name"
          type="text"
          className="aurora-onboarding__input"
          maxLength={24}
          placeholder={O.namePlaceholder}
          value={profile.nickname}
          autoFocus
          onChange={(e) => updateUserProfile({ nickname: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEnter?.()
          }}
        />
        <span className="aurora-onboarding__hint">{O.nameHint}</span>
      </div>

      {/* 生日：可选 + 用途明示 + 选完立刻给星座反馈（人情味在这里，而不是在表单里） */}
      <div className="aurora-onboarding__field">
        <span className="aurora-onboarding__label">
          {O.birthdayLabel}
          <span className="aurora-onboarding__optional">{O.optional}</span>
        </span>
        <div className="aurora-onboarding__birthday">
          <DateWheelInput
            className="aurora-onboarding__date"
            value={profile.birthday}
            onChange={(v) => updateUserProfile({ birthday: v })}
          />
          {constellation && (
            <span className="aurora-onboarding__zodiac">
              {O.zodiacHint.replace('{zodiac}', constellation)}
            </span>
          )}
        </div>
        <span className="aurora-onboarding__hint">{O.birthdayHint}</span>
      </div>

      {/* 头像：可选，纯装饰性收益，绝不阻塞。圆圈在左、说明在右 —— 与上方字段的纵向节奏区分开 */}
      <div className="aurora-onboarding__field aurora-onboarding__field--avatar">
        <button
          ref={avatarAnchorRef}
          type="button"
          className="aurora-onboarding__avatar"
          data-picker-open={pickerOpen || undefined}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={O.avatarLabel}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <UserAvatar profile={profile} size={52} style={{ width: '100%', height: '100%' }} />
        </button>
        <div className="aurora-onboarding__avatar-meta">
          <span className="aurora-onboarding__label">{O.avatarLabel}</span>
          <span className="aurora-onboarding__hint">
            {hasAvatar ? O.avatarChange : O.avatarHint}
          </span>
        </div>
      </div>

      <AvatarPicker
        open={pickerOpen}
        anchorRef={avatarAnchorRef}
        onClose={() => setPickerOpen(false)}
        profile={profile}
        onChange={applyAvatar}
        toast={(msg: string) => toast.show(msg)}
      />
    </div>
  )
}

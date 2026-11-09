import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  useUserProfile,
  updateUserProfile,
  userDisplayName,
  getUserAge,
  getConstellationKey,
  CLEAR_AVATAR_PATCH,
} from '@stores/UserProfileStore'
import { useSettingsQuery } from '../settingsSearch'
import { useLanguage } from '@stores/LanguageStore'
import { DateWheelInput } from '@components/ui/DateWheelInput'
import { AvatarPicker, type AvatarPatch } from '../../../components/AvatarPicker'
import { UserAvatar } from '../../../components/UserAvatar'

/**
 * 用户设置（人情味功能）
 * - 头像预览卡：点大头像（或「选择头像」按钮）即从该元素下方展开选择器气泡，
 *   macOS「用户与群组」同款；照片 / 表情 / 背景自由搭配，点选即时生效；
 * - 资料编辑：昵称、生日。
 * 数据走 useUserProfile()，写入即持久化到 localStorage。
 */
export function UserSection({ query, toast }: { query?: string; toast?: (msg: string) => void }) {
  const profile = useUserProfile()
  const { t } = useLanguage()
  const U = t.settingsUser
  const { q, match } = useSettingsQuery(query)
  const [pickerOpen, setPickerOpen] = useState(false)
  // 手动锚点 ref：两个入口（大头像 / 选择头像按钮）谁的 mousedown 先到就锚定谁，
  // 浮层永远从「用户刚点的那个元素」下方展开，且 outside-click 判定天然豁免它。
  const avatarAnchorRef = useRef<HTMLElement | null>(null)

  const displayName = userDisplayName(profile)
  const age = getUserAge(profile.birthday)
  const constellationKey = getConstellationKey(profile.birthday)
  const constellation = constellationKey ? t.zodiac[constellationKey] : ''

  const hasAny = !q || [
    [U.nickname, U.nicknameDesc],
    [U.avatar, U.avatarSearchDesc],
    [U.birthday, U.birthdayDesc],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const hasAvatar = Boolean(profile.avatarUrl || profile.avatarEmoji)

  const applyAvatar = (patch: AvatarPatch) => {
    updateUserProfile(patch)
  }

  const resetAvatar = () => {
    updateUserProfile(CLEAR_AVATAR_PATCH)
    toast?.(U.avatarRemoved)
  }

  // mousedown 先于 document 的 outside 监听（冒泡顺序），此刻换锚点可避免误关；
  // click 只负责 toggle，因此「再点一次关闭」也能正常工作。
  const setAnchor = (e: MouseEvent<HTMLElement>) => {
    avatarAnchorRef.current = e.currentTarget
  }
  const togglePicker = () => setPickerOpen((v) => !v)

  const subBits: string[] = []
  if (constellation) subBits.push(constellation)
  if (age !== null) subBits.push(U.ageYears.replace('{n}', String(age)))
  const subText = subBits.length ? subBits.join(' · ') : U.birthdayFallback

  return (
    <div>
      {/* 头像预览卡：大头像本身即选择器触发按钮 */}
      <div className="aurora-settings__user-card">
        <button
          type="button"
          className="aurora-settings__user-avatar-trigger"
          data-picker-open={pickerOpen || undefined}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={U.uploadAvatar}
          title={U.uploadAvatar}
          onMouseDown={setAnchor}
          onClick={togglePicker}
        >
          <UserAvatar
            profile={profile}
            size={64}
            className="aurora-settings__user-avatar-lg"
            label={displayName}
          />
          <span className="aurora-settings__user-avatar-badge" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </button>
        <div className="aurora-settings__user-meta">
          <div className="aurora-settings__user-nickname">{displayName}</div>
          <div className="aurora-settings__user-sub">{subText}</div>
        </div>
      </div>

      {/* 昵称 */}
      {match(U.nickname, U.nicknameDesc) && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">{U.nickname}</div>
            <div className="aurora-settings__item-desc">{U.nicknameDesc}</div>
          </div>
          <div className="aurora-settings__item-control">
            <input
              type="text"
              className="aurora-settings__input"
              maxLength={24}
              placeholder={U.nicknamePlaceholder}
              value={profile.nickname}
              onChange={(e) => updateUserProfile({ nickname: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 头像：说明 + 两个入口（按钮与大头像等价，各自锚定自己） */}
      {match(U.avatar, U.avatarSearchDesc) && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">{U.avatar}</div>
            <div className="aurora-settings__item-desc">{U.avatarDesc}</div>
          </div>
          <div className="aurora-settings__item-control">
            <button
              type="button"
              className="aurora-settings__btn"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              onMouseDown={setAnchor}
              onClick={togglePicker}
            >
              {U.uploadAvatar}
            </button>
            {hasAvatar && (
              <button type="button" className="aurora-settings__btn aurora-settings__btn--ghost" onClick={resetAvatar}>
                {U.removeAvatar}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 生日 */}
      {match(U.birthday, U.birthdayDesc) && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">{U.birthday}</div>
            <div className="aurora-settings__item-desc">{U.birthdayDesc}</div>
          </div>
          <div className="aurora-settings__item-control">
            <DateWheelInput
              className="aurora-settings__input--date"
              value={profile.birthday}
              onChange={(v) => updateUserProfile({ birthday: v })}
            />
            {constellation && <span className="aurora-settings__user-constellation">{constellation}</span>}
          </div>
        </div>
      )}

      <AvatarPicker
        open={pickerOpen}
        anchorRef={avatarAnchorRef}
        onClose={() => setPickerOpen(false)}
        profile={profile}
        onChange={applyAvatar}
        toast={toast}
      />
    </div>
  )
}

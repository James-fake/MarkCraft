import { useRef } from 'react'
import {
  useUserProfile,
  updateUserProfile,
  userDisplayName,
  getUserAge,
  getConstellationKey,
  compressAvatarFile,
} from '@stores/UserProfileStore'
import { useSettingsQuery } from '../settingsSearch'
import { useLanguage } from '@stores/LanguageStore'
import { DateWheelInput } from '@components/ui/DateWheelInput'

/**
 * 用户设置（人情味功能）
 * - 头像预览卡：展示当前昵称 / 头像，并附生日推导的星座与年龄（桌面应用的「人情味」）；
 * - 资料编辑：昵称、上传头像（自动压缩、白底兜底）、生日。
 * 数据走 useUserProfile()，写入即持久化到 localStorage。
 */
export function UserSection({ query, toast }: { query?: string; toast?: (msg: string) => void }) {
  const profile = useUserProfile()
  const { t } = useLanguage()
  const U = t.settingsUser
  const { q, match } = useSettingsQuery(query)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast?.(U.pickImage)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast?.(U.imageTooLarge)
      return
    }
    try {
      const dataUrl = await compressAvatarFile(file)
      updateUserProfile({ avatarUrl: dataUrl })
      toast?.(U.avatarUpdated)
    } catch {
      toast?.(U.avatarFailed)
    }
  }

  const removeAvatar = () => {
    updateUserProfile({ avatarUrl: '' })
    toast?.(U.avatarRemoved)
  }

  const subBits: string[] = []
  if (constellation) subBits.push(constellation)
  if (age !== null) subBits.push(U.ageYears.replace('{n}', String(age)))
  const subText = subBits.length ? subBits.join(' · ') : U.birthdayFallback

  return (
    <div>
      {/* 头像预览卡 */}
      <div className="aurora-settings__user-card">
        <div className="aurora-settings__user-avatar-lg">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={displayName} className="aurora-settings__user-avatar-img" />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
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

      {/* 头像 */}
      {match(U.avatar, U.avatarSearchDesc) && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">{U.avatar}</div>
            <div className="aurora-settings__item-desc">{U.avatarDesc}</div>
          </div>
          <div className="aurora-settings__item-control">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="aurora-settings__file-hidden"
              onChange={onPickFile}
            />
            <button type="button" className="aurora-settings__btn" onClick={() => fileRef.current?.click()}>
              {U.uploadAvatar}
            </button>
            {profile.avatarUrl && (
              <button type="button" className="aurora-settings__btn aurora-settings__btn--ghost" onClick={removeAvatar}>
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
    </div>
  )
}

import { useRef } from 'react'
import {
  useUserProfile,
  updateUserProfile,
  userDisplayName,
  getUserAge,
  getConstellation,
  compressAvatarFile,
} from '@stores/UserProfileStore'
import { useSettingsQuery } from '../settingsSearch'
import { DateWheelInput } from '@components/ui/DateWheelInput'

/**
 * 用户设置（人情味功能）
 * - 头像预览卡：展示当前昵称 / 头像，并附生日推导的星座与年龄（桌面应用的「人情味」）；
 * - 资料编辑：昵称、上传头像（自动压缩、白底兜底）、生日。
 * 数据走 useUserProfile()，写入即持久化到 localStorage。
 */
export function UserSection({ query, toast }: { query?: string; toast?: (msg: string) => void }) {
  const profile = useUserProfile()
  const { q, match } = useSettingsQuery(query)
  const fileRef = useRef<HTMLInputElement>(null)

  const displayName = userDisplayName(profile)
  const age = getUserAge(profile.birthday)
  const constellation = getConstellation(profile.birthday)

  const hasAny = !q || [
    ['昵称', '你的显示名称，将出现在侧栏与欢迎页'],
    ['头像', '上传一张头像图片，让账户更有辨识度'],
    ['生日', '设置生日，MarkCraft 会记住你的星座与年龄'],
  ].some(([l, d]) => match(l, d))
  if (!hasAny) return null

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast?.('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast?.('图片过大，请小于 5MB')
      return
    }
    try {
      const dataUrl = await compressAvatarFile(file)
      updateUserProfile({ avatarUrl: dataUrl })
      toast?.('头像已更新')
    } catch {
      toast?.('头像处理失败')
    }
  }

  const removeAvatar = () => {
    updateUserProfile({ avatarUrl: '' })
    toast?.('已移除头像')
  }

  const subBits: string[] = []
  if (constellation) subBits.push(constellation)
  if (age !== null) subBits.push(`${age} 岁`)
  const subText = subBits.length ? subBits.join(' · ') : '设置生日，认领你的星座'

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
      {match('昵称', '你的显示名称，将出现在侧栏与欢迎页') && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">昵称</div>
            <div className="aurora-settings__item-desc">你的显示名称，将出现在侧栏与欢迎页</div>
          </div>
          <div className="aurora-settings__item-control">
            <input
              type="text"
              className="aurora-settings__input"
              maxLength={24}
              placeholder="未命名用户"
              value={profile.nickname}
              onChange={(e) => updateUserProfile({ nickname: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 头像 */}
      {match('头像', '上传一张头像图片，让账户更有辨识度') && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">头像</div>
            <div className="aurora-settings__item-desc">上传一张图片作为头像（自动压缩，建议小于 5MB）</div>
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
              上传头像
            </button>
            {profile.avatarUrl && (
              <button type="button" className="aurora-settings__btn aurora-settings__btn--ghost" onClick={removeAvatar}>
                移除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 生日 */}
      {match('生日', '设置生日，MarkCraft 会记住你的星座与年龄') && (
        <div className="aurora-settings__item">
          <div className="aurora-settings__item-info">
            <div className="aurora-settings__item-label">生日</div>
            <div className="aurora-settings__item-desc">设置生日，MarkCraft 会记住你的星座与年龄</div>
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

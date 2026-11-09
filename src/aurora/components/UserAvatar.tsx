import type { CSSProperties } from 'react'
import {
  avatarKind,
  resolveAvatarBackground,
  resolveAvatarForeground,
  userInitial,
  type UserProfile,
} from '@stores/UserProfileStore'

export interface UserAvatarProps {
  profile: UserProfile
  /** 边长（正方形，圆形裁切）；默认 30px（侧栏尺寸） */
  size?: number
  /** 附加类名（用于复用既有容器的布局/尺寸语义） */
  className?: string
  /** 附加内联样式（会覆盖自动计算的 width/height/background/color，谨慎使用） */
  style?: CSSProperties
  /** 图片头像的 alt；传空字符串表示纯装饰 */
  label?: string
  /** 表情大小系数（相对边长），默认 0.56 */
  emojiScale?: number
  /** 首字母大小系数（相对边长），默认 0.42 */
  initialScale?: number
}

/**
 * 全应用唯一的头像渲染器 —— 侧栏 / 账户设置 / 首启引导 / 选择器预览共用。
 *
 * 三种形态由 `avatarKind(profile)` 单一裁决（照片 > 表情 > 首字母），
 * 背景由 `resolveAvatarBackground` 提供（自定义优先，否则品牌渐变），
 * 文字色由 `resolveAvatarForeground` 按背景亮度自动切换，保证浅色自定义底也可读。
 *
 * 之所以要收口：历史上 4 处各自写 `{avatarUrl ? <img> : <span>}`，
 * 加表情 / 自定义背景必然四处漂移；现在新增形态只改这一处。
 */
export function UserAvatar({
  profile,
  size = 30,
  className,
  style,
  label = '',
  emojiScale = 0.56,
  initialScale = 0.42,
}: UserAvatarProps) {
  const kind = avatarKind(profile)
  const autoStyle: CSSProperties = {
    width: size,
    height: size,
    background: resolveAvatarBackground(profile),
    color: resolveAvatarForeground(profile),
    // 表情比首字母需要更大的视觉占比：emoji 字形自带内边距，同字号会显小
    fontSize: Math.round(size * (kind === 'emoji' ? emojiScale : initialScale)),
  }

  return (
    <div
      className={`aurora-user-avatar${className ? ` ${className}` : ''}`}
      style={{ ...autoStyle, ...style }}
      data-avatar-kind={kind}
    >
      {kind === 'photo' ? (
        <img className="aurora-user-avatar__img" src={profile.avatarUrl} alt={label} />
      ) : (
        <span className="aurora-user-avatar__glyph" aria-hidden="true">
          {kind === 'emoji' ? profile.avatarEmoji : userInitial(profile)}
        </span>
      )}
    </div>
  )
}

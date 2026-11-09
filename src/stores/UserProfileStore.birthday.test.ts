import { describe, it, expect } from 'vitest'
import {
  getConstellationKey,
  getUserAge,
  isBirthdayToday,
  userDisplayName,
  userInitial,
  avatarKind,
  resolveAvatarBackground,
  resolveAvatarForeground,
  DEFAULT_AVATAR_BG,
  type UserProfile,
} from './UserProfileStore'

/** 构造「今天」的生日字符串（年份随便给，只验月日匹配） */
function birthdayToday(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `1990-${mm}-${dd}`
}

/** 完整资料工厂：新增字段时只改这一处，避免各处字面量被 TS 卡住 */
function baseProfile(patch: Partial<UserProfile> = {}): UserProfile {
  return { nickname: '', avatarUrl: '', avatarEmoji: '', avatarBg: '', birthday: '', ...patch }
}

describe('用户资料派生工具 · 生日', () => {
  it('今天是生日 → true', () => {
    expect(isBirthdayToday(birthdayToday())).toBe(true)
  })

  it('明天不是生日', () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    expect(isBirthdayToday(`1990-${mm}-${dd}`)).toBe(false)
  })

  it('空值 / 非法格式 → false（不崩）', () => {
    expect(isBirthdayToday('')).toBe(false)
    expect(isBirthdayToday('不是日期')).toBe(false)
    expect(isBirthdayToday('1990-13-45')).toBe(false)
  })

  it('星座与年龄仍按原规则推导', () => {
    expect(getConstellationKey('1990-11-15')).toBe('scorpio')
    expect(getConstellationKey('1990-03-25')).toBe('aries')
    expect(getUserAge(birthdayToday())).toBeGreaterThanOrEqual(0)
  })
})

describe('用户资料派生工具 · 展示名', () => {
  it('昵称为空回退「用户」', () => {
    expect(userDisplayName(baseProfile())).toBe('用户')
    expect(userInitial(baseProfile())).toBe('用')
  })

  it('昵称首字作头像字母', () => {
    expect(userInitial(baseProfile({ nickname: '小明' }))).toBe('小')
  })
})

describe('用户资料派生工具 · 头像类型与背景', () => {
  it('照片优先于表情，表情优先于首字母', () => {
    expect(avatarKind(baseProfile())).toBe('initial')
    expect(avatarKind(baseProfile({ avatarEmoji: '😀' }))).toBe('emoji')
    expect(avatarKind(baseProfile({ avatarUrl: 'data:image/jpeg;base64,xxx' }))).toBe('photo')
    expect(avatarKind(baseProfile({ avatarUrl: 'data:image/jpeg;base64,xxx', avatarEmoji: '😀' }))).toBe('photo')
  })

  it('未自定义背景回退品牌渐变，自定义则原样返回', () => {
    expect(resolveAvatarBackground(baseProfile())).toBe(DEFAULT_AVATAR_BG)
    expect(resolveAvatarBackground(baseProfile({ avatarBg: '#ff8800' }))).toBe('#ff8800')
  })

  it('浅色自定义背景自动切深色字，深色/渐保持白字', () => {
    expect(resolveAvatarForeground(baseProfile())).toBe('var(--mc-text-inverse)')
    expect(resolveAvatarForeground(baseProfile({ avatarBg: '#102040' }))).toBe('var(--mc-text-inverse)')
    expect(resolveAvatarForeground(baseProfile({ avatarBg: '#FFF3C4' }))).toBe('#1B2030')
    expect(resolveAvatarForeground(baseProfile({ avatarBg: DEFAULT_AVATAR_BG }))).toBe('var(--mc-text-inverse)')
  })
})

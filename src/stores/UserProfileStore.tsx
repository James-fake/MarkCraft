import { useSyncExternalStore } from 'react'
import { safeJsonParse } from '@utils/safeJson'
import { isRecord } from '@utils/schemaGuards'

/**
 * 用户资料 Store（人情味功能 · 账户设置）
 *
 * 采用模块级单一数据源 + useSyncExternalStore：
 * - 无需 React Provider，侧栏头像等全局组件可直接读取并实时反映；
 * - 不依赖任何 features 层，纯 localStorage 持久化，零副作用、可在 jsdom 测试环境直接渲染。
 *
 * 与 SettingsStore（Context 提供）不同，本 store 刻意走模块单例，
 * 因为头像属于「常驻外壳 chrome」，应全局可读、且改动需跨视图即时同步。
 */

export interface UserProfile {
  /** 昵称（空 → 回退「用户」） */
  nickname: string
  /** 头像 data URL（空 → 显示表情或首字母） */
  avatarUrl: string
  /** 表情头像字符（如 '😀'）；仅当 avatarUrl 为空时参与渲染 */
  avatarEmoji: string
  /** 头像背景（CSS 背景值，如渐变/纯色）；空 → 回退默认品牌渐变 */
  avatarBg: string
  /** 生日，ISO 短格式 'YYYY-MM-DD'（空 → 未设置） */
  birthday: string
}

const STORAGE_KEY = 'markcraft.userprofile'

const DEFAULT_PROFILE: UserProfile = {
  nickname: '',
  avatarUrl: '',
  avatarEmoji: '',
  avatarBg: '',
  birthday: '',
}

let state: UserProfile = loadProfile()
const listeners = new Set<() => void>()

function loadProfile(): UserProfile {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? safeJsonParse(raw, {} as Partial<UserProfile>) : {}
  const safeParsed: Partial<UserProfile> = isRecord(parsed) ? parsed : {}
  return {
    nickname: typeof safeParsed.nickname === 'string' ? safeParsed.nickname : '',
    avatarUrl: typeof safeParsed.avatarUrl === 'string' ? safeParsed.avatarUrl : '',
    avatarEmoji: typeof safeParsed.avatarEmoji === 'string' ? safeParsed.avatarEmoji : '',
    avatarBg: typeof safeParsed.avatarBg === 'string' ? safeParsed.avatarBg : '',
    birthday: typeof safeParsed.birthday === 'string' ? safeParsed.birthday : '',
  }
}

function persist(next: UserProfile) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 配额超限等：静默失败，内存态仍更新 */
  }
  listeners.forEach((l) => l())
}

/** 订阅用户资料（实时）。 */
export function useUserProfile(): UserProfile {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => state,
  )
}

/** 局部更新用户资料（立即持久化）。 */
export function updateUserProfile(patch: Partial<UserProfile>): void {
  persist({ ...state, ...patch })
}

/** 重置为用户默认资料。 */
export function resetUserProfile(): void {
  persist({ ...DEFAULT_PROFILE })
}

/* ---------- 派生工具 ---------- */

/** 展示名：昵称优先，空则回退「用户」。 */
export function userDisplayName(p: UserProfile): string {
  return p.nickname.trim() || '用户'
}

/** 头像首字母：取展示名首字（昵称空 → 随「用户」回退显示「用」），与侧栏用户名保持一致（批次⑪ P3-D）。 */
export function userInitial(p: UserProfile): string {
  return Array.from(userDisplayName(p))[0].toUpperCase()
}

/**
 * 默认头像背景 —— 品牌渐变。历史版本里所有「首字母头像」都用它，
 * 现在作为「未自定义背景」的回退值，保证老用户升级后外观不变。
 * CSS 里 4 处头像容器曾硬编码同一条渐变，此处收为单一来源。
 */
export const DEFAULT_AVATAR_BG = 'linear-gradient(135deg, var(--mc-accent) 0%, var(--mc-success) 100%)'

/** 头像类型：照片优先，其次表情，最后回退昵称首字母。 */
export type AvatarKind = 'photo' | 'emoji' | 'initial'

export function avatarKind(p: UserProfile): AvatarKind {
  if (p.avatarUrl) return 'photo'
  if (p.avatarEmoji) return 'emoji'
  return 'initial'
}

/** 解析头像背景：自定义背景优先，否则回退品牌渐变。 */
export function resolveAvatarBackground(p: UserProfile): string {
  return p.avatarBg || DEFAULT_AVATAR_BG
}

/**
 * 解析头像前景色（表情 / 首字母文字色）。
 *
 * 预设渐变均为中深色，白字始终清晰；只有「自定义纯色」（原生取色器产出 #rrggbb）
 * 需要按亮度切换深/浅字，否则浅黄、浅粉底上的白字会看不见。
 * 无法解析的复杂背景（渐变等）一律回退白字，与历史外观一致。
 */
export function resolveAvatarForeground(p: UserProfile): string {
  const bg = p.avatarBg.trim()
  const m = /^#([0-9a-f]{6})$/i.exec(bg)
  if (!m) return 'var(--mc-text-inverse)'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1B2030' : 'var(--mc-text-inverse)'
}

/**
 * 清空所有头像自定义（照片 / 表情 / 背景），回到「首字母 + 品牌渐变」的默认态。
 * 作为 updateUserProfile 的 patch 使用，避免各调用点重复写三个字段。
 */
export const CLEAR_AVATAR_PATCH: Pick<UserProfile, 'avatarUrl' | 'avatarEmoji' | 'avatarBg'> = {
  avatarUrl: '',
  avatarEmoji: '',
  avatarBg: '',
}

/**
 * 今天是不是用户的生日（只比月日，年份不参与）。
 *
 * 这是生日字段的**唯一消费方** —— 首启档案卡上写着「只用来在你生日那天说句话」，
 * 没有这个函数那句话就是空承诺（本项目明令禁止假 affordance）。
 */
export function isBirthdayToday(birthday: string): boolean {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(birthday)
  if (!m) return false
  const now = new Date()
  return Number(m[1]) === now.getMonth() + 1 && Number(m[2]) === now.getDate()
}

/** 由生日推导年龄（周岁）；无效返回 null。 */
export function getUserAge(birthday: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null
  const d = new Date(birthday)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 150 ? age : null
}

/** 十二星座键（展示文案走语言包 t.zodiac，此处只产出键） */
export type ZodiacKey =
  | 'capricorn' | 'aquarius' | 'pisces' | 'aries' | 'taurus' | 'gemini'
  | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius'

/** 由生日推导十二星座键；无效返回 ''。文案请经 t.zodiac[键] 本地化。 */
export function getConstellationKey(birthday: string): ZodiacKey | '' {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday)
  if (!m) return ''
  const month = Number(m[2])
  const day = Number(m[3])
  const table: [number, number, ZodiacKey][] = [
    [1, 19, 'capricorn'], [2, 18, 'aquarius'], [3, 20, 'pisces'],
    [4, 19, 'aries'], [5, 20, 'taurus'], [6, 21, 'gemini'],
    [7, 22, 'cancer'], [8, 22, 'leo'], [9, 22, 'virgo'],
    [10, 23, 'libra'], [11, 22, 'scorpio'], [12, 21, 'sagittarius'],
    [12, 31, 'capricorn'],
  ]
  for (const [mm, dd, key] of table) {
    if (month < mm || (month === mm && day <= dd)) return key
  }
  return ''
}

/**
 * 压缩头像为适合 localStorage 存储的小图（最大边 ≤ 240px，JPEG 0.85）。
 * 透明 PNG 先用白底填充，避免转 JPEG 后变黑底。
 */
export function compressAvatarFile(file: File, maxSize = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建画布'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        } catch {
          reject(new Error('头像编码失败'))
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

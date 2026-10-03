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
  /** 头像 data URL（空 → 显示首字母） */
  avatarUrl: string
  /** 生日，ISO 短格式 'YYYY-MM-DD'（空 → 未设置） */
  birthday: string
}

const STORAGE_KEY = 'markcraft.userprofile'

const DEFAULT_PROFILE: UserProfile = {
  nickname: '',
  avatarUrl: '',
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

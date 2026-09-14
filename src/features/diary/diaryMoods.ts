/* 情绪分类系统 —— 单一数据源
 * 支持三类：正向(pos) / 负向(neg) / 复合(mix)
 * 每条日记可同时标记多种情绪（多值），数据结构向后兼容旧的单值格式。
 */
import type { DiaryEntry } from './diaryDateUtils'

export type MoodCat = 'pos' | 'neg' | 'mix'

export interface MoodDef {
  key: string
  emoji: string
  label: string
  color: string
  cat: MoodCat
}

export const MOODS: MoodDef[] = [
  // 正向
  { key: 'happy', emoji: '😊', label: '开心', color: '#f59e0b', cat: 'pos' },
  { key: 'calm', emoji: '😌', label: '平静', color: '#10b981', cat: 'pos' },
  { key: 'fulfilled', emoji: '💪', label: '充实', color: '#3b82f6', cat: 'pos' },
  { key: 'excited', emoji: '🤩', label: '兴奋', color: '#fb7185', cat: 'pos' },
  { key: 'grateful', emoji: '🙏', label: '感恩', color: '#f97316', cat: 'pos' },
  { key: 'satisfied', emoji: '🥰', label: '满足', color: '#ec4899', cat: 'pos' },
  { key: 'hopeful', emoji: '🌟', label: '充满希望', color: '#22c55e', cat: 'pos' },
  { key: 'proud', emoji: '🏆', label: '自豪', color: '#eab308', cat: 'pos' },
  // 负向
  { key: 'anxious', emoji: '😰', label: '焦虑', color: '#ef4444', cat: 'neg' },
  { key: 'sad', emoji: '😔', label: '低落', color: '#64748b', cat: 'neg' },
  { key: 'tired', emoji: '😪', label: '疲惫', color: '#8b5cf6', cat: 'neg' },
  { key: 'angry', emoji: '😠', label: '愤怒', color: '#dc2626', cat: 'neg' },
  { key: 'lonely', emoji: '🥺', label: '孤独', color: '#6366f1', cat: 'neg' },
  { key: 'frustrated', emoji: '😞', label: '沮丧', color: '#ea580c', cat: 'neg' },
  { key: 'stressed', emoji: '😣', label: '压力大', color: '#e11d48', cat: 'neg' },
  { key: 'guilty', emoji: '😖', label: '愧疚', color: '#a855f7', cat: 'neg' },
  // 复合
  { key: 'expectant', emoji: '🤔', label: '期待', color: '#0ea5e9', cat: 'mix' },
  { key: 'conflicted', emoji: '😕', label: '矛盾', color: '#78716c', cat: 'mix' },
  { key: 'relieved', emoji: '😮‍💨', label: '释然', color: '#2dd4bf', cat: 'mix' },
  { key: 'nostalgic', emoji: '🥹', label: '怀念', color: '#d946ef', cat: 'mix' },
  { key: 'bittersweet', emoji: '🫠', label: '五味杂陈', color: '#f43f5e', cat: 'mix' },
]

export const MOOD_MAP: Record<string, MoodDef> = Object.fromEntries(MOODS.map(m => [m.key, m]))
export const MOOD_KEYS: string[] = MOODS.map(m => m.key)

export type MoodKey = string
/** 存储结构：日期 -> 情绪键数组（多值） */
export type MoodStore = Record<string, MoodKey[]>

export const MOOD_STORAGE_KEY = 'diary.moods'

export const MOOD_CAT_LABEL: Record<MoodCat, string> = {
  pos: '正向',
  neg: '负向',
  mix: '复合',
}

export const MOOD_CAT_COLOR: Record<MoodCat, string> = {
  pos: '#22c55e',
  neg: '#ef4444',
  mix: '#8b5cf6',
}

/** 读取并迁移旧数据：date -> "singleString" 自动升级为 date -> ["singleString"] */
export function loadMoods(): MoodStore {
  try {
    const raw = localStorage.getItem(MOOD_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const out: MoodStore = {}
    if (parsed && typeof parsed === 'object') {
      for (const [date, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          // 旧版单值格式
          if (MOOD_MAP[v]) out[date] = [v]
        } else if (Array.isArray(v)) {
          const valid = v.filter((x): x is string => typeof x === 'string' && !!MOOD_MAP[x])
          if (valid.length) out[date] = valid
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveMoods(store: MoodStore) {
  try {
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private mode */
  }
}

/** 取某天情绪键数组（过滤无效键，兼容传入单字符串） */
export function moodKeysOf(date: string, moods: MoodStore): MoodKey[] {
  const v = moods[date]
  if (!v) return []
  if (typeof v === 'string') return MOOD_MAP[v] ? [v] : []
  return v.filter(k => MOOD_MAP[k])
}

/** 主情绪（用于取色/单值展示）：取第一个有效键 */
export function primaryMood(date: string, moods: MoodStore): MoodDef | null {
  const ks = moodKeysOf(date, moods)
  return ks.length ? (MOOD_MAP[ks[0]] ?? null) : null
}

/** 切换某个情绪的选中态（多选） */
export function toggleMood(list: MoodKey[], key: MoodKey): MoodKey[] {
  return list.includes(key) ? list.filter(k => k !== key) : [...list, key]
}

/** 统计：返回每个情绪键的出现次数（一篇多情绪各计一次），及已标记篇数 */
export function moodCounts(entries: DiaryEntry[], moods: MoodStore): {
  counts: Record<string, number>
  max: number
  tagged: number
} {
  const counts: Record<string, number> = {}
  let tagged = 0
  for (const e of entries) {
    const ks = moodKeysOf(e.date, moods)
    if (ks.length) {
      tagged++
      for (const k of ks) counts[k] = (counts[k] || 0) + 1
    }
  }
  const max = Math.max(1, ...Object.values(counts))
  return { counts, max, tagged }
}

/** 按情绪过滤后的日记条目 */
export function filterEntriesByMood(entries: DiaryEntry[], moods: MoodStore, moodKey: string | null): DiaryEntry[] {
  if (!moodKey) return entries
  return entries.filter(e => moodKeysOf(e.date, moods).includes(moodKey))
}

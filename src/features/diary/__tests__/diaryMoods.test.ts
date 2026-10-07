import { describe, it, expect, beforeEach } from 'vitest'
import {
  MOODS,
  MOOD_KEYS,
  MOOD_MAP,
  loadMoods,
  saveMoods,
  moodKeysOf,
  primaryMood,
  toggleMood,
  moodCounts,
  filterEntriesByMood,
  type MoodStore,
} from '../diaryMoods'
import type { DiaryEntry } from '../diaryDateUtils'

const mkEntry = (date: string, extra: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: date,
  date,
  content: '',
  title: date,
  excerpt: '',
  words: 10,
  tags: [],
  ...extra,
})

describe('情绪分类体系', () => {
  it('覆盖正向 / 负向 / 复合三类，共 21 种', () => {
    expect(MOODS.length).toBe(21)
    const cats = new Set(MOODS.map(m => m.cat))
    expect(cats.has('pos')).toBe(true)
    expect(cats.has('neg')).toBe(true)
    expect(cats.has('mix')).toBe(true)
  })

  it('包含需求指定的典型情绪键', () => {
    for (const key of ['happy', 'excited', 'satisfied', 'grateful', 'calm', 'anxious', 'sad', 'angry', 'lonely', 'tired', 'expectant', 'conflicted', 'relieved']) {
      expect(MOOD_MAP[key]).toBeTruthy()
    }
  })

  it('每种情绪都有 emoji 与合法颜色', () => {
    for (const m of MOODS) {
      expect(m.emoji.length).toBeGreaterThan(0)
      expect(m.color).toMatch(/^#/)
    }
  })

  it('旧版 6 种情绪键保持不变（向后兼容）', () => {
    for (const key of ['happy', 'calm', 'fulfilled', 'tired', 'sad', 'anxious']) {
      expect(MOOD_KEYS).toContain(key)
    }
  })
})

describe('loadMoods 迁移（兼容旧单值格式）', () => {
  beforeEach(() => localStorage.clear())

  it('旧版 date->"happy" 自动升级为 date->["happy"]', () => {
    localStorage.setItem('diary.moods', JSON.stringify({ '2026-07-30': 'happy' }))
    const store = loadMoods()
    expect(store['2026-07-30']).toEqual(['happy'])
  })

  it('新版数组格式原样读取', () => {
    localStorage.setItem('diary.moods', JSON.stringify({ '2026-07-30': ['happy', 'calm'] }))
    const store = loadMoods()
    expect(store['2026-07-30']).toEqual(['happy', 'calm'])
  })

  it('过滤无效键，损坏 JSON 返回空对象', () => {
    localStorage.setItem('diary.moods', JSON.stringify({ '2026-07-30': ['happy', 'nope', 'calm'], 'x': 'nope' }))
    const store = loadMoods()
    expect(store['2026-07-30']).toEqual(['happy', 'calm'])
    expect(store['x']).toBeUndefined()
    localStorage.setItem('diary.moods', '{bad')
    expect(loadMoods()).toEqual({})
  })
})

describe('moodKeysOf / primaryMood', () => {
  it('返回过滤后的有效键数组，兼容单字符串', () => {
    const store: MoodStore = { '2026-07-30': ['happy', 'nope', 'calm'], '2026-07-29': 'sad' as unknown as string[] }
    expect(moodKeysOf('2026-07-30', store)).toEqual(['happy', 'calm'])
    expect(moodKeysOf('2026-07-29', store)).toEqual(['sad'])
    expect(moodKeysOf('2026-08-01', store)).toEqual([])
  })

  it('主情绪取第一个有效键', () => {
    const store: MoodStore = { '2026-07-30': ['calm', 'happy'] }
    expect(primaryMood('2026-07-30', store)?.key).toBe('calm')
    expect(primaryMood('2026-08-01', store)).toBeNull()
  })
})

describe('toggleMood 多选', () => {
  it('添加与移除', () => {
    expect(toggleMood([], 'happy')).toEqual(['happy'])
    expect(toggleMood(['happy'], 'calm')).toEqual(['happy', 'calm'])
    expect(toggleMood(['happy', 'calm'], 'happy')).toEqual(['calm'])
    expect(toggleMood(['happy'], 'happy')).toEqual([])
  })
})

describe('moodCounts 与 filterEntriesByMood 支持多值', () => {
  const entries = [mkEntry('2026-07-30'), mkEntry('2026-07-29'), mkEntry('2026-07-28')]
  const moods: MoodStore = {
    '2026-07-30': ['happy', 'calm'],
    '2026-07-29': ['happy'],
    // 7-28 无情绪
  }

  it('一篇多情绪各计一次，tagged 为已标记篇数', () => {
    const { counts, max, tagged } = moodCounts(entries, moods)
    expect(counts['happy']).toBe(2)
    expect(counts['calm']).toBe(1)
    expect(tagged).toBe(2)
    expect(max).toBe(2)
  })

  it('按情绪过滤返回含该情绪的条目', () => {
    expect(filterEntriesByMood(entries, moods, 'happy').map(e => e.date)).toEqual(['2026-07-30', '2026-07-29'])
    expect(filterEntriesByMood(entries, moods, 'calm').map(e => e.date)).toEqual(['2026-07-30'])
    expect(filterEntriesByMood(entries, moods, null).length).toBe(3)
  })
})

describe('saveMoods 持久化', () => {
  it('写入数组格式', () => {
    localStorage.clear()
    const store: MoodStore = { '2026-07-30': ['happy', 'calm'] }
    saveMoods(store)
    expect(JSON.parse(localStorage.getItem('diary.moods') || '{}')).toEqual(store)
  })
})

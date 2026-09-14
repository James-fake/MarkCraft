/* 日记面板 —— Aurora 专属辅助层（仅保留真实模块未提供的计算/展示辅助）
 *
 * 设计原则（迁移决策 D4：Aurora 库为单一规范、真实 features 改引）：
 * 日期/星期/月历工具与情绪分类系统一律引用真实单一数据源
 * （src/features/diary/diaryDateUtils.ts + diaryMoods.ts），
 * 本文件只承载「日记面板展示逻辑」所需的派生统计与文案，避免重复实现。
 */

import type { DiaryEntry } from '@features/diary'
import { addDays } from '@features/diary'
import type { MoodKey, MoodStore } from '@features/diary'
import { moodKeysOf, MOOD_MAP } from '@features/diary'
import { extractTags, makeExcerpt, DAILY_PROMPTS } from '@features/diary'

/* ============================================================
 * 今日基准
 * ========================================================== */
export const TODAY_STR = (() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})()

/* ============================================================
 * 内容解析工具（D4 单一数据源：源自 features/diary/diaryUtils，re-export）
 * ========================================================== */
export { countWords, extractTags, makeExcerpt } from '@features/diary'

/* ============================================================
 * 统计辅助（用于情绪环形图 / KPI / 热力图）
 * ========================================================== */

/** 连续写作天数：从今天往前数连续有日记的天数（中断归零） */
export function computeStreak(entries: DiaryEntry[]): number {
  const set = new Set(entries.map((e) => e.date))
  let streak = 0
  let cur = TODAY_STR
  while (set.has(cur)) {
    streak++
    cur = addDays(cur, -1)
  }
  return streak
}

/** 热力图分级：依据当日字数映射到 0..4 级 */
export function heatLevel(words: number): 0 | 1 | 2 | 3 | 4 {
  if (words <= 0) return 0
  if (words < 100) return 1
  if (words < 500) return 2
  if (words < 1000) return 3
  return 4
}

export type RangeKey = 'week' | 'month' | 'year'

/** 按时间范围过滤日记（情绪分布支持 本周/本月/本年） */
export function filterByRange(entries: DiaryEntry[], range: RangeKey, base = TODAY_STR): DiaryEntry[] {
  if (range === 'month') {
    const p = base.slice(0, 7)
    return entries.filter((e) => e.date.startsWith(p))
  }
  if (range === 'year') {
    const p = base.slice(0, 4)
    return entries.filter((e) => e.date.startsWith(p))
  }
  const start = addDays(base, -6)
  return entries.filter((e) => e.date >= start && e.date <= base)
}

/** 情绪分类计数（用于环形图：正向/负向/复合 三段） */
export function moodCatCounts(
  entries: DiaryEntry[],
  moods: MoodStore,
): { pos: number; neg: number; mix: number; tagged: number } {
  let pos = 0
  let neg = 0
  let mix = 0
  let tagged = 0
  for (const e of entries) {
    const ks = moodKeysOf(e.date, moods)
    if (ks.length) {
      tagged++
      for (const k of ks) {
        const m = MOOD_MAP[k]
        if (!m) continue
        if (m.cat === 'pos') pos++
        else if (m.cat === 'neg') neg++
        else mix++
      }
    }
  }
  return { pos, neg, mix, tagged }
}

/* ============================================================
 * 每日一问（D4 单一数据源：源自 features/diary/diaryUtils，re-export）
 * ========================================================== */
export { DAILY_PROMPTS } from '@features/diary'

/* ============================================================
 * 月度复盘（D1-3 回顾工作流 · 承接知识库砍掉的「回顾」能力）
 * 纯函数：DiaryPanel 调用，测试直接覆盖
 * ============================================================ */

export interface MonthReview {
  /** YYYY-MM */
  month: string
  /** 写作天数 */
  dayCount: number
  /** 总字数 */
  totalWords: number
  /** 日均字数（取整） */
  avgWords: number
  /** 当月最长连续写作段 */
  longestStreak: number
  /** 情绪分布（正向/负向/复合/已标注天数） */
  mood: { pos: number; neg: number; mix: number; tagged: number }
  /** 主题词 Top（按出现次数降序，最多 5 个） */
  topTags: { tag: string; count: number }[]
  /** 最投入一天（字数最高） */
  bestDay: { date: string; words: number; excerpt: string } | null
}

/** 聚合某月日记为月度复盘数据（D1-3） */
export function buildMonthReview(
  entries: DiaryEntry[],
  moods: MoodStore,
  monthPrefix: string,
): MonthReview {
  const monthEntries = entries
    .filter((e) => e.date.startsWith(monthPrefix))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const totalWords = monthEntries.reduce((s, e) => s + e.words, 0)
  const dayCount = monthEntries.length

  // 当月最长连续段（相邻日期差 1 天计连续）
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const e of monthEntries) {
    if (prev !== null && e.date !== addDays(prev, 1)) run = 0
    run++
    if (run > longestStreak) longestStreak = run
    prev = e.date
  }

  // 主题词 Top
  const tagCount = new Map<string, number>()
  for (const e of monthEntries) {
    for (const t of extractTags(e.content)) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    }
  }
  const topTags = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 最投入一天
  let bestDay: MonthReview['bestDay'] = null
  if (monthEntries.length) {
    const best = monthEntries.reduce((m, e) => (e.words > m.words ? e : m))
    bestDay = { date: best.date, words: best.words, excerpt: makeExcerpt(best.content) }
  }

  return {
    month: monthPrefix,
    dayCount,
    totalWords,
    avgWords: dayCount ? Math.round(totalWords / dayCount) : 0,
    longestStreak,
    mood: moodCatCounts(monthEntries, moods),
    topTags,
    bestDay,
  }
}

/** 渲染月度复盘 Markdown（生成文件 / 复制用） */
export function renderMonthReviewMarkdown(r: MonthReview): string {
  const [y, m] = r.month.split('-')
  const moodLine = r.mood.tagged
    ? `- 正向 ${r.mood.pos} · 负向 ${r.mood.neg} · 复合 ${r.mood.mix}（标注 ${r.mood.tagged} 天）`
    : '- 本月未记录情绪'
  const tagsLine = r.topTags.length
    ? r.topTags.map((t) => `- #${t.tag} ×${t.count}`).join('\n')
    : '- 本月未发现主题标签'
  const bestLine = r.bestDay
    ? `- ${r.bestDay.date}（${r.bestDay.words} 字）：${r.bestDay.excerpt}`
    : '- 本月无日记'

  return [
    `## ${y} 年 ${Number(m)} 月 · 月度复盘`,
    '',
    `> 数据来自当月日记 · ${r.dayCount} 天 · ${r.totalWords} 字`,
    '',
    '**写作概览**',
    `- 写作天数：${r.dayCount} 天`,
    `- 总字数：${r.totalWords} 字（日均 ${r.avgWords} 字）`,
    `- 最长连续：${r.longestStreak} 天`,
    '',
    '**情绪分布**',
    moodLine,
    '',
    '**主题词**',
    tagsLine,
    '',
    '**最投入一天**',
    bestLine,
    '',
  ].join('\n')
}

/* ============================================================
 * 重新导出：面板需直接使用的真实模块符号（单一数据源，不重复定义）
 * ========================================================== */
export { parseYMD, daysInMonth } from '@features/diary'
export type { DiaryEntry, MoodKey, MoodStore }

/* ============================================================
 * 日记面板优化派生（方案 2026-08-29）
 * 全部复用上方真实单一数据源（moodKeysOf / MOOD_MAP / addDays / extractTags），
 * 不重复定义、不修改 src/features/diary。
 * ========================================================== */

/** 按情绪大类筛选日记（与 moodCatCounts 同口径：条目任一情绪属于该 cat 即计入） */
export function entriesByMoodCat(
  entries: DiaryEntry[],
  moods: MoodStore,
  cat: 'pos' | 'neg' | 'mix',
): DiaryEntry[] {
  return entries.filter((e) => {
    const ks = moodKeysOf(e.date, moods)
    if (!ks.length) return false
    return ks.some((k) => {
      const m = MOOD_MAP[k]
      return m != null && m.cat === cat
    })
  })
}

/** 标签跳转：返回含该标签的最近一条日记日期（entries 已按 date 倒序，首条即 date 最大） */
export function focusTagAurora(entries: DiaryEntry[], tag: string): string | null {
  const lower = tag.toLowerCase()
  const matched = entries.filter((e) => extractTags(e.content).some((t) => t.toLowerCase() === lower))
  return matched.length ? matched[0].date : null
}

/** 全历史最长连续写作段（相邻日期差 1 天计连续） */
export function computeLongestStreak(entries: DiaryEntry[]): number {
  if (!entries.length) return 0
  const sorted = [...entries].map((e) => e.date).sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1
    if (run > longest) longest = run
  }
  return longest
}

/** 每日一问随机切换（排除上一条避免顺序重复感；数组长度<=1 时回退 0） */
export function pickPromptIdx(excludeIdx: number): number {
  const n = DAILY_PROMPTS.length
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * n)
  let guard = 0
  while (i === excludeIdx && guard++ < 20) i = Math.floor(Math.random() * n)
  return i
}

const PROMPT_IDX_KEY = 'aurora-diary-prompt-idx'
/** 读取上次每日一问索引（跨会话记忆） */
export function loadPromptIdx(): number {
  try {
    const v = localStorage.getItem(PROMPT_IDX_KEY)
    if (v == null) return 0
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}
/** 持久化每日一问索引 */
export function savePromptIdx(idx: number): void {
  try {
    localStorage.setItem(PROMPT_IDX_KEY, String(idx))
  } catch {
    /* localStorage 不可用时静默（降级为不记忆） */
  }
}

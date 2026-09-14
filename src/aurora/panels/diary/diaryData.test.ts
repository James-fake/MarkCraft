import { describe, it, expect } from 'vitest'
import { buildMonthReview, renderMonthReviewMarkdown, type MonthReview } from './diaryData'
import type { DiaryEntry } from '@features/diary/diaryDateUtils'
import type { MoodStore } from '@features/diary/diaryMoods'

const entry = (date: string, content: string): DiaryEntry => ({
  date,
  content,
  words: content.length,
  title: content.slice(0, 12),
  excerpt: content.slice(0, 60),
  tags: [],
})

const NO_MOODS: MoodStore = {}

describe('buildMonthReview（D1-3 月度复盘聚合）', () => {
  it('聚合当月写作天数 / 总字数 / 日均字数', () => {
    const entries = [
      entry('2026-08-01', '今天开始写日记。'),
      entry('2026-08-02', '坚持第二天。'),
      entry('2026-08-05', '隔了几天继续。'),
      entry('2026-09-01', '下个月的不该混进来。'),
    ]
    const r = buildMonthReview(entries, NO_MOODS, '2026-08')
    expect(r.dayCount).toBe(3)
    expect(r.totalWords).toBe(entries[0].words + entries[1].words + entries[2].words)
    expect(r.avgWords).toBe(Math.round(r.totalWords / 3))
    expect(r.month).toBe('2026-08')
  })

  it('最长连续段：隔天中断后重计', () => {
    const entries = [
      entry('2026-08-01', 'a'),
      entry('2026-08-02', 'b'),
      entry('2026-08-03', 'c'),
      entry('2026-08-05', 'd'),
      entry('2026-08-06', 'e'),
    ]
    const r = buildMonthReview(entries, NO_MOODS, '2026-08')
    expect(r.longestStreak).toBe(3) // 01-03 连续 3 天
  })

  it('主题词 Top：按出现次数降序且最多 5 个', () => {
    const entries = [
      entry('2026-08-01', '今天研究 #graph 与 #graph 还有 #kb'),
      entry('2026-08-02', '#graph 继续，#diary 记录'),
      entry('2026-08-03', '#kb 知识库整理 #graph'),
      entry('2026-08-04', '#x1 #x2 #x3 #x4 #x5 #x6'),
    ]
    const r = buildMonthReview(entries, NO_MOODS, '2026-08')
    // extractTags 按篇 Set 去重：graph 出现在 01/02/03 三篇
    expect(r.topTags[0]).toEqual({ tag: 'graph', count: 3 })
    expect(r.topTags.length).toBeLessThanOrEqual(5)
  })

  it('最投入一天 = 字数最高那天，情绪分布来自 mood 数据', () => {
    const entries = [
      entry('2026-08-01', '短。'),
      entry('2026-08-02', '这一天写了很多很多很多字。'),
    ]
    const moods: MoodStore = {
      '2026-08-02': ['happy'],
    }
    const r = buildMonthReview(entries, moods, '2026-08')
    expect(r.bestDay?.date).toBe('2026-08-02')
    expect(r.bestDay?.words).toBe(entries[1].words)
    expect(r.mood.tagged).toBe(1)
    expect(r.mood.pos).toBe(1)
  })

  it('空月：全部归零、bestDay 为 null', () => {
    const r = buildMonthReview([], NO_MOODS, '2026-08')
    expect(r.dayCount).toBe(0)
    expect(r.totalWords).toBe(0)
    expect(r.avgWords).toBe(0)
    expect(r.longestStreak).toBe(0)
    expect(r.bestDay).toBeNull()
  })
})

describe('renderMonthReviewMarkdown（复盘 Markdown 渲染）', () => {
  const review: MonthReview = {
    month: '2026-08',
    dayCount: 3,
    totalWords: 120,
    avgWords: 40,
    longestStreak: 2,
    mood: { pos: 2, neg: 1, mix: 0, tagged: 3 },
    topTags: [
      { tag: 'graph', count: 4 },
      { tag: 'diary', count: 2 },
    ],
    bestDay: { date: '2026-08-02', words: 80, excerpt: '这一天写了很多字。' },
  }

  it('包含标题与各区块关键数据', () => {
    const md = renderMonthReviewMarkdown(review)
    expect(md).toContain('2026 年 8 月 · 月度复盘')
    expect(md).toContain('写作天数：3 天')
    expect(md).toContain('总字数：120 字（日均 40 字）')
    expect(md).toContain('最长连续：2 天')
    expect(md).toContain('正向 2 · 负向 1 · 复合 0')
    expect(md).toContain('#graph ×4')
    expect(md).toContain('2026-08-02（80 字）')
  })

  it('空数据渲染兜底文案', () => {
    const md = renderMonthReviewMarkdown({
      month: '2026-09',
      dayCount: 0,
      totalWords: 0,
      avgWords: 0,
      longestStreak: 0,
      mood: { pos: 0, neg: 0, mix: 0, tagged: 0 },
      topTags: [],
      bestDay: null,
    })
    expect(md).toContain('本月未记录情绪')
    expect(md).toContain('本月未发现主题标签')
    expect(md).toContain('本月无日记')
  })
})

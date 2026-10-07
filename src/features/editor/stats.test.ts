/**
 * P2-4 文档统计纯函数测试（字数 / 阅读时长）
 */
import { describe, it, expect } from 'vitest'
import { countWords, estimateReadingTime, calculateStats } from './stats'

describe('countWords', () => {
  it('中文按字符计、拉丁按词计', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('你好世界')).toBe(4)
    expect(countWords('hello world')).toBe(2)
    // 混合：2 个中文字 + 2 个英文词
    expect(countWords('你好 hello world')).toBe(4)
  })
})

describe('estimateReadingTime', () => {
  it('空内容返回 0', () => {
    expect(estimateReadingTime('')).toBe(0)
  })
  it('短中文内容至少 1 分钟', () => {
    expect(estimateReadingTime('这是一段测试。')).toBeGreaterThanOrEqual(1)
  })
})

describe('calculateStats', () => {
  it('返回字数、字符数、行数与阅读时长', () => {
    const s = calculateStats('# 标题\n\n正文内容一段。')
    expect(s.charCount).toBeGreaterThan(0)
    expect(s.lineCount).toBe(3)
    expect(s.readingTimeMinutes).toBeGreaterThanOrEqual(1)
    expect(typeof s.wordCountStandardMode).toBe('number')
  })
})

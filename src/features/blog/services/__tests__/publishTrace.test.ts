/**
 * P1-3 发布留痕单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordPublish,
  getPublishLog,
  clearPublishTrace,
  type PublishTraceEntry,
} from '../publishTrace'

const entry = (slug: string, title: string, at: string): PublishTraceEntry => ({
  slug, title, status: 'published', publishedAt: at,
})

describe('publishTrace (localStorage)', () => {
  beforeEach(() => {
    clearPublishTrace()
  })

  it('recordPublish 后 getPublishLog 可读回', () => {
    recordPublish([entry('a', '文章A', '2026-08-01T00:00:00Z')])
    const log = getPublishLog()
    expect(log).toHaveLength(1)
    expect(log[0].slug).toBe('a')
    expect(log[0].title).toBe('文章A')
  })

  it('按 slug 合并：重复 slug 更新 publishedAt', () => {
    recordPublish([entry('a', '文章A', '2026-08-01T00:00:00Z')])
    recordPublish([entry('a', '文章A-改', '2026-08-05T00:00:00Z')])
    const log = getPublishLog()
    expect(log).toHaveLength(1)
    expect(log[0].title).toBe('文章A-改')
    expect(log[0].publishedAt).toBe('2026-08-05T00:00:00Z')
  })

  it('多 slug 并存', () => {
    recordPublish([
      entry('a', 'A', '2026-08-01T00:00:00Z'),
      entry('b', 'B', '2026-08-02T00:00:00Z'),
    ])
    expect(getPublishLog().map(e => e.slug).sort()).toEqual(['a', 'b'])
  })

  it('按时间倒序', () => {
    recordPublish([
      entry('old', '旧', '2026-08-01T00:00:00Z'),
      entry('new', '新', '2026-08-09T00:00:00Z'),
    ])
    expect(getPublishLog().map(e => e.slug)).toEqual(['new', 'old'])
  })

  it('recordPublish 返回合并后完整日志', () => {
    const r = recordPublish([entry('a', 'A', '2026-08-01T00:00:00Z')])
    expect(r).toHaveLength(1)
    expect(r[0].slug).toBe('a')
  })

  it('publishedAt 缺省用 now 补齐', () => {
    const before = Date.now()
    recordPublish([{ slug: 'x', title: 'X', status: 'published' }])
    const ts = new Date(getPublishLog()[0].publishedAt).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('非法条目被过滤', () => {
    recordPublish([
      null as unknown as PublishTraceEntry,
      { slug: 'ok', title: 'OK', status: 'published', publishedAt: '2026-08-01T00:00:00Z' },
      42 as unknown as PublishTraceEntry,
    ])
    const log = getPublishLog()
    expect(log).toHaveLength(1)
    expect(log[0].slug).toBe('ok')
  })

  it('clearPublishTrace 清空', () => {
    recordPublish([entry('a', 'A', '2026-08-01T00:00:00Z')])
    clearPublishTrace()
    expect(getPublishLog()).toEqual([])
  })

  it('无 localStorage 时优雅降级（不抛错、返回空）', () => {
    const original = (globalThis as unknown as { localStorage?: Storage }).localStorage
    // 用抛出异常的 getter 模拟不可用环境
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('blocked') },
    })
    let threw = false
    try {
      expect(getPublishLog()).toEqual([])
      recordPublish([entry('a', 'A', '2026-08-01T00:00:00Z')])
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: original,
    })
  })
})

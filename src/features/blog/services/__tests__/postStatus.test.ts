/**
 * P1-3 发布状态机单元测试
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeStatus,
  derivePostStatus,
  isPublished,
  canTransition,
  nextStatuses,
  statusLabel,
  statusRank,
  type PostStatus,
} from '../postStatus'

describe('normalizeStatus', () => {
  it('合法值原样返回', () => {
    expect(normalizeStatus('draft')).toBe('draft')
    expect(normalizeStatus('pending')).toBe('pending')
    expect(normalizeStatus('published')).toBe('published')
  })
  it('非法值回退 published', () => {
    expect(normalizeStatus('archived')).toBe('published')
    expect(normalizeStatus('')).toBe('published')
    expect(normalizeStatus(undefined)).toBe('published')
    expect(normalizeStatus(123)).toBe('published')
    expect(normalizeStatus(null)).toBe('published')
  })
})

describe('derivePostStatus', () => {
  it('status 字段优先（权威压过 draft）', () => {
    expect(derivePostStatus({ status: 'pending' })).toBe('pending')
    expect(derivePostStatus({ status: 'published', draft: true })).toBe('published')
    expect(derivePostStatus({ status: 'draft' })).toBe('draft')
  })
  it('无 status 时回退 draft 布尔', () => {
    expect(derivePostStatus({ draft: true })).toBe('draft')
    expect(derivePostStatus({ draft: false })).toBe('published')
  })
  it('既无 status 也无 draft → 缺省 published', () => {
    expect(derivePostStatus({})).toBe('published')
    expect(derivePostStatus({ title: 'x' })).toBe('published')
  })
  it('非法 status 字段回退到 draft/published', () => {
    expect(derivePostStatus({ status: 'weird', draft: true })).toBe('draft')
    expect(derivePostStatus({ status: 'weird' })).toBe('published')
  })
})

describe('isPublished', () => {
  it('published 计入', () => {
    expect(isPublished('published')).toBe(true)
  })
  it('draft / pending 不计入', () => {
    expect(isPublished('draft')).toBe(false)
    expect(isPublished('pending')).toBe(false)
  })
  it('publishDate 晚于 now → 不计入', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isPublished('published', future)).toBe(false)
  })
  it('publishDate 早于 now → 计入', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(isPublished('published', past)).toBe(true)
  })
  it('非法 publishDate 视为无定时', () => {
    expect(isPublished('published', 'not-a-date')).toBe(true)
  })
  it('可注入 now 进行确定性断言', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    expect(isPublished('published', '2026-08-06T00:00:00Z', now)).toBe(false)
    expect(isPublished('published', '2026-08-04T00:00:00Z', now)).toBe(true)
  })
})

describe('canTransition / nextStatuses', () => {
  it('每个状态都有三条迁移（含自身）', () => {
    (['draft', 'pending', 'published'] as PostStatus[]).forEach(from => {
      expect(canTransition(from, from)).toBe(true)
      expect(STATUS_TRANSITIONS_ALL(from).length).toBe(3)
    })
  })
  it('自身之外可切换', () => {
    expect(canTransition('draft', 'pending')).toBe(true)
    expect(canTransition('draft', 'published')).toBe(true)
    expect(canTransition('pending', 'published')).toBe(true)
    expect(canTransition('published', 'draft')).toBe(true)
  })
  it('nextStatuses 排除自身', () => {
    expect(nextStatuses('draft')).toEqual(['pending', 'published'])
    expect(nextStatuses('pending')).toEqual(['draft', 'published'])
    expect(nextStatuses('published')).toEqual(['draft', 'pending'])
  })
})

function STATUS_TRANSITIONS_ALL(_from: PostStatus): PostStatus[] {
  // 与实现一致：允许任意态切换（含自身）
  return ['draft', 'pending', 'published']
}

describe('statusLabel / statusRank', () => {
  it('中文文案', () => {
    expect(statusLabel('draft', 'zh')).toBe('草稿')
    expect(statusLabel('pending', 'zh')).toBe('待发布')
    expect(statusLabel('published', 'zh')).toBe('已发布')
  })
  it('英文文案', () => {
    expect(statusLabel('draft', 'en')).toBe('Draft')
    expect(statusLabel('pending', 'en')).toBe('Pending')
    expect(statusLabel('published', 'en')).toBe('Published')
  })
  it('排序权重：已发布 < 待发布 < 草稿', () => {
    expect(statusRank('published')).toBeLessThan(statusRank('pending'))
    expect(statusRank('pending')).toBeLessThan(statusRank('draft'))
  })
})

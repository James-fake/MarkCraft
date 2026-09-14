/**
 * P1-3 系列聚合单元测试
 */
import { describe, it, expect } from 'vitest'
import { collectSeries, groupsToSeriesConfig, seriesSlug } from '../seriesAggregator'
import type { BlogPost } from '../../templates'

const mk = (over: Partial<BlogPost>): BlogPost => ({
  title: 't', slug: 's', date: '', tags: [], category: '', description: '',
  author: '', coverImage: '', draft: false, content: '', rawContent: '',
  customSlug: '', layout: 'post', permalink: '', updated: '', excerpt: '',
  weight: 0, ...over,
})

describe('seriesSlug', () => {
  it('保留中文、折叠分隔符', () => {
    expect(seriesSlug('前端进阶')).toBe('前端进阶')
    expect(seriesSlug('My Series')).toBe('my-series')
  })
})

describe('collectSeries', () => {
  it('仅收集带 series 字段的文章', () => {
    const posts = [mk({ title: 'A', series: 'React' }), mk({ title: 'B' }), mk({ title: 'C', series: 'React' })]
    const groups = collectSeries(posts)
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('React')
    expect(groups[0].posts.map(p => p.title)).toEqual(['A', 'C'])
  })

  it('无 series 文章时为生产空数组', () => {
    expect(collectSeries([mk({ title: 'X' }), mk({ title: 'Y' })])).toEqual([])
  })

  it('按 seriesOrder 升序排序组内', () => {
    const posts = [
      mk({ title: '第二篇', series: 'S', seriesOrder: 2 }),
      mk({ title: '第一篇', series: 'S', seriesOrder: 1 }),
      mk({ title: '第三篇', series: 'S', seriesOrder: 3 }),
    ]
    const groups = collectSeries(posts)
    expect(groups[0].posts.map(p => p.title)).toEqual(['第一篇', '第二篇', '第三篇'])
  })

  it('无 seriesOrder 时按日期倒序', () => {
    const posts = [
      mk({ title: '旧', series: 'S', date: '2026-01-01' }),
      mk({ title: '新', series: 'S', date: '2026-08-01' }),
    ]
    const groups = collectSeries(posts)
    expect(groups[0].posts.map(p => p.title)).toEqual(['新', '旧'])
  })

  it('混合：有 seriesOrder 的文章优先按 order', () => {
    const posts = [
      mk({ title: '无日期', series: 'S', seriesOrder: 1 }),
      mk({ title: '有日期新', series: 'S', date: '2026-08-01' }),
    ]
    const groups = collectSeries(posts)
    // 两者均无 seriesOrder 时回退日期排序；此处都有——用 seriesOrder 优先
    const posts2 = [
      mk({ title: 'A', series: 'S', seriesOrder: 2, date: '2026-01-01' }),
      mk({ title: 'B', series: 'S', seriesOrder: 1, date: '2026-08-01' }),
    ]
    const g2 = collectSeries(posts2)
    expect(g2[0].posts.map(p => p.title)).toEqual(['B', 'A'])
    expect(groups[0].posts.map(p => p.title)).toEqual(['无日期', '有日期新'])
  })

  it('生成 slug', () => {
    const groups = collectSeries([mk({ title: 'A', series: '设计模式' })])
    expect(groups[0].slug).toBe('设计模式')
  })

  it('多个系列按名称确定排序', () => {
    const posts = [
      mk({ title: 'a', series: 'Zoo' }),
      mk({ title: 'b', series: 'Apple' }),
      mk({ title: 'c', series: 'Mango' }),
    ]
    const groups = collectSeries(posts)
    expect(groups.map(g => g.name)).toEqual(['Apple', 'Mango', 'Zoo'])
  })

  it('options 注入描述与封面', () => {
    const posts = [mk({ title: 'A', series: 'React' })]
    const groups = collectSeries(posts, {
      descriptions: { React: 'React 系列' },
      covers: { React: '/cover.png' },
    })
    expect(groups[0].description).toBe('React 系列')
    expect(groups[0].coverImage).toBe('/cover.png')
  })

  it('options 未提供时描述/封面为 undefined', () => {
    const groups = collectSeries([mk({ title: 'A', series: 'React' })])
    expect(groups[0].description).toBeUndefined()
    expect(groups[0].coverImage).toBeUndefined()
  })

  it('不改变入参', () => {
    const posts = [mk({ title: 'A', series: 'React', seriesOrder: 2 }), mk({ title: 'B', series: 'React', seriesOrder: 1 })]
    const snapshot = posts.map(p => ({ ...p }))
    collectSeries(posts)
    expect(posts).toEqual(snapshot)
  })
})

describe('groupsToSeriesConfig', () => {
  it('仅含模板所需字段', () => {
    const groups = collectSeries([mk({ title: 'A', series: 'React' })], {
      descriptions: { React: 'D' },
      covers: { React: 'C' },
    })
    const cfg = groupsToSeriesConfig(groups)
    expect(cfg).toEqual([{ name: 'React', slug: 'react', description: 'D', coverImage: 'C' }])
  })
})

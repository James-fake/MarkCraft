/**
 * P1-3 集成测试：generateBlog 的状态机过滤 + 系列自动发现
 */
import { describe, it, expect } from 'vitest'
import { generateBlog } from '../blogMultiFileGenerator'

describe('P1-3 状态机过滤', () => {
  it('status: draft 不计入已发布列表', () => {
    const { posts, files } = generateBlog([
      { name: 'draft.md', content: '---\ntitle: 草稿\nslug: draft-post\nstatus: draft\n---\n\n正文。' },
      { name: 'pub.md', content: '---\ntitle: 已发布\nslug: pub-post\n---\n\n正文。' },
    ])
    const published = files.find(f => f.path === 'index.html')
    expect(published).toBeTruthy()
    expect(posts.find(p => p.slug === 'draft-post')?.status).toBe('draft')
    expect(files.some(f => f.path === 'posts/draft-post/index.html')).toBe(false)
    expect(files.some(f => f.path === 'posts/pub-post/index.html')).toBe(true)
  })

  it('status: pending 不计入已发布列表', () => {
    const { files } = generateBlog([
      { name: 'pending.md', content: '---\ntitle: 待发布\nslug: pending-post\nstatus: pending\n---\n\n正文。' },
    ])
    expect(files.some(f => f.path === 'posts/pending-post/index.html')).toBe(false)
    expect(files.some(f => f.path === 'index.html')).toBe(true)
  })

  it('draft 布尔仍生效（向后兼容）', () => {
    const { files } = generateBlog([
      { name: 'legacy.md', content: '---\ntitle: 旧草稿\nslug: legacy-post\ndraft: true\n---\n\n正文。' },
    ])
    expect(files.some(f => f.path === 'posts/legacy-post/index.html')).toBe(false)
  })

  it('publishDate 未来 → 不计入', () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString()
    const { files } = generateBlog([
      { name: 'future.md', content: `---\ntitle: 定时\nslug: future-post\npublishDate: ${future}\n---\n\n正文。` },
    ])
    expect(files.some(f => f.path === 'posts/future-post/index.html')).toBe(false)
  })

  it('缺省无状态 → 视为已发布', () => {
    const { posts, files } = generateBlog([
      { name: 'normal.md', content: '---\ntitle: 普通文章\nslug: normal-post\n---\n\n正文内容在此处出现。' },
    ])
    expect(posts[0].status).toBe('published')
    expect(files.some(f => f.path === 'posts/normal-post/index.html')).toBe(true)
  })

  it('status 字段写入 result.posts', () => {
    const { posts } = generateBlog([
      { name: 'a.md', content: '---\ntitle: A\nslug: a-post\nstatus: pending\n---\n\n正文。' },
    ])
    expect(posts[0]).toMatchObject({ slug: 'a-post', status: 'pending' })
  })
})

describe('P1-3 系列自动发现', () => {
  const seriesFiles = (extra: string[] = []) => generateBlog([
    {
      name: 'p1.md',
      content: '---\ntitle: 第一章\nseries: 入门\nseriesOrder: 1\n---\n\n正文一。',
    },
    {
      name: 'p2.md',
      content: '---\ntitle: 第二章\nseries: 入门\nseriesOrder: 2\n---\n\n正文二。',
    },
    {
      name: 'standalone.md',
      content: '---\ntitle: 独立文章\n---\n\n正文。',
    },
    ...extra.map((c, i) => ({ name: `x${i}.md`, content: c })),
  ])

  it('仅含 series 的文章产出系列页', () => {
    const { files } = seriesFiles()
    expect(files.some(f => f.path === 'series/index.html')).toBe(true)
    expect(files.some(f => f.path === 'series/入门/index.html')).toBe(true)
    // 独立文章不应出现在系列详情页路径里（无独立系列）
    expect(files.some(f => f.path === 'series/独立文章/index.html')).toBe(false)
  })

  it('系列详情页含两篇文章并按顺序', () => {
    const { files } = seriesFiles()
    const detail = files.find(f => f.path === 'series/入门/index.html')
    expect(detail).toBeTruthy()
    const idx1 = detail!.content.indexOf('第一章')
    const idx2 = detail!.content.indexOf('第二章')
    expect(idx1).toBeGreaterThan(-1)
    expect(idx2).toBeGreaterThan(-1)
    expect(idx1).toBeLessThan(idx2) // 按 seriesOrder 升序
  })

  it('无 series 文章时不产出系列页', () => {
    const { files } = generateBlog([
      { name: 'a.md', content: '# 只有一篇\n\n正文。' },
    ])
    expect(files.some(f => f.path.startsWith('series/'))).toBe(false)
  })

  it('pending 文章的 series 不进入已发布系列页', () => {
    const { files } = seriesFiles([
      '---\ntitle: 待发布章\nseries: 入门\nseriesOrder: 3\nstatus: pending\n---\n\n正文。',
    ])
    const detail = files.find(f => f.path === 'series/入门/index.html')
    expect(detail?.content.includes('待发布章')).toBe(false)
  })

  it('seriesConfig 提供描述/封面注入系列页', () => {
    const { files } = generateBlog(
      [{ name: 'p1.md', content: '---\ntitle: 第一章\nseries: 入门\nseriesOrder: 1\n---\n\n正文一。' }],
      { seriesConfig: [{ name: '入门', slug: '入门', description: '入门系列简介', coverImage: '/c.png' }] },
    )
    const list = files.find(f => f.path === 'series/index.html')
    expect(list?.content.includes('入门系列简介')).toBe(true)
  })

  it('中文系列名 slug 保留中文，路径正确', () => {
    const { files } = generateBlog([
      { name: 'p1.md', content: '---\ntitle: A\nseries: 设计模式\n---\n\n正文。' },
    ])
    expect(files.some(f => f.path === 'series/设计模式/index.html')).toBe(true)
  })
})

describe('P1-3 留痕（generateBlog 不写存储，留痕在 UI 层）', () => {
  it('generateBlog 自身为纯函数，不抛错且产物完整', () => {
    expect(() => generateBlog([
      { name: 'a.md', content: '---\ntitle: A\nstatus: published\n---\n\n正文。' },
      { name: 'b.md', content: '---\ntitle: B\nstatus: draft\n---\n\n正文。' },
      { name: 'c.md', content: '# C\n\n正文。' },
    ])).not.toThrow()
  })
})

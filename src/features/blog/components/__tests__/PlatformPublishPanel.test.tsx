/**
 * P0-1 平台适配导出 UI 测试
 * 覆盖候选项构建（已生成 / 未生成两种数据源）、导出计算与组件交互。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlatformPublishPanel, { buildCandidates, computeExport } from '../PlatformPublishPanel'
import type { BlogPost } from '../../templates'

const makePost = (over: Partial<BlogPost> = {}): BlogPost => ({
  title: '本地优先写作',
  slug: 'local-first',
  date: '2026-08-05',
  tags: ['写作'],
  category: '方法论',
  description: '一篇关于本地优先的文章',
  author: '张三',
  coverImage: '',
  draft: false,
  content: '<h1>本地优先写作</h1><script>evil()</script><p>正文</p>',
  rawContent: '# 本地优先写作\n\n正文段落内容在此处出现。',
  customSlug: '',
  layout: 'post',
  permalink: '',
  updated: '',
  excerpt: '',
  weight: 0,
  ...over,
})

describe('buildCandidates', () => {
  it('优先使用已生成的文章（含 HTML）', () => {
    const list = buildCandidates([makePost()], [])
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe('本地优先写作')
    expect(list[0].html).toContain('<h1>')
    expect(list[0].meta.slug).toBe('local-first')
    expect(list[0].meta.tags).toEqual(['写作'])
    expect(list[0].meta.categories).toEqual(['方法论'])
  })

  it('未生成时回退源文件，并解析 frontmatter', () => {
    const list = buildCandidates(undefined, [
      { name: '草稿.md', content: '---\ntitle: 我的草稿\ntags: [a]\n---\n\n正文段落内容在此处出现。' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].label).toBe('草稿')
    expect(list[0].html).toBeUndefined()
    expect(list[0].meta.title).toBe('我的草稿')
    expect(list[0].meta.tags).toEqual(['a'])
  })

  it('源文件无 frontmatter 时自动推导标题/描述/slug', () => {
    // 标题用短于 10 字符的「笔记」，使 deriveDescription 跳过标题行、落到正文段
    const list = buildCandidates(undefined, [
      { name: 'note.md', content: '# 笔记\n\n这段正文会成为自动生成的描述内容。' },
    ])
    expect(list[0].meta.title).toBe('笔记')
    expect(list[0].meta.slug).toBe('笔记')
    expect(list[0].meta.description).toBe('这段正文会成为自动生成的描述内容。')
  })

  it('无文章也无源文件时返回空数组', () => {
    expect(buildCandidates(undefined, [])).toEqual([])
    expect(buildCandidates([], [])).toEqual([])
  })

  it('同名文章不会产生重复 key', () => {
    const list = buildCandidates([makePost(), makePost()], [])
    expect(list[0].key).not.toBe(list[1].key)
  })

  it('封面缺失时回退自动生成的 ogImage', () => {
    const list = buildCandidates([makePost({ coverImage: '', ogImage: '/assets/og/a.svg' })], [])
    expect(list[0].meta.cover).toBe('/assets/og/a.svg')
  })
})

describe('computeExport', () => {
  const [candidate] = buildCandidates([makePost()], [])

  it('公众号导出清洗 script 标签', () => {
    const r = computeExport(candidate, 'wechat')!
    expect(r.filename).toBe('wechat.html')
    expect(r.content).not.toContain('<script>')
    expect(r.content).toContain('<h1>')
  })

  it('Hugo / Astro 导出带 frontmatter', () => {
    const r = computeExport(candidate, 'hugo')!
    expect(r.filename).toBe('local-first.md')
    expect(r.content.startsWith('---\n')).toBe(true)
    expect(r.content).toContain('title:')
    expect(r.content).toContain('# 本地优先写作')
    expect(computeExport(candidate, 'astro')!.content.startsWith('---\n')).toBe(true)
  })

  it('Substack / MDX 导出为纯 Markdown', () => {
    const r = computeExport(candidate, 'substack')!
    expect(r.content.startsWith('---')).toBe(false)
    expect(r.content).toContain('# 本地优先写作')
    expect(computeExport(candidate, 'mdx')!.content).toBe(r.content)
  })

  it('无候选项返回 null', () => {
    expect(computeExport(undefined, 'hugo')).toBeNull()
  })

  it('无 HTML 时公众号退化为 Markdown', () => {
    const [c] = buildCandidates(undefined, [{ name: 'a.md', content: '# 标题\n\n正文内容在此处出现。' }])
    expect(computeExport(c, 'wechat')!.content).toContain('# 标题')
  })
})

describe('<PlatformPublishPanel />', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('无可选文档时给出引导文案', () => {
    render(<PlatformPublishPanel selectedMdFiles={[]} />)
    expect(screen.getByText(/请先在「内容」面板中选择要发布的文档/)).toBeTruthy()
  })

  it('默认渲染平台选项与预览内容', () => {
    render(<PlatformPublishPanel posts={[makePost()]} selectedMdFiles={[]} />)
    expect(screen.getByText('公众号')).toBeTruthy()
    expect(screen.getByText('Substack')).toBeTruthy()
    expect(screen.getByText('Hugo')).toBeTruthy()
    expect(screen.getByText(/下载 wechat\.html/)).toBeTruthy()
  })

  it('切换平台后下载文件名随之改变', () => {
    render(<PlatformPublishPanel posts={[makePost()]} selectedMdFiles={[]} />)
    fireEvent.click(screen.getByText('Hugo'))
    expect(screen.getByText(/下载 local-first\.md/)).toBeTruthy()
  })

  it('未生成站点时选择公众号会提示需要先生成', () => {
    render(
      <PlatformPublishPanel
        selectedMdFiles={[{ name: 'a.md', content: '# 标题\n\n正文内容在此处出现。' }]}
      />,
    )
    expect(screen.getByText(/请先点击上方「生成」/)).toBeTruthy()
  })

  it('已生成站点时不显示 HTML 缺失提示', () => {
    render(<PlatformPublishPanel posts={[makePost()]} selectedMdFiles={[]} />)
    expect(screen.queryByText(/请先点击上方「生成」/)).toBeNull()
  })

  it('点击复制调用剪贴板 API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<PlatformPublishPanel posts={[makePost()]} selectedMdFiles={[]} />)
    fireEvent.click(screen.getByText('复制'))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('<h1>')
  })

  it('点击下载触发 Blob 下载流程', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<PlatformPublishPanel posts={[makePost()]} selectedMdFiles={[]} />)
    fireEvent.click(screen.getByText(/下载 wechat\.html/))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('多篇文章时可通过下拉切换', () => {
    const posts = [makePost(), makePost({ title: '第二篇', slug: 'second', rawContent: '# 第二篇\n\n内容。' })]
    render(<PlatformPublishPanel posts={posts} selectedMdFiles={[]} />)
    const trigger = document.querySelector('.aurora-select') as HTMLButtonElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    // 滚轮下拉：点选项 = 明确选择（点击即提交并收起）
    fireEvent.click(options[1])
    fireEvent.click(screen.getByText('Hugo'))
    expect(screen.getByText(/下载 second\.md/)).toBeTruthy()
  })
})

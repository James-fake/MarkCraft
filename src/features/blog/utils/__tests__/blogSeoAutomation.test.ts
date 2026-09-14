/**
 * P1-2 集成测试：静态导出时的 SEO 元数据与封面自动化
 * 直接跑 generateBlog，断言真实产物（HTML head、assets/og/*.svg）
 */
import { describe, it, expect } from 'vitest'
import { generateBlog } from '../blogMultiFileGenerator'

const findFile = (files: Array<{ path: string; content: string }>, path: string) =>
  files.find(f => f.path === path)

describe('generateBlog — SEO / 封面自动化（P1-2）', () => {
  describe('描述自动推导', () => {
    it('无 FrontMatter description 时从正文首段推导', () => {
      const { posts } = generateBlog([
        {
          name: 'a.md',
          content: '# 本地优先写作\n\n这是一篇讲本地优先工作流的文章，正文首段会成为描述。\n\n第二段。',
        },
      ])
      expect(posts[0].description).toBe('这是一篇讲本地优先工作流的文章，正文首段会成为描述。')
    })

    it('FrontMatter description 优先于推导结果', () => {
      const { posts } = generateBlog([
        {
          name: 'a.md',
          content: '---\ntitle: T\ndescription: 手写描述\n---\n\n这是正文第一段足够长的内容。',
        },
      ])
      expect(posts[0].description).toBe('手写描述')
    })

    it('excerpt 可作为描述来源', () => {
      const { posts } = generateBlog([
        { name: 'a.md', content: '---\ntitle: T\nexcerpt: 摘要文本\n---\n\n正文内容在这里出现。' },
      ])
      expect(posts[0].description).toBe('摘要文本')
    })

    it('autoSeo:false 时不推导描述（保持旧行为）', () => {
      const { posts } = generateBlog(
        [{ name: 'a.md', content: '# T\n\n这是一段不应被自动提取的正文内容。' }],
        { autoSeo: false },
      )
      expect(posts[0].description).toBe('')
    })

    it('推导后的描述进入文章页 <head>', () => {
      const { files } = generateBlog([
        { name: 'a.md', content: '# 标题甲\n\n这段文字应当出现在 meta description 中。' },
      ])
      const html = findFile(files, 'posts/标题甲/index.html')!.content
      expect(html).toContain('<meta name="description" content="这段文字应当出现在 meta description 中。">')
    })
  })

  describe('OG 封面本地生成', () => {
    it('无封面时生成 assets/og/<slug>.svg 并注入 og:image', () => {
      const { files } = generateBlog(
        [{ name: 'a.md', content: '# 标题乙\n\n正文内容足够长以生成描述。' }],
        { siteUrl: 'https://blog.test' },
      )
      const cover = findFile(files, 'assets/og/标题乙.svg')
      expect(cover).toBeDefined()
      expect(cover!.content).toContain('<svg')
      expect(cover!.content).toContain('标题乙')

      const html = findFile(files, 'posts/标题乙/index.html')!.content
      expect(html).toContain('<meta property="og:image" content="https://blog.test/assets/og/标题乙.svg">')
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    })

    it('已有 coverImage 时不生成，也不覆盖', () => {
      const { files, posts } = generateBlog([
        { name: 'a.md', content: '---\ntitle: 有封面\ncoverImage: /my.png\n---\n\n正文内容在此处出现。' },
      ])
      expect(files.some(f => f.path.startsWith('assets/og/'))).toBe(false)
      expect(posts[0].coverImage).toBe('/my.png')
      expect(posts[0].ogImage).toBeUndefined()
      const html = findFile(files, 'posts/有封面/index.html')!.content
      expect(html).toContain('<meta property="og:image" content="/my.png">')
    })

    it('autoCover:false 时不生成封面文件', () => {
      const { files } = generateBlog([{ name: 'a.md', content: '# 无封面\n\n正文内容在此处出现。' }], {
        autoCover: false,
      })
      expect(files.some(f => f.path.startsWith('assets/og/'))).toBe(false)
    })

    it('草稿不生成封面（不进入发布产物）', () => {
      const { files } = generateBlog([
        { name: 'a.md', content: '---\ntitle: 草稿文\ndraft: true\n---\n\n正文内容在此处出现。' },
        { name: 'b.md', content: '---\ntitle: 正式文\n---\n\n正文内容在此处出现。' },
      ])
      expect(findFile(files, 'assets/og/草稿文.svg')).toBeUndefined()
      expect(findFile(files, 'assets/og/正式文.svg')).toBeDefined()
    })

    it('slug 相同的多篇文章封面路径自动去重', () => {
      const { files } = generateBlog([
        { name: 'a.md', content: '---\ntitle: 同名\nslug: dup\n---\n\n第一篇正文内容在此。' },
        { name: 'b.md', content: '---\ntitle: 同名\nslug: dup\n---\n\n第二篇正文内容在此。' },
      ])
      expect(findFile(files, 'assets/og/dup.svg')).toBeDefined()
      expect(findFile(files, 'assets/og/dup-2.svg')).toBeDefined()
    })

    it('站点地址为空时 og:image 退化为页面相对路径', () => {
      const { posts } = generateBlog([{ name: 'a.md', content: '# 相对\n\n正文内容在此处出现。' }], {
        siteUrl: '',
      })
      expect(posts[0].ogImage).toBe('../../assets/og/相对.svg')
    })

    it('封面 SVG 参与 PWA 预缓存清单', () => {
      const { files } = generateBlog([{ name: 'a.md', content: '# PWA 文\n\n正文内容在此处出现。' }], {
        enablePwa: true,
      })
      const sw = findFile(files, 'sw.js')!.content
      expect(sw).toContain('assets/og/pwa-文.svg')
    })

    it('封面标题中的特殊字符被转义，SVG 不被破坏', () => {
      const { files } = generateBlog([
        { name: 'a.md', content: '---\ntitle: "<img onerror=x>"\nslug: xss\n---\n\n正文内容在此处出现。' },
      ])
      const cover = findFile(files, 'assets/og/xss.svg')!.content
      expect(cover).not.toContain('<img')
      expect(cover).toContain('&lt;img')
    })
  })

  describe('slug 兜底与路径安全', () => {
    it('全符号标题不会产出 posts//index.html', () => {
      const { files, posts } = generateBlog([{ name: '!!!.md', content: '# !!!???\n\n正文内容在此处出现。' }])
      expect(posts[0].slug).toBe('untitled')
      expect(files.some(f => f.path === 'posts//index.html')).toBe(false)
      expect(findFile(files, 'posts/untitled/index.html')).toBeDefined()
    })

    it('自定义 slug 优先生效', () => {
      const { files } = generateBlog([
        { name: 'a.md', content: '---\ntitle: 中文标题\nslug: my-post\n---\n\n正文内容在此处出现。' },
      ])
      expect(findFile(files, 'posts/my-post/index.html')).toBeDefined()
    })
  })

  describe('元数据标签完整性', () => {
    it('文章页输出 keywords / author / canonical / article:*', () => {
      const { files } = generateBlog(
        [
          {
            name: 'a.md',
            content:
              '---\ntitle: 元数据文\ntags: [写作, 本地优先]\nauthor: 张三\ndate: 2026-08-05\nupdated: 2026-08-06\n---\n\n正文内容在此处出现。',
          },
        ],
        { siteUrl: 'https://blog.test' },
      )
      const html = findFile(files, 'posts/元数据文/index.html')!.content
      expect(html).toContain('<meta name="keywords" content="写作, 本地优先">')
      expect(html).toContain('<meta name="author" content="张三">')
      expect(html).toContain('<link rel="canonical" href="https://blog.test/posts/元数据文/">')
      expect(html).toContain('<meta property="article:published_time"')
      expect(html).toContain('<meta property="article:modified_time"')
      expect(html).toContain('<meta property="article:tag" content="写作">')
    })

    it('独立页面（layout:page）拥有自身描述而非站点描述', () => {
      const { files } = generateBlog(
        [
          {
            name: 'about.md',
            content: '---\ntitle: 关于\nlayout: page\n---\n\n这是关于页面的专属描述文字内容。',
          },
        ],
        { siteDescription: '站点级描述' },
      )
      const html = findFile(files, '关于/index.html')!.content
      expect(html).toContain('<meta name="description" content="这是关于页面的专属描述文字内容。">')
      expect(html).not.toContain('content="站点级描述"')
      expect(html).toContain('<link rel="canonical"')
    })

    it('统计字数与阅读时长', () => {
      const { posts } = generateBlog([
        { name: 'a.md', content: `# 长文\n\n${'字'.repeat(900)}` },
      ])
      expect(posts[0].wordCount).toBeGreaterThanOrEqual(900)
      expect(posts[0].readingMinutes).toBe(3)
    })
  })

  describe('边界与回归', () => {
    it('空文件列表不抛错，仍产出基础站点文件', () => {
      const { files, posts } = generateBlog([])
      expect(posts).toHaveLength(0)
      expect(findFile(files, 'index.html')).toBeDefined()
      expect(findFile(files, 'rss.xml')).toBeDefined()
      expect(files.some(f => f.path.startsWith('assets/og/'))).toBe(false)
    })

    it('忽略非 .md 与空内容文件', () => {
      const { posts } = generateBlog([
        { name: 'a.txt', content: '文本' },
        { name: 'b.md', content: '   ' },
        { name: 'c.md', content: '# 有效\n\n正文内容在此处出现。' },
      ])
      expect(posts).toHaveLength(1)
      expect(posts[0].title).toBe('有效')
    })

    it('仅有 frontmatter 无正文时描述为空且不崩溃', () => {
      const { posts, files } = generateBlog([
        { name: 'a.md', content: '---\ntitle: 空正文\n---\n' },
      ])
      expect(posts[0].description).toBe('')
      expect(findFile(files, 'posts/空正文/index.html')).toBeDefined()
    })

    it('代码块内容不污染描述', () => {
      const { posts } = generateBlog([
        {
          name: 'a.md',
          content: '# 代码文\n\n```js\nconst secret = "不该出现在描述里"\n```\n\n这才是真正的正文描述段落。',
        },
      ])
      expect(posts[0].description).not.toContain('secret')
      expect(posts[0].description).toBe('这才是真正的正文描述段落。')
    })
  })
})

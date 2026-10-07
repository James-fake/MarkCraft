import { describe, it, expect } from 'vitest'
import {
  buildOgCoverSvg,
  buildSeoHeadTags,
  countWords,
  deriveDescription,
  deriveSeoMeta,
  deriveTags,
  escapeXml,
  estimateReadingMinutes,
  injectSeoIntoHead,
  joinUrl,
  slugifyTitle,
  stripMarkdown,
  svgToDataUri,
  toPublishMeta,
  wrapTitleLines,
} from '../seoMeta'

describe('seoMeta（P1-2 发布元数据与 SEO/封面自动化）', () => {
  describe('escapeXml', () => {
    it('转义 XML/HTML 危险字符', () => {
      expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
    })

    it('普通文本原样返回', () => {
      expect(escapeXml('正常中文 text 123')).toBe('正常中文 text 123')
    })
  })

  describe('stripMarkdown', () => {
    it('去除标题、强调、链接与图片语法', () => {
      const md = '# 标题\n\n这是**加粗**与*斜体*，还有[链接](https://a.com)和![图](/i.png)。'
      const out = stripMarkdown(md)
      expect(out).toContain('标题')
      expect(out).toContain('加粗')
      expect(out).toContain('链接')
      expect(out).not.toContain('**')
      expect(out).not.toContain('https://a.com')
      expect(out).not.toContain('/i.png')
    })

    it('剥离 frontmatter 与围栏代码块', () => {
      const md = '---\ntitle: 秘密\n---\n\n正文开始\n\n```js\nconst secret = 1\n```\n\n结尾'
      const out = stripMarkdown(md)
      expect(out).not.toContain('秘密')
      expect(out).not.toContain('const secret')
      expect(out).toContain('正文开始')
      expect(out).toContain('结尾')
    })

    it('去除 wiki 链接、块引用与块 ID 标记', () => {
      const md = '参见 [[某笔记]] 与 ((blk-1)) 内容 ^blk-99'
      const out = stripMarkdown(md)
      expect(out).toContain('某笔记')
      expect(out).not.toContain('((')
      expect(out).not.toContain('^blk-99')
    })

    it('空输入返回空串', () => {
      expect(stripMarkdown('')).toBe('')
      expect(stripMarkdown('   \n\n  ')).toBe('')
    })
  })

  describe('countWords', () => {
    it('中文按字统计', () => {
      expect(countWords('本地优先的知识写作')).toBe(9)
    })

    it('英文按词统计', () => {
      expect(countWords('local first knowledge writing')).toBe(4)
    })

    it('中英混排分别累加', () => {
      expect(countWords('本地优先 local first')).toBe(6)
    })

    it('忽略代码块内容', () => {
      expect(countWords('一二三\n\n```\nsome code here\n```')).toBe(3)
    })

    it('空文档为 0', () => {
      expect(countWords('')).toBe(0)
      expect(countWords('---\ntitle: x\n---\n')).toBe(0)
    })
  })

  describe('estimateReadingMinutes', () => {
    it('空文档为 0 分钟', () => {
      expect(estimateReadingMinutes('')).toBe(0)
    })

    it('极短文档最少 1 分钟', () => {
      expect(estimateReadingMinutes('短文')).toBe(1)
    })

    it('中文 400 字/分向上取整', () => {
      expect(estimateReadingMinutes('字'.repeat(400))).toBe(1)
      expect(estimateReadingMinutes('字'.repeat(401))).toBe(2)
      expect(estimateReadingMinutes('字'.repeat(1200))).toBe(3)
    })

    it('英文 200 词/分', () => {
      const words = Array.from({ length: 400 }, () => 'word').join(' ')
      expect(estimateReadingMinutes(words)).toBe(2)
    })
  })

  describe('slugifyTitle', () => {
    it('英文转小写连字符', () => {
      expect(slugifyTitle('Hello World, Again!')).toBe('hello-world-again')
    })

    it('保留中文字符', () => {
      expect(slugifyTitle('本地优先 写作')).toBe('本地优先-写作')
    })

    it('折叠连续分隔符并去除首尾连字符', () => {
      expect(slugifyTitle('--a///b--')).toBe('a-b')
    })

    it('纯符号标题回退 untitled', () => {
      expect(slugifyTitle('!!!???')).toBe('untitled')
      expect(slugifyTitle('')).toBe('untitled')
      expect(slugifyTitle('   ')).toBe('untitled')
    })

    it('超长标题按 maxLength 截断且不以连字符结尾', () => {
      const out = slugifyTitle('a b c d e f g h i j k l', 7)
      expect(out.length).toBeLessThanOrEqual(7)
      expect(out.endsWith('-')).toBe(false)
    })
  })

  describe('deriveDescription', () => {
    it('取首个实质段落并去除语法', () => {
      const md = '# 标题\n\n这是第一段正文，长度足够作为描述使用。\n\n第二段。'
      expect(deriveDescription(md)).toBe('这是第一段正文，长度足够作为描述使用。')
    })

    it('跳过过短的段落（如单行标题）', () => {
      const md = '# 短\n\n这里才是真正有内容的第一段描述文字。'
      expect(deriveDescription(md)).toBe('这里才是真正有内容的第一段描述文字。')
    })

    it('超长时截断并加省略号', () => {
      const md = '正'.repeat(300)
      const out = deriveDescription(md, 50)
      expect(out.length).toBe(51)
      expect(out.endsWith('…')).toBe(true)
    })

    it('忽略 frontmatter', () => {
      const md = '---\ndescription: 不应被取用的前置描述\n---\n\n真正的正文第一段内容在这里。'
      expect(deriveDescription(md)).toBe('真正的正文第一段内容在这里。')
    })

    it('空正文返回空串', () => {
      expect(deriveDescription('')).toBe('')
      expect(deriveDescription('---\ntitle: a\n---\n')).toBe('')
    })
  })

  describe('deriveTags', () => {
    it('提取行内 #标签（含中文）', () => {
      expect(deriveTags('内容 #写作 与 #local-first 结束')).toEqual(['写作', 'local-first'])
    })

    it('去重并限制数量', () => {
      expect(deriveTags('#a #a #b')).toEqual(['a', 'b'])
      expect(deriveTags('#a #b #c', 2)).toEqual(['a', 'b'])
    })

    it('忽略代码块内的井号', () => {
      expect(deriveTags('```\n# 这是注释 #fake\n```\n正文 #real')).toEqual(['real'])
    })

    it('无标签返回空数组', () => {
      expect(deriveTags('普通正文没有标签')).toEqual([])
      expect(deriveTags('')).toEqual([])
    })
  })

  describe('deriveSeoMeta', () => {
    const md = '---\ntitle: 我的文章\n---\n\n# 我的文章\n\n这是一段足够长的正文，用来自动生成文章描述。'

    it('FrontMatter 优先于正文推导', () => {
      const meta = deriveSeoMeta(md, {
        title: '前置标题',
        description: '前置描述',
        slug: 'custom-slug',
        tags: ['t1'],
        coverImage: '/cover.png',
        author: '作者A',
        date: '2026-08-05',
      })
      expect(meta.title).toBe('前置标题')
      expect(meta.description).toBe('前置描述')
      expect(meta.slug).toBe('custom-slug')
      expect(meta.tags).toEqual(['t1'])
      expect(meta.cover).toBe('/cover.png')
      expect(meta.author).toBe('作者A')
      expect(meta.date).toBe('2026-08-05')
    })

    it('缺失项从正文推导', () => {
      const meta = deriveSeoMeta(md)
      expect(meta.title).toBe('我的文章')
      expect(meta.slug).toBe('我的文章')
      expect(meta.description).toBe('这是一段足够长的正文，用来自动生成文章描述。')
      expect(meta.wordCount).toBeGreaterThan(0)
      expect(meta.readingMinutes).toBeGreaterThanOrEqual(1)
      expect(meta.draft).toBe(false)
    })

    it('无标题时回退文件名，再回退占位标题', () => {
      expect(deriveSeoMeta('正文', {}, { fileName: '随手记.md' }).title).toBe('随手记')
      expect(deriveSeoMeta('', {}).title).toBe('未命名文档')
    })

    it('categories 缺失时回退 category', () => {
      expect(deriveSeoMeta(md, { category: '随笔' }).categories).toEqual(['随笔'])
      expect(deriveSeoMeta(md, { categories: ['A', 'B'] }).categories).toEqual(['A', 'B'])
    })

    it('draft 仅在严格 true 时生效', () => {
      expect(deriveSeoMeta(md, { draft: true }).draft).toBe(true)
      expect(deriveSeoMeta(md, { draft: 'true' }).draft).toBe(false)
      expect(deriveSeoMeta(md, {}).draft).toBe(false)
    })

    it('站点默认作者作为兜底', () => {
      expect(deriveSeoMeta(md, {}, { author: '站长' }).author).toBe('站长')
    })
  })

  describe('wrapTitleLines', () => {
    it('按每行字数折行', () => {
      expect(wrapTitleLines('abcdefgh', 3, 5)).toEqual(['abc', 'def', 'gh'])
    })

    it('超出最大行数时末行省略', () => {
      const lines = wrapTitleLines('abcdefghij', 3, 2)
      expect(lines).toHaveLength(2)
      expect(lines[1].endsWith('…')).toBe(true)
    })

    it('空标题或非法参数返回空数组', () => {
      expect(wrapTitleLines('', 5, 2)).toEqual([])
      expect(wrapTitleLines('abc', 0, 2)).toEqual([])
      expect(wrapTitleLines('abc', 5, 0)).toEqual([])
    })
  })

  describe('buildOgCoverSvg', () => {
    it('生成 1200×630 的 SVG 且含标题', () => {
      const svg = buildOgCoverSvg({ title: '本地优先写作' })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('width="1200"')
      expect(svg).toContain('height="630"')
      expect(svg).toContain('本地优先写作')
    })

    it('转义标题中的特殊字符，避免 SVG 损坏', () => {
      const svg = buildOgCoverSvg({ title: '<script>alert(1)</script>' })
      expect(svg).not.toContain('<script>')
      expect(svg).toContain('&lt;script&gt;')
    })

    it('可选副标题与站点名', () => {
      const svg = buildOgCoverSvg({ title: 'T', subtitle: '副标题', siteTitle: '我的站点' })
      expect(svg).toContain('副标题')
      expect(svg).toContain('我的站点')
    })

    it('非法主色回退默认色', () => {
      expect(buildOgCoverSvg({ title: 'T', accent: 'javascript:x' })).toContain('#7c3aed')
      expect(buildOgCoverSvg({ title: 'T', accent: '#0af' })).toContain('#0af')
    })

    it('支持自定义尺寸', () => {
      const svg = buildOgCoverSvg({ title: 'T', width: 800, height: 400 })
      expect(svg).toContain('width="800"')
      expect(svg).toContain('viewBox="0 0 800 400"')
    })

    it('空标题不抛错', () => {
      expect(() => buildOgCoverSvg({ title: '' })).not.toThrow()
    })
  })

  describe('svgToDataUri', () => {
    it('生成 UTF-8 data URI', () => {
      const uri = svgToDataUri('<svg>中文</svg>')
      expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
      expect(decodeURIComponent(uri.split(',')[1])).toBe('<svg>中文</svg>')
    })
  })

  describe('joinUrl', () => {
    it('拼接并规范化斜杠', () => {
      expect(joinUrl('https://a.com/', '/posts/x/')).toBe('https://a.com/posts/x/')
      expect(joinUrl('https://a.com', 'posts/x')).toBe('https://a.com/posts/x')
    })

    it('缺省 base 时返回绝对路径', () => {
      expect(joinUrl('', 'posts/x')).toBe('/posts/x')
      expect(joinUrl('', '')).toBe('')
    })

    it('缺省 path 时返回 base', () => {
      expect(joinUrl('https://a.com/', '')).toBe('https://a.com')
    })
  })

  describe('buildSeoHeadTags', () => {
    const meta = {
      title: '文章标题',
      description: '文章描述',
      tags: ['写作', '本地优先'],
      author: '作者',
      cover: 'assets/og/a.svg',
    }

    it('输出 description/keywords/canonical/OG/Twitter 全套', () => {
      const tags = buildSeoHeadTags(meta, {
        siteUrl: 'https://a.com',
        pagePath: 'posts/a/index.html',
        siteTitle: '我的站点',
        locale: 'zh_CN',
      })
      expect(tags).toContain('<meta name="description" content="文章描述">')
      expect(tags).toContain('<meta name="keywords" content="写作, 本地优先">')
      expect(tags).toContain('<link rel="canonical" href="https://a.com/posts/a/index.html">')
      expect(tags).toContain('<meta property="og:title" content="文章标题">')
      expect(tags).toContain('<meta property="og:image" content="https://a.com/assets/og/a.svg">')
      expect(tags).toContain('<meta property="og:site_name" content="我的站点">')
      expect(tags).toContain('<meta property="og:locale" content="zh_CN">')
      expect(tags).toContain('<meta name="twitter:card" content="summary_large_image">')
    })

    it('绝对封面地址不再拼接站点地址', () => {
      const tags = buildSeoHeadTags({ cover: 'https://cdn.com/a.png' }, { siteUrl: 'https://a.com' })
      expect(tags).toContain('content="https://cdn.com/a.png"')
    })

    it('无封面时 twitter:card 降级为 summary', () => {
      const tags = buildSeoHeadTags({ title: 'T' })
      expect(tags).toContain('<meta name="twitter:card" content="summary">')
      expect(tags).not.toContain('og:image')
    })

    it('空字段自动省略，仅保留 og:type 与 twitter:card', () => {
      const tags = buildSeoHeadTags({})
      expect(tags).not.toContain('description')
      expect(tags).not.toContain('canonical')
      expect(tags).toContain('og:type')
      expect(tags).toContain('twitter:card')
    })

    it('转义引号防止属性截断', () => {
      const tags = buildSeoHeadTags({ description: '带"引号"的描述' })
      expect(tags).toContain('&quot;')
      expect(tags).not.toContain('content="带"')
    })
  })

  describe('injectSeoIntoHead', () => {
    it('注入到 </head> 之前', () => {
      const html = '<html><head><title>t</title></head><body>x</body></html>'
      const out = injectSeoIntoHead(html, '<meta name="a" content="b">')
      expect(out).toContain('<meta name="a" content="b">\n</head>')
    })

    it('大小写不敏感匹配 </HEAD>', () => {
      const out = injectSeoIntoHead('<HEAD></HEAD>', '<meta>')
      expect(out).toContain('<meta>\n</HEAD>')
    })

    it('无 head 或空标签时原样返回', () => {
      expect(injectSeoIntoHead('<div>x</div>', '<meta>')).toBe('<div>x</div>')
      expect(injectSeoIntoHead('<head></head>', '')).toBe('<head></head>')
    })
  })

  describe('toPublishMeta', () => {
    it('转换为发布适配器元数据，空值转 undefined', () => {
      const seo = deriveSeoMeta('# T\n\n这是一段足够长度的正文内容描述。', { tags: ['a'] })
      const pm = toPublishMeta(seo)
      expect(pm.title).toBe('T')
      expect(pm.slug).toBe('t')
      expect(pm.tags).toEqual(['a'])
      expect(pm.categories).toBeUndefined()
      expect(pm.cover).toBeUndefined()
      expect(pm.draft).toBe(false)
    })

    it('保留完整元数据', () => {
      const seo = deriveSeoMeta('正文', {
        title: 'T',
        slug: 's',
        date: '2026-01-01',
        description: 'd',
        tags: ['a'],
        categories: ['c'],
        coverImage: '/c.png',
        draft: true,
      })
      expect(toPublishMeta(seo)).toMatchObject({
        title: 'T',
        slug: 's',
        date: '2026-01-01',
        description: 'd',
        tags: ['a'],
        categories: ['c'],
        cover: '/c.png',
        draft: true,
      })
    })
  })
})

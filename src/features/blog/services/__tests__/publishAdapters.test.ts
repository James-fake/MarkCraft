import { describe, it, expect } from 'vitest'
import {
  buildFrontmatter,
  toHugoOrAstro,
  toMdx,
  toWechatHtml,
  generatePlatformExport,
} from '../publishAdapters'

const MD = '# 标题\n\n正文内容，含 [链接](https://example.com)。\n'

describe('P0-1 多平台发布适配器（导出适配）', () => {
  describe('buildFrontmatter', () => {
    it('正常：拼接 title/slug/tags', () => {
      const fm = buildFrontmatter({ title: '我的文章', slug: 'my-post', tags: ['a', 'b'] })
      expect(fm).toContain('title: 我的文章')
      expect(fm).toContain('slug: my-post')
      expect(fm).toContain('tags: [a, b]')
    })

    it('边界：含特殊字符的标题被 YAML 引号包裹', () => {
      const fm = buildFrontmatter({ title: '测试: 冒号与#井号' })
      expect(fm).toContain('title: "测试: 冒号与#井号"')
    })

    it('边界：空 meta 返回空字符串', () => {
      expect(buildFrontmatter({})).toBe('')
    })

    it('边界：draft 布尔正确序列化', () => {
      expect(buildFrontmatter({ draft: true })).toBe('draft: true')
      expect(buildFrontmatter({ draft: false })).toBe('draft: false')
    })
  })

  describe('toHugoOrAstro', () => {
    it('正常：输出 --- 围栏 + frontmatter + 正文', () => {
      const out = toHugoOrAstro(MD, { title: 'T', date: '2026-08-05' })
      expect(out.startsWith('---\n')).toBe(true)
      expect(out).toContain('title: T')
      expect(out.trimEnd().endsWith(MD.trimEnd())).toBe(true)
    })
  })

  describe('toMdx', () => {
    it('正常：MDX 兼容，原样返回', () => {
      expect(toMdx(MD)).toBe(MD)
    })
  })

  describe('toWechatHtml', () => {
    it('正常：去除 script/style/link', () => {
      const dirty = '<div>正文</div><script>alert(1)</script><style>.a{}</style><link rel="x">'
      const clean = toWechatHtml(dirty)
      expect(clean).toContain('<div>正文</div>')
      expect(clean).not.toContain('<script')
      expect(clean).not.toContain('<style')
      expect(clean).not.toContain('<link')
    })

    it('边界：无脚本时原样保留', () => {
      expect(toWechatHtml('<p>纯文本</p>')).toBe('<p>纯文本</p>')
    })
  })

  describe('generatePlatformExport', () => {
    it('wechat 返回 html 文件名与清洗内容', () => {
      const r = generatePlatformExport(MD, 'wechat', { title: 'T' }, '<p>ok</p><script>x</script>')
      expect(r.filename).toBe('wechat.html')
      expect(r.content).toBe('<p>ok</p>')
    })

    it('hugo 返回带 frontmatter 的 md', () => {
      const r = generatePlatformExport(MD, 'hugo', { title: 'T', slug: 'my post' })
      expect(r.filename).toBe('my-post.md')
      expect(r.content.startsWith('---\n')).toBe(true)
    })

    it('substack/mdx 返回原 markdown', () => {
      const r = generatePlatformExport(MD, 'substack', { title: 'T' })
      expect(r.content).toBe(MD)
      expect(r.filename).toBe('T.md')
    })

    it('边界：无 slug/title 时回退为 untitled', () => {
      const r = generatePlatformExport(MD, 'hugo', {})
      expect(r.filename).toBe('untitled.md')
    })

    it('边界：slug 中的非法字符被清洗', () => {
      const r = generatePlatformExport(MD, 'hugo', { slug: 'a/b:c' })
      expect(r.filename).toBe('a-b-c.md')
    })
  })
})

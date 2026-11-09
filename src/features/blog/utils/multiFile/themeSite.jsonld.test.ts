import { describe, it, expect } from 'vitest'
import { generateThemedSiteFiles } from './themeSite'
import type { BlogPost, BlogConfig } from '../../templates/types'

/**
 * 回归锁（2026-11-03 穷尽式审查 P0-5）：
 * 主题路径的文章页 JSON-LD 曾用裸 `JSON.stringify` 拼进 `<script type="application/ld+json">`，
 * 标题/描述含 `</script>` 即提前闭合脚本块，其后内容成为真实标签 → 访客浏览器执行。
 * 经典路径（seoUtils / htmlTemplate）早已用 safeJsonLd，themeSite 是遗漏点。
 */
function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    title: '普通标题',
    slug: 'normal',
    date: '2026-01-01',
    tags: [],
    category: '',
    description: '',
    author: '',
    coverImage: '',
    draft: false,
    content: '<p>正文</p>',
    rawContent: '正文',
    customSlug: '',
    layout: 'post',
    permalink: '',
    updated: '',
    excerpt: '',
    ...overrides,
  }
}

function makeConfig(): BlogConfig {
  return {
    siteUrl: 'https://example.com',
    siteTitle: '测试站',
    siteDescription: '描述',
    author: '作者',
    language: 'zh',
    postsPerPage: 10,
    dateFormat: 'YYYY-MM-DD',
    theme: 'light',
    layout: 'magazine',
    colorScheme: 'blue',
    colorLightness: 50,
    colorSaturation: 100,
    colorSharpness: 100,
    font: 'sans',
    themeStyle: 'minimal' as BlogConfig['themeStyle'],
  }
}

describe('P0-5 · 主题路径 JSON-LD 必须走 safeJsonLd', () => {
  it('标题含 </script> 时不得闭合脚本块（不产生可执行标签）', () => {
    const evil = '</script><script>window.__pwned=1</script>'
    const files = generateThemedSiteFiles({
      posts: [makePost({ title: evil, slug: 'evil' })],
      published: [makePost({ title: evil, slug: 'evil' })],
      config: makeConfig(),
      themeStyle: 'minimal',
    })
    const postFile = files.find((f) => f.path.includes('evil') && f.path.includes('index.html'))
    expect(postFile, '文章页未生成').toBeTruthy()
    const html = postFile!.content

    // 攻击串的原始形态绝不能出现（被转义成 \u003c/script\u003e…）
    expect(html).not.toContain('</script><script>window.__pwned=1</script>')
    // 每个 ld+json 块内部只允许一个合法的 </script> 收尾
    const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? []
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      // 块内除末尾收尾外不得再有 < 起始的标签
      const inner = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
      expect(inner).not.toContain('<script')
    }
  })

  it('正常标题的 JSON-LD 仍然完整（转义不破坏结构）', () => {
    const files = generateThemedSiteFiles({
      posts: [makePost({ title: '正常标题 & 符号' })],
      published: [makePost({ title: '正常标题 & 符号' })],
      config: makeConfig(),
      themeStyle: 'minimal',
    })
    const postFile = files.find((f) => f.path.includes('normal') && f.path.includes('index.html'))
    const html = postFile!.content
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    expect(ld).toBeTruthy()
    const parsed = JSON.parse(ld![1]) as { headline?: string }
    // \u003c 等转义在 JSON 内合法，parse 后与原值等价
    expect(parsed.headline).toBe('正常标题 & 符号')
  })
})

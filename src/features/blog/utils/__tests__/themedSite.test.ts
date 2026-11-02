/**
 * 多文件站点 · 主题渲染器回归锁（专项：部署站点与预览同源）。
 *
 * 背景：多文件管线此前从不消费 themeStyle（只认配色/明暗/字体），换 63 主题部署无效
 * （用户实测：宇宙主题部署后仍是默认样式）。修复 = 非经典主题（NEW_THEME_STYLES 60 个）
 * 走 utils/multiFile/themeSite.ts 主题渲染器，DOM 词汇表与单文件主题系统一致。
 */
import { describe, it, expect } from 'vitest'
import { generateBlog } from '../blogMultiFileGenerator'

const findFile = (files: Array<{ path: string; content: string }>, path: string) =>
  files.find(f => f.path === path)

const sample = [
  { name: 'a.md', content: '---\ntitle: 第一篇\nslug: first\ntags: [测试]\nseries: Getting Started\nseriesOrder: 1\n---\n\n## 小节一\n\n第一篇正文内容，足够长以生成摘录。' },
  { name: 'b.md', content: '---\ntitle: 第二篇\nslug: second\ntags: [测试]\nseries: Getting Started\nseriesOrder: 2\n---\n\n第二篇正文内容。' },
  { name: 'c.md', content: '---\ntitle: 关于站\nslug: about-site\nlayout: page\n---\n\n页面内容。' },
]

describe('generateBlog · 主题路径（非经典主题）', () => {
  it('cosmos：整站产出主题化 DOM + 主题 CSS，链接直出真实 URL（不再 SPA 哈希）', () => {
    const { files } = generateBlog(sample, { themeStyle: 'cosmos' })

    // 页面齐全（含主题化 404 / 系列页 / page 布局页 + 公共辅助文件）
    for (const p of ['index.html', 'archive.html', 'tags.html', '404.html', 'posts/first/index.html', 'posts/second/index.html', 'about-site/index.html', 'series/index.html', 'series/getting-started/index.html', 'rss.xml', 'sitemap.xml', 'robots.txt']) {
      expect(findFile(files, p), `应生成 ${p}`).toBeTruthy()
    }

    const index = findFile(files, 'index.html')!.content
    expect(index).toContain('blog-container')
    expect(index).toContain('blog-hero')
    expect(index).toContain('card-grid')
    expect(index).toContain('class="nav-link')
    // 主题 CSS 确实注入（cosmos 星空底色：暗 #0b0d17 / 亮 #0f1120 + 星点 radial-gradient）
    expect(index).toMatch(/#0b0d17|#0f1120/)
    expect(index).toContain('radial-gradient')
    // 卡片链接 = 真实 URL，SPA 哈希清零
    expect(index).toContain('href="posts/first/index.html"')
    expect(index).not.toContain('href="#post/')

    const post = findFile(files, 'posts/first/index.html')!.content
    expect(post).toContain('post-body-layout')
    expect(post).toContain('post-toc')
    expect(post).toContain('href="../../index.html"') // back-link / 面包屑首页
    expect(post).toContain('href="../../posts/second/index.html"') // 相关文章
    expect(post).toMatch(/href="#heading-/) // TOC 锚点（注入的 heading id）
    expect(post).toContain('BlogPosting') // JSON-LD

    const page = findFile(files, 'about-site/index.html')!.content
    expect(page).toContain('post-body-layout')
    expect(page).toContain('href="../index.html"') // 一层深前缀

    const tags = findFile(files, 'tags.html')!.content
    expect(tags).toContain('tag-cloud-item')
    expect(tags).toContain('href="posts/first/index.html"')
  })

  it('terminal：主题专属装饰（cd .. 返回文案 / hero 光标）随 themeStyle 生效', () => {
    const { files } = generateBlog(sample, { themeStyle: 'terminal' })
    const post = findFile(files, 'posts/first/index.html')!.content
    expect(post).toContain('cd ..')
    const index = findFile(files, 'index.html')!.content
    expect(index).toContain('hero-cursor')
  })

  it('magazine（经典布局）不回归：仍走原多文件管线', () => {
    const { files } = generateBlog(sample)
    const index = findFile(files, 'index.html')!.content
    expect(index).not.toContain('blog-container')
    expect(index).toContain('site-header')
    const post = findFile(files, 'posts/first/index.html')!.content
    expect(post).toContain('post-layout')
    expect(post).not.toContain('post-body-layout')
  })

  it('辅助文件照常产出：PWA 预缓存清单包含主题化页面，404 带主题外壳', () => {
    const { files } = generateBlog(sample, { themeStyle: 'cosmos', enablePwa: true })
    const sw = findFile(files, 'sw.js')!.content
    expect(sw).toContain('posts/first/index.html')
    expect(sw).toContain('archive.html')
    const nf = findFile(files, '404.html')!.content
    expect(nf).toContain('not-found-page')
    expect(nf).toContain('blog-container')
    expect(findFile(files, 'search.html')).toBeTruthy()
  })
})

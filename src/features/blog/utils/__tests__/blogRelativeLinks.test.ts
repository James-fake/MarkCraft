/**
 * 嵌套页面相对链接回归锁。
 *
 * 背景（2026-11-02 用户实测 james-fake.github.io）：主页正常，但点进文章后
 * 面包屑「首页」/外壳导航落到了 posts/index.html → 404。
 * 根因：文章页在 posts/<slug>/ 两层深，模板里却硬编码单层 ../ 前缀或根相对路径。
 * 本测试直接跑 generateBlog，断言各层级页面的站内链接前缀正确。
 */
import { describe, it, expect } from 'vitest'
import { generateBlog } from '../blogMultiFileGenerator'

const findFile = (files: Array<{ path: string; content: string }>, path: string) =>
  files.find(f => f.path === path)

const sample = [
  { name: 'a.md', content: '---\ntitle: 第一篇\nslug: first\ntags: [测试]\nseries: Getting Started\nseriesOrder: 1\n---\n\n第一篇正文内容。' },
  { name: 'b.md', content: '---\ntitle: 第二篇\nslug: second\ntags: [测试]\nseries: Getting Started\nseriesOrder: 2\n---\n\n第二篇正文内容。' },
  { name: 'c.md', content: '---\ntitle: 关于站\nslug: about-site\nlayout: page\n---\n\n页面内容。' },
]

describe('generateBlog — 嵌套页面相对链接', () => {
  it('文章页（posts/<slug>/ 两层深）：面包屑/标签/返回首页/外壳导航全部带 ../../', () => {
    const { files } = generateBlog(sample)
    const html = findFile(files, 'posts/first/index.html')!.content

    expect(html).toContain('href="../../index.html"') // 面包屑首页 + 返回首页
    expect(html).toContain('href="../../tags.html#tag-') // 正文标签
    expect(html).toContain('href="../../archive.html"') // 外壳导航（wrapHtml）
    expect(html).toContain('href="../../tags.html"') // 外壳导航标签页
    // 上一篇/下一篇是 posts/ 内兄弟层级，保持单层 ../
    expect(html).toContain('href="../second/index.html"')
    // 坏链清零：不得再出现解析到 posts/ 下不存在文件的链接
    expect(html).not.toContain('href="../index.html"')
    expect(html).not.toContain('href="../tags.html')
    expect(html).not.toContain('href="archive.html"')
  })

  it('独立页面（<slug>/ 一层深）：返回首页与外壳导航带 ../', () => {
    const { files } = generateBlog(sample)
    const html = findFile(files, 'about-site/index.html')!.content

    expect(html).toContain('href="../index.html"')
    expect(html).toContain('href="../archive.html"')
    expect(html).not.toContain('href="archive.html"')
  })

  it('根页面（index/404）：站内链接保持无前缀（不回归）', () => {
    const { files } = generateBlog(sample)
    const index = findFile(files, 'index.html')!.content
    const notFound = findFile(files, '404.html')!.content

    expect(index).toContain('href="archive.html"')
    expect(index).toContain('href="index.html"') // 外壳站点标题
    expect(notFound).toContain('href="index.html"')
  })

  it('系列页：列表卡片指向 <slug>/index.html，详情的文章链接带 ../../posts/ 前缀', () => {
    const { files } = generateBlog(sample)
    const list = findFile(files, 'series/index.html')!.content
    const detail = findFile(files, 'series/getting-started/index.html')!.content

    expect(list).toContain('href="getting-started/index.html"')
    expect(detail).toContain('href="../index.html"') // 返回系列列表（series/ 一层深）
    expect(detail).toContain('href="../../posts/first/index.html"')
  })

  it('PWA 链接随页面深度变化（项目页部署 xxx.github.io/repo/ 也可用）', () => {
    const { files } = generateBlog(sample, { enablePwa: true })

    const index = findFile(files, 'index.html')!.content
    expect(index).toContain('href="manifest.json"')
    expect(index).toContain("register('sw.js')")

    const post = findFile(files, 'posts/first/index.html')!.content
    expect(post).toContain('href="../../manifest.json"')
    expect(post).toContain("register('../../sw.js')")
  })

  it('Service Worker：缓存名随构建变化 + 导航网络优先（否则重新部署后浏览器永远读旧缓存）', () => {
    const sw1 = findFile(generateBlog(sample, { enablePwa: true }).files, 'sw.js')!.content
    // ⚠️ buildId 取 Date.now()：两次生成必然不同 → sw.js 字节变化 → 浏览器检测到更新
    const sw2 = findFile(generateBlog(sample, { enablePwa: true }).files, 'sw.js')!.content

    expect(sw1).toMatch(/CACHE_NAME = 'markcraft-blog-[a-z0-9]+'/)
    expect(sw1).not.toBe(sw2)

    // 页面导航必须网络优先（旧的纯 cache-first 是「部署后仍见旧站」的元凶）
    expect(sw1).toContain("event.request.mode === 'navigate'")
    expect(sw1.indexOf("mode === 'navigate'")).toBeLessThan(sw1.indexOf('caches.match(event.request)'))

    // 预缓存清单相对路径（根绝对 /x 在项目页部署下 404，会导致 addAll 失败、SW 装不上）
    expect(sw1).toContain("'posts/first/index.html'")
    expect(sw1).not.toContain("'/posts/first/index.html'")
  })
})

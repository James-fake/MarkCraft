/**
 * Blog multi-file generator — generates blog as multiple files (HTML, RSS, sitemap)
 */

import { marked, Marked } from 'marked'
import DOMPurify from 'dompurify'
import { parseFrontMatter, FrontMatter, ParsedDocument } from '@utils/frontMatter'
import {
  BlogConfig,
  BlogPost,
  slugify,
  generatePostHtml,
  generateIndexHtml,
  generateArchiveHtml,
  generateTagsHtml,
  generateRssXml,
  generateSitemapXml,
  DEFAULT_BLOG_CONFIG,
  extractAdmonitionsFromMarkdown,
} from '../templates'
import { textToStorage } from '@core/storage/imageStore'
import {
  extractTitleFromContent,
  inferTagsFromContent,
  inferDateFromContent,
} from './blogConvert'
import { highlightCode } from '../templates/highlight'
import { generateSearchIndex } from '../templates/searchIndexGenerator'
import { generateSearchHtml } from '../templates/searchTemplate'
import { generatePageHtml } from '../templates/pageTemplate'
import { generate404Html } from '../templates/404Template'
import { generateSingleFileBlog } from './blogSingleFileGenerator'
import { generateLinksHtml } from '../templates/linksTemplate'
import { generateAboutHtml } from '../templates/aboutTemplate'
import { generateSeriesHtml, generateSeriesDetailHtml } from '../templates/seriesTemplate'
import {
  derivePostStatus,
  isPublished,
} from '../services/postStatus'
import {
  collectSeries,
  groupsToSeriesConfig,
} from '../services/seriesAggregator'
import { generateManifestJson, generateServiceWorker } from '../templates/pwaTemplate'
import {
  buildOgCoverSvg,
  countWords,
  deriveDescription,
  estimateReadingMinutes,
  joinUrl,
  slugifyTitle,
} from '../services/seoMeta'

// Use a separate Marked instance to avoid polluting the global marked state
// which would affect blogSingleFileGenerator's heading rendering
const multiFileMarked = new Marked()
const markedRenderer = new marked.Renderer()
markedRenderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const highlighted = highlightCode(text, lang)
  const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
  const copyBtn = `<button class="copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">Copy</button>`
  const langClass = lang ? ` class="language-${lang}"` : ''
  return `<pre>${langLabel}${copyBtn}<code${langClass}>${highlighted}</code></pre>`
}
multiFileMarked.use({ renderer: markedRenderer })

export interface BlogFile {
  path: string
  content: string
}

export interface BlogGenerationResult {
  files: BlogFile[]
  posts: BlogPost[]
  config: BlogConfig
}

export function generateBlog(
  files: Array<{ name: string; content: string }>,
  config?: Partial<BlogConfig>
): BlogGenerationResult {
  const mergedConfig: BlogConfig = { ...DEFAULT_BLOG_CONFIG, ...config }
  const posts: BlogPost[] = []

  for (const file of files) {
    if (!file.name.endsWith('.md')) continue
    if (!file.content || !file.content.trim()) continue

    const parsed: ParsedDocument = parseFrontMatter(file.content)
    const resolvedContent = textToStorage(parsed.content)

    // Pre-process: extract mermaid/mindmap code blocks BEFORE marked.parse()
    // This bypasses the marked renderer chain entirely
    const mermaidBlocks: Array<{ lang: string; code: string }> = []
    const codeBlockRegex = /```(mermaid|mindmap)\s*\n([\s\S]*?)\n\s*```/g
    let mermaidIdx = 0
    const preprocessedContent = resolvedContent.replace(codeBlockRegex, (_match, lang, code) => {
      mermaidBlocks.push({ lang, code: code.trim() })
      const placeholder = `\n\nMERMAID_PLACEHOLDER_${mermaidIdx}\n\n`
      mermaidIdx++
      return placeholder
    })

    // Pre-process: extract admonition blocks (:::tip, :::warning, etc.) BEFORE marked.parse()
    const blogLang: 'zh' | 'en' = mergedConfig.language === 'en' ? 'en' : 'zh'
    const { markdown: admonitionProcessedContent } = extractAdmonitionsFromMarkdown(preprocessedContent, blogLang)

    const htmlContent = DOMPurify.sanitize(multiFileMarked.parse(admonitionProcessedContent, { gfm: true, breaks: true, async: false }) as string, { ADD_TAGS: ['style', 'details', 'summary'], ADD_ATTR: ['data-theme', 'data-code', 'id', 'class'] })

    // Post-process: replace placeholders with mermaid diagram containers
    let processedContent = htmlContent
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const block = mermaidBlocks[i]
      const placeholderRegex = new RegExp(`<p>\\s*MERMAID_PLACEHOLDER_${i}\\s*</p>`, 'g')
      if (placeholderRegex.test(processedContent)) {
        const encodedCode = btoa(unescape(encodeURIComponent(block.code)))
        processedContent = processedContent.replace(placeholderRegex, `<div class="mermaid-diagram" id="mermaid-diagram-${i + 1}" data-code="${encodedCode}"><div class="mermaid-spinner"></div><span class="mermaid-loading-text">${block.lang === 'mindmap' ? '🧠' : '📊'} Rendering...</span></div>`)
      }
    }
    const fm: FrontMatter = parsed.frontMatter

    const title = fm.title || extractTitleFromContent(parsed.content) || file.name.replace(/\.md$/, '')
    // slugify 对全符号标题会返回空串，导致产出 posts//index.html，这里兜底
    const slug = slugify(title) || slugifyTitle(title)

    // P1-2: FrontMatter 优先，缺失项从正文推导（可用 autoSeo:false 关闭）
    const autoSeo = mergedConfig.autoSeo !== false
    const fmDescription = fm.description || fm.excerpt || ''
    const description = fmDescription || (autoSeo ? deriveDescription(parsed.content) : '')

    // P1-3: 发布状态机。status 权威优先，回退 draft 布尔，再缺省 published
    const status = derivePostStatus(fm)

    const post: BlogPost = {
      title,
      slug: (fm.slug as string) || slug,
      date: fm.date || inferDateFromContent(parsed.content),
      tags: Array.isArray(fm.tags) && fm.tags.length > 0 ? fm.tags : inferTagsFromContent(parsed.content),
      category: fm.category || '',
      description,
      author: fm.author || mergedConfig.author,
      coverImage: fm.coverImage || '',
      draft: status === 'draft',
      status,
      content: processedContent,
      rawContent: resolvedContent,
      customSlug: (fm.slug as string) || '',
      layout: (fm.layout as 'post' | 'page') || 'post',
      permalink: (fm.permalink as string) || '',
      updated: (fm.updated as string) || '',
      excerpt: (fm.excerpt as string) || '',
      weight: typeof fm.weight === 'number' ? fm.weight : 0,
      series: (fm.series as string) || undefined,
      seriesOrder: typeof fm.seriesOrder === 'number' ? fm.seriesOrder : undefined,
      publishDate: (fm.publishDate as string) || (fm.publish_date as string) || undefined,
      wordCount: countWords(parsed.content),
      readingMinutes: estimateReadingMinutes(parsed.content),
    }

    posts.push(post)
  }

  posts.sort((a, b) => {
    const wA = a.weight || 0
    const wB = b.weight || 0
    if (wA !== wB) return wB - wA
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  // Filter published posts: 仅 status=published 且未到定时发布时间的文章计入
  const now = new Date()
  const publishedPosts = posts.filter(p => isPublished(p.status || 'published', p.publishDate, now))

  const blogFiles: BlogFile[] = []

  // P1-2: 无封面的已发布文章，本地生成 OG 分享图（纯 SVG，不联网、不调第三方服务）
  if (mergedConfig.autoCover !== false) {
    const usedCoverPaths = new Set<string>()
    for (const post of publishedPosts) {
      if (post.coverImage) continue
      const safeSlug = slugifyTitle(post.slug || post.title)
      let assetPath = `assets/og/${safeSlug}.svg`
      let dedupe = 2
      while (usedCoverPaths.has(assetPath)) {
        assetPath = `assets/og/${safeSlug}-${dedupe++}.svg`
      }
      usedCoverPaths.add(assetPath)

      blogFiles.push({
        path: assetPath,
        content: buildOgCoverSvg({
          title: post.title,
          subtitle: post.description || mergedConfig.siteDescription,
          siteTitle: mergedConfig.siteTitle,
          accent: mergedConfig.coverAccent || mergedConfig.customColor,
        }),
      })

      // og:image 优先绝对地址；无站点地址时退化为页面相对路径
      const depth = (post.layout || 'post') === 'page' ? '../' : '../../'
      post.ogImage = mergedConfig.siteUrl
        ? joinUrl(mergedConfig.siteUrl, assetPath)
        : `${depth}${assetPath}`
    }
  }

  blogFiles.push({
    path: 'index.html',
    content: generateIndexHtml(publishedPosts, mergedConfig),
  })

  blogFiles.push({
    path: 'archive.html',
    content: generateArchiveHtml(publishedPosts, mergedConfig),
  })

  blogFiles.push({
    path: 'tags.html',
    content: generateTagsHtml(publishedPosts, mergedConfig),
  })

  blogFiles.push({
    path: 'rss.xml',
    content: generateRssXml(publishedPosts, mergedConfig),
  })

  blogFiles.push({
    path: 'sitemap.xml',
    content: generateSitemapXml(publishedPosts, mergedConfig),
  })

  blogFiles.push({
    path: 'robots.txt',
    content: `User-agent: *\nAllow: /\n\nSitemap: ${mergedConfig.siteUrl}/sitemap.xml\n`,
  })

  // Search
  if (mergedConfig.enableSearch !== false) {
    blogFiles.push({
      path: 'search-index.json',
      content: generateSearchIndex(publishedPosts),
    })
    blogFiles.push({
      path: 'search.html',
      content: generateSearchHtml(mergedConfig),
    })
  }

  // 404 page
  blogFiles.push({
    path: '404.html',
    content: generate404Html(mergedConfig),
  })

  // PWA files
  if (mergedConfig.enablePwa) {
    blogFiles.push({
      path: 'manifest.json',
      content: generateManifestJson(mergedConfig),
    })
    const allAssetPaths = blogFiles.map(f => f.path)
    blogFiles.push({
      path: 'sw.js',
      content: generateServiceWorker(allAssetPaths),
    })
  }

  // 友情链接页
  if (mergedConfig.friendLinks && mergedConfig.friendLinks.length > 0) {
    blogFiles.push({
      path: 'links.html',
      content: generateLinksHtml(mergedConfig.friendLinks, mergedConfig),
    })
  }

  // 关于页面
  if (mergedConfig.aboutConfig?.enable) {
    blogFiles.push({
      path: 'about.html',
      content: generateAboutHtml(mergedConfig.aboutConfig, mergedConfig),
    })
  }

  // 系列文章页面（P1-3：从已发布文章自动发现 series 字段，兼容 seriesConfig 的描述/封面）
  {
    const seriesGroups = collectSeries(publishedPosts, {
      descriptions: Object.fromEntries(
        (mergedConfig.seriesConfig || []).map(s => [s.name, s.description]),
      ),
      covers: Object.fromEntries(
        (mergedConfig.seriesConfig || []).map(s => [s.name, s.coverImage]),
      ),
    })

    if (seriesGroups.length > 0) {
      const seriesConfigForTpl = groupsToSeriesConfig(seriesGroups)

      blogFiles.push({
        path: 'series/index.html',
        content: generateSeriesHtml(publishedPosts, seriesConfigForTpl, mergedConfig),
      })

      for (const grp of seriesGroups) {
        if (grp.posts.length > 0) {
          const cfg = seriesConfigForTpl.find(s => s.slug === grp.slug)!
          blogFiles.push({
            path: `series/${grp.slug}/index.html`,
            content: generateSeriesDetailHtml(cfg, grp.posts, mergedConfig),
          })
        }
      }
    }
  }

  for (let i = 0; i < publishedPosts.length; i++) {
    const post = publishedPosts[i]
    const prevPost = i > 0 ? publishedPosts[i - 1] : undefined
    const nextPost = i < publishedPosts.length - 1 ? publishedPosts[i + 1] : undefined
    const layout = post.layout || 'post'
    if (layout === 'page') {
      blogFiles.push({
        path: `${post.slug}/index.html`,
        content: generatePageHtml(post, mergedConfig),
      })
    } else {
      blogFiles.push({
        path: `posts/${post.slug}/index.html`,
        content: generatePostHtml(post, mergedConfig, prevPost, nextPost, publishedPosts),
      })
    }
  }

  return { files: blogFiles, posts, config: mergedConfig }
}

async function writeFilesToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  files: BlogFile[]
): Promise<void> {
  for (const file of files) {
    const parts = file.path.split('/')
    let currentHandle = dirHandle

    for (let i = 0; i < parts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true })
    }

    const fileName = parts[parts.length - 1]
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file.content)
    await writable.close()
  }
}

export async function downloadBlogAsZip(result: BlogGenerationResult): Promise<void> {
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker()
      await writeFilesToDirectory(dirHandle, result.files)
      return
    } catch {
    }
  }

  const singleFile = generateSingleFileBlog(
    result.posts.map((p) => ({
      name: p.slug,
      content: p.rawContent,
      frontMatter: {
        title: p.title,
        date: p.date,
        tags: p.tags,
        category: p.category,
        description: p.description,
        author: p.author,
        coverImage: p.coverImage,
        draft: p.draft,
      },
    })),
    result.config
  )

  const blob = new Blob([singleFile], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'blog.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

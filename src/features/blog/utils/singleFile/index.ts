/**
 * Single-file blog generator — main entry point
 * Re-exports generateSingleFileBlog and generateNewThemeSingleFileBlog
 */

import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { FrontMatter } from '@utils/frontMatter'
import {
  BlogConfig,
  BlogPost,
  slugify,
  DEFAULT_BLOG_CONFIG,
  ThemeStyle,
} from '../../templates'
import { textToStorage } from '@core/storage/imageStore'
import {
  extractTitleFromContent,
  inferTagsFromContent,
  inferDateFromContent,
} from '../blogConvert'
import { extractMermaidFromMarkdown, injectMermaidContainers } from './mermaidHelpers'
import { extractAdmonitionsFromMarkdown } from '../../templates/extraRenderers'
import { resolveColorScheme, resolveFonts, resolveLayout } from './colorSchemes'
import { generateClassicHtmlTemplate } from './htmlTemplate'
import { generateNewThemeSingleFileBlog, generateCustomThemeSingleFileBlog } from './newThemeTemplate'

export { generateNewThemeSingleFileBlog, generateCustomThemeSingleFileBlog } from './newThemeTemplate'

/**
 * 拥有专属主题模板的主题风格清单（48 生成器 + 12 独立）。
 * 单文件管线据此分派到 generateNewThemeSingleFileBlog；
 * 多文件主题渲染器（utils/multiFile/themeSite.ts）据此分派主题路径（单一数据源，禁两处各自维护）。
 */
export const NEW_THEME_STYLES: ReadonlySet<string> = new Set(['ink-wash', 'terminal', 'newspaper', 'glassmorphism', 'bento', 'narrative', 'cyberpunk', 'aurora', 'academia', 'retro', 'garden', 'midnight', 'poetry', 'typewriter', 'ocean', 'sunset', 'editorial', 'trending', 'dispatch', 'carbon', 'blueprint', 'hacker', 'showcase', 'mosaic', 'gallery', 'cinematic', 'docs', 'wiki', 'neon', 'origami', 'swiss', 'bauhaus', 'artdeco', 'zen', 'brutalist', 'vaporwave', 'pixel', 'neumorphism', 'corporate', 'fashion', 'forest', 'notion', 'cafe', 'travel', 'music', 'sketch', 'cosmos', 'claymorphism', 'ice-crystal', 'rams', 'luxury', 'comic', 'steampunk', 'gothic', 'noir', 'recipe', 'timeline', 'feed', 'pastel', 'newsletter'])

export function generateSingleFileBlog(
  files: Array<{
    name: string
    content: string
    frontMatter?: Partial<FrontMatter>
  }>,
  config?: Partial<BlogConfig>
): string {
  const mergedConfig: BlogConfig = { ...DEFAULT_BLOG_CONFIG, ...config }
  const isDark = mergedConfig.theme === 'dark'
  const blogLang: 'zh' | 'en' = mergedConfig.language === 'en' ? 'en' : 'zh'
  const colors = resolveColorScheme(mergedConfig)
  const fonts = resolveFonts(mergedConfig)
  const layout = resolveLayout(mergedConfig)
  const posts: BlogPost[] = []

  for (const file of files) {
    const fm = file.frontMatter || {}
    const resolvedContent = textToStorage(file.content)
    if (!resolvedContent || !resolvedContent.trim()) continue

    // Pre-process: extract mermaid/mindmap code blocks BEFORE marked.parse()
    // This bypasses the marked renderer chain entirely
    const { markdown: preprocessedMarkdown, mermaidBlocks } = extractMermaidFromMarkdown(resolvedContent)

    // Pre-process: extract admonition blocks (:::tip, :::warning, etc.) BEFORE marked.parse()
    const { markdown: admonitionProcessedMarkdown } = extractAdmonitionsFromMarkdown(preprocessedMarkdown, blogLang)

    const rawHtml = marked.parse(admonitionProcessedMarkdown, { gfm: true, breaks: true }) as string
    const htmlContent = DOMPurify.sanitize(rawHtml, { ADD_TAGS: ['style', 'details', 'summary'], ADD_ATTR: ['data-theme', 'data-code', 'id', 'class'] })

    // Post-process: replace placeholders with mermaid diagram containers
    const { html: processedContent, hasMermaid: _postHasMermaid } = injectMermaidContainers(htmlContent, mermaidBlocks)
    const title = fm.title || extractTitleFromContent(resolvedContent) || file.name
    const slug = slugify(title)

    posts.push({
      title,
      slug: (fm.slug as string) || slug,
      date: fm.date || inferDateFromContent(resolvedContent),
      tags: Array.isArray(fm.tags) && fm.tags.length > 0 ? fm.tags : inferTagsFromContent(resolvedContent),
      category: fm.category || '',
      description: fm.description || fm.excerpt || '',
      author: fm.author || mergedConfig.author,
      coverImage: fm.coverImage || '',
      draft: fm.draft === true,
      content: processedContent,
      rawContent: resolvedContent,
      customSlug: (fm.slug as string) || '',
      layout: (fm.layout as 'post' | 'page') || 'post',
      permalink: (fm.permalink as string) || '',
      updated: (fm.updated as string) || '',
      excerpt: (fm.excerpt as string) || '',
      weight: typeof fm.weight === 'number' ? fm.weight : 0,
      series: (fm.series as string) || '',
      seriesOrder: typeof fm.seriesOrder === 'number' ? fm.seriesOrder : undefined,
      publishDate: (fm.publishDate as string) || (fm.publish_date as string) || undefined,
    })
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

  const published = posts.filter((p) => !p.draft)
  const hasMermaid = posts.some((p) => p.content.includes('mermaid-diagram'))

  const themeStyle = mergedConfig.themeStyle || 'magazine'
  const isNewTheme = ['ink-wash', 'terminal', 'newspaper', 'glassmorphism', 'bento', 'narrative', 'cyberpunk', 'aurora', 'academia', 'retro', 'garden', 'midnight', 'poetry', 'typewriter', 'ocean', 'sunset', 'editorial', 'trending', 'dispatch', 'carbon', 'blueprint', 'hacker', 'showcase', 'mosaic', 'gallery', 'cinematic', 'docs', 'wiki', 'neon', 'origami', 'swiss', 'bauhaus', 'artdeco', 'zen', 'brutalist', 'vaporwave', 'pixel', 'neumorphism', 'corporate', 'fashion', 'forest', 'notion', 'cafe', 'travel', 'music', 'sketch', 'cosmos', 'claymorphism', 'ice-crystal', 'rams', 'luxury', 'comic', 'steampunk', 'gothic', 'noir', 'recipe', 'timeline', 'feed', 'pastel', 'newsletter'].includes(themeStyle)

  if (themeStyle === 'custom') {
    return generateCustomThemeSingleFileBlog(posts, published, mergedConfig, isDark)
  }

  if (isNewTheme) {
    return generateNewThemeSingleFileBlog(posts, published, mergedConfig, isDark, themeStyle as ThemeStyle)
  }

  return generateClassicHtmlTemplate({
    config: mergedConfig,
    isDark,
    blogLang,
    colors,
    fonts,
    layout,
    published,
    posts,
    hasMermaid,
  })
}

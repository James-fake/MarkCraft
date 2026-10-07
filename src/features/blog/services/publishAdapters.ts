/**
 * P0-1 多平台发布适配器（导出适配，无需外部凭证）
 *
 * 设计原则（见《优化项可行性分析》）：本期实现「导出适配」而非「真 API 发布」。
 * 真 API 发布（公众号/Substack）需 AppID/密钥/后端中转，当前无后端（#20 排除），故不做。
 * 本模块提供纯函数，把当前文档转换为各平台可粘贴/可托管的格式，保留本地源为唯一真相。
 *
 * - WeChat：清洗后的 HTML（去 script/style/link），供粘贴进公众号编辑器
 * - Substack / MDX：Markdown 超集（MDX 兼容）
 * - Hugo / Astro：frontmatter + 正文
 */

export type PublishPlatform = 'wechat' | 'substack' | 'mdx' | 'hugo' | 'astro'

export interface PublishMeta {
  title?: string
  slug?: string
  date?: string
  description?: string
  tags?: string[]
  categories?: string[]
  cover?: string
  draft?: boolean
}

function yamlScalar(v: string): string {
  // 简单安全的 YAML 标量引用：含会破坏纯标量的特殊字符（冒号后空格、#、引号、流指示符等）才加双引号
  if (/[:#[\]{}&*!|>'"]/.test(v) || v.trim() !== v) {
    return `"${v.replace(/"/g, '\\"')}"`
  }
  return v
}

/** 由元数据生成 YAML frontmatter 文本（不含 --- 围栏） */
export function buildFrontmatter(meta: PublishMeta): string {
  const lines: string[] = []
  if (meta.title) lines.push(`title: ${yamlScalar(meta.title)}`)
  if (meta.slug) lines.push(`slug: ${yamlScalar(meta.slug)}`)
  if (meta.date) lines.push(`date: ${meta.date}`)
  if (meta.description) lines.push(`description: ${yamlScalar(meta.description ?? '')}`)
  if (meta.tags && meta.tags.length) {
    lines.push(`tags: [${meta.tags.map(yamlScalar).join(', ')}]`)
  }
  if (meta.categories && meta.categories.length) {
    lines.push(`categories: [${meta.categories.map(yamlScalar).join(', ')}]`)
  }
  if (meta.cover) lines.push(`cover: ${yamlScalar(meta.cover)}`)
  if (meta.draft !== undefined) lines.push(`draft: ${meta.draft ? 'true' : 'false'}`)
  return lines.join('\n')
}

/** Hugo / Astro：frontmatter 围栏 + 正文 */
export function toHugoOrAstro(markdown: string, meta: PublishMeta): string {
  const fm = buildFrontmatter(meta)
  return `---\n${fm}\n---\n\n${markdown}\n`
}

/** Substack / MDX：Markdown 超集（MDX 兼容），原样返回 */
export function toMdx(markdown: string): string {
  return markdown
}

/** WeChat：清洗 HTML，去除 script/style/link，供粘贴进公众号编辑器 */
export function toWechatHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
}

export interface PlatformExportResult {
  filename: string
  content: string
}

/** 按平台生成导出结果。markdown 用于 hugo/astro/mdx/substack；html 用于 wechat。 */
export function generatePlatformExport(
  markdown: string,
  platform: PublishPlatform,
  meta: PublishMeta,
  html?: string,
): PlatformExportResult {
  const slug = meta.slug || meta.title || 'untitled'
  const safeSlug = String(slug).replace(/[^\w一-龥-]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
  switch (platform) {
    case 'wechat':
      return { filename: 'wechat.html', content: toWechatHtml(html ?? markdown) }
    case 'substack':
    case 'mdx':
      return { filename: `${safeSlug}.md`, content: toMdx(markdown) }
    case 'hugo':
      return { filename: `${safeSlug}.md`, content: toHugoOrAstro(markdown, meta) }
    case 'astro':
      return { filename: `${safeSlug}.md`, content: toHugoOrAstro(markdown, { ...meta, /* astro 同 frontmatter 形态 */ }) }
    default:
      return { filename: `${safeSlug}.md`, content: markdown }
  }
}

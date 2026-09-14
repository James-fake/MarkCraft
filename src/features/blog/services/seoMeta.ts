/**
 * P1-2 发布元数据与 SEO / 封面自动化
 *
 * 以 FrontMatter 为准、缺失项由正文自动推导：slug、描述、标签、阅读时长；
 * 无封面时本地生成 OG 封面（SVG，不联网、不调用第三方服务），
 * 静态导出时把 description / OG / Twitter Card / canonical 注入 <head>。
 *
 * 全部为纯函数，不依赖 DOM 与网络。
 */
import type { PublishMeta } from './publishAdapters'

export interface SeoMeta {
  title: string
  slug: string
  description: string
  tags: string[]
  categories: string[]
  cover: string
  date: string
  draft: boolean
  author: string
  wordCount: number
  readingMinutes: number
}

export interface DeriveSeoOptions {
  /** 文件名（无标题时回退用） */
  fileName?: string
  /** 站点默认作者 */
  author?: string
  /** 描述最大长度 */
  descriptionLength?: number
}

/** 前置元数据的最小结构（兼容 FrontMatter） */
export interface FrontMatterLike {
  [key: string]: unknown
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff]/g

/** XML / HTML 属性转义 */
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 去除 markdown 语法，得到用于摘要 / 统计的纯文本 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return ''
  let t = markdown
  t = t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') // frontmatter
  t = t.replace(/```[\s\S]*?```/g, ' ') // 围栏代码
  t = t.replace(/~~~[\s\S]*?~~~/g, ' ')
  t = t.replace(/`([^`]*)`/g, '$1') // 行内代码
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接
  t = t.replace(/\[\[([^\]]*)\]\]/g, '$1') // wiki 链接
  t = t.replace(/!?\(\(([^)]*)\)\)/g, ' ') // 块引用/嵌入
  t = t.replace(/\[\^[^\]]+\]:?/g, ' ') // 脚注
  t = t.replace(/<[^>]+>/g, ' ') // 内联 HTML
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '') // 标题标记
  t = t.replace(/^\s{0,3}>\s?/gm, '') // 引用标记
  t = t.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '') // 列表标记
  t = t.replace(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ') // 分割线
  t = t.replace(/(\*\*|__|~~|\*|_)/g, '') // 强调
  t = t.replace(/[ \t]\^[a-zA-Z0-9_-]+(?=\s|$)/g, '') // 块 ID 标记
  t = t.replace(/\|/g, ' ') // 表格竖线
  return t.replace(/\s+/g, ' ').trim()
}

/** 统计字数：中日韩按字计，拉丁按词计 */
export function countWords(markdown: string): number {
  const text = stripMarkdown(markdown)
  if (!text) return 0
  const cjk = text.match(CJK_RE)?.length ?? 0
  const latin = text.replace(CJK_RE, ' ').match(/[A-Za-z0-9'’-]+/g)?.length ?? 0
  return cjk + latin
}

/** 预估阅读时长（分钟，最少 1 分钟）：中文 400 字/分，拉丁 200 词/分 */
export function estimateReadingMinutes(markdown: string): number {
  const text = stripMarkdown(markdown)
  if (!text) return 0
  const cjk = text.match(CJK_RE)?.length ?? 0
  const latin = text.replace(CJK_RE, ' ').match(/[A-Za-z0-9'’-]+/g)?.length ?? 0
  const minutes = cjk / 400 + latin / 200
  return Math.max(1, Math.ceil(minutes))
}

/** 生成 URL 友好的 slug（保留中文，其余非字母数字折叠为连字符） */
export function slugifyTitle(input: string, maxLength = 80): string {
  const base = (input || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!base) return 'untitled'
  return base.slice(0, maxLength).replace(/-+$/, '') || 'untitled'
}

/** 从正文推导描述：取首个实质段落，压缩空白并截断 */
export function deriveDescription(markdown: string, maxLength = 150): string {
  const body = (markdown || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const paragraphs = body.split(/\n\s*\n/)
  for (const p of paragraphs) {
    const text = stripMarkdown(p)
    if (text.length >= 10) return truncate(text, maxLength)
  }
  const all = stripMarkdown(body)
  return all ? truncate(all, maxLength) : ''
}

function truncate(text: string, maxLength: number): string {
  if (maxLength <= 0) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

/** 从正文推导标签（#tag，支持中文），最多 8 个 */
export function deriveTags(markdown: string, limit = 8): string[] {
  const body = (markdown || '').replace(/```[\s\S]*?```/g, ' ')
  const found = body.match(/(?:^|\s)#([\w\u4e00-\u9fa5-]{1,24})(?=\s|$)/g)
  if (!found) return []
  const out: string[] = []
  for (const raw of found) {
    const tag = raw.trim().slice(1)
    // 排除 markdown 标题（# 后必须紧跟非空格才算标签，这里再排除纯数字）
    if (!tag || /^\d+$/.test(tag)) continue
    if (!out.includes(tag)) out.push(tag)
    if (out.length >= limit) break
  }
  return out
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  const s = asString(v)
  return s ? [s] : []
}

/**
 * 合成发布元数据：FrontMatter 优先，缺失项从正文推导。
 * `markdown` 可含 frontmatter；`fm` 为已解析的前置元数据（可选）。
 */
export function deriveSeoMeta(
  markdown: string,
  fm: FrontMatterLike = {},
  options: DeriveSeoOptions = {},
): SeoMeta {
  const body = (markdown || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const headingTitle = body.match(/^\s{0,3}#\s+(.+)$/m)?.[1]?.trim() ?? ''
  const fallbackName = (options.fileName || '').replace(/\.mdx?$/i, '').trim()
  const title = asString(fm.title) || headingTitle || fallbackName || '未命名文档'

  const tags = asStringArray(fm.tags).length ? asStringArray(fm.tags) : deriveTags(body)
  const categories = asStringArray(fm.categories).length
    ? asStringArray(fm.categories)
    : asStringArray(fm.category)

  return {
    title,
    slug: asString(fm.slug) || slugifyTitle(title),
    description:
      asString(fm.description) ||
      asString(fm.excerpt) ||
      deriveDescription(body, options.descriptionLength ?? 150),
    tags,
    categories,
    cover: asString(fm.coverImage) || asString(fm.cover),
    date: asString(fm.date),
    draft: fm.draft === true,
    author: asString(fm.author) || (options.author || ''),
    wordCount: countWords(body),
    readingMinutes: estimateReadingMinutes(body),
  }
}

/** OG 封面参数 */
export interface OgCoverOptions {
  title: string
  subtitle?: string
  siteTitle?: string
  /** 主色（十六进制） */
  accent?: string
  width?: number
  height?: number
}

/** 将标题按每行字数折行，超出行数时末行省略 */
export function wrapTitleLines(title: string, perLine: number, maxLines: number): string[] {
  const text = (title || '').trim()
  if (!text || perLine <= 0 || maxLines <= 0) return []
  const lines: string[] = []
  for (let i = 0; i < text.length && lines.length < maxLines; i += perLine) {
    lines.push(text.slice(i, i + perLine))
  }
  const consumed = lines.length * perLine
  if (consumed < text.length && lines.length > 0) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, perLine - 1))}…`
  }
  return lines
}

/**
 * 本地生成 OG 封面（SVG 字符串，1200×630）。
 * 不联网、不依赖字体文件之外的资源；调用方可直接写成 .svg 文件或转 data URI。
 */
export function buildOgCoverSvg(options: OgCoverOptions): string {
  const width = options.width ?? 1200
  const height = options.height ?? 630
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(options.accent || '') ? options.accent! : '#7c3aed'
  const lines = wrapTitleLines(options.title, 14, 3)
  const startY = height / 2 - (lines.length - 1) * 40 - 20

  const titleTspans = lines
    .map((line, i) => `<tspan x="80" y="${startY + i * 84}">${escapeXml(line)}</tspan>`)
    .join('')

  const subtitle = options.subtitle
    ? `<text x="80" y="${height - 120}" font-size="30" fill="#cbd5f5" font-family="'PingFang SC','Microsoft YaHei',sans-serif">${escapeXml(
        truncate(options.subtitle, 48),
      )}</text>`
    : ''

  const siteTitle = options.siteTitle
    ? `<text x="80" y="${height - 64}" font-size="26" fill="#94a3b8" font-family="'PingFang SC','Microsoft YaHei',sans-serif">${escapeXml(
        truncate(options.siteTitle, 40),
      )}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    options.title,
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="${height}" fill="${accent}"/>
  <text font-size="64" font-weight="700" fill="#f8fafc" font-family="'PingFang SC','Microsoft YaHei',sans-serif">${titleTspans}</text>
  ${subtitle}
  ${siteTitle}
</svg>`
}

/** SVG 转 data URI（UTF-8 安全，不依赖 btoa） */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 拼接站点 URL 与相对路径 */
export function joinUrl(base: string, path: string): string {
  const b = (base || '').replace(/\/+$/, '')
  const p = (path || '').replace(/^\/+/, '')
  if (!b) return p ? `/${p}` : ''
  return p ? `${b}/${p}` : b
}

export interface SeoHeadOptions {
  siteTitle?: string
  siteUrl?: string
  /** 页面相对路径，如 posts/foo/index.html */
  pagePath?: string
  /** og:type，默认 article */
  type?: string
  locale?: string
}

/** 生成注入 <head> 的 SEO 标签串（逐行、已转义；空字段自动省略） */
export function buildSeoHeadTags(meta: Partial<SeoMeta>, options: SeoHeadOptions = {}): string {
  const lines: string[] = []
  const push = (tag: string) => lines.push(tag)

  const canonical = options.siteUrl ? joinUrl(options.siteUrl, options.pagePath || '') : ''
  const coverUrl =
    meta.cover && /^(https?:)?\/\//.test(meta.cover)
      ? meta.cover
      : meta.cover && options.siteUrl
        ? joinUrl(options.siteUrl, meta.cover)
        : meta.cover || ''

  if (meta.description) push(`<meta name="description" content="${escapeXml(meta.description)}">`)
  if (meta.tags && meta.tags.length) {
    push(`<meta name="keywords" content="${escapeXml(meta.tags.join(', '))}">`)
  }
  if (meta.author) push(`<meta name="author" content="${escapeXml(meta.author)}">`)
  if (canonical) push(`<link rel="canonical" href="${escapeXml(canonical)}">`)

  push(`<meta property="og:type" content="${escapeXml(options.type || 'article')}">`)
  if (meta.title) push(`<meta property="og:title" content="${escapeXml(meta.title)}">`)
  if (meta.description) push(`<meta property="og:description" content="${escapeXml(meta.description)}">`)
  if (canonical) push(`<meta property="og:url" content="${escapeXml(canonical)}">`)
  if (coverUrl) push(`<meta property="og:image" content="${escapeXml(coverUrl)}">`)
  if (options.siteTitle) push(`<meta property="og:site_name" content="${escapeXml(options.siteTitle)}">`)
  if (options.locale) push(`<meta property="og:locale" content="${escapeXml(options.locale)}">`)

  push(`<meta name="twitter:card" content="${coverUrl ? 'summary_large_image' : 'summary'}">`)
  if (meta.title) push(`<meta name="twitter:title" content="${escapeXml(meta.title)}">`)
  if (meta.description) push(`<meta name="twitter:description" content="${escapeXml(meta.description)}">`)
  if (coverUrl) push(`<meta name="twitter:image" content="${escapeXml(coverUrl)}">`)

  return lines.join('\n')
}

/** 将标签注入 HTML 的 </head> 之前；无 head 时原样返回 */
export function injectSeoIntoHead(html: string, tags: string): string {
  if (!tags) return html
  const idx = html.search(/<\/head\s*>/i)
  if (idx === -1) return html
  return `${html.slice(0, idx)}${tags}\n${html.slice(idx)}`
}

/** 转换为 P0-1 发布适配器所需的元数据 */
export function toPublishMeta(seo: SeoMeta): PublishMeta {
  return {
    title: seo.title,
    slug: seo.slug,
    date: seo.date || undefined,
    description: seo.description || undefined,
    tags: seo.tags.length ? seo.tags : undefined,
    categories: seo.categories.length ? seo.categories : undefined,
    cover: seo.cover || undefined,
    draft: seo.draft,
  }
}

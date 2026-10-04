import type { BlogConfig } from './types'
import { escapeAttr } from './templateHelpers'
import { safeJsonLd } from '../utils/jsonLd'

export interface SeoMeta {
  title: string
  description: string
  url: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  tags?: string[]
}

export function generateSeoTags(seoMeta: SeoMeta, config: BlogConfig): string {
  const tags: string[] = []
  tags.push(`<meta name="description" content="${escapeAttr(seoMeta.description)}">`)
  if (seoMeta.tags?.length) {
    tags.push(`<meta name="keywords" content="${escapeAttr(seoMeta.tags.join(', '))}">`)
  }
  if (seoMeta.author) {
    tags.push(`<meta name="author" content="${escapeAttr(seoMeta.author)}">`)
  }
  tags.push(`<link rel="canonical" href="${escapeAttr(seoMeta.url)}">`)
  tags.push(`<meta name="robots" content="index, follow">`)
  tags.push(`<meta property="og:title" content="${escapeAttr(seoMeta.title)}">`)
  tags.push(`<meta property="og:description" content="${escapeAttr(seoMeta.description)}">`)
  tags.push(`<meta property="og:url" content="${escapeAttr(seoMeta.url)}">`)
  tags.push(`<meta property="og:type" content="${seoMeta.type || 'website'}">`)
  tags.push(`<meta property="og:site_name" content="${escapeAttr(config.siteTitle)}">`)
  if (seoMeta.image) {
    tags.push(`<meta property="og:image" content="${escapeAttr(seoMeta.image)}">`)
  }
  if (seoMeta.type === 'article') {
    if (seoMeta.publishedTime) {
      tags.push(`<meta property="article:published_time" content="${seoMeta.publishedTime}">`)
    }
    if (seoMeta.modifiedTime) {
      tags.push(`<meta property="article:modified_time" content="${seoMeta.modifiedTime}">`)
    }
    if (seoMeta.author) {
      tags.push(`<meta property="article:author" content="${escapeAttr(seoMeta.author)}">`)
    }
    if (seoMeta.tags?.length) {
      seoMeta.tags.forEach(tag => {
        tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`)
      })
    }
  }
  tags.push(`<meta name="twitter:card" content="${seoMeta.image ? 'summary_large_image' : 'summary'}">`)
  tags.push(`<meta name="twitter:title" content="${escapeAttr(seoMeta.title)}">`)
  tags.push(`<meta name="twitter:description" content="${escapeAttr(seoMeta.description)}">`)
  if (seoMeta.image) {
    tags.push(`<meta name="twitter:image" content="${escapeAttr(seoMeta.image)}">`)
  }
  return tags.join('\n  ')
}

export function generateJsonLd(seoMeta: SeoMeta, config: BlogConfig): string {
  if (seoMeta.type === 'article') {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: seoMeta.title,
      description: seoMeta.description,
      url: seoMeta.url,
      author: { '@type': 'Person', name: seoMeta.author || config.author },
      publisher: { '@type': 'Organization', name: config.siteTitle },
    }
    if (seoMeta.publishedTime) schema.datePublished = seoMeta.publishedTime
    if (seoMeta.modifiedTime) schema.dateModified = seoMeta.modifiedTime
    if (seoMeta.image) schema.image = seoMeta.image
    return `<script type="application/ld+json">${safeJsonLd(schema)}</script>`
  }
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteTitle,
    description: config.siteDescription,
    url: config.siteUrl,
  }
  return `<script type="application/ld+json">${safeJsonLd(schema)}</script>`
}

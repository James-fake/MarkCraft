/**
 * Classic/Magazine/Minimal theme HTML template — the main HTML skeleton
 * with inline CSS/JS for the original single-file blog styles.
 */

import {
  BlogConfig,
  BlogPost,
} from '../../templates'
import {
  escapeHtml,
  escapeAttr,
  formatDate,
  extractExcerpt,
  tagId,
  sectionIdFromText,
  estimateReadingTime,
  extractToc,
} from '../blogConvert'
import { getMermaidCss, getMermaidScript } from './mermaidHelpers'
import type { ColorScheme, FontSet } from './colorSchemes'
import { getClassicJsInteractions } from './jsInteractions'
import { getClassicThemeCss } from './classicThemeCss'
import { sanitizeCssFast } from '../cssSanitizer'
import { safeJsonLd } from '../jsonLd'

export interface ClassicTemplateConfig {
  config: BlogConfig
  isDark: boolean
  blogLang: 'zh' | 'en'
  colors: ColorScheme
  fonts: FontSet
  layout: string
  published: BlogPost[]
  posts: BlogPost[]
  hasMermaid: boolean
}

export function generateClassicHtmlTemplate(params: ClassicTemplateConfig): string {
  const { config: mergedConfig, isDark, blogLang, colors, fonts, layout, published, posts, hasMermaid } = params

  const featuredCard = published.length > 0
    ? (() => {
        const post = published[0]
        const metaParts: string[] = []
        if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
        if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
        const tagsHtml = post.tags.map(t => `<a href="#tags" class="tag" data-tag-filter="${escapeAttr(t)}">${escapeHtml(t)}</a>`).join('')
        const excerpt = post.description ? escapeHtml(post.description) : escapeHtml(extractExcerpt(post.content, 260))
        return `<div class="featured-card">
  <div class="featured-card-inner">
    <div class="featured-badge">Featured</div>
    <div class="featured-number">01</div>
    <h2><a href="#post/${escapeAttr(post.slug)}">${escapeHtml(post.title)}</a></h2>
    <div class="post-meta">${metaParts.join('')}</div>
    <p class="featured-excerpt">${excerpt}</p>
    ${tagsHtml ? `<div class="tag-list">${tagsHtml}</div>` : ''}
    <a href="#post/${escapeAttr(post.slug)}" class="featured-cta">${blogLang === 'en' ? 'Read More' : '阅读全文'} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
  </div>
  <div class="featured-deco">
    <div class="deco-circle"></div>
    <div class="deco-diamond"></div>
    <div class="deco-dot"></div>
  </div>
</div>`
      })()
    : ''

  const gridCards = published.slice(1)
    .map((post, idx) => {
      const num = String(idx + 2).padStart(2, '0')
      const metaParts: string[] = []
      if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
      if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
      const tagsHtml = post.tags.map(t => `<a href="#tags" class="tag" data-tag-filter="${escapeAttr(t)}">${escapeHtml(t)}</a>`).join('')
      const excerpt = post.description ? escapeHtml(post.description) : escapeHtml(extractExcerpt(post.content, 120))
      const isEven = idx % 2 === 0
      return `<div class="grid-card ${isEven ? 'grid-card--left' : 'grid-card--right'}">
  <div class="grid-card-inner">
    <div class="grid-card-num">${num}</div>
    <div class="grid-card-line"></div>
    <h3><a href="#post/${escapeAttr(post.slug)}">${escapeHtml(post.title)}</a></h3>
    <div class="post-meta">${metaParts.join('')}</div>
    <p class="grid-excerpt">${excerpt}</p>
    ${tagsHtml ? `<div class="tag-list">${tagsHtml}</div>` : ''}
    <a href="#post/${escapeAttr(post.slug)}" class="grid-cta">${blogLang === 'en' ? 'Read' : '阅读'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
  </div>
</div>`
    })
    .join('')

  const minimalListHtml = published
    .map((post) =>
      `<a href="#post/${escapeAttr(post.slug)}" class="minimal-item"><span class="minimal-date">${escapeHtml(formatDate(post.date))}</span><span class="minimal-title">${escapeHtml(post.title)}</span></a>`
    )
    .join('')

  const classicCardsHtml = published
    .map((post) => {
      const metaParts: string[] = []
      if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
      if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
      const excerpt = post.description ? escapeHtml(post.description) : escapeHtml(extractExcerpt(post.content, 140))
      const tagsHtml = post.tags.map(t => `<a href="#tags" class="tag" data-tag-filter="${escapeAttr(t)}">${escapeHtml(t)}</a>`).join('')
      return `<a href="#post/${escapeAttr(post.slug)}" class="classic-card"><h3>${escapeHtml(post.title)}</h3><div class="post-meta">${metaParts.join('')}</div><p class="classic-excerpt">${excerpt}</p>${tagsHtml ? `<div class="tag-list">${tagsHtml}</div>` : ''}</a>`
    })
    .join('')

  const archiveByYear = new Map<string, BlogPost[]>()
  for (const post of published) {
    const year = post.date ? new Date(post.date).getFullYear().toString() : (blogLang === 'en' ? 'Unknown' : '未知')
    const list = archiveByYear.get(year) || []
    list.push(post)
    archiveByYear.set(year, list)
  }
  const archiveYears = [...archiveByYear.keys()].sort((a, b) => b.localeCompare(a))
  const archiveSection = archiveYears
    .map((year) => {
      const yearPosts = archiveByYear.get(year)!
      const items = yearPosts
        .map((post) =>
          `<a href="#post/${escapeAttr(post.slug)}" class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><span class="timeline-date">${escapeHtml(formatDate(post.date))}</span><span class="timeline-title">${escapeHtml(post.title)}</span></div></a>`
        )
        .join('')
      return `<div class="timeline-year"><div class="timeline-year-label">${escapeHtml(year)}</div><div class="timeline-group">${items}</div></div>`
    })
    .join('')

  const tagMap = new Map<string, BlogPost[]>()
  for (const post of published) {
    for (const tag of post.tags) {
      const list = tagMap.get(tag) || []
      list.push(post)
      tagMap.set(tag, list)
    }
  }
  const sortedTags = [...tagMap.keys()].sort()
  const tagCloud = sortedTags
    .map((tag) =>
      `<a href="#tags" class="tag tag--cloud" data-tag-filter="${escapeAttr(tag)}">${escapeHtml(tag)}<span class="tag-num">${tagMap.get(tag)!.length}</span></a>`
    )
    .join('')
  const tagGroups = sortedTags
    .map((tag) => {
      const tagPosts = tagMap.get(tag)!
      const items = tagPosts
        .map((post) =>
          `<a href="#post/${escapeAttr(post.slug)}" class="tag-post-item tag-item" data-tag="${escapeAttr(tag)}" data-section="${escapeAttr(sectionIdFromText(tag))}"><span class="tag-post-date">${escapeHtml(formatDate(post.date))}</span><span class="tag-post-title">${escapeHtml(post.title)}</span></a>`
        )
        .join('')
      return `<div class="tag-group" id="${tagId(tag)}"><h3 data-tag-heading="${escapeAttr(tag)}">${escapeHtml(tag)}<span class="tag-count">${tagPosts.length}</span></h3>${items}</div>`
    })
    .join('')

  const classicSidebarHtml = (() => {
    const recentPosts = published.slice(0, 5)
    const recentHtml = recentPosts
      .map((post) =>
        `<a href="#post/${escapeAttr(post.slug)}" class="sidebar-recent-item"><span class="sidebar-recent-title">${escapeHtml(post.title)}</span><span class="sidebar-recent-date">${escapeHtml(formatDate(post.date))}</span></a>`
      )
      .join('')
    const sidebarTagCloud = sortedTags
      .map((tag) =>
        `<a href="#tags" class="tag tag--cloud" data-tag-filter="${escapeAttr(tag)}">${escapeHtml(tag)}<span class="tag-num">${tagMap.get(tag)!.length}</span></a>`
      )
      .join('')
    return `<aside class="classic-sidebar"><div class="sidebar-section"><h4 class="sidebar-title">${blogLang === 'en' ? 'Tags' : '标签'}</h4><div class="sidebar-tag-cloud">${sidebarTagCloud}</div></div><div class="sidebar-section"><h4 class="sidebar-title">${blogLang === 'en' ? 'Recent Posts' : '最近文章'}</h4><div class="sidebar-recent">${recentHtml}</div></div></aside>`
  })()

  const indexContentHtml = layout === 'minimal'
    ? `<div class="minimal-list">${minimalListHtml}</div>`
    : layout === 'classic'
      ? `<div class="classic-layout"><div class="classic-main">${classicCardsHtml}</div>${classicSidebarHtml}</div>`
      : `${featuredCard}${gridCards ? `<div class="post-grid">${gridCards}</div>` : ''}`

  const heroHtml = layout === 'minimal'
    ? ''
    : `<div class="hero-section">
        <div class="hero-left">
          <div class="hero-label">Personal Blog</div>
          <h2 class="hero-title"><span>${escapeHtml(mergedConfig.siteTitle)}</span></h2>
          <p class="hero-desc">${escapeHtml(mergedConfig.siteDescription)}</p>
        </div>
        <div class="hero-right">
          <div class="vline"></div>
          <div class="vlabel">${escapeHtml(mergedConfig.author)}</div>
        </div>
        <div class="hero-divider">
          <div class="line"></div>
          <div class="diamond"></div>
          <div class="line"></div>
        </div>
      </div>`

  const postSections = posts
    .map((post) => {
      const tagsHtml = post.tags.map(t => `<a href="#tags" class="tag" data-tag-filter="${escapeAttr(t)}">${escapeHtml(t)}</a>`).join('')
      const metaParts: string[] = []
      if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
      if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
      if (post.category) metaParts.push(`<span class="category-badge">${escapeHtml(post.category)}</span>`)

      let contentWithIds = post.content
      const tocItems = extractToc(contentWithIds)
      const usedIds = new Set<string>()
      for (const item of tocItems) {
        if (item.existingId) continue
        const tag = `h${item.level}`
        let finalId = item.id
        let counter = 1
        while (usedIds.has(finalId)) {
          finalId = `${item.id}-${counter}`
          counter++
        }
        usedIds.add(finalId)
        item.id = finalId
        const headingRegex = new RegExp(`<${tag}(?!\\s+id=)`)
        contentWithIds = contentWithIds.replace(
          headingRegex,
          `<${tag} id="${finalId}"`
        )
      }

      const tocHtml = tocItems.map(item =>
        `<a href="#${item.id}" class="toc-h${item.level}">${escapeHtml(item.text)}</a>`
      ).join('')

      const readingTime = estimateReadingTime(post.content)
      metaParts.push(`<span class="reading-time meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${blogLang === 'en' ? readingTime.display : readingTime.displayZh}</span>`)

      // 阅读量统计
      if (mergedConfig.enableBusuanzi) {
        metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span class="view-count" data-slug="${post.slug}">0</span> ${blogLang === 'en' ? 'views' : '阅读'}</span>`)
      }

      const author = post.author || mergedConfig.author || 'A'
      const authorInitial = author.charAt(0).toUpperCase()

      // Related posts based on tag similarity
      const relatedPosts = posts
        .filter(p => p.slug !== post.slug && !p.draft)
        .map(p => ({ post: p, score: p.tags.filter(t => post.tags.includes(t)).length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter(item => item.score > 0)

      const relatedHtml = relatedPosts.length > 0 ? `
<div class="related-posts">
  <h3 class="related-title">${blogLang === 'en' ? 'Related Posts' : '相关文章'}</h3>
  <div class="related-list">
    ${relatedPosts.map(item => `
      <a href="#post/${item.post.slug}" class="related-card">
        <div class="related-card-title">${escapeHtml(item.post.title)}</div>
        <div class="related-card-meta">
          <span>${item.post.date}</span>
          ${item.post.tags.slice(0, 2).map(t => `<span class="related-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </a>
    `).join('')}
  </div>
</div>
` : ''

      return `<div class="page-section" id="post-${escapeAttr(post.slug)}" data-section="post">
  <div class="reading-progress-bar" id="reading-progress"></div>
  <div class="post-detail-wrapper">
    <nav class="breadcrumb" aria-label="${blogLang === 'en' ? 'Breadcrumb' : '面包屑导航'}">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList">
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#index"><span itemprop="name">${blogLang === 'en' ? 'Home' : '首页'}</span></a><meta itemprop="position" content="1" /></li>
        ${post.category ? `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#archive"><span itemprop="name">${escapeHtml(post.category)}</span></a><meta itemprop="position" content="2" /></li>` : ''}
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" class="breadcrumb-current"><span itemprop="name">${escapeHtml(post.title)}</span><meta itemprop="position" content="${post.category ? '3' : '2'}" /></li>
      </ol>
    </nav>
    <div class="post-header">
      <div class="post-header-deco"></div>
      <div class="post-header-ornament">
        <div class="ornament-line"></div>
        <div class="ornament-dot"></div>
        <div class="ornament-line"></div>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">${metaParts.join('')}</div>
    </div>
    <div class="post-body-layout">
      <div class="post-content">${contentWithIds}</div>
      <aside class="post-toc">
        <div class="toc-title">${blogLang === 'en' ? 'Contents' : '目录'}</div>
        <nav class="toc-nav">${tocHtml}</nav>
      </aside>
    </div>
    ${tagsHtml ? `<div class="post-tags"><span class="post-tags-label">${blogLang === 'en' ? 'Tags' : '标签'}</span>${tagsHtml}</div>` : ''}
    ${relatedHtml}
    ${mergedConfig.enableApplause ? `<div class="vote-section"><button class="vote-btn vote-up" data-slug="${post.slug}" data-type="up" onclick="handleVote(this)"><span class="vote-icon">👍</span><span class="vote-count">0</span></button><button class="vote-btn vote-down" data-slug="${post.slug}" data-type="down" onclick="handleVote(this)"><span class="vote-icon">👎</span><span class="vote-count">0</span></button></div>` : ''}
    ${mergedConfig.reward?.enable ? `<div class="reward-section" style="text-align:center;margin:24px 0;padding:20px 0;border-top:1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}"><p style="font-size:14px;margin-bottom:12px;color:${isDark ? '#aaa' : '#666'}">${mergedConfig.reward.title || (blogLang === 'en' ? 'Buy me a coffee' : '请我喝杯咖啡')}</p><div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap">${mergedConfig.reward.wechatQrcode ? `<div style="text-align:center"><img src="${mergedConfig.reward.wechatQrcode}" alt="WeChat" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;color:${isDark ? '#888' : '#999'}">${blogLang === 'en' ? 'WeChat' : '微信'}</p></div>` : ''}${mergedConfig.reward.alipayQrcode ? `<div style="text-align:center"><img src="${mergedConfig.reward.alipayQrcode}" alt="Alipay" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;color:${isDark ? '#888' : '#999'}">${blogLang === 'en' ? 'Alipay' : '支付宝'}</p></div>` : ''}</div></div>` : ''}
    <div class="post-author-card">
      <div class="author-avatar">${authorInitial}</div>
      <div class="author-info">
        <div class="author-name">${escapeHtml(author)}</div>
        <div class="author-bio">Writer & Creator</div>
      </div>
    </div>
    <div class="post-share">
      <span class="share-label">${blogLang === 'en' ? 'Share this post' : '分享本文'}</span>
      <button class="share-copy-btn" onclick="copyPostLink()">${blogLang === 'en' ? 'Copy Link' : '复制链接'}</button>
    </div>
    <a href="#index" class="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>${blogLang === 'en' ? 'Back to Home' : '返回首页'}</a>
  </div>
</div>`
    })
    .join('')

  const css = getClassicThemeCss({ isDark, colors, fonts })

  // JSON-LD structured data
  const websiteJsonLd = `<script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: mergedConfig.siteTitle,
    url: mergedConfig.siteUrl || '',
  })}</script>`

  const postJsonLds = published.map(post => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      author: { '@type': 'Person', name: post.author || mergedConfig.author },
      publisher: { '@type': 'Organization', name: mergedConfig.siteTitle },
    }
    if (post.date) schema.datePublished = new Date(post.date).toISOString()
    if (post.description) schema.description = post.description
    if (post.coverImage) schema.image = post.coverImage
    return `<script type="application/ld+json" id="jsonld-post-${escapeAttr(post.slug)}">${safeJsonLd(schema)}</script>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="${escapeAttr(mergedConfig.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(mergedConfig.siteTitle)}</title>
  ${mergedConfig.favicon ? `<link rel="icon" href="${escapeAttr(mergedConfig.favicon)}">` : ''}
  <style>${css}</style>
  ${hasMermaid ? `<style>${getMermaidCss()}</style>` : ''}
  ${mergedConfig.customCss ? `<style>${sanitizeCssFast(mergedConfig.customCss)}</style>` : ''}
  ${mergedConfig.customCssDark ? `<style>@media (prefers-color-scheme: dark) {\n${sanitizeCssFast(mergedConfig.customCssDark)}\n}\n[data-theme="dark"] {\n${sanitizeCssFast(mergedConfig.customCssDark)}\n}</style>` : ''}
  ${websiteJsonLd}
  ${postJsonLds}
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <div class="site-title"><a href="#index">${escapeHtml(mergedConfig.siteTitle)}</a></div>
      <nav class="site-nav">
        <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
        <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
        <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
        ${mergedConfig.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
        ${mergedConfig.friendLinks && mergedConfig.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
        ${mergedConfig.seriesConfig && mergedConfig.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
      </nav>
    </div>
  </header>
  <div class="page-section active" id="page-index" data-section="index">
    <div class="main-content">
      ${heroHtml}
      ${indexContentHtml}
    </div>
  </div>
  <div class="page-section" id="page-archive" data-section="archive">
    <div class="main-content">
      <div class="page-header">
        <h1 class="page-title">Archive</h1>
        <p class="page-subtitle">${blogLang === 'en' ? `${published.length} posts` : `共 ${published.length} 篇文章`}</p>
      </div>
      ${archiveSection}
    </div>
  </div>
  <div class="page-section" id="page-tags" data-section="tags">
    <div class="main-content">
      <div class="page-header">
        <h1 class="page-title">Tags</h1>
        <p class="page-subtitle">${blogLang === 'en' ? `${sortedTags.length} tags` : `共 ${sortedTags.length} 个标签`}</p>
      </div>
      <div class="tag-cloud-section">${tagCloud}</div>
      <div id="tag-groups-container">${tagGroups}</div>
    </div>
  </div>
  ${mergedConfig.aboutConfig?.enable ? `<div class="page-section" id="page-about" data-section="about">
    <div class="main-content">
      <div class="page-header">
        <h1 class="page-title">${blogLang === 'en' ? 'About' : '关于'}</h1>
      </div>
      <div class="about-page">
        ${mergedConfig.aboutConfig.avatar ? `<img src="${escapeAttr(mergedConfig.aboutConfig.avatar)}" alt="${escapeHtml(mergedConfig.author)}" class="about-avatar">` : ''}
        <div class="page-title">${escapeHtml(mergedConfig.author)}</div>
        ${mergedConfig.aboutConfig.bio ? `<div class="about-bio">${escapeHtml(mergedConfig.aboutConfig.bio)}</div>` : ''}
        ${mergedConfig.aboutConfig.skills && mergedConfig.aboutConfig.skills.length > 0 ? `<div class="about-skills">${mergedConfig.aboutConfig.skills.map(s => `<span class="about-skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        ${mergedConfig.aboutConfig.contact && mergedConfig.aboutConfig.contact.length > 0 ? `<div class="about-contact">${mergedConfig.aboutConfig.contact.map(c => `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('')}</div>` : ''}
      </div>
    </div>
  </div>` : ''}
  ${mergedConfig.friendLinks && mergedConfig.friendLinks.length > 0 ? `<div class="page-section" id="page-links" data-section="links">
    <div class="main-content">
      <div class="page-header">
        <h1 class="page-title">${blogLang === 'en' ? 'Friend Links' : '友情链接'}</h1>
        <p class="page-subtitle">${blogLang === 'en' ? 'Friends and recommended sites' : '朋友与推荐站点'}</p>
      </div>
      <div class="friend-links-grid">${mergedConfig.friendLinks.map(l => `
        <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener" class="friend-link-card">
          ${l.avatar ? `<img src="${escapeAttr(l.avatar)}" alt="${escapeHtml(l.name)}" class="friend-avatar">` : ''}
          <div class="friend-info">
            <strong>${escapeHtml(l.name)}</strong>
            ${l.description ? `<p>${escapeHtml(l.description)}</p>` : ''}
          </div>
        </a>`).join('')}</div>
    </div>
  </div>` : ''}
  ${mergedConfig.seriesConfig && mergedConfig.seriesConfig.length > 0 ? `<div class="page-section" id="page-series" data-section="series">
    <div class="main-content">
      <div class="page-header">
        <h1 class="page-title">📚 ${blogLang === 'en' ? 'Series' : '系列文章'}</h1>
        <p class="page-subtitle">${blogLang === 'en' ? 'Explore topic series for systematic learning' : '探索主题系列，系统化学习'}</p>
      </div>
      <div class="series-grid">${mergedConfig.seriesConfig.map(series => {
        const seriesPosts = posts.filter(p => p.series === series.name && !p.draft)
        return `<a href="#post/" class="series-card">
          <div class="series-cover">${!series.coverImage ? '<span class="series-icon">📚</span>' : `<img src="${escapeAttr(series.coverImage)}" alt="${escapeHtml(series.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`}</div>
          <div class="series-info">
            <h3 class="series-title">${escapeHtml(series.name)}</h3>
            <p class="series-description">${escapeHtml(series.description || '')}</p>
            <div class="series-meta"><span class="series-count">${seriesPosts.length} ${blogLang === 'en' ? 'posts' : '篇文章'}</span></div>
          </div>
        </a>`
      }).join('')}</div>
    </div>
  </div>` : ''}
  ${postSections}
  <div class="page-section" id="page-404" data-section="404">
    <div class="main-content">
      <div class="not-found-page">
        <div class="not-found-code">404</div>
        <p class="not-found-text">${blogLang === 'en' ? 'Page Not Found' : '页面未找到'}</p>
        <a href="#index" class="not-found-link">${blogLang === 'en' ? 'Back to Home' : '返回首页'}</a>
      </div>
    </div>
  </div>
  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(mergedConfig.author)} &middot; Crafted with passion</p>
  </footer>
  <div class="scroll-nav">
    <button class="scroll-nav-btn scroll-to-top" aria-label="${blogLang === 'en' ? 'Back to top' : '回到顶部'}" title="${blogLang === 'en' ? 'Back to top' : '回到顶部'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    <button class="scroll-nav-btn scroll-to-bottom" aria-label="${blogLang === 'en' ? 'Go to bottom' : '前往底部'}" title="${blogLang === 'en' ? 'Go to bottom' : '前往底部'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
  </div>
  <script>
  ${getClassicJsInteractions(blogLang)}
  </script>
  <script>(function(){var topBtn=document.querySelector('.scroll-to-top');var btmBtn=document.querySelector('.scroll-to-bottom');function onScroll(){var st=window.pageYOffset||document.documentElement.scrollTop;var sh=document.documentElement.scrollHeight-window.innerHeight;if(topBtn)topBtn.classList.toggle('visible',st>300);if(btmBtn)btmBtn.classList.toggle('visible',st<sh-300);}window.addEventListener('scroll',onScroll,{passive:true});if(topBtn)topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});if(btmBtn)btmBtn.addEventListener('click',function(){window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})});onScroll();})();</script>
  <script>(function(){var pres=document.querySelectorAll('.post-content pre');if(!pres.length)return;pres.forEach(function(pre){if(pre.querySelector('.code-copy-btn'))return;var code=pre.querySelector('code');if(!code)return;var btn=document.createElement('button');btn.className='code-copy-btn';btn.textContent='复制';btn.addEventListener('click',function(){var text=code.textContent||code.innerText;navigator.clipboard.writeText(text).then(function(){btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}).catch(function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}catch(e){}document.body.removeChild(ta);});});pre.appendChild(btn);});})();</script>
  ${hasMermaid ? getMermaidScript(isDark) : ''}
  ${mergedConfig.enableBusuanzi ? `<script>
(function(){
  function updateViewCount(slug){
    var key='views_'+slug;
    var count=parseInt(localStorage.getItem(key)||'0')+1;
    localStorage.setItem(key,count.toString());
    var el=document.querySelector('.view-count[data-slug="'+slug+'"]');
    if(el)el.textContent=count;
  }
  function showViewCounts(){
    document.querySelectorAll('.view-count[data-slug]').forEach(function(el){
      var slug=el.getAttribute('data-slug');
      var key='views_'+slug;
      var count=parseInt(localStorage.getItem(key)||'0');
      el.textContent=count;
    });
  }
  showViewCounts();
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'A') {
        var href = el.getAttribute('href') || '';
        if (href.indexOf('#post/') === 0) {
          var slugPart = href.replace('#post/', '');
          var parts = slugPart.split('/');
          updateViewCount(parts[0]);
          return;
        }
      }
      el = el.parentElement;
    }
  });
})();
</script>` : ''}
  ${mergedConfig.enableApplause ? `<script>
function handleVote(btn){
  var slug=btn.getAttribute('data-slug');
  var type=btn.getAttribute('data-type');
  var key='vote_'+slug;
  var cur=localStorage.getItem(key)||'';
  var section=btn.parentElement;
  var upBtn=section.querySelector('.vote-up');
  var downBtn=section.querySelector('.vote-down');
  var upCountEl=upBtn.querySelector('.vote-count');
  var downCountEl=downBtn.querySelector('.vote-count');
  if(cur===type){
    localStorage.removeItem(key);
    upBtn.classList.remove('active');
    downBtn.classList.remove('active');
    upCountEl.textContent='0';
    downCountEl.textContent='0';
  }else{
    localStorage.setItem(key,type);
    upBtn.classList.toggle('active',type==='up');
    downBtn.classList.toggle('active',type==='down');
    upCountEl.textContent=type==='up'?'1':'0';
    downCountEl.textContent=type==='down'?'1':'0';
  }
}
(function(){
  document.querySelectorAll('.vote-section').forEach(function(s){
    var btn=s.querySelector('.vote-btn');
    if(!btn)return;
    var slug=btn.getAttribute('data-slug');
    var key='vote_'+slug;
    var cur=localStorage.getItem(key)||'';
    var upBtn=s.querySelector('.vote-up');
    var downBtn=s.querySelector('.vote-down');
    var upCountEl=upBtn.querySelector('.vote-count');
    var downCountEl=downBtn.querySelector('.vote-count');
    if(cur==='up'){upBtn.classList.add('active');upCountEl.textContent='1';downCountEl.textContent='0';}
    else if(cur==='down'){downBtn.classList.add('active');downCountEl.textContent='1';upCountEl.textContent='0';}
  });
})();
</script>` : ''}
<script>
(function(){
  document.addEventListener('click',function(e){
    if(e.target.tagName==='IMG'&&e.target.closest('.post-content')&&!e.target.closest('.mermaid')){
      var o=document.createElement('div');o.className='lightbox-overlay';
      var img=document.createElement('img');img.src=e.target.src;img.alt=e.target.alt||'';
      o.appendChild(img);o.onclick=function(){document.body.removeChild(o)};
      document.body.appendChild(o);
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){var o=document.querySelector('.lightbox-overlay');if(o)document.body.removeChild(o)}
  });
})();
</script>
</body>
</html>`
}

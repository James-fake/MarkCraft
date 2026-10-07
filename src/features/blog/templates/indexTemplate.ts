import { BlogPost, BlogConfig } from './types'
import { escapeHtml, escapeAttr, tagId, formatDate, wrapHtml } from './utils'
import type { SeoMeta } from './utils'

export function generateIndexHtml(posts: BlogPost[], config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const published = posts.filter(p => !p.draft)

  if (published.length === 0) {
    const body = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg><p>${bl === 'en' ? 'No posts yet' : '暂无文章'}</p></div>`
    return wrapHtml(config.siteTitle, body, config)
  }

  const heroSection = `<div class="hero-section">
    <h2>${escapeHtml(config.siteTitle)}</h2>
    <p>${escapeHtml(config.siteDescription)}</p>
  </div>`

  const cards = published.map(post => {
    const metaParts: string[] = []
    if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
    if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
    if (post.category) metaParts.push(`<span class="category-badge">${escapeHtml(post.category)}</span>`)

    const tagsHtml = post.tags.map(t =>
      `<a href="tags.html#${tagId(t)}" class="tag">${escapeHtml(t)}</a>`
    ).join('')

    const pinnedBadge = (post.weight || 0) > 0
      ? `<span class="pinned-badge">${bl === 'en' ? 'Pinned' : '置顶'}</span>`
      : ''

    return `<div class="post-card${(post.weight || 0) > 0 ? ' post-card-pinned' : ''}">
  ${pinnedBadge}
  <h2><a href="posts/${escapeAttr(post.slug)}/index.html">${escapeHtml(post.title)}</a></h2>
  <div class="post-meta">${metaParts.join('')}</div>
  ${post.description ? `<p class="post-description">${escapeHtml(post.description)}</p>` : ''}
  ${tagsHtml ? `<div class="tag-list">${tagsHtml}</div>` : ''}
</div>`
  }).join('\n')

  const seoMeta: SeoMeta = {
    title: config.siteTitle,
    description: config.siteDescription,
    url: config.siteUrl,
    type: 'website',
  }

  return wrapHtml(config.siteTitle, heroSection + cards, config, undefined, seoMeta)
}

import { BlogPost, BlogConfig } from './types'
import { escapeHtml, escapeAttr, formatDate, wrapHtml } from './utils'
import type { SeoMeta } from './utils'

export function generateArchiveHtml(posts: BlogPost[], config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const published = posts.filter(p => !p.draft)
  const byYear = new Map<string, BlogPost[]>()
  for (const post of published) {
    const year = post.date ? new Date(post.date).getFullYear().toString() : (bl === 'en' ? 'Unknown' : '未知')
    const list = byYear.get(year) || []
    list.push(post)
    byYear.set(year, list)
  }

  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a))

  const body = `<h1 class="page-title">${bl === 'en' ? 'Archive' : '归档'}</h1>
<p class="page-subtitle">${bl === 'en' ? `${published.length} posts` : `共 ${published.length} 篇文章`}</p>
${years.map(year => {
    const yearPosts = byYear.get(year)!
    const items = yearPosts.map(post =>
      `<div class="archive-item"><span class="date">${escapeHtml(formatDate(post.date))}</span><a href="posts/${escapeAttr(post.slug)}/index.html">${escapeHtml(post.title)}</a></div>`
    ).join('\n')
    return `<div class="archive-section"><div class="archive-year">${escapeHtml(year)}</div>${items}</div>`
  }).join('\n')}`

  const seoMeta: SeoMeta = {
    title: bl === 'en' ? 'Archive' : '归档',
    description: config.siteDescription,
    url: `${config.siteUrl}/archive.html`,
    type: 'website',
  }

  return wrapHtml(bl === 'en' ? 'Archive' : '归档', body, config, undefined, seoMeta)
}

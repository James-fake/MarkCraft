import { BlogPost, BlogConfig } from './types'
import { escapeHtml } from './utils'

export function generateRssXml(posts: BlogPost[], config: BlogConfig): string {
  const published = posts.filter(p => !p.draft)
  const items = published.map(post => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeHtml(config.siteUrl)}/posts/${escapeHtml(post.slug)}/</link>
      <description>${escapeHtml(post.description)}</description>
      <author>${escapeHtml(config.author)}</author>
      ${post.date ? `<pubDate>${new Date(post.date).toUTCString()}</pubDate>` : ''}
      <guid>${escapeHtml(config.siteUrl)}/posts/${escapeHtml(post.slug)}/</guid>
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(config.siteTitle)}</title>
    <link>${escapeHtml(config.siteUrl)}</link>
    <description>${escapeHtml(config.siteDescription)}</description>
    <language>${escapeHtml(config.language)}</language>
    <atom:link href="${escapeHtml(config.siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`
}

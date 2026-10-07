import { BlogPost, BlogConfig } from './types'
import { escapeHtml, formatDate } from './utils'

export function generateSitemapXml(posts: BlogPost[], config: BlogConfig): string {
  const published = posts.filter(p => !p.draft)
  const urls = [
    `  <url>
    <loc>${escapeHtml(config.siteUrl)}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...published.map(post => `  <url>
    <loc>${escapeHtml(config.siteUrl)}/posts/${escapeHtml(post.slug)}/</loc>
    ${post.date ? `<lastmod>${formatDate(post.date)}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`)
  ].join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

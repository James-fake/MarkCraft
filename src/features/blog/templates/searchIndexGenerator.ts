import { BlogPost } from './types'

export function generateSearchIndex(posts: BlogPost[]): string {
  const entries = posts.filter(p => !p.draft).map(post => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    tags: post.tags,
    category: post.category,
    description: post.description,
    content: stripHtml(post.content).slice(0, 500),
  }))
  return JSON.stringify(entries, null, 2)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

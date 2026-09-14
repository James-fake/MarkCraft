import { BlogPost, BlogConfig } from './types'
import { escapeHtml, escapeAttr, tagId, formatDate, wrapHtml } from './utils'
import type { SeoMeta } from './utils'

export function generateTagsHtml(posts: BlogPost[], config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const published = posts.filter(p => !p.draft)
  const tagMap = new Map<string, BlogPost[]>()
  for (const post of published) {
    for (const tag of post.tags) {
      const list = tagMap.get(tag) || []
      list.push(post)
      tagMap.set(tag, list)
    }
  }

  const tags = [...tagMap.keys()].sort()

  const maxCount = Math.max(1, ...tags.map(t => tagMap.get(t)!.length))
  const cloud = tags.map(tag => {
    const count = tagMap.get(tag)!.length
    const level = Math.max(1, Math.ceil((count / maxCount) * 5))
    return `<a href="#${tagId(tag)}" class="tag tag-level-${level}">${escapeHtml(tag)} <span class="tag-count-inline">${count}</span></a>`
  }).join('\n')

  const groups = tags.map(tag => {
    const tagPosts = tagMap.get(tag)!
    const items = tagPosts.map(post =>
      `<div class="archive-item"><span class="date">${escapeHtml(formatDate(post.date))}</span><a href="posts/${escapeAttr(post.slug)}/index.html">${escapeHtml(post.title)}</a></div>`
    ).join('\n')
    return `<div class="tag-group" id="${tagId(tag)}"><h3>${escapeHtml(tag)}<span class="tag-count">${tagPosts.length}</span></h3>${items}</div>`
  }).join('\n')

  const body = `<h1 class="page-title">${bl === 'en' ? 'Tags' : '标签'}</h1>
<p class="page-subtitle">${bl === 'en' ? `${tags.length} tags` : `共 ${tags.length} 个标签`}</p>
<div class="tag-cloud-section">${cloud}</div>
${groups}`

  const seoMeta: SeoMeta = {
    title: bl === 'en' ? 'Tags' : '标签',
    description: config.siteDescription,
    url: `${config.siteUrl}/tags.html`,
    type: 'website',
  }

  return wrapHtml(bl === 'en' ? 'Tags' : '标签', body, config, undefined, seoMeta)
}

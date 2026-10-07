export interface ThemeIndexData {
  siteTitle: string
  siteDescription: string
  author: string
  language: string
  published: Array<{
    title: string
    slug: string
    date: string
    author: string
    tags: string[]
    description: string
    excerpt: string
    category: string
    content: string
  }>
  archiveByYear: Map<string, Array<{title: string; slug: string; date: string}>>
  tagMap: Map<string, Array<{title: string; slug: string; date: string}>>
  sortedTags: string[]
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

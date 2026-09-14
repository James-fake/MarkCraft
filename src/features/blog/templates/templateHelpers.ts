export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function tagId(tag: string): string {
  return 'tag-' + tag.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
}

export function optimizeImages(html: string): string {
  let imageIndex = 0
  return html.replace(/<img\s+/g, (match) => {
    // 已有 loading 属性则跳过
    if (match.includes('loading=')) return match;
    // 前2张图片不使用 lazy loading（首屏内容）
    if (imageIndex < 2) {
      imageIndex++
      return '<img data-lightbox ';
    }
    imageIndex++
    return '<img loading="lazy" decoding="async" data-lightbox ';
  })
}

export { formatDate } from '../utils/date'


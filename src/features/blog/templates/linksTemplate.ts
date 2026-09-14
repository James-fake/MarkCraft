import { FriendLink, BlogConfig } from './types'
import { escapeHtml, escapeAttr, wrapHtml } from './utils'

export function generateLinksHtml(links: FriendLink[], config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const cards = links.map(l => `
    <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener" class="friend-link-card">
      ${l.avatar ? `<img src="${escapeAttr(l.avatar)}" alt="${escapeHtml(l.name)}" class="friend-avatar">` : ''}
      <div class="friend-info">
        <strong>${escapeHtml(l.name)}</strong>
        ${l.description ? `<p>${escapeHtml(l.description)}</p>` : ''}
      </div>
    </a>`).join('')

  const body = `
  <div class="page-title">${bl === 'en' ? 'Friend Links' : '友情链接'}</div>
  <p class="page-subtitle">${bl === 'en' ? 'Friends and recommended sites' : '朋友与推荐站点'}</p>
  <div class="friend-links-grid">${cards}</div>
  `

  return wrapHtml(bl === 'en' ? 'Links' : '友情链接', body, config)
}

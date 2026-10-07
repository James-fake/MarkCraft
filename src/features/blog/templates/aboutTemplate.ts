import { AboutConfig, BlogConfig } from './types'
import { escapeHtml, escapeAttr, wrapHtml } from './utils'

export function generateAboutHtml(about: AboutConfig, config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'

  const avatarHtml = about.avatar
    ? `<img src="${escapeAttr(about.avatar)}" alt="${escapeHtml(config.author)}" class="about-avatar">`
    : ''

  const bioHtml = about.bio
    ? `<div class="about-bio">${escapeHtml(about.bio)}</div>`
    : ''

  const skillsHtml = about.skills && about.skills.length > 0
    ? `<div class="about-skills">${about.skills.map(s => `<span class="about-skill-tag">${escapeHtml(s)}</span>`).join('')}</div>`
    : ''

  const contactHtml = about.contact && about.contact.length > 0
    ? `<div class="about-contact">${about.contact.map(c => `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('')}</div>`
    : ''

  const body = `
  <div class="about-page">
    ${avatarHtml}
    <div class="page-title">${escapeHtml(config.author)}</div>
    ${bioHtml}
    ${skillsHtml}
    ${contactHtml}
  </div>
  `

  return wrapHtml(bl === 'en' ? 'About' : '关于', body, config)
}

/**
 * New theme template — generates HTML for the new theme styles
 * (ink-wash, terminal, newspaper, glassmorphism, bento, narrative, etc.)
 */

import {
  BlogConfig,
  BlogPost,
  ThemeStyle,
} from '../../templates'
import { getThemeStyleCss } from '../../themes'
import {
  escapeHtml,
  escapeAttr,
  formatDate,
  extractExcerpt,
  extractToc,
  estimateReadingTime,
} from '../blogConvert'
import { getMermaidCss, getMermaidScript } from './mermaidHelpers'
import { generateCustomColorOverrideCss } from './colorSchemes'
import { sanitizeCssFast } from '../cssSanitizer'
import { safeJsonLd } from '../jsonLd'
import { getNewThemeJsInteractions } from './jsInteractions'

const THEME_NAV_LABELS: Record<string, { home: { zh: string; en: string }; archive: { zh: string; en: string }; tags: { zh: string; en: string } }> = {
  'ink-wash': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'terminal': { home: { zh: 'ls home', en: 'ls home' }, archive: { zh: 'cat archive', en: 'cat archive' }, tags: { zh: 'grep tags', en: 'grep tags' } },
  'newspaper': { home: { zh: '首页', en: 'Front Page' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Index' } },
  'glassmorphism': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'bento': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'narrative': { home: { zh: '序章', en: 'Prologue' }, archive: { zh: '编年', en: 'Chronicle' }, tags: { zh: '主题', en: 'Themes' } },
  'poetry': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'typewriter': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'ocean': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'sunset': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'editorial': { home: { zh: '首页', en: 'Front Page' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '索引', en: 'Index' } },
  'trending': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'dispatch': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'carbon': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'blueprint': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'hacker': { home: { zh: 'ls home', en: 'ls home' }, archive: { zh: 'cat archive', en: 'cat archive' }, tags: { zh: 'grep tags', en: 'grep tags' } },
  'showcase': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'mosaic': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'gallery': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'cinematic': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'docs': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'wiki': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'neon': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
  'origami': { home: { zh: '首页', en: 'Home' }, archive: { zh: '归档', en: 'Archive' }, tags: { zh: '标签', en: 'Tags' } },
}

export function generateNewThemeSingleFileBlog(
  posts: BlogPost[],
  published: BlogPost[],
  config: BlogConfig,
  isDark: boolean,
  themeStyle: ThemeStyle
): string {
  const themeCss = getThemeStyleCss(themeStyle, isDark)
  const blogLang: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const navLabels = THEME_NAV_LABELS[themeStyle] || THEME_NAV_LABELS['ink-wash']
  const nav = { home: navLabels.home[blogLang], archive: navLabels.archive[blogLang], tags: navLabels.tags[blogLang] }
  const hasMermaid = posts.some((p) => p.content.includes('mermaid-diagram'))

  const sealChar = escapeHtml(config.siteTitle.charAt(0) || 'B')

  const cardsHtml = published.map((post) => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const excerpt = post.description ? escapeHtml(post.description) : escapeHtml(extractExcerpt(post.content, 160))
    return `<a class="card" href="#post/${escapeAttr(post.slug)}">
      <div class="card-title">${escapeHtml(post.title)}</div>
      <div class="card-date">${escapeHtml(formatDate(post.date))}${post.author ? ' · ' + escapeHtml(post.author) : ''}</div>
      <div class="card-excerpt">${excerpt}</div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    </a>`
  }).join('')

  const archiveByYear = new Map<string, BlogPost[]>()
  for (const post of published) {
    const year = post.date ? new Date(post.date).getFullYear().toString() : (blogLang === 'en' ? 'Unknown' : '未知')
    const list = archiveByYear.get(year) || []
    list.push(post)
    archiveByYear.set(year, list)
  }
  const archiveYears = [...archiveByYear.keys()].sort((a, b) => b.localeCompare(a))

  const archiveHtml = archiveYears.map(year => {
    const yearPosts = archiveByYear.get(year)!
    const items = yearPosts.map(p => `
      <div class="archive-item">
        <a href="#post/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a>
        <span class="archive-item-date">${escapeHtml(formatDate(p.date))}</span>
      </div>
    `).join('')
    return `<div class="archive-year">
      <div class="archive-year-title">${escapeHtml(year)}</div>
      ${items}
    </div>`
  }).join('')

  const tagMap = new Map<string, BlogPost[]>()
  for (const post of published) {
    for (const tag of post.tags) {
      const list = tagMap.get(tag) || []
      list.push(post)
      tagMap.set(tag, list)
    }
  }
  const sortedTags = [...tagMap.keys()].sort()

  const tagCloudHtml = sortedTags.map(tag => {
    const count = tagMap.get(tag)!.length
    return `<a class="tag-cloud-item" data-tag="${escapeAttr(tag)}" href="javascript:void(0)">${escapeHtml(tag)}${themeStyle === 'terminal' ? '[' + count + ']' : ' (' + count + ')'}</a>`
  }).join('')

  const tagPostsHtml = sortedTags.map(tag => {
    const tagPosts = tagMap.get(tag)!
    const items = tagPosts.map(p => `
      <div class="tag-post-item">
        <a href="#post/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a>
        <span class="tag-post-date">${escapeHtml(formatDate(p.date))}</span>
      </div>
    `).join('')
    return `<div class="tag-posts-section" id="tag-posts-${escapeAttr(tag)}">
      <div class="tag-posts-title">${themeStyle === 'terminal' ? '// ' : ''}${escapeHtml(tag)}</div>
      ${items}
    </div>`
  }).join('')

  const postSectionsHtml = posts.map(post => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const metaParts: string[] = []
    if (post.date) metaParts.push(escapeHtml(formatDate(post.date)))
    if (post.author) metaParts.push(escapeHtml(post.author))

    // Reading time + word count
    const readingTime = estimateReadingTime(post.content)
    metaParts.push(blogLang === 'en' ? readingTime.display : readingTime.displayZh)

    // 阅读量统计
    if (config.enableBusuanzi) {
      metaParts.push(`<span class="view-count" data-slug="${post.slug}">0</span> ${blogLang === 'en' ? 'views' : '阅读'}`)
    }

    let contentWithIds = post.content
    const tocItems = extractToc(contentWithIds)
    const usedIds = new Set<string>()
    for (const item of tocItems) {
      if (item.existingId) continue // heading already has an id from marked
      const tag = `h${item.level}`
      let finalId = item.id
      let counter = 1
      while (usedIds.has(finalId)) {
        finalId = `${item.id}-${counter}`
        counter++
      }
      usedIds.add(finalId)
      item.id = finalId
      // 替换第一个不带 id 的同级 heading（之前已替换的会被负向预查跳过）
      const headingRegex = new RegExp(`<${tag}(?!\\s+id=)`)
      contentWithIds = contentWithIds.replace(
        headingRegex,
        `<${tag} id="${finalId}"`
      )
    }

    const tocHtml = tocItems.map(item =>
      `<a href="#${item.id}" class="toc-h${item.level}">${escapeHtml(item.text)}</a>`
    ).join('')

    // Related posts based on tag similarity
    const relatedPosts = posts
      .filter(p => p.slug !== post.slug && !p.draft)
      .map(p => ({ post: p, score: p.tags.filter(t => post.tags.includes(t)).length }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(item => item.score > 0)

    const relatedHtml = relatedPosts.length > 0 ? `
<div class="related-posts">
  <h3 class="related-title">${blogLang === 'en' ? 'Related Posts' : '相关文章'}</h3>
  <div class="related-list">
    ${relatedPosts.map(item => `
      <a href="#post/${item.post.slug}" class="related-card">
        <div class="related-card-title">${escapeHtml(item.post.title)}</div>
        <div class="related-card-meta">
          <span>${item.post.date}</span>
          ${item.post.tags.slice(0, 2).map(t => `<span class="related-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </a>
    `).join('')}
  </div>
</div>
` : ''

    return `<div class="page-section" id="post-${escapeAttr(post.slug)}" data-section="post">
      <div class="post-detail">
        <a href="#index" class="back-link">&larr; ${themeStyle === 'terminal' ? 'cd ..' : themeStyle === 'narrative' ? 'Back to Story' : (blogLang === 'en' ? 'Back' : '返回')}</a>
        <nav class="breadcrumb" aria-label="${blogLang === 'en' ? 'Breadcrumb' : '面包屑导航'}">
          <ol itemscope itemtype="https://schema.org/BreadcrumbList">
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#index"><span itemprop="name">${blogLang === 'en' ? 'Home' : '首页'}</span></a><meta itemprop="position" content="1" /></li>
            ${post.category ? `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#archive"><span itemprop="name">${escapeHtml(post.category)}</span></a><meta itemprop="position" content="2" /></li>` : ''}
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" class="breadcrumb-current"><span itemprop="name">${escapeHtml(post.title)}</span><meta itemprop="position" content="${post.category ? '3' : '2'}" /></li>
          </ol>
        </nav>
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <div class="post-meta">${metaParts.join(' · ')}</div>
        <div class="post-body-layout">
          <div class="post-content">${contentWithIds}</div>
          <aside class="post-toc"><div class="toc-title">${blogLang === 'en' ? 'Contents' : '目录'}</div><nav class="toc-nav">${tocHtml}</nav></aside>
        </div>
        ${tagsHtml ? `<div class="post-tags-section">${tagsHtml}</div>` : ''}
        ${relatedHtml}
        ${config.enableApplause ? `<div class="vote-section"><button class="vote-btn vote-up" data-slug="${post.slug}" data-type="up" onclick="handleVote(this)"><span class="vote-icon">👍</span><span class="vote-count">0</span></button><button class="vote-btn vote-down" data-slug="${post.slug}" data-type="down" onclick="handleVote(this)"><span class="vote-icon">👎</span><span class="vote-count">0</span></button></div>` : ''}
        ${config.reward?.enable ? `<div class="reward-section" style="text-align:center;margin:24px 0;padding:20px 0;border-top:1px solid rgba(128,128,128,0.2)"><p style="font-size:14px;margin-bottom:12px;opacity:0.7">${config.reward.title || (blogLang === 'en' ? 'Buy me a coffee' : '请我喝杯咖啡')}</p><div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap">${config.reward.wechatQrcode ? `<div style="text-align:center"><img src="${config.reward.wechatQrcode}" alt="WeChat" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${blogLang === 'en' ? 'WeChat' : '微信'}</p></div>` : ''}${config.reward.alipayQrcode ? `<div style="text-align:center"><img src="${config.reward.alipayQrcode}" alt="Alipay" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${blogLang === 'en' ? 'Alipay' : '支付宝'}</p></div>` : ''}</div></div>` : ''}
      </div>
    </div>`
  }).join('')

  const heroExtra = themeStyle === 'terminal' ? '<span class="hero-cursor"></span>' : ''
  const headerExtra = themeStyle === 'ink-wash' ? `<div class="hero-seal">${sealChar}</div>` : ''
  const footerContent = themeStyle === 'terminal'
    ? `<div class="footer-sys-info">Blog engine v1.0.0 | Uptime: ${new Date().toISOString().split('T')[0]}</div><div class="footer-sys-info">&copy; ${escapeHtml(config.author)} | All rights reserved</div>`
    : themeStyle === 'ink-wash'
      ? `<div class="footer-seal">${sealChar}</div><div class="footer-text">&copy; ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</div>`
      : themeStyle === 'narrative'
        ? `<div class="footer-ornament">\u2756</div><div class="footer-end-mark">The End</div><div class="footer-text">&copy; ${new Date().getFullYear()} ${escapeHtml(config.author)}</div>`
        : `&copy; ${new Date().getFullYear()} ${escapeHtml(config.author)}`

  // 生成自定义颜色覆盖 CSS（用于新主题）
  const customColorOverrideCss = generateCustomColorOverrideCss(config)

  // JSON-LD structured data
  const websiteJsonLd = `<script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteTitle,
    url: config.siteUrl || '',
  })}</script>`

  const postJsonLds = published.map(post => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      author: { '@type': 'Person', name: post.author || config.author },
      publisher: { '@type': 'Organization', name: config.siteTitle },
    }
    if (post.date) schema.datePublished = new Date(post.date).toISOString()
    if (post.description) schema.description = post.description
    if (post.coverImage) schema.image = post.coverImage
    return `<script type="application/ld+json" id="jsonld-post-${escapeAttr(post.slug)}">${safeJsonLd(schema)}</script>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="${escapeAttr(config.language)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.siteTitle)}</title>
${config.favicon ? `<link rel="icon" href="${escapeAttr(config.favicon)}">` : ''}
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Noto+Serif+SC:wght@400;600;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Lora:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Ma+Shan+Zheng&family=Fira+Code:wght@400;500&family=Press+Start+2P&family=Caveat:wght@400;500;600;700&family=Bangers&family=UnifrakturMaguntia&display=swap" rel="stylesheet">
<style>
${themeCss}
${customColorOverrideCss}

.page-section { display: none; }
.page-section.active { display: block; animation: themeFadeIn 0.5s ease; }
@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* TOC styles for new themes */
.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
}
.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
.toc-title {
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
  margin-bottom: 10px;
  font-size: 0.9em;
}
.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--text-muted, #888);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}
.toc-nav a.toc-h1 { font-weight: 600; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: var(--accent, #e74c3c); }
.vote-section { display: flex; justify-content: center; align-items: center; gap: 24px; margin: 32px 0; padding: 24px 0; border-top: 1px solid var(--border-color, rgba(128,128,128,0.2)); }
.vote-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: 2px solid var(--border-color, rgba(128,128,128,0.2)); border-radius: 24px; padding: 8px 18px; cursor: pointer; transition: all 0.25s ease; font-size: 14px; color: #888; font-family: inherit; }
.vote-btn:hover { border-color: var(--accent, #e74c3c); background: var(--accent-light, rgba(231,76,60,0.08)); transform: scale(1.05); }
.vote-btn:active { transform: scale(0.95); }
.vote-btn.active.vote-up { border-color: #22c55e; background: rgba(34,197,94,0.1); color: #22c55e; }
.vote-btn.active.vote-down { border-color: #ef4444; background: rgba(239,68,68,0.1); color: #ef4444; }
.vote-icon { font-size: 18px; line-height: 1; }
.vote-count { font-weight: 600; min-width: 12px; text-align: center; }
.about-page { text-align: center; padding: 40px 20px; }
.about-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 24px; object-fit: cover; border: 3px solid var(--accent, #e74c3c); }
.about-name { font-size: 1.8em; font-weight: 700; margin-bottom: 16px; }
.about-bio { font-size: 1.05em; color: var(--text-muted, #888); line-height: 1.8; max-width: 600px; margin: 0 auto 32px; }
.about-skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 32px; }
.about-skill-tag { padding: 6px 16px; border-radius: 20px; background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); font-size: 0.85em; font-weight: 500; }
.about-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.about-contact a { padding: 8px 20px; border-radius: 20px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); font-size: 0.9em; color: var(--text-muted, #888); transition: all 0.2s; }
.about-contact a:hover { border-color: var(--accent, #e74c3c); color: var(--accent, #e74c3c); }
.friend-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.friend-link-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: var(--radius, 12px); background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; text-decoration: none; }
.friend-link-card:hover { border-color: var(--accent, #e74c3c); transform: translateY(-2px); }
.friend-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.friend-info strong { font-size: 1em; color: var(--text-primary, #333); }
.friend-info p { font-size: 0.85em; color: var(--text-muted, #888); margin-top: 4px; }
.links-title, .series-title { font-size: 1.6em; font-weight: 700; margin-bottom: 24px; }
.series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.series-card { display: flex; gap: 16px; padding: 20px; border-radius: var(--radius, 12px); background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; }
.series-card:hover { border-color: var(--accent, #e74c3c); transform: translateY(-2px); }
.series-cover { width: 80px; height: 80px; border-radius: 8px; background: var(--accent-light, rgba(231,76,60,0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.series-icon { font-size: 32px; }
.series-info { flex: 1; min-width: 0; }
.series-info .series-title { font-size: 1.05em; font-weight: 600; margin: 0 0 6px; }
.series-description { font-size: 0.85em; color: var(--text-muted, #888); margin: 0 0 8px; }
.series-meta { font-size: 0.8em; color: var(--text-muted, #888); }
.series-count { background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); padding: 2px 8px; border-radius: 10px; }
.related-posts{margin:32px 0;padding:24px 0;border-top:1px solid var(--border-color,rgba(128,128,128,0.2))}
.related-title{font-size:1.1em;font-weight:600;margin-bottom:16px;color:var(--text-primary,#333)}
.related-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.related-card{display:block;padding:16px;border-radius:8px;background:var(--bg-card,rgba(128,128,128,0.05));border:1px solid var(--border-color,rgba(128,128,128,0.2));text-decoration:none;transition:all 0.2s}
.related-card:hover{border-color:var(--accent,#e74c3c);transform:translateY(-2px)}
.related-card-title{font-size:0.95em;font-weight:500;color:var(--text-primary,#333);margin-bottom:8px}
.related-card-meta{display:flex;align-items:center;gap:8px;font-size:0.8em;color:var(--text-muted,#888)}
.related-tag{padding:2px 8px;border-radius:10px;background:var(--accent-light,rgba(231,76,60,0.08));color:var(--accent,#e74c3c);font-size:0.85em}
/* Admonition blocks */
.admonition{margin:16px 0;padding:16px 20px;border-radius:8px;border-left:4px solid;font-size:0.95em}
.admonition-title{font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.admonition-content{line-height:1.7}
.admonition-content p:first-child{margin-top:0}
.admonition-content p:last-child{margin-bottom:0}
.admonition.tip{background:rgba(52,211,153,0.08);border-left-color:#34d399;color:var(--text-primary,#333)}
.admonition.tip .admonition-title{color:#34d399}
.admonition.warning{background:rgba(251,191,36,0.08);border-left-color:#fbbf24;color:var(--text-primary,#333)}
.admonition.warning .admonition-title{color:#fbbf24}
.admonition.danger{background:rgba(239,68,68,0.08);border-left-color:#ef4444;color:var(--text-primary,#333)}
.admonition.danger .admonition-title{color:#ef4444}
.admonition.details{background:var(--bg-card,rgba(128,128,128,0.05));border-left-color:var(--accent,#e74c3c)}
.admonition.details .admonition-title{cursor:pointer;color:var(--accent,#e74c3c)}
.admonition.details .admonition-content{padding-top:8px}
/* Image lightbox */
.lightbox-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:lightboxIn .2s ease}
.lightbox-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
@keyframes lightboxIn{from{opacity:0}to{opacity:1}}

/* Breadcrumb navigation */
.breadcrumb{margin-bottom:16px;font-size:0.85em;color:var(--text-muted,#888)}
.breadcrumb ol{display:flex;align-items:center;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.breadcrumb li{display:flex;align-items:center;gap:6px}
.breadcrumb li+li::before{content:'/';color:var(--border-color,rgba(128,128,128,0.3))}
.breadcrumb a{color:var(--text-muted,#888);text-decoration:none;transition:color 0.2s}
.breadcrumb a:hover{color:var(--accent,#e74c3c)}
.breadcrumb-current{color:var(--text-primary,#333)}

/* TOC scroll spy active state */
.toc-link.active{color:var(--accent,#e74c3c);font-weight:600}

/* Page transition animation */
@keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

/* Scroll nav buttons */
.scroll-nav {
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 99;
}
.scroll-nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color, rgba(128,128,128,0.2));
  background: var(--bg-card, rgba(128,128,128,0.05));
  color: var(--text-muted, #888);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px);
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.scroll-nav-btn.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.scroll-nav-btn:hover {
  border-color: var(--accent, #e74c3c);
  color: var(--accent, #e74c3c);
  background: var(--accent-light, rgba(231,76,60,0.08));
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}
@media (max-width: 768px) {
  .scroll-nav { bottom: 20px; right: 20px; }
  .scroll-nav-btn { width: 40px; height: 40px; }
}

/* Code copy button */
.post-content pre {
  position: relative;
}
.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(128,128,128,0.2));
  background: var(--bg-card, rgba(128,128,128,0.05));
  color: var(--text-muted, #888);
  font-size: 0.75em;
  font-family: inherit;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}
.post-content pre:hover .code-copy-btn {
  opacity: 1;
}
.code-copy-btn:hover {
  border-color: var(--accent, #e74c3c);
  color: var(--accent, #e74c3c);
  background: var(--accent-light, rgba(231,76,60,0.08));
}
.code-copy-btn.copied {
  border-color: #22c55e;
  color: #22c55e;
}

/* 404 page */
.not-found-page {
  text-align: center;
  padding: 120px 20px;
}
.not-found-code {
  font-size: 8em;
  font-weight: 900;
  color: var(--text-muted, #888);
  opacity: 0.2;
  line-height: 1;
  margin-bottom: 16px;
}
.not-found-text {
  font-size: 1.3em;
  color: var(--text-secondary, #666);
  margin-bottom: 32px;
}
.not-found-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 24px;
  background: var(--accent-light, rgba(231,76,60,0.08));
  color: var(--accent, #e74c3c);
  font-weight: 500;
  font-size: 0.95em;
  transition: all 0.2s;
  text-decoration: none;
}
.not-found-link:hover {
  background: var(--accent, #e74c3c);
  color: #fff;
}
${themeStyle === 'gallery' ? `
/* Gallery theme: scroll nav above bottom navbar */
.scroll-nav { bottom: 80px !important; z-index: 101 !important; }
@media (max-width: 768px) { .scroll-nav { bottom: 60px !important; } }
` : ''}
${themeStyle === 'cinematic' ? `
/* Cinematic theme: scroll nav above bottom navbar */
.scroll-nav { bottom: 76px !important; z-index: 101 !important; }
@media (max-width: 768px) { .scroll-nav { bottom: 60px !important; } }
` : ''}
</style>
${hasMermaid ? `<style>${getMermaidCss()}</style>` : ''}
${config.customCss ? `<style>${sanitizeCssFast(config.customCss)}</style>` : ''}
${config.customCssDark ? `<style>@media (prefers-color-scheme: dark) {\n${sanitizeCssFast(config.customCssDark)}\n}\n[data-theme="dark"] {\n${sanitizeCssFast(config.customCssDark)}\n}</style>` : ''}
${websiteJsonLd}
${postJsonLds}
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    ${headerExtra}
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="#index">${nav.home}</a>
      <a class="nav-link" data-view="archive" href="#archive">${nav.archive}</a>
      <a class="nav-link" data-view="tags" href="#tags">${nav.tags}</a>
      ${config.aboutConfig?.enable ? `<a class="nav-link" data-view="about" href="#about">${themeStyle === 'terminal' ? 'whoami' : themeStyle === 'narrative' ? 'Author' : (blogLang === 'en' ? 'About' : '关于')}</a>` : ''}
      ${config.friendLinks && config.friendLinks.length > 0 ? `<a class="nav-link" data-view="links" href="#links">${themeStyle === 'terminal' ? 'cat /etc/hosts' : themeStyle === 'narrative' ? 'Companions' : (blogLang === 'en' ? 'Links' : '友链')}</a>` : ''}
      ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a class="nav-link" data-view="series" href="#series">${themeStyle === 'terminal' ? 'ls series/' : themeStyle === 'narrative' ? 'Chapters' : (blogLang === 'en' ? 'Series' : '系列')}</a>` : ''}
    </nav>
  </header>

  <div class="page-section active" id="page-index" data-section="index">
    <section class="blog-hero blog-view view-home">
      <h1 class="hero-title">${escapeHtml(config.siteTitle)}${heroExtra}</h1>
      <p class="hero-description">${escapeHtml(config.siteDescription)}</p>
    </section>
    <section class="blog-home blog-view view-home">
      <div class="card-grid">${cardsHtml}</div>
    </section>
  </div>

  <div class="page-section" id="page-archive" data-section="archive">
    <section class="blog-archive blog-view view-archive">
      <div class="archive-title">${themeStyle === 'terminal' ? '$ cat archive' : themeStyle === 'narrative' ? 'Chronicle' : (blogLang === 'en' ? 'Archive' : '归档')}</div>
      ${archiveHtml}
    </section>
  </div>

  <div class="page-section" id="page-tags" data-section="tags">
    <section class="blog-tags blog-view view-tags">
      <div class="tags-title">${themeStyle === 'terminal' ? '$ grep tags' : themeStyle === 'narrative' ? 'Themes' : (blogLang === 'en' ? 'Tags' : '标签')}</div>
      <div class="tag-cloud">${tagCloudHtml}</div>
      ${tagPostsHtml}
    </section>
  </div>

  ${config.aboutConfig?.enable ? `<div class="page-section" id="page-about" data-section="about">
    <section class="blog-about">
      <div class="about-page">
        ${config.aboutConfig.avatar ? `<img src="${escapeAttr(config.aboutConfig.avatar)}" alt="${escapeHtml(config.author)}" class="about-avatar">` : ''}
        <h1 class="about-name">${escapeHtml(config.author)}</h1>
        ${config.aboutConfig.bio ? `<div class="about-bio">${escapeHtml(config.aboutConfig.bio)}</div>` : ''}
        ${config.aboutConfig.skills && config.aboutConfig.skills.length > 0 ? `<div class="about-skills">${config.aboutConfig.skills.map(s => `<span class="about-skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        ${config.aboutConfig.contact && config.aboutConfig.contact.length > 0 ? `<div class="about-contact">${config.aboutConfig.contact.map(c => `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('')}</div>` : ''}
      </div>
    </section>
  </div>` : ''}

  ${config.friendLinks && config.friendLinks.length > 0 ? `<div class="page-section" id="page-links" data-section="links">
    <section class="blog-links">
      <div class="links-title">${themeStyle === 'terminal' ? '$ cat /etc/hosts' : themeStyle === 'narrative' ? 'Companions' : (blogLang === 'en' ? 'Friend Links' : '友情链接')}</div>
      <div class="friend-links-grid">${config.friendLinks.map(l => `
        <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener" class="friend-link-card">
          ${l.avatar ? `<img src="${escapeAttr(l.avatar)}" alt="${escapeHtml(l.name)}" class="friend-avatar">` : ''}
          <div class="friend-info">
            <strong>${escapeHtml(l.name)}</strong>
            ${l.description ? `<p>${escapeHtml(l.description)}</p>` : ''}
          </div>
        </a>`).join('')}</div>
    </section>
  </div>` : ''}

  ${config.seriesConfig && config.seriesConfig.length > 0 ? `<div class="page-section" id="page-series" data-section="series">
    <section class="blog-series">
      <div class="series-title">📚 ${themeStyle === 'terminal' ? 'ls series/' : themeStyle === 'narrative' ? 'Chapters' : (blogLang === 'en' ? 'Series' : '系列文章')}</div>
      <div class="series-grid">${config.seriesConfig.map(series => {
        const seriesPosts = posts.filter(p => p.series === series.name && !p.draft)
        return `<div class="series-card">
          <div class="series-cover">${!series.coverImage ? '<span class="series-icon">📚</span>' : `<img src="${escapeAttr(series.coverImage)}" alt="${escapeHtml(series.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`}</div>
          <div class="series-info">
            <h3 class="series-title">${escapeHtml(series.name)}</h3>
            <p class="series-description">${escapeHtml(series.description || '')}</p>
            <div class="series-meta"><span class="series-count">${seriesPosts.length} ${blogLang === 'en' ? 'posts' : '篇文章'}</span></div>
          </div>
        </div>`
      }).join('')}</div>
    </section>
  </div>` : ''}

  ${postSectionsHtml}

  <div class="page-section" id="page-404" data-section="404">
    <div class="not-found-page">
      <div class="not-found-code">404</div>
      <p class="not-found-text">${blogLang === 'en' ? 'Page Not Found' : '页面未找到'}</p>
      <a href="#index" class="not-found-link">${blogLang === 'en' ? 'Back to Home' : '返回首页'}</a>
    </div>
  </div>

  <footer class="blog-footer">
    ${footerContent}
  </footer>
</div>

<div class="scroll-nav">
  <button class="scroll-nav-btn scroll-to-top" aria-label="Back to top" title="Back to top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
  <button class="scroll-nav-btn scroll-to-bottom" aria-label="Go to bottom" title="Go to bottom"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
</div>
<script>${getNewThemeJsInteractions()}</script>
<script>(function(){var topBtn=document.querySelector('.scroll-to-top');var btmBtn=document.querySelector('.scroll-to-bottom');function onScroll(){var st=window.pageYOffset||document.documentElement.scrollTop;var sh=document.documentElement.scrollHeight-window.innerHeight;if(topBtn)topBtn.classList.toggle('visible',st>300);if(btmBtn)btmBtn.classList.toggle('visible',st<sh-300);}window.addEventListener('scroll',onScroll,{passive:true});if(topBtn)topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});if(btmBtn)btmBtn.addEventListener('click',function(){window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})});onScroll();})();</script>
<script>(function(){var pres=document.querySelectorAll('.post-content pre');if(!pres.length)return;pres.forEach(function(pre){if(pre.querySelector('.code-copy-btn'))return;var code=pre.querySelector('code');if(!code)return;var btn=document.createElement('button');btn.className='code-copy-btn';btn.textContent='复制';btn.addEventListener('click',function(){var text=code.textContent||code.innerText;navigator.clipboard.writeText(text).then(function(){btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}).catch(function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}catch(e){}document.body.removeChild(ta);});});pre.appendChild(btn);});})();</script>
${hasMermaid ? getMermaidScript(isDark) : ''}
${config.enableBusuanzi ? `<script>
(function(){
  function updateViewCount(slug){
    var key='views_'+slug;
    var count=parseInt(localStorage.getItem(key)||'0')+1;
    localStorage.setItem(key,count.toString());
    var el=document.querySelector('.view-count[data-slug="'+slug+'"]');
    if(el)el.textContent=count;
  }
  function showViewCounts(){
    document.querySelectorAll('.view-count[data-slug]').forEach(function(el){
      var slug=el.getAttribute('data-slug');
      var key='views_'+slug;
      var count=parseInt(localStorage.getItem(key)||'0');
      el.textContent=count;
    });
  }
  showViewCounts();
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'A') {
        var href = el.getAttribute('href') || '';
        if (href.indexOf('#post/') === 0) {
          var slugPart = href.replace('#post/', '');
          var parts = slugPart.split('/');
          updateViewCount(parts[0]);
          return;
        }
      }
      el = el.parentElement;
    }
  });
})();
</script>` : ''}
${config.enableApplause ? `<script>
function handleVote(btn){
  var slug=btn.getAttribute('data-slug');
  var type=btn.getAttribute('data-type');
  var key='vote_'+slug;
  var cur=localStorage.getItem(key)||'';
  var section=btn.parentElement;
  var upBtn=section.querySelector('.vote-up');
  var downBtn=section.querySelector('.vote-down');
  var upCountEl=upBtn.querySelector('.vote-count');
  var downCountEl=downBtn.querySelector('.vote-count');
  if(cur===type){
    localStorage.removeItem(key);
    upBtn.classList.remove('active');
    downBtn.classList.remove('active');
    upCountEl.textContent='0';
    downCountEl.textContent='0';
  }else{
    localStorage.setItem(key,type);
    upBtn.classList.toggle('active',type==='up');
    downBtn.classList.toggle('active',type==='down');
    upCountEl.textContent=type==='up'?'1':'0';
    downCountEl.textContent=type==='down'?'1':'0';
  }
}
(function(){
  document.querySelectorAll('.vote-section').forEach(function(s){
    var btn=s.querySelector('.vote-btn');
    if(!btn)return;
    var slug=btn.getAttribute('data-slug');
    var key='vote_'+slug;
    var cur=localStorage.getItem(key)||'';
    var upBtn=s.querySelector('.vote-up');
    var downBtn=s.querySelector('.vote-down');
    var upCountEl=upBtn.querySelector('.vote-count');
    var downCountEl=downBtn.querySelector('.vote-count');
    if(cur==='up'){upBtn.classList.add('active');upCountEl.textContent='1';downCountEl.textContent='0';}
    else if(cur==='down'){downBtn.classList.add('active');downCountEl.textContent='1';upCountEl.textContent='0';}
  });
})();
</script>` : ''}
<script>
(function(){
  document.addEventListener('click',function(e){
    if(e.target.tagName==='IMG'&&e.target.closest('.post-content')&&!e.target.closest('.mermaid')){
      var o=document.createElement('div');o.className='lightbox-overlay';
      var img=document.createElement('img');img.src=e.target.src;img.alt=e.target.alt||'';
      o.appendChild(img);o.onclick=function(){document.body.removeChild(o)};
      document.body.appendChild(o);
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){var o=document.querySelector('.lightbox-overlay');if(o)document.body.removeChild(o)}
  });
})();
</script>
</body>
</html>`
}

/**
 * Custom theme — minimal skeleton that lets user CSS take full control.
 * Uses a simple multi-page structure (not SPA) so user CSS overrides work cleanly.
 */
export function generateCustomThemeSingleFileBlog(
  posts: BlogPost[],
  published: BlogPost[],
  config: BlogConfig,
  isDark: boolean,
): string {
  const themeCss = getThemeStyleCss('custom', isDark)
  const blogLang: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const hasMermaid = posts.some((p) => p.content.includes('mermaid-diagram'))

  // Build ThemeIndexData for getThemeStyleIndexHtml
  const archiveByYear = new Map<string, Array<{ title: string; slug: string; date: string }>>()
  for (const post of published) {
    const year = post.date ? new Date(post.date).getFullYear().toString() : (blogLang === 'en' ? 'Unknown' : '未知')
    const list = archiveByYear.get(year) || []
    list.push({ title: post.title, slug: post.slug, date: formatDate(post.date) })
    archiveByYear.set(year, list)
  }

  const tagMap = new Map<string, Array<{ title: string; slug: string; date: string }>>()
  for (const post of published) {
    for (const tag of post.tags) {
      const list = tagMap.get(tag) || []
      list.push({ title: post.title, slug: post.slug, date: formatDate(post.date) })
      tagMap.set(tag, list)
    }
  }

  // Build index page body (SPA links: #post/slug, #archive, #tags)
  const indexBody = `
    <header class="site-header">
      <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
      ${config.siteDescription ? `<p>${escapeHtml(config.siteDescription)}</p>` : ''}
      <nav class="nav-links">
        <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
        <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
        <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
        ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
        ${config.friendLinks && config.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
        ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
      </nav>
    </header>
    <main class="main-content">
      ${published.map(post => `
        <article class="post-item">
          <h2><a href="#post/${escapeAttr(post.slug)}">${escapeHtml(post.title)}</a></h2>
          <div class="post-meta">${escapeHtml(formatDate(post.date))}${post.tags.length ? ' · ' + post.tags.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ') : ''}</div>
          ${(post.excerpt || post.description) ? `<p class="post-excerpt">${escapeHtml(post.excerpt || post.description)}</p>` : ''}
        </article>
      `).join('')}
    </main>
    <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
  `

  // Build archive page body
  const archiveYears = [...archiveByYear.keys()].sort((a, b) => b.localeCompare(a))
  const archiveBody = `
    <header class="site-header">
      <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
      <nav class="nav-links">
        <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
        <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
        <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
        ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
        ${config.friendLinks && config.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
        ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
      </nav>
    </header>
    <main class="main-content">
      ${archiveYears.map(year => `
        <div class="archive-year">
          <h2 style="font-size:1.3em;font-weight:700;margin-bottom:12px;color:var(--accent-warm)">${escapeHtml(year)}</h2>
          ${(archiveByYear.get(year) || []).map(p => `
            <article class="post-item">
              <h2><a href="#post/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a></h2>
              <div class="post-meta">${p.date}</div>
            </article>
          `).join('')}
        </div>
      `).join('')}
    </main>
    <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
  `

  // Build tags page body
  const tagsBody = `
    <header class="site-header">
      <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
      <nav class="nav-links">
        <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
        <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
        <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
        ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
        ${config.friendLinks && config.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
        ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
      </nav>
    </header>
    <main class="main-content">
      <div class="tag-cloud" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:30px">
        ${[...tagMap.keys()].sort().map(tag => {
          const count = tagMap.get(tag)!.length
          return `<a class="tag" href="#tag-${escapeAttr(tag)}">${escapeHtml(tag)} (${count})</a>`
        }).join('')}
      </div>
      ${[...tagMap.keys()].sort().map(tag => `
        <div id="tag-${escapeAttr(tag)}" style="margin-bottom:24px">
          <h2 style="font-size:1.2em;font-weight:600;margin-bottom:10px;color:var(--accent-warm)">${escapeHtml(tag)}</h2>
          ${(tagMap.get(tag) || []).map(p => `
            <article class="post-item">
              <h2><a href="#post/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a></h2>
              <div class="post-meta">${p.date}</div>
            </article>
          `).join('')}
        </div>
      `).join('')}
    </main>
    <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
  `

  // Build post detail sections
  const postSectionsHtml = posts.map(post => {
    const metaParts: string[] = []
    if (post.date) metaParts.push(escapeHtml(formatDate(post.date)))
    if (post.author) metaParts.push(escapeHtml(post.author))

    // Reading time + word count
    const readingTime = estimateReadingTime(post.content)
    metaParts.push(blogLang === 'en' ? readingTime.display : readingTime.displayZh)

    // 阅读量统计
    if (config.enableBusuanzi) {
      metaParts.push(`<span class="view-count" data-slug="${post.slug}">0</span> ${blogLang === 'en' ? 'views' : '阅读'}`)
    }

    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')

    return `<div class="page-section" id="post-${escapeAttr(post.slug)}" data-section="post">
      <header class="site-header">
        <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
        <nav class="nav-links">
          <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
          <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
          <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
          ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
          ${config.friendLinks && config.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
          ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
        </nav>
      </header>
      <main class="main-content">
        <nav class="breadcrumb" aria-label="${blogLang === 'en' ? 'Breadcrumb' : '面包屑导航'}">
          <ol itemscope itemtype="https://schema.org/BreadcrumbList">
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#index"><span itemprop="name">${blogLang === 'en' ? 'Home' : '首页'}</span></a><meta itemprop="position" content="1" /></li>
            ${post.category ? `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="#archive"><span itemprop="name">${escapeHtml(post.category)}</span></a><meta itemprop="position" content="2" /></li>` : ''}
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" class="breadcrumb-current"><span itemprop="name">${escapeHtml(post.title)}</span><meta itemprop="position" content="${post.category ? '3' : '2'}" /></li>
          </ol>
        </nav>
        <div class="post-header">
          <a href="#index" class="back-link" style="color:var(--text-secondary);font-size:0.9em">&larr; ${blogLang === 'en' ? 'Back' : '返回'}</a>
          <h1>${escapeHtml(post.title)}</h1>
          <div class="post-meta">${metaParts.join(' · ')}</div>
        </div>
        <div class="post-content">${post.content}</div>
        ${tagsHtml ? `<div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap">${tagsHtml}</div>` : ''}
        ${config.enableApplause ? `<div class="vote-section"><button class="vote-btn vote-up" data-slug="${post.slug}" data-type="up" onclick="handleVote(this)"><span class="vote-icon">👍</span><span class="vote-count">0</span></button><button class="vote-btn vote-down" data-slug="${post.slug}" data-type="down" onclick="handleVote(this)"><span class="vote-icon">👎</span><span class="vote-count">0</span></button></div>` : ''}
        ${config.reward?.enable ? `<div class="reward-section" style="text-align:center;margin:24px 0;padding:20px 0;border-top:1px solid rgba(128,128,128,0.2)"><p style="font-size:14px;margin-bottom:12px;opacity:0.7">${config.reward.title || (blogLang === 'en' ? 'Buy me a coffee' : '请我喝杯咖啡')}</p><div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap">${config.reward.wechatQrcode ? `<div style="text-align:center"><img src="${config.reward.wechatQrcode}" alt="WeChat" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${blogLang === 'en' ? 'WeChat' : '微信'}</p></div>` : ''}${config.reward.alipayQrcode ? `<div style="text-align:center"><img src="${config.reward.alipayQrcode}" alt="Alipay" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${blogLang === 'en' ? 'Alipay' : '支付宝'}</p></div>` : ''}</div></div>` : ''}
      </main>
      <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
    </div>`
  }).join('')

  // Custom color override CSS
  const customColorOverrideCss = generateCustomColorOverrideCss(config)

  // JSON-LD structured data for custom theme
  const customWebsiteJsonLd = `<script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteTitle,
    url: config.siteUrl || '',
  })}</script>`

  const customPostJsonLds = published.map(post => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      author: { '@type': 'Person', name: post.author || config.author },
      publisher: { '@type': 'Organization', name: config.siteTitle },
    }
    if (post.date) schema.datePublished = new Date(post.date).toISOString()
    if (post.description) schema.description = post.description
    if (post.coverImage) schema.image = post.coverImage
    return `<script type="application/ld+json" id="jsonld-post-${escapeAttr(post.slug)}">${safeJsonLd(schema)}</script>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="${escapeAttr(config.language)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.siteTitle)}</title>
${config.favicon ? `<link rel="icon" href="${escapeAttr(config.favicon)}">` : ''}
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
${themeCss}
${customColorOverrideCss}

/* SPA page switching */
.page-section { display: none; }
.page-section.active { display: block; animation: customFadeIn 0.4s ease; }
@keyframes customFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.about-page { text-align: center; padding: 40px 20px; }
.about-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 24px; object-fit: cover; border: 3px solid var(--accent-warm); }
.about-name { font-size: 1.8em; font-weight: 700; margin-bottom: 16px; }
.about-bio { font-size: 1.05em; color: var(--text-secondary); line-height: 1.8; max-width: 600px; margin: 0 auto 32px; }
.about-skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 32px; }
.about-skill-tag { padding: 6px 16px; border-radius: 20px; background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent-warm); font-size: 0.85em; font-weight: 500; }
.about-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.about-contact a { padding: 8px 20px; border-radius: 20px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); font-size: 0.9em; color: var(--text-secondary); transition: all 0.2s; }
.about-contact a:hover { border-color: var(--accent-warm); color: var(--accent-warm); }
.friend-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.friend-link-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: 12px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; text-decoration: none; }
.friend-link-card:hover { border-color: var(--accent-warm); transform: translateY(-2px); }
.friend-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.friend-info strong { font-size: 1em; color: var(--text-primary); }
.friend-info p { font-size: 0.85em; color: var(--text-secondary); margin-top: 4px; }
.series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.series-card { display: flex; gap: 16px; padding: 20px; border-radius: 12px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; }
.series-card:hover { border-color: var(--accent-warm); transform: translateY(-2px); }
.series-cover { width: 80px; height: 80px; border-radius: 8px; background: var(--accent-light, rgba(231,76,60,0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.series-icon { font-size: 32px; }
.series-info { flex: 1; min-width: 0; }
.series-info .series-title { font-size: 1.05em; font-weight: 600; margin: 0 0 6px; color: var(--text-primary); }
.series-description { font-size: 0.85em; color: var(--text-secondary); margin: 0 0 8px; }
.series-meta { font-size: 0.8em; color: var(--text-secondary); }
.series-count { background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent-warm); padding: 2px 8px; border-radius: 10px; }

/* Back to top button */
.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color, rgba(128,128,128,0.2));
  background: var(--bg-card, rgba(128,128,128,0.05));
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px);
  transition: all 0.3s ease;
  z-index: 99;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.back-to-top.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.back-to-top:hover {
  border-color: var(--accent-warm);
  color: var(--accent-warm);
  background: var(--accent-light, rgba(231,76,60,0.08));
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}
@media (max-width: 768px) {
  .back-to-top { bottom: 20px; right: 20px; width: 40px; height: 40px; }
}

/* Code copy button */
.post-content pre {
  position: relative;
}
.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(128,128,128,0.2));
  background: var(--bg-card, rgba(128,128,128,0.05));
  color: var(--text-secondary);
  font-size: 0.75em;
  font-family: inherit;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}
.post-content pre:hover .code-copy-btn {
  opacity: 1;
}
.code-copy-btn:hover {
  border-color: var(--accent-warm);
  color: var(--accent-warm);
  background: var(--accent-light, rgba(231,76,60,0.08));
}
.code-copy-btn.copied {
  border-color: #22c55e;
  color: #22c55e;
}

/* 404 page */
.not-found-page {
  text-align: center;
  padding: 120px 20px;
}
.not-found-code {
  font-size: 8em;
  font-weight: 900;
  color: var(--text-secondary);
  opacity: 0.2;
  line-height: 1;
  margin-bottom: 16px;
}
.not-found-text {
  font-size: 1.3em;
  color: var(--text-secondary);
  margin-bottom: 32px;
}
.not-found-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 24px;
  background: var(--accent-light, rgba(231,76,60,0.08));
  color: var(--accent-warm);
  font-weight: 500;
  font-size: 0.95em;
  transition: all 0.2s;
  text-decoration: none;
}
.not-found-link:hover {
  background: var(--accent-warm);
  color: #fff;
}
</style>
${hasMermaid ? `<style>${getMermaidCss()}</style>` : ''}
${config.customCss ? `<style>/* ─── User Custom CSS ─── */\n${sanitizeCssFast(config.customCss)}</style>` : ''}
${config.customCssDark ? `<style>/* ─── User Custom CSS (Dark Mode) ─── */\n@media (prefers-color-scheme: dark) {\n${sanitizeCssFast(config.customCssDark)}\n}\n[data-theme="dark"] {\n${sanitizeCssFast(config.customCssDark)}\n}</style>` : ''}
${customWebsiteJsonLd}
${customPostJsonLds}
</head>
<body>
<div class="page-section active" id="page-index" data-section="index">
  ${indexBody}
</div>

<div class="page-section" id="page-archive" data-section="archive">
  ${archiveBody}
</div>

<div class="page-section" id="page-tags" data-section="tags">
  ${tagsBody}
</div>

${config.aboutConfig?.enable ? `<div class="page-section" id="page-about" data-section="about">
  <header class="site-header">
    <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
    <nav class="nav-links">
      <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
      <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
      <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
      <a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>
    </nav>
  </header>
  <main class="main-content">
    <div class="about-page">
      ${config.aboutConfig.avatar ? `<img src="${escapeAttr(config.aboutConfig.avatar)}" alt="${escapeHtml(config.author)}" class="about-avatar">` : ''}
      <h1 class="about-name">${escapeHtml(config.author)}</h1>
      ${config.aboutConfig.bio ? `<div class="about-bio">${escapeHtml(config.aboutConfig.bio)}</div>` : ''}
      ${config.aboutConfig.skills && config.aboutConfig.skills.length > 0 ? `<div class="about-skills">${config.aboutConfig.skills.map(s => `<span class="about-skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
      ${config.aboutConfig.contact && config.aboutConfig.contact.length > 0 ? `<div class="about-contact">${config.aboutConfig.contact.map(c => `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('')}</div>` : ''}
    </div>
  </main>
  <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
</div>` : ''}

${config.friendLinks && config.friendLinks.length > 0 ? `<div class="page-section" id="page-links" data-section="links">
  <header class="site-header">
    <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
    <nav class="nav-links">
      <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
      <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
      <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
      ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
      <a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>
      ${config.seriesConfig && config.seriesConfig.length > 0 ? `<a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>` : ''}
    </nav>
  </header>
  <main class="main-content">
    <div class="friend-links-grid">${config.friendLinks.map(l => `
      <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener" class="friend-link-card">
        ${l.avatar ? `<img src="${escapeAttr(l.avatar)}" alt="${escapeHtml(l.name)}" class="friend-avatar">` : ''}
        <div class="friend-info">
          <strong>${escapeHtml(l.name)}</strong>
          ${l.description ? `<p>${escapeHtml(l.description)}</p>` : ''}
        </div>
      </a>`).join('')}</div>
  </main>
  <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
</div>` : ''}

${config.seriesConfig && config.seriesConfig.length > 0 ? `<div class="page-section" id="page-series" data-section="series">
  <header class="site-header">
    <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
    <nav class="nav-links">
      <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
      <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
      <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
      ${config.aboutConfig?.enable ? `<a href="#about">${blogLang === 'en' ? 'About' : '关于'}</a>` : ''}
      ${config.friendLinks && config.friendLinks.length > 0 ? `<a href="#links">${blogLang === 'en' ? 'Links' : '友链'}</a>` : ''}
      <a href="#series">${blogLang === 'en' ? 'Series' : '系列'}</a>
    </nav>
  </header>
  <main class="main-content">
    <div class="series-grid">${config.seriesConfig.map(series => {
      const seriesPosts = posts.filter(p => p.series === series.name && !p.draft)
      return `<div class="series-card">
        <div class="series-cover">${!series.coverImage ? '<span class="series-icon">📚</span>' : `<img src="${escapeAttr(series.coverImage)}" alt="${escapeHtml(series.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`}</div>
        <div class="series-info">
          <h3 class="series-title">${escapeHtml(series.name)}</h3>
          <p class="series-description">${escapeHtml(series.description || '')}</p>
          <div class="series-meta"><span class="series-count">${seriesPosts.length} ${blogLang === 'en' ? 'posts' : '篇文章'}</span></div>
        </div>
      </div>`
    }).join('')}</div>
  </main>
  <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
</div>` : ''}

${postSectionsHtml}

<div class="page-section" id="page-404" data-section="404">
  <header class="site-header">
    <h1><a href="#index">${escapeHtml(config.siteTitle)}</a></h1>
    <nav class="nav-links">
      <a href="#index">${blogLang === 'en' ? 'Home' : '首页'}</a>
      <a href="#archive">${blogLang === 'en' ? 'Archive' : '归档'}</a>
      <a href="#tags">${blogLang === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>
  <main class="main-content">
    <div class="not-found-page">
      <div class="not-found-code">404</div>
      <p class="not-found-text">${blogLang === 'en' ? 'Page Not Found' : '页面未找到'}</p>
      <a href="#index" class="not-found-link">${blogLang === 'en' ? 'Back to Home' : '返回首页'}</a>
    </div>
  </main>
  <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</footer>
</div>

<div class="scroll-nav">
  <button class="scroll-nav-btn scroll-to-top" aria-label="Back to top" title="Back to top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
  <button class="scroll-nav-btn scroll-to-bottom" aria-label="Go to bottom" title="Go to bottom"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
</div>
<script>${getNewThemeJsInteractions()}</script>
<script>(function(){var topBtn=document.querySelector('.scroll-to-top');var btmBtn=document.querySelector('.scroll-to-bottom');function onScroll(){var st=window.pageYOffset||document.documentElement.scrollTop;var sh=document.documentElement.scrollHeight-window.innerHeight;if(topBtn)topBtn.classList.toggle('visible',st>300);if(btmBtn)btmBtn.classList.toggle('visible',st<sh-300);}window.addEventListener('scroll',onScroll,{passive:true});if(topBtn)topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});if(btmBtn)btmBtn.addEventListener('click',function(){window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})});onScroll();})();</script>
<script>(function(){var pres=document.querySelectorAll('.post-content pre');if(!pres.length)return;pres.forEach(function(pre){if(pre.querySelector('.code-copy-btn'))return;var code=pre.querySelector('code');if(!code)return;var btn=document.createElement('button');btn.className='code-copy-btn';btn.textContent='复制';btn.addEventListener('click',function(){var text=code.textContent||code.innerText;navigator.clipboard.writeText(text).then(function(){btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}).catch(function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}catch(e){}document.body.removeChild(ta);});});pre.appendChild(btn);});})();</script>
${hasMermaid ? getMermaidScript(isDark) : ''}
${config.enableBusuanzi ? `<script>
(function(){
  function updateViewCount(slug){
    var key='views_'+slug;
    var count=parseInt(localStorage.getItem(key)||'0')+1;
    localStorage.setItem(key,count.toString());
    var el=document.querySelector('.view-count[data-slug="'+slug+'"]');
    if(el)el.textContent=count;
  }
  function showViewCounts(){
    document.querySelectorAll('.view-count[data-slug]').forEach(function(el){
      var slug=el.getAttribute('data-slug');
      var key='views_'+slug;
      var count=parseInt(localStorage.getItem(key)||'0');
      el.textContent=count;
    });
  }
  showViewCounts();
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === 'A') {
        var href = el.getAttribute('href') || '';
        if (href.indexOf('#post/') === 0) {
          var slugPart = href.replace('#post/', '');
          var parts = slugPart.split('/');
          updateViewCount(parts[0]);
          return;
        }
      }
      el = el.parentElement;
    }
  });
})();
</script>` : ''}
${config.enableApplause ? `<script>
function handleVote(btn){
  var slug=btn.getAttribute('data-slug');
  var type=btn.getAttribute('data-type');
  var key='vote_'+slug;
  var cur=localStorage.getItem(key)||'';
  var section=btn.parentElement;
  var upBtn=section.querySelector('.vote-up');
  var downBtn=section.querySelector('.vote-down');
  var upCountEl=upBtn.querySelector('.vote-count');
  var downCountEl=downBtn.querySelector('.vote-count');
  if(cur===type){
    localStorage.removeItem(key);
    upBtn.classList.remove('active');
    downBtn.classList.remove('active');
    upCountEl.textContent='0';
    downCountEl.textContent='0';
  }else{
    localStorage.setItem(key,type);
    upBtn.classList.toggle('active',type==='up');
    downBtn.classList.toggle('active',type==='down');
    upCountEl.textContent=type==='up'?'1':'0';
    downCountEl.textContent=type==='down'?'1':'0';
  }
}
(function(){
  document.querySelectorAll('.vote-section').forEach(function(s){
    var btn=s.querySelector('.vote-btn');
    if(!btn)return;
    var slug=btn.getAttribute('data-slug');
    var key='vote_'+slug;
    var cur=localStorage.getItem(key)||'';
    var upBtn=s.querySelector('.vote-up');
    var downBtn=s.querySelector('.vote-down');
    var upCountEl=upBtn.querySelector('.vote-count');
    var downCountEl=downBtn.querySelector('.vote-count');
    if(cur==='up'){upBtn.classList.add('active');upCountEl.textContent='1';downCountEl.textContent='0';}
    else if(cur==='down'){downBtn.classList.add('active');downCountEl.textContent='1';upCountEl.textContent='0';}
  });
})();
</script>` : ''}
<script>
(function(){
  document.addEventListener('click',function(e){
    if(e.target.tagName==='IMG'&&e.target.closest('.post-content')&&!e.target.closest('.mermaid')){
      var o=document.createElement('div');o.className='lightbox-overlay';
      var img=document.createElement('img');img.src=e.target.src;img.alt=e.target.alt||'';
      o.appendChild(img);o.onclick=function(){document.body.removeChild(o)};
      document.body.appendChild(o);
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){var o=document.querySelector('.lightbox-overlay');if(o)document.body.removeChild(o)}
  });
})();
</script>
</body>
</html>`
}

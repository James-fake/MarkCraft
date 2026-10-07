import { BlogPost, BlogConfig } from './types'
import { escapeHtml, escapeAttr, tagId, formatDate, wrapHtml, optimizeImages } from './utils'
import type { SeoMeta } from './utils'
import { generateToc, addHeadingIds, generateTocHtml, getTocScript } from './tocGenerator'
import { generateCommentHtml } from './commentScript'
import { generateShareButtons } from './shareButtons'
import { hasMermaid, hasMath, getMermaidScript, getKaTeXScript } from './extraRenderers'

interface ReadingTimeResult {
  minutes: number
  wordCount: number
  display: string
  displayZh: string
}

function estimateReadingTime(content: string): ReadingTimeResult {
  const text = content.replace(/<[^>]*>/g, '')
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords
  const minutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200))
  return {
    minutes,
    wordCount,
    display: `~${minutes} min read · ${wordCount} words`,
    displayZh: `约 ${minutes} 分钟 · ${wordCount} 字`,
  }
}

function getRelatedPosts(current: BlogPost, all: BlogPost[], max = 3): BlogPost[] {
  return all
    .filter(p => p.slug !== current.slug && !p.draft)
    .map(p => ({
      post: p,
      score: p.tags.filter((t: string) => current.tags.includes(t)).length
        + (p.category && p.category === current.category ? 1 : 0)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(x => x.post)
}

function generatePostNav(prev: BlogPost | undefined, next: BlogPost | undefined, bl: 'zh' | 'en'): string {
  if (!prev && !next) return ''
  const prevHtml = prev
    ? `<a href="../${escapeAttr(prev.slug)}/index.html" class="post-nav-prev"><span class="post-nav-label">${bl === 'en' ? '← Previous' : '← 上一篇'}</span><span class="post-nav-title">${escapeHtml(prev.title)}</span></a>`
    : '<span class="post-nav-placeholder"></span>'
  const nextHtml = next
    ? `<a href="../${escapeAttr(next.slug)}/index.html" class="post-nav-next"><span class="post-nav-label">${bl === 'en' ? 'Next →' : '下一篇 →'}</span><span class="post-nav-title">${escapeHtml(next.title)}</span></a>`
    : '<span class="post-nav-placeholder"></span>'
  return `<nav class="post-nav">${prevHtml}${nextHtml}</nav>`
}

function generateRelatedPosts(related: BlogPost[], bl: 'zh' | 'en'): string {
  if (related.length === 0) return ''
  const cards = related.map(p =>
    `<div class="related-post-card"><h4><a href="../${escapeAttr(p.slug)}/index.html">${escapeHtml(p.title)}</a></h4>${p.date ? `<span class="related-date">${escapeHtml(formatDate(p.date))}</span>` : ''}</div>`
  ).join('')
  return `<div class="related-posts"><div class="related-posts-title">${bl === 'en' ? 'Related Posts' : '相关文章'}</div><div class="related-posts-grid">${cards}</div></div>`
}

function generateRewardHtml(config: BlogConfig, bl: 'zh' | 'en'): string {
  const reward = config.reward
  if (!reward?.enable) return ''
  const qrcodes: string[] = []
  if (reward.wechatQrcode) qrcodes.push(`<div class="reward-item"><img src="${escapeAttr(reward.wechatQrcode)}" alt="WeChat"><span>${bl === 'en' ? 'WeChat' : '微信'}</span></div>`)
  if (reward.alipayQrcode) qrcodes.push(`<div class="reward-item"><img src="${escapeAttr(reward.alipayQrcode)}" alt="Alipay"><span>${bl === 'en' ? 'Alipay' : '支付宝'}</span></div>`)
  if (qrcodes.length === 0) return ''
  return `<div class="reward-section"><div class="reward-title">${escapeHtml(reward.title || (bl === 'en' ? 'Buy me a coffee' : '请我喝杯咖啡'))}</div><div class="reward-qrcodes">${qrcodes.join('')}</div></div>`
}

export function generatePostHtml(
  post: BlogPost,
  config: BlogConfig,
  prevPost?: BlogPost,
  nextPost?: BlogPost,
  allPosts?: BlogPost[]
): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'

  // Optimize images
  const optimizedContent = optimizeImages(post.content)

  // Add heading IDs for TOC
  const contentWithIds = addHeadingIds(optimizedContent)

  // Generate TOC
  const tocItems = generateToc(contentWithIds)
  const tocHtml = generateTocHtml(tocItems, bl)
  const tocScript = tocItems.length > 0 ? getTocScript() : ''

  const tagsHtml = post.tags.map(t =>
    `<a href="../tags.html#${tagId(t)}" class="tag">${escapeHtml(t)}</a>`
  ).join('')

  const categoryHtml = post.category
    ? `<span class="category-badge">${escapeHtml(post.category)}</span>`
    : ''

  const metaParts: string[] = []
  if (post.date) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(formatDate(post.date))}</span>`)
  if (post.author) metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(post.author)}</span>`)
  if (categoryHtml) metaParts.push(categoryHtml)

  // Reading time
  const readingTime = estimateReadingTime(post.content)
  metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>${bl === 'en' ? readingTime.display : readingTime.displayZh}</span>`)

  // 阅读量统计
  if (config.enableBusuanzi) {
    metaParts.push(`<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span class="view-count" data-slug="${escapeAttr(post.slug)}">0</span> ${bl === 'en' ? 'views' : '阅读'}</span>`)
  }

  // Comments
  const commentHtml = generateCommentHtml(config, post.slug)

  // Share buttons
  const shareHtml = generateShareButtons(post, config.siteUrl, bl)

  // 面包屑导航
  const breadcrumb = `<nav class="breadcrumb" aria-label="${bl === 'en' ? 'Breadcrumb' : '面包屑导航'}"><ol itemscope itemtype="https://schema.org/BreadcrumbList"><li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="../index.html"><span itemprop="name">${bl === 'en' ? 'Home' : '首页'}</span></a><meta itemprop="position" content="1" /></li>${post.category ? `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="../tags.html#${tagId(post.category)}"><span itemprop="name">${escapeHtml(post.category)}</span></a><meta itemprop="position" content="2" /></li>` : ''}<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" class="breadcrumb-current"><span itemprop="name">${escapeHtml(post.title)}</span><meta itemprop="position" content="${post.category ? '3' : '2'}" /></li></ol></nav>`

  // 上一篇/下一篇导航
  const navHtml = generatePostNav(prevPost, nextPost, bl)

  // 相关文章推荐
  const relatedPosts = allPosts ? getRelatedPosts(post, allPosts) : []
  const relatedHtml = generateRelatedPosts(relatedPosts, bl)

  // 打赏
  const rewardHtml = generateRewardHtml(config, bl)

  // 点赞/踩
  const applauseHtml = config.enableApplause
    ? `<div class="vote-section"><button class="vote-btn vote-up" data-slug="${escapeAttr(post.slug)}" data-type="up" onclick="handleVote(this)"><span class="vote-icon">👍</span><span class="vote-count">0</span></button><button class="vote-btn vote-down" data-slug="${escapeAttr(post.slug)}" data-type="down" onclick="handleVote(this)"><span class="vote-icon">👎</span><span class="vote-count">0</span></button></div>`
    : ''

  // Extra renderers (Mermaid/KaTeX)
  const extraScripts: string[] = []
  if (hasMermaid(post)) extraScripts.push(getMermaidScript())
  if (hasMath(post)) extraScripts.push(getKaTeXScript())

  const body = `
  ${breadcrumb}
  <div class="post-header">
    <h1>${escapeHtml(post.title)}</h1>
    <div class="post-meta">${metaParts.join('')}</div>
  </div>
  <div class="post-layout">
    <div class="post-content">${contentWithIds}</div>
    ${tocHtml ? `<aside class="post-sidebar">${tocHtml}</aside>` : ''}
  </div>
  ${tagsHtml ? `<div class="post-tags"><span class="post-tags-label">${bl === 'en' ? 'Tags:' : '标签：'}</span>${tagsHtml}</div>` : ''}
  ${shareHtml}
  ${applauseHtml}
  ${rewardHtml}
  ${commentHtml}
  ${navHtml}
  ${relatedHtml}
  <a href="../index.html" class="back-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>${bl === 'en' ? 'Back to Home' : '返回首页'}</a>
  ${tocScript}
  ${extraScripts.join('\n')}
  `

  const seoMeta: SeoMeta = {
    title: post.title,
    description: post.description || config.siteDescription,
    url: `${config.siteUrl}/posts/${post.slug}/`,
    image: post.coverImage || post.ogImage || undefined,
    type: 'article',
    publishedTime: post.date ? new Date(post.date).toISOString() : undefined,
    modifiedTime: post.updated ? new Date(post.updated).toISOString() : undefined,
    author: post.author || config.author,
    tags: post.tags,
  }

  const postHasMermaid = post.content.includes('mermaid-diagram')

  return wrapHtml(post.title, body, config, 'post-detail', seoMeta, postHasMermaid)
}

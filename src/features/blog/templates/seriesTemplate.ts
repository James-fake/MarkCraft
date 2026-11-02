/**
 * Series template — generates series index and detail pages
 */

import { SeriesConfig, BlogPost, BlogConfig } from './types'
import { escapeHtml, formatDate, wrapHtml, safeCssUrl } from './utils'

export function generateSeriesHtml(posts: BlogPost[], config: SeriesConfig[], blogConfig: BlogConfig): string {
  if (!config || config.length === 0) return ''

  // Filter posts that belong to a series
  const seriesPosts = posts.filter(p => p.series && !p.draft)
  
  // Group posts by series
  const seriesMap = new Map<string, BlogPost[]>()
  for (const post of seriesPosts) {
    if (post.series) {
      const existing = seriesMap.get(post.series) || []
      existing.push(post)
      seriesMap.set(post.series, existing)
    }
  }

  // Sort posts within each series by seriesOrder or date
  for (const [seriesName, postList] of seriesMap) {
    postList.sort((a, b) => {
      if (a.seriesOrder !== undefined && b.seriesOrder !== undefined) {
        return a.seriesOrder - b.seriesOrder
      }
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })
    seriesMap.set(seriesName, postList)
  }

  const bl: 'zh' | 'en' = blogConfig.language === 'en' ? 'en' : 'zh'
  
  const seriesCards = config.map(series => {
    const posts = seriesMap.get(series.name) || []
    const postCount = posts.length
    
    return `
      <a href="${escapeHtml(series.slug)}/index.html" class="series-card">
        <div class="series-cover" style="${series.coverImage ? `background-image: ${safeCssUrl(series.coverImage)}` : ''}">
          ${!series.coverImage ? '<span class="series-icon">📚</span>' : ''}
        </div>
        <div class="series-info">
          <h3 class="series-title">${escapeHtml(series.name)}</h3>
          <p class="series-description">${escapeHtml(series.description || '')}</p>
          <div class="series-meta">
            <span class="series-count">${postCount} ${bl === 'en' ? 'posts' : '篇文章'}</span>
          </div>
          ${posts.length > 0 ? `<div class="series-latest">${bl === 'en' ? 'Latest:' : '最新：'}${escapeHtml(posts[posts.length - 1].title)}</div>` : ''}
        </div>
      </a>
    `
  }).join('')

  const content = `
    <div class="container">
      <header class="page-header">
        <h1>📚 ${bl === 'en' ? 'Series' : '系列文章'}</h1>
        <p class="page-subtitle">${bl === 'en' ? 'Explore topic series for systematic learning' : '探索主题系列，系统化学习'}</p>
      </header>
      
      <div class="series-grid">
        ${seriesCards || `<p class="no-content">${bl === 'en' ? 'No series yet' : '暂无系列文章'}</p>`}
      </div>
    </div>
  `

  // 系列列表页在 series/ 一层深；卡片指向 series/<slug>/index.html（相对本页）
  return wrapHtml(`${bl === 'en' ? 'Series' : '系列文章'} - ${blogConfig.siteTitle}`, content, blogConfig, undefined, undefined, undefined, '../')
}

export function generateSeriesDetailHtml(series: SeriesConfig, posts: BlogPost[], blogConfig: BlogConfig): string {
  const bl: 'zh' | 'en' = blogConfig.language === 'en' ? 'en' : 'zh'
  
  // Sort posts by seriesOrder or date
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.seriesOrder !== undefined && b.seriesOrder !== undefined) {
      return a.seriesOrder - b.seriesOrder
    }
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  const totalPosts = sortedPosts.length

  // 阅读进度：与下方进度条显示 `0 / totalPosts` 保持一致（目前尚无持久化来源）。
  // 原实现 `post.seriesOrder <= (post.seriesOrder || 0)` 是自比恒真 → 每篇都标“已读”。
  // 将来接入真实阅读进度时，把 readCount 换成该值即可。
  const readCount = 0

  const postsList = sortedPosts.map((post, index) => {
    const isCompleted = post.seriesOrder !== undefined ? post.seriesOrder <= readCount : false
    
    return `
      <a href="../../posts/${post.slug}/index.html" class="series-post-item ${isCompleted ? 'completed' : ''}">
        <div class="series-post-number">${index + 1}</div>
        <div class="series-post-content">
          <h3 class="series-post-title">${escapeHtml(post.title)}</h3>
          ${post.description ? `<p class="series-post-desc">${escapeHtml(post.description)}</p>` : ''}
          <div class="series-post-meta">
            <span class="series-post-date">${post.date ? formatDate(post.date) : ''}</span>
            ${post.tags && post.tags.length > 0 ? `<span class="series-post-tags">${post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</span>` : ''}
          </div>
        </div>
        <div class="series-post-status">
          ${isCompleted ? `<span class="status-completed">✓ ${bl === 'en' ? 'Read' : '已读'}</span>` : ''}
        </div>
      </a>
    `
  }).join('')

  const content = `
    <div class="container">
      <div class="series-detail-header">
        <a href="../index.html" class="back-link">← ${bl === 'en' ? 'Back to series' : '返回系列列表'}</a>
        <div class="series-detail-cover" style="${series.coverImage ? `background-image: ${safeCssUrl(series.coverImage)}` : ''}">
          ${!series.coverImage ? '<span class="series-icon-large">📚</span>' : ''}
        </div>
        <h1 class="series-detail-title">${escapeHtml(series.name)}</h1>
        ${series.description ? `<p class="series-detail-description">${escapeHtml(series.description)}</p>` : ''}
        <div class="series-detail-progress">
          <span>${bl === 'en' ? 'Progress' : '阅读进度'}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <span class="progress-text">0 / ${totalPosts}</span>
        </div>
      </div>
      
      <div class="series-posts-list">
        ${postsList}
      </div>
    </div>
  `

  // 系列详情页在 series/<slug>/ 两层深 → 外壳导航带两层根前缀
  return wrapHtml(`${series.name} - ${bl === 'en' ? 'Series' : '系列文章'} - ${blogConfig.siteTitle}`, content, blogConfig, undefined, undefined, undefined, '../../')
}

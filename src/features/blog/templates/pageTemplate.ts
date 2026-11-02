import { BlogPost, BlogConfig } from './types'
import { escapeHtml, wrapHtml } from './utils'
import type { SeoMeta } from './seoUtils'

export function generatePageHtml(post: BlogPost, config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const body = `
    <div class="post-header">
      <h1>${escapeHtml(post.title)}</h1>
    </div>
    <div class="post-content">${post.content}</div>
    <a href="../index.html" class="back-link">${bl === 'en' ? 'Back to Home' : '返回首页'}</a>
  `
  const hasMermaid = post.content.includes('mermaid-diagram')
  // P1-2: 独立页面此前只继承站点级描述，这里补齐页面自身的 SEO 元数据
  const seoMeta: SeoMeta = {
    title: post.title,
    description: post.description || config.siteDescription,
    url: `${config.siteUrl}/${post.slug}/`,
    image: post.coverImage || post.ogImage || undefined,
    type: 'website',
    author: post.author || config.author,
  }
  // 独立页面在 <slug>/ 一层深 → 外壳导航与返回链接都带一层前缀
  return wrapHtml(post.title, body, config, 'post-detail', seoMeta, hasMermaid, '../')
}

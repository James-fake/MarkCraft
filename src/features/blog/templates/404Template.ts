import { BlogConfig } from './types'
import { wrapHtml } from './utils'

export function generate404Html(config: BlogConfig): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const body = `
    <div class="not-found-page">
      <div class="not-found-code">404</div>
      <p class="not-found-text">${bl === 'en' ? 'Page Not Found' : '页面未找到'}</p>
      <a href="index.html" class="not-found-link">${bl === 'en' ? 'Back to Home' : '返回首页'}</a>
    </div>
  `
  return wrapHtml('404', body, config, 'post-detail')
}

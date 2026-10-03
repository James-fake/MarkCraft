import type { BlogConfig } from './types'
import { escapeAttr } from './utils'

export type CommentSystem = 'none' | 'giscus' | 'utterances' | 'waline'

export interface CommentConfig {
  system: CommentSystem
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
  utterancesRepo?: string
  walineServerUrl?: string
}

export function generateCommentHtml(config: BlogConfig, postSlug: string): string {
  const comment = config.comment
  if (!comment || comment.system === 'none') return ''

  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'
  const title = bl === 'en' ? 'Comments' : '评论'

  switch (comment.system) {
    case 'giscus':
      return `<div class="comments-section">
  <h3 class="comments-title">${title}</h3>
  <script src="https://giscus.app/client.js"
    data-repo="${escapeAttr(comment.repo || '')}"
    data-repo-id="${escapeAttr(comment.repoId || '')}"
    data-category="${escapeAttr(comment.category || '')}"
    data-category-id="${escapeAttr(comment.categoryId || '')}"
    data-mapping="specific"
    data-term="${escapeAttr(postSlug)}"
    data-strict="0"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="top"
    data-theme="preferred_color_scheme"
    data-lang="${bl === 'en' ? 'en' : 'zh-CN'}"
    data-loading="lazy"
    crossorigin="anonymous"
    async>
  </script>
</div>`

    case 'utterances':
      return `<div class="comments-section">
  <h3 class="comments-title">${title}</h3>
  <script src="https://utteranc.es/client.js"
    repo="${escapeAttr(comment.utterancesRepo || '')}"
    issue-term="pathname"
    theme="preferred-color-scheme"
    crossorigin="anonymous"
    async>
  </script>
</div>`

    case 'waline':
      return `<div class="comments-section">
  <h3 class="comments-title">${title}</h3>
  <div id="waline"></div>
  <script type="module">
    import { init } from 'https://unpkg.com/@waline/client@v3/dist/waline.js';
    init({ el: '#waline', serverURL: '${escapeAttr(comment.walineServerUrl || '')}' });
  </script>
</div>`

    default:
      return ''
  }
}

export function getCommentStyles(): string {
  return `
    .comments-section { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--border-color); }
    .comments-title { font-family: 'Noto Serif SC', Georgia, serif; font-size: 1.3em; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
  `
}

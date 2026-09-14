import { BlogConfig } from '../types'
import { getHighlightStyles } from '../highlight'
import { getTocStyles } from '../tocGenerator'
import { getCommentStyles } from '../commentScript'
import { getShareStyles } from '../shareButtons'
import { resolveThemeColors } from './themeColors'
import { getBaseStyles } from './baseStyles'
import { getComponentStyles } from './componentStyles'

export function getStyles(config: BlogConfig): string {
  const colors = resolveThemeColors(config)

  return `
    ${getBaseStyles(colors)}
    ${getComponentStyles(colors)}
    ${getHighlightStyles(colors.isDark)}
    .post-content pre { position: relative; }
    .post-content pre .code-lang {
      position: absolute; top: 8px; right: 12px;
      font-size: 0.75em; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.05em; pointer-events: none;
    }
    .post-content pre .copy-btn {
      position: absolute; top: 8px; right: 12px;
      padding: 4px 10px; font-size: 0.75em; color: var(--text-muted);
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 6px; cursor: pointer; opacity: 0; transition: opacity 0.2s;
    }
    .post-content pre:hover .copy-btn { opacity: 1; }
    ${getTocStyles()}
    ${getCommentStyles()}
    ${getShareStyles()}
  `
}

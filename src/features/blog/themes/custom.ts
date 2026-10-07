import type { ThemeIndexData } from './types'
import { escapeHtml, escapeAttr } from '../templates/utils'

/**
 * Custom theme — minimal skeleton that lets user CSS take full control.
 * Only provides essential layout structure and CSS variables.
 */

export function getCustomCss(isDark: boolean): string {
  const bg = isDark ? '#0f172a' : '#ffffff'
  const bgSecondary = isDark ? '#1e293b' : '#f8fafc'
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'
  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const accent = isDark ? '#818cf8' : '#6366f1'

  return `
/* ─── Custom Theme — Skeleton ─── */
/* Modify these variables or add your own CSS below */

:root {
  --accent-warm: ${accent};
  --accent-cool: #38bdf8;
  --accent-violet: #a78bfa;
  --accent-rose: #fb7185;
  --accent-emerald: #34d399;
  --accent-light: ${accent}33;
  --bg-primary: ${bg};
  --bg-secondary: ${bgSecondary};
  --bg-card: ${bgSecondary};
  --text-primary: ${textPrimary};
  --text-secondary: ${textSecondary};
  --text-muted: ${textSecondary}99;
  --border-color: ${borderColor};
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --radius: 12px;
  --radius-sm: 8px;
  --max-width: 800px;
  --transition: 0.35s ease;
}

/* ─── Base Reset ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent-warm); text-decoration: none; transition: color var(--transition); }
a:hover { color: var(--accent-cool); }
img { max-width: 100%; height: auto; }

/* ─── Layout ─── */
.site-header {
  padding: 20px 0;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}
.site-header h1 { font-size: 1.5em; font-weight: 700; }
.site-header h1 a { color: var(--text-primary); }
.site-header p { color: var(--text-secondary); font-size: 0.9em; margin-top: 4px; }

.main-content {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 40px 20px;
}

.site-footer {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-muted);
  font-size: 0.85em;
  border-top: 1px solid var(--border-color);
}

/* ─── Post List ─── */
.post-item {
  padding: 20px 0;
  border-bottom: 1px solid var(--border-color);
}
.post-item:last-child { border-bottom: none; }
.post-item h2 { font-size: 1.2em; font-weight: 600; }
.post-item h2 a { color: var(--text-primary); }
.post-item h2 a:hover { color: var(--accent-warm); }
.post-meta { color: var(--text-secondary); font-size: 0.85em; margin-top: 4px; }
.post-excerpt { color: var(--text-secondary); margin-top: 8px; font-size: 0.95em; }

/* ─── Post Detail ─── */
.post-header { margin-bottom: 30px; }
.post-header h1 { font-size: 2em; font-weight: 800; line-height: 1.3; }
.post-content { line-height: 1.8; }
.post-content p { margin-bottom: 1em; }
.post-content h2 { font-size: 1.5em; font-weight: 700; margin: 1.5em 0 0.5em; }
.post-content h3 { font-size: 1.2em; font-weight: 600; margin: 1.2em 0 0.4em; }
.post-content blockquote {
  border-left: 3px solid var(--accent-warm);
  padding: 8px 16px;
  margin: 1em 0;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.post-content pre {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 0.9em;
  margin: 1em 0;
}
.post-content code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
}
.post-content img { border-radius: var(--radius-sm); margin: 1em 0; }
.post-content ul, .post-content ol { padding-left: 1.5em; margin-bottom: 1em; }
.post-content li { margin-bottom: 0.3em; }
.post-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.post-content th, .post-content td { padding: 8px 12px; border: 1px solid var(--border-color); text-align: left; }
.post-content th { background: var(--bg-secondary); font-weight: 600; }

/* ─── Tags ─── */
.tag {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.8em;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.tag:hover { border-color: var(--accent-warm); color: var(--accent-warm); }

/* ─── Navigation ─── */
.nav-links { display: flex; gap: 16px; justify-content: center; margin-top: 10px; }
.nav-links a { color: var(--text-secondary); font-size: 0.9em; }
.nav-links a:hover { color: var(--accent-warm); }
`
}

export function getCustomIndexHtml(data: ThemeIndexData): string {
  const bl: 'zh' | 'en' = data.language === 'en' ? 'en' : 'zh'
  const posts = data.published.map(post => `
    <article class="post-item">
      <h2><a href="posts/${escapeAttr(post.slug)}/index.html">${escapeHtml(post.title)}</a></h2>
      <div class="post-meta">${escapeHtml(post.date)}${post.tags.length ? ' · ' + post.tags.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ') : ''}</div>
      ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
    </article>
  `).join('')

  return `
    <header class="site-header">
      <h1><a href="index.html">${escapeHtml(data.siteTitle)}</a></h1>
      ${data.siteDescription ? `<p>${escapeHtml(data.siteDescription)}</p>` : ''}
      <nav class="nav-links">
        <a href="archive.html">${bl === 'en' ? 'Archive' : '归档'}</a>
        <a href="tags.html">${bl === 'en' ? 'Tags' : '标签'}</a>
      </nav>
    </header>

    <main class="main-content">
      ${posts}
    </main>

    <footer class="site-footer">
      © ${new Date().getFullYear()} ${escapeHtml(data.siteTitle)}
    </footer>
  `
}

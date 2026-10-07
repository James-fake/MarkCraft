/**
 * getEditorialCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Editorial ─────────────────────────────────────────────
export function getEditorialCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#ffffff'
  const fg = isDark ? '#e8e8e8' : '#1a1a1a'
  const muted = isDark ? '#999999' : '#666666'
  const accent = isDark ? '#ff4444' : '#cc0000'
  const accentLight = isDark ? 'rgba(255,68,68,0.12)' : 'rgba(204,0,0,0.06)'
  const cardBg = isDark ? '#242424' : '#fafafa'
  const border = isDark ? '#3a3a3a' : '#d4d4d4'
  const navBg = isDark ? '#111111' : '#1a1a1a'
  const navFg = '#ffffff'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0;
}

.blog-header {
  background: ${navBg};
  padding: 0;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  color: ${navFg};
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 4px;
  padding: 16px 0 0;
  text-transform: uppercase;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-top: 0;
  padding: 0 24px;
  border-top: 1px solid rgba(255,255,255,0.15);
}

.nav-link {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  position: relative;
  padding: 12px 20px;
  font-weight: 600;
}

.nav-link:hover, .nav-link.active {
  color: ${navFg};
  background: rgba(255,255,255,0.08);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${accent};
}

.blog-hero {
  text-align: center;
  padding: 48px 24px 32px;
  border-bottom: 2px solid ${accent};
}

.hero-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 56px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
  line-height: 1.1;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 0.5px;
  font-style: italic;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0;
  padding: 0;
}

.card-grid .card:nth-child(n+5) {
  display: none;
}

.card-grid::after {
  content: '';
  display: block;
  background: var(--card-bg);
  border-left: 1px solid var(--border);
  padding: 24px;
  grid-column: 2;
  grid-row: 1 / 5;
}

.card {
  background: transparent;
  border-radius: 0;
  padding: 20px 24px;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card:hover {
  background: var(--accent-light);
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--fg);
  line-height: 1.3;
}

.card-date {
  color: ${accent};
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 700;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: transparent;
  color: ${accent};
  border: 1px solid ${accent};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
}

.blog-archive {
  padding: 40px 24px;
}

.archive-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  font-weight: 900;
  border-bottom: 3px solid ${accent};
  padding-bottom: 12px;
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 3px solid ${accent};
}

.archive-year-title {
  font-size: 24px;
  color: ${accent};
  margin-bottom: 12px;
  font-weight: 900;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted var(--border);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 15px;
}

.archive-item a:hover {
  color: ${accent};
  text-decoration: underline;
}

.archive-item-date {
  color: ${accent};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  margin-left: 16px;
}

.blog-tags {
  padding: 40px 24px;
}

.tags-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  font-weight: 900;
  border-bottom: 3px solid ${accent};
  padding-bottom: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  font-weight: 600;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${navFg};
  border-color: ${accent};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  font-weight: 900;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
  text-decoration: underline;
}

.tag-post-date {
  color: ${accent};
  font-size: 12px;
  margin-left: 12px;
  font-weight: 700;
}

.blog-footer {
  text-align: center;
  padding: 32px 24px;
  border-top: 3px solid ${accent};
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 48px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 1px;
  color: var(--fg);
  font-weight: 900;
  line-height: 1.15;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-style: italic;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  text-align: justify;
  hyphens: auto;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  font-weight: 900;
}

.post-content h2 {
  font-size: 1.6em;
  border-bottom: 2px solid ${accent};
  padding-bottom: 8px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 3px solid ${accent};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 4px solid ${accent};
  padding-left: 20px;
  color: var(--muted);
  margin: 1.2em 0;
  font-style: italic;
  background: var(--accent-light);
  padding: 12px 20px;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid ${accent};
}

.post-content a:hover {
  border-bottom-width: 2px;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 2px solid var(--border);
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 16px;
  transition: color 0.2s;
}

.back-link:hover {
  color: ${accent};
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: themeFadeIn 0.4s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.1s; }
.card:nth-child(4) { animation-delay: 0.15s; }

@media (max-width: 768px) {
  .blog-container { padding: 0; }
  .hero-title { font-size: 32px; letter-spacing: 1px; }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card-grid::after { display: none; }
  .card-grid .card:nth-child(n+5) { display: block; }
  .card { padding: 16px; }
  .blog-nav { gap: 0; overflow-x: auto; }
  .nav-link { padding: 10px 14px; font-size: 12px; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-hero { padding: 32px 16px 24px; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

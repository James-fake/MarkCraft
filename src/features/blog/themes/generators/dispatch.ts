/**
 * getDispatchCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Dispatch ──────────────────────────────────────────────
export function getDispatchCss(isDark: boolean): string {
  const bg = isDark ? '#0a1520' : '#f0f4f8'
  const fg = isDark ? '#c8d8e8' : '#1e3a5f'
  const muted = isDark ? '#5a7a9a' : '#6b8aab'
  const accent = isDark ? '#ea580c' : '#d44800'
  const accentLight = isDark ? 'rgba(234,88,12,0.12)' : 'rgba(212,72,0,0.08)'
  const cardBg = isDark ? '#0f1e2e' : '#ffffff'
  const border = isDark ? '#1a3050' : '#c8d4e0'
  const redDot = isDark ? '#ef4444' : '#dc2626'
  const headerLine = isDark ? '#ea580c' : '#d44800'

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
  font-family: 'Inter', 'JetBrains Mono', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.5;
  min-height: 100vh;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* ── Single-column compact layout ── */
.blog-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

/* ── Telegram header: thin line + text nav ── */
.blog-header {
  padding: 0;
  border-bottom: 2px solid ${headerLine};
  position: relative;
}

.blog-header::before {
  content: '▶ BREAKING │';
  display: block;
  padding: 8px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: ${accent};
  font-weight: 600;
  text-transform: uppercase;
}

.blog-header-site {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--muted);
  padding: 4px 0 0;
  letter-spacing: 0.5px;
}

.blog-nav {
  display: flex;
  gap: 0;
  margin-top: 4px;
  border-top: 1px solid ${border};
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  padding: 6px 14px;
  position: relative;
  border-right: 1px solid ${border};
}

.nav-link:last-child {
  border-right: none;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: ${accent};
}

/* ── Hero: compact dispatch banner ── */
.blog-hero {
  padding: 24px 0 16px;
  border-bottom: 1px dashed ${border};
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.3px;
  margin-bottom: 6px;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card grid: compact list ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 14px;
  padding: 14px 0;
  border-bottom: 1px dashed ${border};
  position: relative;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  animation: dispatchSlideIn 0.4s ease-out both;
}

.card:hover {
  background: ${accentLight};
}

@keyframes dispatchSlideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.1s; }
.card:nth-child(4) { animation-delay: 0.15s; }
.card:nth-child(5) { animation-delay: 0.2s; }
.card:nth-child(6) { animation-delay: 0.25s; }

/* Red dot ● for new articles */
.card::before {
  content: '●';
  position: absolute;
  left: -14px;
  top: 16px;
  font-size: 8px;
  color: ${redDot};
  line-height: 1;
}

/* ── Card date: vertical red text on left ── */
.card-date {
  writing-mode: vertical-lr;
  text-orientation: mixed;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: ${accent};
  letter-spacing: 1px;
  padding-top: 2px;
  white-space: nowrap;
  grid-row: 1 / 3;
  align-self: start;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: ${accentLight};
  color: ${accent};
  border: 1px dashed ${border};
  border-radius: 2px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

/* ── Page sections ── */
.page-section { display: none; }
.page-section.active {
  display: block;
  animation: dispatchSlideIn 0.4s ease;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  margin-bottom: 20px;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.archive-title::before {
  content: '▶ ';
  color: ${accent};
}

.archive-year {
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 2px solid ${accent};
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.archive-item {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
  border-bottom: 1px dashed ${border};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  margin-bottom: 20px;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.tags-title::before {
  content: '▶ ';
  color: ${accent};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px dashed ${border};
  border-radius: 2px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed ${border};
}

.tag-posts-title::before {
  content: '▶ ';
}

.tag-post-item {
  padding: 5px 0;
  border-bottom: 1px dashed ${border};
  font-size: 13px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 24px 0;
  border-top: 2px solid ${headerLine};
  margin-top: 32px;
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 1px;
}

.blog-footer::before {
  content: '■ ■ ■  ';
  color: ${accent};
  font-size: 8px;
}

/* ── Post detail ── */
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0;
}

.back-link {
  display: inline-block;
  color: var(--muted);
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  margin: 16px 0 8px;
  transition: color 0.2s;
  letter-spacing: 0.5px;
}

.back-link:hover {
  color: ${accent};
}

.back-link::before {
  content: '◀ ';
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  padding: 16px 0 8px;
  color: var(--fg);
  letter-spacing: -0.3px;
  border-bottom: 2px solid ${accent};
  padding-bottom: 12px;
}

.post-title::before {
  content: '▶ ';
  color: ${accent};
  font-weight: 400;
}

.post-meta {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
  padding: 8px 0;
  font-family: 'JetBrains Mono', monospace;
  border-bottom: 1px dashed ${border};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
}

.post-content p {
  margin-bottom: 0.8em;
  font-size: 14px;
  line-height: 1.6;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.2em 0 0.5em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2::before {
  content: '▶ ';
  color: ${accent};
  font-size: 0.8em;
}

.post-content pre {
  background: ${isDark ? '#0c1a28' : '#e8eef4'};
  padding: 12px;
  border: 1px solid ${border};
  border-left: 3px solid ${accent};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${border};
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.5;
  font-family: 'JetBrains Mono', monospace;
  border-left: 2px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 600; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 14px; }

  .card::before {
    left: -10px;
  }

  .card-date {
    writing-mode: horizontal-tb;
    font-size: 11px;
  }

  .card {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .card-date {
    grid-row: auto;
  }

  .hero-title { font-size: 18px; }
  .post-title { font-size: 18px; }

  .blog-nav {
    overflow-x: auto;
  }

  .nav-link {
    font-size: 11px;
    padding: 5px 10px;
  }
}
`
}

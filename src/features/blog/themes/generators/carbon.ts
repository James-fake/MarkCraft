/**
 * getCarbonCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Carbon ────────────────────────────────────────────────
export function getCarbonCss(isDark: boolean): string {
  const bg = isDark ? '#0d1117' : '#f6f8fa'
  const fg = isDark ? '#c9d1d9' : '#24292f'
  const muted = isDark ? '#8b949e' : '#57606a'
  const accent = isDark ? '#4ade80' : '#1f6feb'
  const cardBg = isDark ? '#161b22' : '#ffffff'
  const border = isDark ? '#30363d' : '#d0d7de'
  const accentLight = isDark ? 'rgba(74,222,128,0.1)' : 'rgba(31,111,235,0.08)'
  const sidebarBg = isDark ? '#0d1117' : '#f0f3f6'
  const lineNumColor = isDark ? '#484f58' : '#afb8c1'
  const hoverBg = isDark ? 'rgba(74,222,128,0.06)' : 'rgba(31,111,235,0.04)'
  const tabActiveBg = isDark ? '#161b22' : '#ffffff'
  const tabInactiveBg = isDark ? '#0d1117' : '#eaeef2'

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
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
  font-size: 14px;
}

/* ── Three-column IDE layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 200px 1fr 160px;
  min-height: 100vh;
}

/* ── Left sidebar: file tree ── */
.blog-header {
  grid-column: 1;
  grid-row: 1;
  background: ${sidebarBg};
  border-right: 1px solid ${border};
  padding: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 10;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.blog-nav::before {
  content: 'EXPLORER';
  display: block;
  padding: 8px 16px;
  font-size: 11px;
  letter-spacing: 1px;
  color: ${muted};
  font-weight: 600;
  border-bottom: 1px solid ${border};
}

.nav-link {
  color: ${fg};
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 6px 16px 6px 28px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link::before {
  content: '📄';
  font-size: 12px;
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 1;
}

.nav-link:hover, .nav-link.active {
  background: ${hoverBg};
  color: ${accent};
}

.nav-link.active {
  background: ${accentLight};
  border-left: 2px solid ${accent};
  padding-left: 26px;
}

/* ── Center: main content ── */
.blog-hero,
.blog-home,
.blog-archive,
.blog-tags,
.blog-about,
.blog-links,
.blog-series,
.post-detail {
  grid-column: 2;
}

.blog-hero {
  padding: 32px 24px 20px;
  border-bottom: 1px solid ${border};
  background: ${cardBg};
}

.hero-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 6px;
}

.hero-title::before {
  content: '# ';
  color: ${muted};
  font-weight: 400;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Tab bar above content ── */
.card-grid {
  padding: 0;
}

.card-grid::before {
  content: 'README.md ✕';
  display: block;
  padding: 8px 16px;
  font-size: 12px;
  color: ${muted};
  background: ${tabInactiveBg};
  border-bottom: 1px solid ${border};
}

.card {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 0;
  padding: 8px 16px 8px 0;
  border-bottom: 1px solid ${border};
  position: relative;
  text-decoration: none;
  color: inherit;
  transition: background 0.1s;
  font-size: 13px;
  align-items: center;
  animation: carbonFadeIn 0.3s ease-out both;
}

.card:hover {
  background: ${hoverBg};
}

@keyframes carbonFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.03s; }
.card:nth-child(3) { animation-delay: 0.06s; }
.card:nth-child(4) { animation-delay: 0.09s; }
.card:nth-child(5) { animation-delay: 0.12s; }

/* Line number column */
.card::before {
  content: counter(carbon-line);
  counter-increment: carbon-line;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: ${lineNumColor};
  text-align: right;
  padding: 0 12px 0 8px;
  user-select: none;
  min-width: 36px;
}

.card-grid {
  counter-reset: carbon-line;
}

.card-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: ${accent};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title::before {
  content: '📄 ';
  font-size: 12px;
}

.card-date {
  font-size: 11px;
  color: ${muted};
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

.card-excerpt {
  grid-column: 2 / -1;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  padding-left: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  grid-column: 2 / -1;
  display: flex;
  gap: 4px;
  margin-top: 2px;
  padding-left: 36px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  background: ${accentLight};
  color: ${accent};
  border-radius: 10px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Right sidebar: mini map ── */
.blog-hero {
  grid-column: 2;
}

/* Use the right column area for mini-map simulation via blog-hero siblings */
.page-section {
  grid-column: 2;
}

.page-section.active {
  display: block;
  animation: carbonFadeIn 0.3s ease;
}

.page-section { display: none; }

/* ── Archive ── */
.blog-archive {
  padding: 24px;
}

.archive-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  margin-bottom: 20px;
  color: var(--fg);
}

.archive-title::before {
  content: 'git log --oneline  ';
  color: ${muted};
  font-weight: 400;
}

.archive-year {
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 2px solid ${border};
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 8px;
}

.archive-year-title::before {
  content: 'tag: ';
  color: ${muted};
}

.archive-item {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px;
}

.tags-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  margin-bottom: 20px;
  color: var(--fg);
}

.tags-title::before {
  content: 'git tag -l  ';
  color: ${muted};
  font-weight: 400;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 12px;
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
  font-size: 14px;
  color: ${accent};
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.tag-posts-title::before {
  content: '$ grep -r "';
}

.tag-posts-title::after {
  content: '" .';
}

.tag-post-item {
  padding: 4px 0;
  border-bottom: 1px solid ${border};
  font-size: 13px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px 0;
  border-top: 1px solid ${border};
  margin-top: 0;
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  background: ${sidebarBg};
}

/* ── Post detail ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.back-link {
  display: inline-block;
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  margin: 12px 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

.back-link::before {
  content: '← ';
}

.post-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  padding: 12px 24px;
  color: var(--fg);
  background: ${tabActiveBg};
  border-bottom: 1px solid ${border};
  border-top: 1px solid ${border};
}

.post-title::after {
  content: '.md';
  color: ${muted};
  font-weight: 400;
}

.post-meta {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
  padding: 8px 24px;
  font-family: 'JetBrains Mono', monospace;
  background: ${sidebarBg};
  border-bottom: 1px solid ${border};
}

.post-meta::before {
  content: 'git blame  ';
  color: ${lineNumColor};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 24px;
  align-items: start;
  padding: 24px;
}

.post-content p {
  margin-bottom: 1em;
  font-size: 14px;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', monospace;
  margin: 1.3em 0 0.6em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2::before {
  content: '## ';
  color: ${muted};
  font-weight: 400;
}

.post-content pre {
  background: ${isDark ? '#161b22' : '#f6f8fa'};
  padding: 14px;
  border: 1px solid ${border};
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'bash';
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: ${lineNumColor};
  text-transform: uppercase;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding-left: 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${hoverBg};
  padding: 8px 14px;
  border-radius: 0 6px 6px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 6px;
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
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px solid ${border};
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
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive: collapse to single column on mobile ── */
@media (max-width: 1024px) {
  .blog-container {
    grid-template-columns: 1fr;
  }

  .blog-header {
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid ${border};
  }

  .blog-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 12px;
  }

  .blog-nav::before {
    display: none;
  }

  .nav-link {
    padding: 8px 12px;
    font-size: 12px;
  }

  .nav-link::before {
    display: none;
  }

  .nav-link.active {
    border-left: none;
    border-bottom: 2px solid ${accent};
    padding-left: 12px;
  }

  .blog-footer {
    grid-column: 1;
  }

  .post-body-layout {
    grid-template-columns: 1fr;
  }

  .post-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .card {
    grid-template-columns: 30px 1fr;
  }

  .card-excerpt, .card-tags {
    padding-left: 30px;
  }

  .card-date {
    grid-column: 2;
  }

  .post-title {
    font-size: 16px;
    padding: 10px 16px;
  }

  .post-body-layout {
    padding: 16px;
  }
}
`
}

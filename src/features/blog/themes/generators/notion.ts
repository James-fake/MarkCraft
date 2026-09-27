/**
 * getNotionCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Notion ──────────────────────────────────────────
export function getNotionCss(isDark: boolean): string {
  const bg = isDark ? '#191919' : '#fff'
  const fg = isDark ? '#e0e0e0' : '#37352f'
  const muted = isDark ? '#6b6b6b' : '#9b9a97'
  const accent = isDark ? '#529cca' : '#2383e2'
  const accentLight = isDark ? 'rgba(82,156,202,0.1)' : 'rgba(35,131,226,0.08)'
  const cardBg = isDark ? '#191919' : '#fff'
  const border = isDark ? '#2e2e2e' : '#e3e3e3'
  const navBg = isDark ? 'rgba(25,25,25,0.95)' : 'rgba(255,255,255,0.95)'
  const codeBg = isDark ? '#2e2e2e' : '#f7f6f3'

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
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 12px 0;
  text-align: center;
}

.blog-header-site {
  font-size: 14px;
  font-weight: 600;
  color: ${fg};
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 400;
}

.nav-link:hover {
  background: ${accent}15;
  color: ${fg};
}

.nav-link.active {
  background: ${accent}20;
  color: ${accent};
  font-weight: 500;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero: minimal, no hero feel ── */
.blog-hero {
  padding: 48px 0 24px;
  text-align: left;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 4px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  line-height: 1.5;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid: list style ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.card {
  padding: 12px 0;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  box-shadow: none;
  position: relative;
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 16px;
}

.card:hover {
  background: ${accent}08;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
  color: ${fg};
  margin-bottom: 0;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  white-space: nowrap;
  margin-bottom: 0;
}

.card-excerpt {
  display: none;
}

.card-tags {
  display: none;
}

/* ── Archive ── */
.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 24px;
  color: ${fg};
}

.archive-year {
  margin-bottom: 24px;
  padding-left: 0;
  border-left: none;
}

.archive-year-title {
  font-size: 14px;
  font-weight: 600;
  color: ${muted};
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  font-size: 14px;
}

.archive-item a:hover {
  color: ${accent};
  background: ${accent}08;
  border-radius: 2px;
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
}

/* ── Tags ── */
.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 24px;
  color: ${fg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 4px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 16px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  font-size: 14px;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 32px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid ${border};
  margin-top: 32px;
  color: ${muted};
  font-size: 13px;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 0;
}

.post-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 8px;
  color: ${fg};
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.post-meta {
  text-align: left;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${border};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1em;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', system-ui, sans-serif;
  margin: 1.5em 0 0.5em;
  color: ${fg};
  font-weight: 600;
}

.post-content h2 {
  font-size: 1.3em;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${codeBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 4px;
  border-radius: 3px;
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
  border-radius: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 16px;
  color: ${muted};
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  border-radius: 0 3px 3px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 4px;
}

.post-content a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: opacity 0.15s;
}

.post-content a:hover {
  opacity: 0.7;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${accentLight};
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid ${border};
  font-size: 13px;
}

.post-content td {
  padding: 8px 12px;
  border: 1px solid ${border};
}

.post-content tr:hover td {
  background: ${accent}08;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
  text-transform: uppercase;
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

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 24px; }
  .post-title { font-size: 24px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 4px 6px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 24px 0; }
}
`
}

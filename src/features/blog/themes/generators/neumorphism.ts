/**
 * getNeumorphismCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Neumorphism ──────────────────────────────────────────
export function getNeumorphismCss(isDark: boolean): string {
  const bg = isDark ? '#2d2d35' : '#e0e5ec'
  const fg = isDark ? '#c8c8d0' : '#3a3f47'
  const muted = isDark ? '#8a8a95' : '#6b7280'
  const accentLight = isDark ? 'rgba(200,200,208,0.08)' : 'rgba(58,63,71,0.06)'
  const cardBg = isDark ? '#2d2d35' : '#e0e5ec'
  const border = isDark ? '#3b3b43' : '#d1d9e6'
  const raised = isDark
    ? '8px 8px 16px #1f1f27, -8px -8px 16px #3b3b43'
    : '8px 8px 16px #b8bec7, -8px -8px 16px #ffffff'
  const sunken = isDark
    ? 'inset 8px 8px 16px #1f1f27, inset -8px -8px 16px #3b3b43'
    : 'inset 8px 8px 16px #b8bec7, inset -8px -8px 16px #ffffff'
  const accentColor = isDark ? '#9b9ba8' : '#6b7280'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accentColor};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${bg};
  border-bottom: none;
  padding: 16px 0;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
  padding: 10px 20px;
  background: ${bg};
  border-radius: 12px;
  box-shadow: ${raised};
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  box-shadow: ${sunken};
  color: ${fg};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 42px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  display: inline-block;
  padding: 24px 48px;
  border-radius: 24px;
  box-shadow: ${raised};
  background: ${bg};
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 560px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
  padding: 32px 0;
}

.card {
  background: ${bg};
  border-radius: 24px;
  padding: 28px;
  position: relative;
  border: none;
  box-shadow: ${raised};
  transition: box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: ${sunken};
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  font-weight: 500;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 4px 12px;
  background: ${bg};
  color: ${muted};
  border: none;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
  box-shadow: ${sunken};
}

/* ── Archive ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
  display: inline-block;
  padding: 12px 28px;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 24px;
  border-left: 3px solid ${border};
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 12px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: ${accentColor};
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
  font-weight: 500;
}

/* ── Tags ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
  display: inline-block;
  padding: 12px 28px;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: ${bg};
  color: ${muted};
  border: none;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-weight: 500;
  box-shadow: ${raised};
}

.tag-cloud-item:hover {
  box-shadow: ${sunken};
  color: ${fg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 18px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
}

.tag-post-item a:hover {
  color: ${accentColor};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
  font-weight: 500;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 48px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: none;
  margin-top: 48px;
  color: ${muted};
  font-size: 13px;
  letter-spacing: 0.5px;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 48px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  line-height: 1.3;
  display: inline-block;
  padding: 20px 40px;
  border-radius: 20px;
  box-shadow: ${raised};
  background: ${bg};
}

.post-detail > .post-title,
.post-detail .post-title {
  display: block;
  text-align: center;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', sans-serif;
  margin: 1.5em 0 0.6em;
  color: ${fg};
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.4em;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${bg};
  padding: 16px 20px;
  border: none;
  border-radius: 16px;
  box-shadow: ${sunken};
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accentColor};
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accentColor};
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: normal;
  background: ${bg};
  border-radius: 0 16px 16px 0;
  box-shadow: ${sunken};
}

.post-content img {
  max-width: 100%;
  border-radius: 20px;
  box-shadow: ${raised};
}

.post-content a {
  color: ${accentColor};
  text-decoration: none;
  border-bottom: 1px dashed ${accentColor};
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${bg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  box-shadow: ${sunken};
}

.post-content td {
  padding: 8px 14px;
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
  padding: 8px 16px;
  border-radius: 12px;
  box-shadow: ${raised};
  background: ${bg};
}

.back-link:hover {
  box-shadow: ${sunken};
  color: ${fg};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 16px;
  font-size: 0.85em;
  line-height: 1.8;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0.5px;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 1.6;
  text-decoration: none;
}

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accentColor}; }

/* ── Animation ── */
@keyframes neumorphFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: neumorphFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; padding: 16px 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 24px; }
  .card { padding: 20px; }
  .blog-nav { gap: 8px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 8px 14px; }
  .post-title { font-size: 24px; padding: 16px 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 32px 0; }
}
`
}

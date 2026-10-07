/**
 * getFashionCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Fashion ──────────────────────────────────────────
export function getFashionCss(isDark: boolean): string {
  const bg = isDark ? '#0a0a0a' : '#fff'
  const fg = isDark ? '#f0f0f0' : '#1a1a1a'
  const muted = isDark ? '#888' : '#999'
  const accent = '#c8a97e'
  const accentLight = isDark ? 'rgba(200,169,126,0.1)' : 'rgba(200,169,126,0.08)'
  const cardBg = isDark ? '#111' : '#fafafa'
  const border = isDark ? '#222' : '#e5e5e5'
  const navBg = isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)'

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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 20px 0;
  text-align: center;
}

.blog-header-site {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 4px;
  text-transform: uppercase;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 0;
  font-weight: 400;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 100px 0 64px;
  position: relative;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 56px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 20px;
  line-height: 1.1;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 300;
  max-width: 520px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid: editorial mixed layout ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 32px;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  animation: fashionFadeIn 0.6s ease-out both;
}

.card:nth-child(1) { grid-column: span 6; }
.card:nth-child(2) { grid-column: span 6; }
.card:nth-child(n+3) { grid-column: span 4; }

.card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: 0.5px;
}

.card-date {
  color: ${accent};
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 400;
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
  padding: 3px 12px;
  background: none;
  color: ${accent};
  border: 1px solid ${accent};
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

/* ── Archive ── */
.blog-archive {
  padding: 64px 0;
}

.archive-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: ${fg};
  letter-spacing: 2px;
  text-transform: uppercase;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 1px solid ${accent};
}

.archive-year-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
  font-weight: 300;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 300;
}

/* ── Tags ── */
.blog-tags {
  padding: 64px 0;
}

.tags-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: ${fg};
  letter-spacing: 2px;
  text-transform: uppercase;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: none;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

.tag-cloud-item:hover {
  color: ${accent};
  border-color: ${accent};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
  letter-spacing: 1px;
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
  font-weight: 300;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
  letter-spacing: 1px;
  font-weight: 300;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 64px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid ${border};
  margin-top: 64px;
  color: ${muted};
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 300;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 64px 0;
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  letter-spacing: 1px;
  line-height: 1.2;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 48px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.4em;
  line-height: 1.8;
  font-weight: 300;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  margin: 1.8em 0 0.8em;
  color: ${fg};
  font-weight: 700;
  letter-spacing: 0.5px;
}

.post-content h2 {
  font-size: 1.5em;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${cardBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 2px solid ${accent};
  padding: 16px 24px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: italic;
  font-family: 'Playfair Display', serif;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid ${accent};
  transition: opacity 0.3s;
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
  background: ${cardBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid ${border};
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.post-content td {
  padding: 8px 14px;
  border: 1px solid ${border};
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
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
  line-height: 1.8;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.8em;
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
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Animation ── */
@keyframes fashionFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(6, 1fr); }
  .card:nth-child(1) { grid-column: span 6; }
  .card:nth-child(2) { grid-column: span 3; }
  .card:nth-child(n+3) { grid-column: span 3; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .card:nth-child(1),
  .card:nth-child(2),
  .card:nth-child(n+3) { grid-column: span 1; }
  .card { padding: 24px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; letter-spacing: 2px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 40px 0; }
}
`
}

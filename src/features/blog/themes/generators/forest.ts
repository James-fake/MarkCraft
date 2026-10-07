/**
 * getForestCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Forest ──────────────────────────────────────────
export function getForestCss(isDark: boolean): string {
  const bg = isDark ? '#1a2416' : '#f5f0e8'
  const fg = isDark ? '#d4cbb8' : '#2d3436'
  const muted = isDark ? '#8a9a7a' : '#7a8a6a'
  const accent = isDark ? '#6ba33e' : '#5a8a32'
  const accentLight = isDark ? 'rgba(107,163,62,0.12)' : 'rgba(90,138,50,0.08)'
  const cardBg = isDark ? '#223020' : '#faf7f0'
  const border = isDark ? '#2e3e28' : '#ddd5c5'
  const navBg = isDark ? 'rgba(26,36,22,0.95)' : 'rgba(245,240,232,0.95)'

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
  font-family: 'Lora', 'Georgia', serif;
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
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 16px 0;
  text-align: center;
}

.blog-header-site {
  font-family: 'Lora', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Lora', serif;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 400;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active {
  color: ${bg};
  background: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
  background: linear-gradient(180deg, ${accent}08 0%, transparent 100%);
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: 20px;
  right: 10%;
  width: 200px;
  height: 200px;
  border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
  background: ${accent}15;
}

.hero-title {
  font-family: 'Lora', serif;
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 16px;
  padding: 28px;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  animation: forestFadeIn 0.6s ease-out both;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(90,138,50,0.1);
}

.card-title {
  font-family: 'Lora', serif;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
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
  padding: 4px 14px;
  background: ${accent}15;
  color: ${accent};
  border: none;
  border-radius: 20px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── Archive ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Lora', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 24px;
  border-left: 3px solid ${accent};
}

.archive-year-title {
  font-family: 'Lora', serif;
  font-size: 18px;
  font-weight: 700;
  color: ${accent};
  margin-bottom: 12px;
}

.archive-item {
  padding: 8px 0;
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
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
}

/* ── Tags ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Lora', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: ${accent}15;
  color: ${accent};
  border: none;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-weight: 500;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Lora', serif;
  font-size: 18px;
  font-weight: 700;
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
  padding: 48px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid ${border};
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
  font-family: 'Lora', serif;
  font-size: 34px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  line-height: 1.3;
  letter-spacing: -0.5px;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 0.5px;
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
  font-family: 'Lora', serif;
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
  background: ${cardBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 12px;
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
  border-left: 3px solid ${accent};
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: italic;
  background: ${accentLight};
  border-radius: 0 12px 12px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid ${border};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${accent};
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
  background: ${cardBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid ${border};
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
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
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

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 700;
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
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Animation ── */
@keyframes forestFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .blog-hero::before { display: none; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 6px 14px; }
  .post-title { font-size: 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 32px 0; }
}
`
}

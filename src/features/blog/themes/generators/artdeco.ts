/**
 * getArtdecoCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Art Deco — 「装饰艺术」──────────────────────────────────
export function getArtdecoCss(isDark: boolean): string {
  const bg = isDark ? '#0d0d1a' : '#faf8f5'
  const fg = isDark ? '#e8dcc8' : '#1a1a2e'
  const muted = isDark ? '#8a7e6a' : '#6b6356'
  const accent = '#d4a843'
  const accentLight = isDark ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.08)'
  const cardBg = isDark ? '#161625' : '#ffffff'
  const border = isDark ? '#2a2a3e' : '#e0d8c8'
  const gold = '#d4a843'
  const shadowBase = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'

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
  font-family: 'Playfair Display', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 40px 0 32px;
  text-align: center;
  border-bottom: 1px solid ${gold};
  position: relative;
}

.blog-header::before {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 2px;
  background: ${gold};
}

.blog-header-site {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  font-weight: 700;
  color: ${gold};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 0;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 1px;
  background: ${gold};
  transition: width 0.3s;
}

.nav-link:hover {
  color: ${gold};
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.active {
  color: ${gold};
}

.nav-link.active::after {
  width: 100%;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 56px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 60px;
  border: 1px solid ${gold}33;
  border-radius: 50% 50% 0 0;
  border-bottom: none;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  letter-spacing: 4px;
  font-weight: 700;
  color: ${gold};
  margin-bottom: 20px;
  text-transform: uppercase;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  font-style: italic;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 28px 24px;
  position: relative;
  border: 1px solid ${gold}33;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
  box-shadow: 0 2px 8px ${shadowBase};
}

.card::before {
  content: '\\25C6';
  position: absolute;
  top: -8px;
  left: 16px;
  color: ${gold};
  font-size: 12px;
  background: ${bg};
  padding: 0 4px;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px ${shadowMid};
  border-color: ${gold}66;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.05em;
}

.card-date {
  color: ${gold};
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 400;
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
  background: ${accentLight};
  color: ${gold};
  border: 1px solid ${gold}33;
  font-family: 'Playfair Display', serif;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 8px;
  background: ${gold};
  transform: translateY(-50%) rotate(45deg);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 1px solid ${gold}44;
}

.archive-year-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: ${gold};
  margin-bottom: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${gold};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.tags-title::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 8px;
  background: ${gold};
  transform: translateY(-50%) rotate(45deg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: ${cardBg};
  color: ${gold};
  border: 1px solid ${gold}33;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  border-color: ${gold};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: ${gold};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${gold}33;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid ${gold}22;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${gold};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid ${gold}33;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.blog-footer::before {
  content: '\\25C6  ';
  color: ${gold};
}

.blog-footer::after {
  content: '  \\25C6';
  color: ${gold};
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.1em;
  color: var(--fg);
  position: relative;
  display: inline-block;
  width: 100%;
}

.post-title::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 30px;
  border: 1px solid ${gold}33;
  border-radius: 50% 50% 0 0;
  border-bottom: none;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Playfair Display', serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.post-content h2::before {
  content: '\\25C6 ';
  color: ${gold};
  font-size: 0.7em;
}

.post-content pre {
  background: ${isDark ? '#161625' : '#f5f0e8'};
  padding: 20px 24px;
  border: 1px solid ${gold}22;
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${gold};
}

.post-content blockquote {
  border-left: 2px solid ${gold};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: italic;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${gold}22;
  box-shadow: 0 4px 12px ${shadowBase};
}

.post-content a {
  color: ${gold};
  text-decoration: none;
  border-bottom: 1px solid ${gold}44;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-color: ${gold};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Playfair Display', serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${gold}33; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 1px solid ${gold}33;
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${gold};
  border-left-color: ${gold};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${gold};
}

@keyframes artdecoFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: artdecoFadeIn 0.6s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; letter-spacing: 2px; }
  .blog-hero::before { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; }
  .post-title { font-size: 24px; }
  .post-title::before { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getBauhausCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Bauhaus — 「包豪斯」──────────────────────────────────
export function getBauhausCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#f8f8f8'
  const fg = isDark ? '#f0f0f0' : '#1a1a1a'
  const muted = isDark ? '#888888' : '#666666'
  const accent = isDark ? '#e63946' : '#e63946'
  const accentLight = isDark ? 'rgba(230,57,70,0.1)' : 'rgba(230,57,70,0.08)'
  const cardBg = isDark ? '#242424' : '#ffffff'
  const border = isDark ? '#333333' : '#dddddd'
  const red = '#e63946'
  const yellow = '#f1c40f'
  const blue = '#2980b9'
  const shadowBase = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'

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
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
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
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  position: relative;
}

.nav-link {
  color: var(--fg);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 10px 20px;
  background: ${cardBg};
  border: 2px solid var(--border);
}

.nav-link:nth-child(3n+1) { border-top: 4px solid ${red}; }
.nav-link:nth-child(3n+2) { border-top: 4px solid ${yellow}; }
.nav-link:nth-child(3n+3) { border-top: 4px solid ${blue}; }

.nav-link:hover {
  background: var(--accent-light);
  transform: translateY(-2px);
}

.nav-link.active {
  color: var(--accent);
  border-color: var(--accent);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 56px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 20px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${red};
  opacity: 0.15;
  top: -20px;
  left: -20px;
}

.hero-title::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  background: ${blue};
  opacity: 0.15;
  bottom: -10px;
  right: -10px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 28px 24px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
  box-shadow: 0 2px 8px ${shadowBase};
}

.card:nth-child(3n+1) { border-top: 4px solid ${red}; }
.card:nth-child(3n+2) { border-top: 4px solid ${yellow}; }
.card:nth-child(3n+3) { border-top: 4px solid ${blue}; }

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px ${shadowMid};
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 300;
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
  background: var(--accent-light);
  color: var(--accent);
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 60px;
  height: 4px;
  background: ${red};
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 4px solid ${blue};
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${blue};
  margin-bottom: 16px;
  font-weight: 900;
  letter-spacing: 0.05em;
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
  font-weight: 700;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${red};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.tags-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 60px;
  height: 4px;
  background: ${yellow};
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
  color: var(--fg);
  border: 2px solid var(--border);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:nth-child(3n+1):hover { border-color: ${red}; color: ${red}; }
.tag-cloud-item:nth-child(3n+2):hover { border-color: ${yellow}; color: ${yellow}; }
.tag-cloud-item:nth-child(3n+3):hover { border-color: ${blue}; color: ${blue}; }

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${red};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${red};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 300;
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
  border-top: 4px solid var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.post-title::before {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${red};
  opacity: 0.1;
  top: -10px;
  left: -16px;
}

.post-meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 300;
  letter-spacing: 0.1em;
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
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: ${red};
  margin-right: 12px;
  vertical-align: middle;
}

.post-content pre {
  background: ${isDark ? '#242424' : '#f0f0f0'};
  padding: 20px 24px;
  border: 2px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${red};
}

.post-content blockquote {
  border-left: 4px solid ${blue};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: var(--accent-light);
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  box-shadow: 0 4px 12px ${shadowBase};
}

.post-content a {
  color: ${red};
  text-decoration: none;
  border-bottom: 2px solid ${red}33;
  font-weight: 700;
}

.post-content a:hover {
  border-bottom-color: ${red};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); }

.toc-title {
  font-weight: 900;
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
  border-left: 2px solid var(--border);
  transition: all 0.3s;
  font-size: 0.9em;
  font-weight: 300;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${red};
  border-left-color: ${red};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${red};
}

@keyframes bauhausFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: bauhausFadeIn 0.5s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 8px 12px; }
  .post-title { font-size: 24px; }
  .post-title::before { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

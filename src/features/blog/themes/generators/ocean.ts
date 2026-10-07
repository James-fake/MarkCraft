/**
 * getOceanCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Ocean — 「潮汐韵律」─────────────────────────────────────
export function getOceanCss(isDark: boolean): string {
  const bg = isDark ? '#001a2e' : '#f0f9ff'
  const fg = isDark ? '#caf0f8' : '#023e8a'
  const muted = isDark ? '#4895b8' : '#5e8fac'
  const accent = isDark ? '#90e0ef' : '#0077b6'
  const accentLight = isDark ? 'rgba(144,224,239,0.12)' : 'rgba(0,119,182,0.08)'
  const cardBg = isDark ? '#002d4a' : '#ffffff'
  const border = isDark ? '#004060' : '#caf0f8'
  const waveColor1 = isDark ? 'rgba(0,119,182,0.25)' : 'rgba(0,119,182,0.12)'
  const waveColor2 = isDark ? 'rgba(144,224,239,0.15)' : 'rgba(144,224,239,0.10)'
  const shadowWaveHover = isDark ? '0 16px 48px rgba(0,64,96,0.5)' : '0 16px 48px rgba(0,119,182,0.18)'

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
  font-family: 'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.9;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── 顶部波浪装饰带 ── */
.blog-container::before {
  content: '';
  display: block;
  height: 6px;
  background: linear-gradient(90deg, ${accent}, ${isDark ? '#4895b8' : '#90e0ef'}, ${accent});
  background-size: 200% 100%;
  animation: oceanWaveShift 4s ease-in-out infinite;
  border-radius: 0 0 4px 4px;
}

@keyframes oceanWaveShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.blog-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 28px;
}

/* ── 头部 ── */
.blog-header {
  padding: 48px 0 0;
  text-align: center;
  position: relative;
}

.blog-header-site {
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

/* ── 半透明胶囊导航 ── */
.blog-nav {
  display: inline-flex;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
  padding: 6px 12px;
  background: ${isDark ? 'rgba(0,45,74,0.6)' : 'rgba(255,255,255,0.7)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 40px;
  border: 1px solid ${border};
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 18px;
  border-radius: 24px;
  position: relative;
}

.nav-link:hover, .nav-link.active {
  color: ${isDark ? '#001a2e' : '#ffffff'};
  background: var(--accent);
}

.nav-link.active::after {
  display: none;
}

/* ── SVG波浪分隔线 ── */
.blog-hero {
  text-align: center;
  padding: 60px 0 0;
  position: relative;
}

.blog-hero::after {
  content: '';
  display: block;
  width: 100%;
  height: 24px;
  margin-top: 40px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 24'%3E%3Cpath d='M0,12 C200,24 400,0 600,12 C800,24 1000,0 1200,12 L1200,24 L0,24 Z' fill='${encodeURIComponent(waveColor1)}'/%3E%3C/svg%3E") repeat-x;
  background-size: 1200px 24px;
  animation: oceanWaveScroll 8s linear infinite;
}

@keyframes oceanWaveScroll {
  from { background-position-x: 0; }
  to { background-position-x: 1200px; }
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.hero-description {
  color: var(--muted);
  font-size: 17px;
  line-height: 1.7;
  letter-spacing: 0.5px;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 卡片网格 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease, border-color 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
}

/* 波浪阴影 */
.card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, ${waveColor1}, ${waveColor2}, ${waveColor1});
  background-size: 200% 100%;
  border-radius: 0 0 16px 16px;
  animation: oceanWaveShift 3s ease-in-out infinite;
}

.card:hover {
  border-color: var(--accent);
  box-shadow: ${shadowWaveHover};
  transform: translateY(-6px);
}

.card-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.8;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 14px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
  position: relative;
}

.archive-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--accent);
  margin: 12px auto 0;
  border-radius: 2px;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid var(--accent);
  border-radius: 2px;
}

.archive-year-title {
  font-family: 'Nunito', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
  position: relative;
}

.tags-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--accent);
  margin: 12px auto 0;
  border-radius: 2px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#001a2e' : '#ffffff'};
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${waveColor1};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-weight: 500;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 0;
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  position: relative;
}

.blog-footer::before {
  content: '';
  display: block;
  width: 100%;
  height: 20px;
  margin-bottom: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 20'%3E%3Cpath d='M0,10 C150,20 350,0 600,10 C850,20 1050,0 1200,10 L1200,20 L0,20 Z' fill='${encodeURIComponent(waveColor2)}'/%3E%3C/svg%3E") repeat-x;
  background-size: 1200px 20px;
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 28px;
}

.post-title {
  font-family: 'Nunito', sans-serif;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  color: var(--fg);
  position: relative;
  padding-bottom: 20px;
}

/* 波浪装饰线 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 2px;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 32px;
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
  font-family: 'Nunito', sans-serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

/* 波浪左边框引用块 */
.post-content blockquote {
  border-left: 4px solid var(--accent);
  border-image: linear-gradient(to bottom, var(--accent), ${isDark ? '#4895b8' : '#90e0ef'}) 1;
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  position: relative;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--border);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
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
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.9em;
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
.toc-nav a:hover, .toc-nav a.active { color: var(--accent); }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 16px;
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画：潮水涌来 ── */
@keyframes oceanTideIn {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: oceanTideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }
.card:nth-child(5) { animation-delay: 0.48s; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 30px; }
  .card { padding: 20px 24px; border-radius: 12px; }
  .blog-nav { gap: 2px; padding: 4px 8px; }
  .nav-link { padding: 6px 14px; font-size: 13px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getShowcaseCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Showcase — 「作品橱窗」────────────────────────────────
export function getShowcaseCss(isDark: boolean): string {
  const bg = isDark ? '#111827' : '#ffffff'
  const fg = isDark ? '#f9fafb' : '#111827'
  const muted = isDark ? '#6b7280' : '#9ca3af'
  const accent = isDark ? '#60a5fa' : '#3b82f6'
  const accentLight = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.08)'
  const cardBg = isDark ? '#1f2937' : '#f9fafb'
  const border = isDark ? '#374151' : '#e5e7eb'
  const overlayBg = isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.88)'
  const heroGradient1 = isDark ? '#1e3a5f' : '#dbeafe'
  const heroGradient2 = isDark ? '#111827' : '#eff6ff'
  const cardImgBg1 = isDark ? '#1e3a5f' : '#dbeafe'
  const cardImgBg2 = isDark ? '#1f2937' : '#bfdbfe'
  const cardImgBg3 = isDark ? '#312e81' : '#c7d2fe'
  const cardImgBg4 = isDark ? '#1e1b4b' : '#e0e7ff'
  const cardImgBg5 = isDark ? '#164e63' : '#cffafe'
  const shadowHover = isDark ? '0 20px 60px rgba(96,165,250,0.2)' : '0 20px 60px rgba(59,130,246,0.12)'

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
  line-height: 1.6;
  min-height: 100vh;
}

/* ── 全宽布局 ── */
.blog-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

/* ── 头部：左Logo + 右汉堡菜单导航 ── */
.blog-header {
  padding: 24px 0;
  text-align: left;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* 汉堡菜单风格导航 */
.blog-nav {
  display: flex;
  justify-content: flex-end;
  gap: 0;
  margin-top: 0;
  position: relative;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  padding: 8px 16px;
  position: relative;
  font-weight: 500;
}

.nav-link::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 2px;
  background: var(--border);
  margin-right: 8px;
  vertical-align: middle;
  transition: background 0.3s, width 0.3s;
}

.nav-link:hover::before, .nav-link.active::before {
  background: var(--accent);
  width: 24px;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

/* ── Hero区域 ── */
.blog-hero {
  text-align: left;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 72px;
  font-weight: 800;
  color: var(--fg);
  letter-spacing: -2px;
  margin-bottom: 20px;
  line-height: 1.05;
}

.hero-description {
  color: var(--muted);
  font-size: 18px;
  letter-spacing: 0.5px;
  max-width: 500px;
  font-weight: 300;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 瀑布流/砖石网格 ── */
.card-grid {
  columns: 2;
  column-gap: 24px;
  padding: 40px 0;
}

.card {
  break-inside: avoid;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.5s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  margin-bottom: 24px;
  perspective: 1000px;
  animation: showcaseFadeIn 0.8s ease-out both;
}

/* 卡片顶部图片区域 - 不同高度模拟不同尺寸 */
.card::before {
  content: '';
  display: block;
  min-height: 200px;
  background: linear-gradient(135deg, ${cardImgBg1}, ${cardImgBg2});
  transition: transform 0.5s ease, opacity 0.3s;
}

.card:nth-child(3n+1)::before {
  min-height: 280px;
  background: linear-gradient(135deg, ${cardImgBg1}, ${cardImgBg2});
}

.card:nth-child(3n+2)::before {
  min-height: 180px;
  background: linear-gradient(135deg, ${cardImgBg3}, ${cardImgBg4});
}

.card:nth-child(3n)::before {
  min-height: 240px;
  background: linear-gradient(135deg, ${cardImgBg5}, ${cardImgBg1});
}

/* 悬停遮罩层 */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: ${overlayBg};
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 1;
}

.card:hover::after {
  opacity: 1;
}

.card:hover::before {
  transform: scale(1.08);
}

/* 卡片悬停3D效果 */
.card:hover {
  transform: perspective(1000px) translateY(-8px);
  box-shadow: ${shadowHover};
  border-color: var(--accent);
}

/* 卡片文字区域 */
.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  padding: 20px 24px 4px;
  color: var(--fg);
  position: relative;
  z-index: 2;
  transition: color 0.3s;
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 0 24px;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.1s, transform 0.3s 0.1s;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  padding: 0 24px;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.15s, transform 0.3s 0.15s;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 12px 24px 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.2s, transform 0.3s 0.2s;
}

/* 悬停显示信息 */
.card:hover .card-date,
.card:hover .card-excerpt,
.card:hover .card-tags {
  opacity: 1;
  transform: translateY(0);
}

/* 项目编号装饰 */
.card-title::before {
  content: counter(showcase-item) ' / ';
  color: var(--accent);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
  margin-right: 8px;
}

.card-grid {
  counter-reset: showcase-item;
}

.card {
  counter-increment: showcase-item;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── 归档 ── */
.blog-archive {
  padding: 60px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: -1px;
  color: var(--fg);
}

.archive-year {
  margin-bottom: 40px;
  padding-left: 32px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  color: var(--accent);
  margin-bottom: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.archive-item {
  padding: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.archive-item:hover {
  padding-left: 12px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 16px;
  font-weight: 500;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 60px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: -1px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#111827' : '#ffffff'};
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.2)'};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.tag-post-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.tag-post-item:hover {
  padding-left: 12px;
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
  margin-left: 16px;
  font-weight: 400;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: left;
  padding: 40px 0;
  border-top: 1px solid var(--border);
  margin-top: 60px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ── 文章详情：全屏图片头图 + 窄栏内容 ── */
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: -1px;
  color: ${isDark ? '#f9fafb' : '#ffffff'};
  padding: 120px 60px 40px;
  background: linear-gradient(135deg, ${heroGradient1}, ${heroGradient2});
  max-width: none;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  line-height: 1.1;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 40px;
  padding-top: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 24px;
  letter-spacing: 0.5px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.4em;
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 2em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.post-content h2 {
  font-size: 1.6em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.post-content pre {
  background: var(--card-bg);
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 3px solid var(--accent);
  padding: 16px 24px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: var(--accent-light);
  border-radius: 0 8px 8px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
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
  padding: 16px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 2px solid var(--border);
  padding-left: 16px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
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
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
  font-weight: 500;
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画 ── */
@keyframes showcaseFadeIn {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }
.card:nth-child(5) { animation-delay: 0.4s; }
.card:nth-child(6) { animation-delay: 0.5s; }

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 40px; letter-spacing: -1px; }
  .card-grid { columns: 1; }
  .blog-header { padding: 16px 0; }
  .blog-nav { gap: 0; }
  .nav-link { padding: 6px 10px; font-size: 12px; }
  .nav-link::before { width: 12px; }
  .post-title {
    font-size: 32px;
    padding: 80px 24px 32px;
    margin-left: -20px;
    margin-right: -20px;
  }
  .archive-title, .tags-title { font-size: 36px; }
}
`
}

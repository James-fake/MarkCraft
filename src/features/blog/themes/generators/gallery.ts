/**
 * getGalleryCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Gallery — 「白墙展览」──────────────────────────────────
export function getGalleryCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#ffffff'
  const fg = isDark ? '#e5e5e5' : '#171717'
  const muted = isDark ? '#737373' : '#a3a3a3'
  const accent = isDark ? '#a3a3a3' : '#525252'
  const accentLight = isDark ? 'rgba(163,163,163,0.06)' : 'rgba(23,23,23,0.04)'
  const cardBg = isDark ? '#1a1a1a' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e5e5e5'
  const navBg = isDark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)'
  const labelBorder = isDark ? '#404040' : '#d4d4d4'
  const frameBorder = isDark ? '#3a3a3a' : '#c0c0c0'
  const frameShadow = isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)'

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
  line-height: 2.2;
  min-height: 100vh;
  font-weight: 300;
  font-size: 14px;
  padding-bottom: 56px;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ── 底部固定细线导航 ── */
.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  padding-bottom: 0;
  font-weight: 300;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 1px;
  background: ${fg};
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 120px 0 80px;
}

.hero-title {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 36px;
  font-weight: 300;
  color: var(--fg);
  letter-spacing: 8px;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.hero-description {
  color: ${muted};
  font-size: 13px;
  letter-spacing: 2px;
  font-weight: 300;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 展品编号计数器 ── */
.card-grid {
  counter-reset: gallery-item;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

/* ── 无边框无背景卡片 ── */
.card {
  background: none;
  border-radius: 0;
  padding: 40px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid ${border};
  transition: none;
  text-decoration: none;
  color: inherit;
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 0;
  align-items: baseline;
  animation: galleryFadeIn 0.8s ease-out both;
  counter-increment: gallery-item;
}

.card:hover {
  border-color: ${border};
  box-shadow: none;
  transform: none;
}

/* 展品编号 No.01, No.02 ... */
.card::before {
  content: 'No.' counter(gallery-item, decimal-leading-zero);
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 1px;
  color: ${muted};
  padding-top: 4px;
  align-self: start;
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 18px;
  font-weight: 400;
  margin-bottom: 4px;
  color: var(--fg);
  letter-spacing: 1px;
  transition: text-decoration-color 0.3s;
  text-decoration: underline transparent;
  text-underline-offset: 4px;
}

.card:hover .card-title {
  text-decoration-color: ${fg};
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

.card-excerpt {
  color: ${muted};
  font-size: 13px;
  line-height: 2.0;
  font-weight: 300;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 0;
  background: none;
  color: ${muted};
  border: none;
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

/* ── 归档 ── */
.blog-archive {
  padding: 80px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${muted};
  font-weight: 300;
}

.archive-year {
  margin-bottom: 40px;
  padding-left: 24px;
  border-left: 1px solid ${border};
}

.archive-year-title {
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: ${fg};
  margin-bottom: 16px;
  letter-spacing: 2px;
  font-weight: 400;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
  font-weight: 300;
}

.archive-item a:hover {
  color: ${fg};
  text-decoration: underline;
  text-underline-offset: 3px;
}

.archive-item-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

/* ── 标签 ── */
.blog-tags {
  padding: 80px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${muted};
  font-weight: 300;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: flex-start;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 0;
  background: none;
  color: ${muted};
  border: none;
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.3s;
  text-decoration: none;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

.tag-cloud-item:hover {
  color: ${fg};
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: ${fg};
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${border};
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 300;
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: none;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 300;
}

.tag-post-item a:hover {
  color: ${fg};
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 16px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid ${border};
  margin-top: 80px;
  color: ${muted};
  font-size: 11px;
  letter-spacing: 3px;
  font-weight: 300;
  text-transform: uppercase;
}

/* ── 文章详情：展品名牌 ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 80px 0;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
  font-weight: 400;
  line-height: 1.6;
  border: 1px solid ${labelBorder};
  padding: 24px 40px;
  display: inline-block;
}

.post-detail > .post-title,
.post-detail .post-title {
  display: block;
  text-align: center;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 56px;
  letter-spacing: 2px;
  font-weight: 300;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 48px;
  align-items: start;
}

.post-content p {
  margin-bottom: 2em;
  line-height: 2.2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 2.5em 0 1.2em;
  color: var(--fg);
  font-weight: 400;
  letter-spacing: 1px;
}

.post-content pre {
  background: ${isDark ? '#222222' : '#f8f8f8'};
  padding: 20px 24px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 2em 0;
  font-size: 13px;
  line-height: 1.8;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 1px solid ${border};
  padding-left: 24px;
  color: ${muted};
  margin: 2em 0;
  font-style: italic;
  font-weight: 300;
}

/* 图片画框效果 */
.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${frameBorder};
  box-shadow: ${frameShadow};
  padding: 8px;
  background: ${isDark ? '#222' : '#fafafa'};
}

.post-content a {
  color: var(--fg);
  text-decoration: none;
  border-bottom: 1px solid ${border};
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: ${fg};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 2.0;
  border-left: 1px solid ${border};
  padding-left: 16px;
}

.post-toc::-webkit-scrollbar { width: 1px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; }

.toc-title {
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 2.0;
  text-decoration: none;
  font-weight: 300;
}

.toc-nav a.toc-h1 { font-weight: 400; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${fg}; }

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 40px;
  font-weight: 300;
}

.back-link:hover {
  color: ${fg};
}

/* ── 极简淡入动画 ── */
@keyframes galleryFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card:nth-child(2) { animation-delay: 0.15s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.45s; }
.card:nth-child(5) { animation-delay: 0.6s; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 24px; }
  body { padding-bottom: 48px; font-size: 13px; }
  .hero-title { font-size: 24px; letter-spacing: 4px; }
  .blog-hero { padding: 80px 0 48px; }
  .card { padding: 24px 0; grid-template-columns: 60px 1fr; }
  .card::before { font-size: 10px; }
  .card-title { font-size: 16px; }
  .blog-nav { gap: 24px; }
  .nav-link { font-size: 10px; letter-spacing: 2px; }
  .post-detail { padding: 48px 0; }
  .post-title { font-size: 22px; padding: 16px 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

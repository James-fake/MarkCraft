/**
 * getMosaicCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Mosaic — 「色块拼图」──────────────────────────────────
export function getMosaicCss(isDark: boolean): string {
  const bg = isDark ? '#0f0520' : '#faf5ff'
  const fg = isDark ? '#f0d0ff' : '#1a0533'
  const muted = isDark ? '#a070c0' : '#7c3aed'
  const accent = isDark ? '#ec4899' : '#8b5cf6'
  const accentLight = isDark ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.08)'
  const cardBg = isDark ? '#1a0a30' : '#ffffff'
  const border = isDark ? '#3d1a60' : '#e9d5ff'
  const mondrianRed = isDark ? '#dc2626' : '#ef4444'
  const mondrianYellow = isDark ? '#ca8a04' : '#eab308'
  const mondrianBlue = isDark ? '#2563eb' : '#3b82f6'
  const mondrianBlack = isDark ? '#000000' : '#000000'
  const mondrianWhite = isDark ? '#1a0a30' : '#ffffff'
  const navBlockBg1 = isDark ? '#7c3aed' : '#8b5cf6'
  const navBlockBg2 = isDark ? '#ec4899' : '#ec4899'
  const navBlockBg3 = isDark ? '#2563eb' : '#6366f1'
  const navBlockFg = '#ffffff'
  const quoteBg = isDark ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.08)'

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
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  border: 4px solid ${mondrianBlack};
  min-height: 100vh;
}

/* ── 头部：色块导航 ── */
.blog-header {
  padding: 0;
  text-align: left;
  border-bottom: 4px solid ${mondrianBlack};
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: ${mondrianWhite};
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 16px 24px;
  background: ${mondrianBlack};
  display: flex;
  align-items: center;
}

/* 色块导航 */
.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 0;
  margin-top: 0;
  flex: 1;
}

.nav-link {
  color: ${navBlockFg};
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
  padding: 16px 24px;
  position: relative;
  font-weight: 700;
  display: flex;
  align-items: center;
  border-right: 4px solid ${mondrianBlack};
  border-radius: 0;
}

.nav-link:nth-child(1) {
  background: ${navBlockBg1};
}

.nav-link:nth-child(2) {
  background: ${navBlockBg2};
}

.nav-link:nth-child(3) {
  background: ${navBlockBg3};
}

.nav-link:nth-child(n+4) {
  background: ${navBlockBg1};
}

.nav-link:hover, .nav-link.active {
  filter: brightness(1.2);
  transform: none;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero区域 ── */
.blog-hero {
  text-align: left;
  padding: 0;
  position: relative;
  border-bottom: 4px solid ${mondrianBlack};
  display: grid;
  grid-template-columns: 2fr 1fr;
  min-height: 200px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 56px;
  font-weight: 900;
  color: ${mondrianWhite};
  letter-spacing: -1px;
  margin-bottom: 0;
  line-height: 1;
  padding: 48px 40px;
  background: ${mondrianRed};
  border-right: 4px solid ${mondrianBlack};
  display: flex;
  align-items: flex-end;
}

.hero-description {
  color: ${mondrianWhite};
  font-size: 16px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 40px;
  background: ${mondrianYellow};
  display: flex;
  align-items: center;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── CSS Grid不规则网格 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding: 0;
}

/* 不同尺寸色块卡片 */
.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px;
  position: relative;
  border: 4px solid ${mondrianBlack};
  border-top: none;
  border-left: none;
  transition: filter 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 200px;
  overflow: hidden;
  perspective: 800px;
  animation: mosaicFadeIn 0.6s ease-out both;
}

/* 第1张卡片：2列宽 */
.card:nth-child(1) {
  grid-column: span 2;
  background: ${mondrianBlue};
  color: ${mondrianWhite};
  min-height: 280px;
}

/* 第2张卡片：1列 */
.card:nth-child(2) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
}

/* 第3张卡片：1列 */
.card:nth-child(3) {
  background: ${mondrianRed};
  color: ${mondrianWhite};
}

/* 第4张卡片：1列 */
.card:nth-child(4) {
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

/* 第5张卡片：2列宽 */
.card:nth-child(5) {
  grid-column: span 2;
  background: ${mondrianBlack};
  color: ${mondrianWhite};
  min-height: 240px;
}

/* 第6张及以后：交替色块 */
.card:nth-child(6n+6) {
  background: ${mondrianBlue};
  color: ${mondrianWhite};
}

.card:nth-child(6n+7) {
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

.card:nth-child(6n+8) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
  grid-column: span 2;
}

/* 色块悬停加深 */
.card:hover {
  filter: brightness(0.85);
  z-index: 2;
}

/* 色块翻转效果 */
.card:active {
  transform: perspective(800px) rotateY(8deg);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 8px;
  color: inherit;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.card-date {
  color: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  opacity: 0.8;
}

.card-excerpt {
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(0,0,0,0.2);
  color: inherit;
  border: 2px solid ${mondrianBlack};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px;
  border-top: 4px solid ${mondrianBlack};
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: -1px;
  color: var(--fg);
  background: ${mondrianYellow};
  color: ${mondrianBlack};
  padding: 16px 24px;
  display: inline-block;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 0;
  border-left: 4px solid ${mondrianBlack};
  padding-left: 24px;
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  color: ${accent};
  margin-bottom: 16px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 2px solid ${mondrianBlack};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 15px;
  font-weight: 700;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px;
  border-top: 4px solid ${mondrianBlack};
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: -1px;
  color: var(--fg);
  background: ${mondrianRed};
  color: ${mondrianWhite};
  padding: 16px 24px;
  display: inline-block;
}

.tag-cloud {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 12px 16px;
  background: ${mondrianWhite};
  color: ${mondrianBlack};
  border: 4px solid ${mondrianBlack};
  border-radius: 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
  text-decoration: none;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
}

.tag-cloud-item:nth-child(3n+1) {
  background: ${mondrianBlue};
  color: ${mondrianWhite};
}

.tag-cloud-item:nth-child(3n+2) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
}

.tag-cloud-item:nth-child(3n) {
  background: ${mondrianRed};
  color: ${mondrianWhite};
}

.tag-cloud-item:hover {
  filter: brightness(0.8);
  transform: scale(1.02);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 4px solid ${mondrianBlack};
  font-weight: 900;
  letter-spacing: -0.5px;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 2px solid ${mondrianBlack};
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-weight: 700;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 16px;
  font-weight: 700;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 24px;
  border-top: 4px solid ${mondrianBlack};
  margin-top: 0;
  color: ${mondrianWhite};
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  background: ${mondrianBlack};
}

/* ── 文章详情：标题在色块中 ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 0;
  letter-spacing: -1px;
  color: ${mondrianWhite};
  padding: 60px 48px;
  background: ${mondrianRed};
  line-height: 1.1;
}

.post-meta {
  text-align: left;
  color: ${mondrianBlack};
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 0;
  padding: 16px 48px;
  background: ${mondrianYellow};
  letter-spacing: 0.5px;
  border-bottom: 4px solid ${mondrianBlack};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 0;
  align-items: start;
}

.post-content {
  padding: 40px 48px;
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

.post-content p {
  margin-bottom: 1.4em;
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: ${mondrianBlack};
  font-weight: 900;
  letter-spacing: -0.5px;
}

.post-content h2 {
  font-size: 1.5em;
  padding: 8px 16px;
  background: ${mondrianYellow};
  display: inline-block;
}

.post-content pre {
  background: ${mondrianBlack};
  color: #e0e0e0;
  padding: 20px;
  border: 4px solid ${mondrianBlack};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

/* 引用块用彩色背景 */
.post-content blockquote {
  border-left: none;
  padding: 20px 24px;
  color: ${mondrianBlack};
  margin: 1.5em 0;
  font-style: normal;
  font-weight: 500;
  background: ${quoteBg};
  border-left: 4px solid ${accent};
  border-radius: 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 4px solid ${mondrianBlack};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 2px solid ${accent};
  font-weight: 700;
}

.post-content a:hover {
  background: ${accent};
  color: ${mondrianWhite};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
  font-size: 0.85em;
  line-height: 1.6;
  background: ${mondrianBlack};
  color: #e0e0e0;
  border-left: 4px solid ${mondrianRed};
  min-height: 100%;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}; border-radius: 0; }

.toc-title {
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${mondrianYellow};
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
  font-size: 0.88em;
  color: #a0a0a0;
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; color: #e0e0e0; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: ${mondrianWhite};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: filter 0.2s;
  display: inline-block;
  margin-bottom: 0;
  font-weight: 700;
  background: ${mondrianBlue};
  padding: 12px 24px;
}

.back-link:hover {
  filter: brightness(1.2);
}

/* ── 入场动画 ── */
@keyframes mosaicFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
.card:nth-child(5) { animation-delay: 0.32s; }
.card:nth-child(6) { animation-delay: 0.4s; }

/* ── 滚动导航按钮避开底部导航栏 ── */
.scroll-nav {
  bottom: 80px !important;
  z-index: 101 !important;
}

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { border-width: 2px; }
  .scroll-nav { bottom: 60px !important; z-index: 101 !important; }
  .blog-header { flex-direction: column; }
  .blog-header-site { padding: 12px 20px; }
  .blog-nav { flex-wrap: wrap; }
  .nav-link {
    padding: 10px 16px;
    font-size: 12px;
    border-right: 2px solid ${mondrianBlack};
    border-bottom: 2px solid ${mondrianBlack};
  }
  .blog-hero {
    grid-template-columns: 1fr;
  }
  .hero-title {
    font-size: 36px;
    padding: 32px 20px;
    border-right: none;
    border-bottom: 2px solid ${mondrianBlack};
  }
  .hero-description {
    padding: 20px;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card:nth-child(1),
  .card:nth-child(5),
  .card:nth-child(6n+8) {
    grid-column: span 1;
  }
  .card { min-height: 160px; border-width: 2px; }
  .post-title {
    font-size: 28px;
    padding: 40px 20px;
  }
  .post-meta {
    padding: 12px 20px;
  }
  .post-content {
    padding: 24px 20px;
  }
  .archive-title, .tags-title { font-size: 28px; }
  .blog-archive, .blog-tags { padding: 24px 20px; }
}
`
}

/**
 * getCinematicCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Cinematic — 「银幕叙事」──────────────────────────────────
export function getCinematicCss(_isDark: boolean): string {
  // 电影主题始终暗色
  const bg = '#0a0a0a'
  const fg = '#d4a843'
  const muted = '#6b7280'
  const accent = '#d4a843'
  const accentLight = 'rgba(212,168,67,0.1)'
  const cardBg = '#111111'
  const border = '#1f1f1f'
  const navBg = 'rgba(0,0,0,0.85)'
  const subtitleBg = 'rgba(0,0,0,0.75)'
  const filmHole = '#1a1a1a'
  const filmHoleBorder = '#2a2a2a'

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
  font-family: 'Inter', sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  letter-spacing: 0.03em;
  padding-bottom: 56px;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
}

/* ── 银幕上下黑边装饰 ── */
.blog-container::before,
.blog-container::after {
  content: '';
  display: block;
  height: 40px;
  background: #000;
  position: relative;
}

.blog-container::before {
  margin-bottom: 0;
  border-bottom: 1px solid ${border};
}

.blog-container::after {
  margin-top: 0;
  border-top: 1px solid ${border};
}

/* ── 底部字幕式导航 ── */
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
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  padding: 12px 24px;
}

.nav-link {
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s, background 0.3s;
  position: relative;
  padding: 6px 16px;
  font-weight: 400;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
  background: ${subtitleBg};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 42px;
  font-weight: 400;
  color: ${accent};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.hero-description {
  color: ${muted};
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 宽屏横向卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 0;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  animation: cinematicZoomIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* 播放按钮装饰 */
.card::before {
  content: '\\25B6';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  color: rgba(212,168,67,0.3);
  z-index: 2;
  transition: color 0.3s, transform 0.3s;
  pointer-events: none;
}

.card:hover::before {
  color: rgba(212,168,67,0.6);
  transform: translate(-50%, -50%) scale(1.2);
}

/* 胶片孔边框 - 左侧 */
.card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 28px;
  background: repeating-linear-gradient(
    to bottom,
    ${filmHole} 0px,
    ${filmHole} 8px,
    transparent 8px,
    transparent 16px
  );
  border-right: 1px solid ${filmHoleBorder};
  z-index: 1;
  opacity: 0.6;
}

.card:hover {
  box-shadow: 0 8px 32px rgba(212,168,67,0.1);
  transform: scale(1);
}

/* 宽屏图片区域 */
.card > .card-title {
  margin-top: 0;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 4px;
  color: ${accent};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 16px 20px 0 40px;
}

.card-date {
  color: ${muted};
  font-size: 11px;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
  padding: 0 20px 0 40px;
  text-transform: uppercase;
}

.card-excerpt {
  color: rgba(255,255,255,0.45);
  font-size: 13px;
  line-height: 1.6;
  padding: 0 20px 16px 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0 20px 16px 40px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(212,168,67,0.08);
  color: ${accent};
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* ── 归档 ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  position: relative;
}

.archive-title::before,
.archive-title::after {
  content: '\\2014';
  margin: 0 12px;
  color: ${muted};
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid rgba(212,168,67,0.3);
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: ${accent};
  margin-bottom: 16px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 400;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
  letter-spacing: 0.05em;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── 标签 ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  position: relative;
}

.tags-title::before,
.tags-title::after {
  content: '\\2014';
  margin: 0 12px;
  color: ${muted};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: rgba(212,168,67,0.06);
  color: ${accent};
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 400;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: color 0.3s;
  letter-spacing: 0.05em;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  margin-left: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid ${border};
  margin-top: 48px;
  color: ${muted};
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* ── 文章详情：电影标题卡 ── */
.post-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 0;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  line-height: 1.3;
  padding: 48px 24px;
  position: relative;
  background: ${cardBg};
  border: 1px solid ${border};
}

/* 电影标题卡装饰线 */
.post-title::before,
.post-title::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  height: 1px;
  background: linear-gradient(90deg, transparent, ${accent}, transparent);
}

.post-title::before {
  top: 16px;
  width: 80px;
}

.post-title::after {
  bottom: 16px;
  width: 80px;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 11px;
  margin-bottom: 40px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 12px 0;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
  padding: 0 24px;
}

/* 剧本格式正文 */
.post-content p {
  margin-bottom: 1.6em;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 2em 0 1em;
  color: ${accent};
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-content h2 {
  font-size: 1.3em;
  border-bottom: 1px solid ${border};
  padding-bottom: 8px;
}

.post-content pre {
  background: #0d0d0d;
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 2px solid rgba(212,168,67,0.3);
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: normal;
  background: rgba(212,168,67,0.03);
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid rgba(212,168,67,0.3);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.8;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; }

.toc-title {
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
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
  letter-spacing: 0.05em;
}

.toc-nav a.toc-h1 { font-weight: 400; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── 镜头推进动画 ── */
@keyframes cinematicZoomIn {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

.card:nth-child(2) { animation-delay: 0.15s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.45s; }
.card:nth-child(5) { animation-delay: 0.6s; }

/* ── 滚动导航按钮避开底部导航栏 ── */
.scroll-nav {
  bottom: 76px !important;
  z-index: 101 !important;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .scroll-nav { bottom: 60px !important; z-index: 101 !important; }
  body { padding-bottom: 48px; }
  .blog-container::before,
  .blog-container::after { height: 24px; }
  .hero-title { font-size: 26px; letter-spacing: 0.12em; }
  .blog-hero { padding: 48px 0 32px; }
  .card-title { font-size: 12px; padding-left: 36px; }
  .card-date { padding-left: 36px; }
  .card-excerpt { padding-left: 36px; }
  .card-tags { padding-left: 36px; }
  .card::after { width: 20px; }
  .blog-nav { gap: 4px; padding: 10px 12px; }
  .nav-link { padding: 6px 10px; font-size: 10px; }
  .post-title { font-size: 24px; padding: 32px 16px; letter-spacing: 0.12em; }
  .post-body-layout { grid-template-columns: 1fr; padding: 0 16px; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getSunsetCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Sunset — 「光影长廊」─────────────────────────────────────
export function getSunsetCss(isDark: boolean): string {
  const bg = isDark ? '#1a0a05' : '#fff7ed'
  const fg = isDark ? '#fde68a' : '#7c2d12'
  const muted = isDark ? '#b87333' : '#9a6b3d'
  const accent = isDark ? '#f48c06' : '#dc2f02'
  const accentLight = isDark ? 'rgba(244,140,6,0.12)' : 'rgba(220,47,2,0.08)'
  const cardBg = isDark ? '#2a1208' : '#ffffff'
  const border = isDark ? '#4a2010' : '#fed7aa'
  const sidebarBg = isDark ? 'rgba(26,10,5,0.95)' : 'rgba(255,247,237,0.95)'
  const glowColor = isDark ? 'rgba(244,140,6,0.3)' : 'rgba(220,47,2,0.2)'
  const gradientStart = isDark ? '#1a0a05' : '#fff7ed'
  const gradientMid = isDark ? '#2a1208' : '#ffedd5'
  const gradientEnd = isDark ? '#1a0520' : '#fde68a'

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
  font-family: 'Georgia', 'Noto Serif SC', serif;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientMid}, ${gradientEnd}, ${gradientMid}, ${gradientStart});
  background-size: 400% 400%;
  animation: sunsetGradientShift 20s ease infinite;
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

@keyframes sunsetGradientShift {
  0% { background-position: 0% 50%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 50%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 50%; }
}

/* ── 非对称布局：侧边栏 + 内容 ── */
.blog-container {
  display: flex;
  min-height: 100vh;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* ── 左侧固定侧边栏 ── */
.blog-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 200px;
  height: 100vh;
  background: ${sidebarBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--border);
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  overflow-y: auto;
}

.blog-header-site {
  font-family: 'Georgia', serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--fg);
  margin-bottom: 32px;
  writing-mode: horizontal-tb;
}

/* ── 竖排导航 ── */
.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0;
  width: 100%;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 10px 16px;
  border-radius: 8px;
  position: relative;
  text-align: left;
  display: block;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
  background: ${accentLight};
  box-shadow: 0 0 16px ${glowColor};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 2px;
}

/* 侧边栏底部太阳图标装饰 */
.blog-header::after {
  content: '☀';
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 28px;
  opacity: 0.3;
  color: var(--accent);
}

/* ── 右侧内容区 ── */
.blog-hero,
.blog-home,
.blog-archive,
.blog-tags,
.blog-about,
.blog-links,
.blog-series,
.blog-footer,
.post-detail,
.not-found-page {
  margin-left: 200px;
}

.blog-hero {
  text-align: left;
  padding: 80px 48px 40px;
  position: relative;
}

.hero-title {
  font-family: 'Georgia', serif;
  font-size: 52px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  color: var(--muted);
  font-size: 18px;
  line-height: 1.6;
  max-width: 600px;
  font-family: 'Inter', sans-serif;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 封面式卡片网格 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 28px;
  padding: 0 48px 40px;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 320px;
}

/* 卡片顶部渐变模拟封面图（占2/3） */
.card::before {
  content: '';
  display: block;
  min-height: 200px;
  background: linear-gradient(135deg,
    ${isDark ? '#4a2010' : '#fed7aa'},
    ${isDark ? '#7c2d12' : '#fdba74'},
    ${isDark ? '#9a3412' : '#fb923c'},
    ${isDark ? '#7c2d12' : '#f97316'});
  background-size: 200% 200%;
  animation: sunsetCardGlow 6s ease infinite;
  flex-shrink: 0;
}

@keyframes sunsetCardGlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* 卡片右上角光晕效果 */
.card::after {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, ${glowColor}, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px ${isDark ? 'rgba(244,140,6,0.15)' : 'rgba(220,47,2,0.1)'};
}

.card-title {
  font-family: 'Georgia', serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  padding: 16px 20px 4px;
  color: var(--fg);
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 0 20px;
  margin-bottom: 4px;
  font-family: 'Inter', sans-serif;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  padding: 0 20px;
  flex: 1;
  font-family: 'Inter', sans-serif;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 8px 20px 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  font-family: 'Inter', sans-serif;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 48px;
}

.archive-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid var(--accent);
}

.archive-year-title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
}

.archive-item {
  padding: 8px 0;
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
  font-family: 'Inter', sans-serif;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 48px;
}

.tags-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#1a0a05' : '#ffffff'};
  box-shadow: 0 0 20px ${glowColor};
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Georgia', serif;
  font-size: 22px;
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
  font-family: 'Inter', sans-serif;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 48px;
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  border-top: 1px solid var(--border);
  font-family: 'Inter', sans-serif;
}

/* ── 文章详情：全宽头图+渐变遮罩+标题叠加 ── */
.post-detail {
  margin-left: 200px;
  padding: 0;
  max-width: none;
}

.post-detail > .back-link {
  display: inline-block;
  margin: 24px 48px 0;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
  font-family: 'Inter', sans-serif;
}

.post-detail > .back-link:hover {
  color: var(--accent);
}

.post-detail > .breadcrumb {
  margin: 12px 48px 0;
}

/* 全宽头图区域 */
.post-title {
  font-family: 'Georgia', serif;
  font-size: 42px;
  font-weight: 700;
  text-align: left;
  margin: 0;
  letter-spacing: -0.5px;
  color: ${isDark ? '#1a0a05' : '#ffffff'};
  position: relative;
  padding: 80px 48px 40px;
  background: linear-gradient(135deg,
    ${isDark ? '#7c2d12' : '#f97316'},
    ${isDark ? '#9a3412' : '#ea580c'},
    ${isDark ? '#4a2010' : '#dc2f02'});
  background-size: 200% 200%;
  animation: sunsetCardGlow 8s ease infinite;
}

/* 渐变遮罩 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, ${bg});
  pointer-events: none;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  padding: 16px 48px 32px;
  font-family: 'Inter', sans-serif;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
  padding: 0 48px;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.6em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 4px solid var(--accent);
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
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
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
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
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画 ── */
@keyframes sunsetFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: sunsetFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── 移动端响应式：侧边栏隐藏，顶部汉堡菜单 ── */
@media (max-width: 768px) {
  .blog-container {
    flex-direction: column;
  }

  .blog-header {
    position: relative;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 16px 20px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .blog-header::after {
    display: none;
  }

  .blog-header-site {
    margin-bottom: 0;
    font-size: 14px;
  }

  .blog-nav {
    flex-direction: row;
    gap: 4px;
    width: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 13px;
    text-align: center;
  }

  .nav-link.active::after {
    display: none;
  }

  .blog-hero,
  .blog-home,
  .blog-archive,
  .blog-tags,
  .blog-about,
  .blog-links,
  .blog-series,
  .blog-footer,
  .post-detail {
    margin-left: 0;
  }

  .blog-hero {
    padding: 40px 20px 24px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-description {
    font-size: 15px;
  }

  .card-grid {
    grid-template-columns: 1fr;
    padding: 0 20px 24px;
    gap: 20px;
  }

  .card {
    min-height: 260px;
  }

  .card::before {
    min-height: 140px;
  }

  .blog-archive,
  .blog-tags {
    padding: 24px 20px;
  }

  .blog-footer {
    padding: 24px 20px;
  }

  .post-title {
    font-size: 28px;
    padding: 48px 20px 32px;
  }

  .post-meta {
    padding: 12px 20px 24px;
  }

  .post-body-layout {
    grid-template-columns: 1fr;
    padding: 0 20px;
  }

  .post-toc {
    display: none;
  }

  .post-detail > .back-link {
    margin: 16px 20px 0;
  }

  .post-detail > .breadcrumb {
    margin: 8px 20px 0;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .post-body-layout {
    grid-template-columns: 1fr;
  }
  .post-toc {
    display: none;
  }
}
`
}

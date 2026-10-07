/**
 * getBlueprintCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Blueprint — 「工程制图」────────────────────────────────
export function getBlueprintCss(isDark: boolean): string {
  const bg = isDark ? '#0a1628' : '#f0f7ff'
  const fg = isDark ? '#b0c8e8' : '#1e3a5f'
  const muted = isDark ? '#5080a8' : '#5a7a9a'
  const accent = isDark ? '#60a5fa' : '#2563eb'
  const accentLight = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.08)'
  const cardBg = isDark ? '#0f1f35' : '#ffffff'
  const border = isDark ? '#1e3a5f' : '#bfdbfe'
  const gridLine = isDark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.06)'
  const gridLineStrong = isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)'
  const dimColor = isDark ? 'rgba(176,200,232,0.35)' : 'rgba(30,58,95,0.3)'

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
  font-family: 'JetBrains Mono', 'Share Tech Mono', 'Consolas', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(0deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(90deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(0deg, ${gridLineStrong} 0px, ${gridLineStrong} 1px, transparent 1px, transparent 200px),
    repeating-linear-gradient(90deg, ${gridLineStrong} 0px, ${gridLineStrong} 1px, transparent 1px, transparent 200px);
  background-size: 40px 40px, 40px 40px, 200px 200px, 200px 200px;
}

.blog-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 32px;
  position: relative;
}

/* ── 刻度尺导航 ── */
.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: '';
  display: block;
  height: 24px;
  background: repeating-linear-gradient(
    90deg,
    ${accent} 0px, ${accent} 1px,
    transparent 1px, transparent 10px,
    ${dimColor} 10px, ${dimColor} 11px,
    transparent 11px, transparent 20px
  );
  margin-bottom: 4px;
  opacity: 0.5;
}

.blog-header-site {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 16px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 12px;
  position: relative;
  display: inline-block;
}

.blog-header-site::before {
  content: '[ ';
  color: var(--accent);
}

.blog-header-site::after {
  content: ' ]';
  color: var(--accent);
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  padding: 12px 0;
  border-bottom: 2px dashed ${border};
  position: relative;
}

/* 导航下方刻度线 */
.blog-nav::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: repeating-linear-gradient(
    90deg,
    ${accent} 0px, ${accent} 2px,
    transparent 2px, transparent 8px
  );
  opacity: 0.4;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding: 6px 16px;
  text-transform: uppercase;
}

.nav-link::before {
  content: 'X:';
  color: ${dimColor};
  font-size: 10px;
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-link:hover::before {
  opacity: 1;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
  border: 1px dashed ${accent};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px solid ${accent};
}

/* ── Hero 区域 ── */
.blog-hero {
  text-align: center;
  padding: 64px 0 48px;
  position: relative;
}

/* 十字准线装饰 */
.blog-hero::before {
  content: '+';
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 28px;
  color: ${accent};
  opacity: 0.3;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}

.hero-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 36px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 3px;
  margin-bottom: 16px;
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

/* 标题下划线标注 */
.hero-title::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -8px;
  right: -8px;
  height: 0;
  border-top: 2px dashed ${accent};
}

.hero-description {
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 1px;
}

.hero-description::before {
  content: '// ';
  color: ${dimColor};
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 蓝图线框卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 24px 28px;
  position: relative;
  border: 2px dashed ${border};
  text-decoration: none;
  color: inherit;
  display: block;
  animation: borderDraw 0.8s ease-out both;
  background-image:
    repeating-linear-gradient(0deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(90deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 20px);
  background-size: 20px 20px;
}

/* 角落尺寸标注 */
.card::before {
  content: '280\\00D7180';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 9px;
  color: ${dimColor};
  background: ${bg};
  padding: 0 4px;
  letter-spacing: 0.5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-top: 1px solid ${accent};
  border-right: 1px solid ${accent};
  opacity: 0.3;
}

.card:hover {
  border-color: ${accent};
  box-shadow: 0 0 0 1px ${accentLight}, 0 0 20px ${accentLight};
}

.card:hover::before {
  opacity: 1;
}

@keyframes borderDraw {
  0% {
    border-color: transparent;
    clip-path: inset(0 100% 100% 0);
  }
  25% {
    border-color: ${border};
    clip-path: inset(0 0 100% 0);
  }
  50% {
    border-color: ${border};
    clip-path: inset(0 0 0 0);
  }
  100% {
    border-color: ${border};
    clip-path: inset(0 0 0 0);
  }
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }

.card-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 1px;
  position: relative;
  padding-left: 16px;
}

.card-title::before {
  content: '\\25B8';
  position: absolute;
  left: 0;
  color: ${accent};
  font-size: 12px;
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.card-date::before {
  content: 'REV: ';
  color: ${dimColor};
  font-size: 10px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: transparent;
  color: var(--accent);
  border: 1px dashed ${border};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-family: 'JetBrains Mono', monospace;
}

.tag::before {
  content: '\\25C6 ';
  font-size: 8px;
  color: ${dimColor};
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

.blog-archive .archive-title {
  display: block;
}

.archive-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: -4px;
  right: -4px;
  border-top: 2px dashed ${accent};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 2px dashed ${border};
  position: relative;
}

.archive-year::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 0;
  width: 8px;
  height: 8px;
  border: 1px solid ${accent};
  border-radius: 50%;
  background: ${bg};
}

.archive-year-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 14px;
  letter-spacing: 2px;
}

.archive-year-title::before {
  content: 'SHT: ';
  color: ${dimColor};
  font-size: 11px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted ${border};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 14px;
}

.archive-item a:hover {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-style: dashed;
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

.blog-tags .tags-title {
  display: block;
}

.tags-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: -4px;
  right: -4px;
  border-top: 2px dashed ${accent};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 4px 14px;
  background: transparent;
  color: var(--muted);
  border: 1px dashed ${border};
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: ${accent};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px dashed ${border};
  letter-spacing: 1px;
}

.tag-posts-title::before {
  content: '\\25B8 ';
  color: ${dimColor};
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted ${border};
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 2px dashed ${border};
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.blog-footer::before {
  content: '// EOF';
  display: block;
  color: ${dimColor};
  margin-bottom: 8px;
  font-size: 10px;
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 32px;
}

.post-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 28px;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  padding-bottom: 12px;
}

/* 标题下划线标注 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 2px dashed ${accent};
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.post-meta::before {
  content: 'DWG: ';
  color: ${dimColor};
  font-size: 11px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  position: relative;
  padding-left: 32px;
}

/* 段落编号标记 */
.post-content p::before {
  content: '\\00A7';
  position: absolute;
  left: 0;
  color: ${dimColor};
  font-size: 13px;
  top: 2px;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
  position: relative;
  padding-bottom: 6px;
}

.post-content h1::after, .post-content h2::after, .post-content h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  border-top: 2px dashed ${accent};
}

.post-content pre {
  background: ${cardBg};
  padding: 16px;
  border: 1px dashed ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'CODE';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 9px;
  color: ${dimColor};
  background: ${bg};
  padding: 0 4px;
  letter-spacing: 1px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 2px dashed ${accent};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  position: relative;
}

.post-content blockquote::before {
  content: 'NOTE:';
  display: block;
  font-size: 10px;
  color: ${accent};
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px dashed ${border};
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed ${border};
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
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px dashed ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 0; }

.toc-title {
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-title::before {
  content: '\\25B8 ';
  color: ${accent};
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

.toc-nav a.toc-h1 { font-weight: 600; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  transition: color 0.2s;
  display: inline-block;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
}

.back-link::before {
  content: '\\25C0 ';
  color: ${accent};
}

.back-link:hover {
  color: var(--accent);
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 24px; letter-spacing: 2px; }
  .card { padding: 16px 20px; }
  .blog-nav { gap: 4px; }
  .nav-link { padding: 4px 10px; font-size: 12px; }
  .post-title { font-size: 22px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

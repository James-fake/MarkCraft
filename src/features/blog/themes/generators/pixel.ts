/**
 * getPixelCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Pixel — 「像素复古」──────────────────────────────────
export function getPixelCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#e8e8e8'
  const fg = isDark ? '#e0e0e0' : '#2a2a2a'
  const muted = isDark ? '#7a7a9a' : '#6a6a6a'
  const accent = '#6b8cff'
  const accentLight = isDark ? 'rgba(107,140,255,0.12)' : 'rgba(107,140,255,0.08)'
  const cardBg = isDark ? '#242440' : '#ffffff'
  const border = isDark ? '#3a3a5c' : '#c0c0c0'
  const red = '#ff6b6b'
  const green = '#6bff6b'
  const yellow = '#ffe66b'
  const shadowBase = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'

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
  font-family: 'Press Start 2P', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 2;
  min-height: 100vh;
  font-size: 12px;
}

.blog-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 24px 0 16px;
  text-align: center;
  border-bottom: 4px solid var(--border);
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
}

.blog-header-site {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  color: ${accent};
  letter-spacing: 0.1em;
  margin-bottom: 16px;
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  flex-wrap: wrap;
}

.nav-link {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--fg);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 3px solid var(--fg);
  text-transform: uppercase;
}

.nav-link:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  transform: scale(1.05);
}

.nav-link.active {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  box-shadow: 4px 4px 0 ${isDark ? '#0a0a1e' : '#a0a0a0'};
}

.blog-hero {
  text-align: center;
  padding: 60px 0 40px;
  position: relative;
}

.hero-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 20px;
  line-height: 1.6;
  font-weight: 400;
  color: var(--fg);
  margin-bottom: 20px;
  text-shadow: 3px 3px 0 ${accent}44;
  position: relative;
  display: inline-block;
  padding: 20px 28px;
  border: 4px solid var(--fg);
  background: var(--card-bg);
}

.hero-title::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 8px;
  height: 8px;
  background: ${red};
}

.hero-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: -8px;
  width: 8px;
  height: 8px;
  background: ${green};
}

.hero-description {
  color: var(--muted);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  line-height: 2;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 32px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px 20px;
  position: relative;
  border: 4px solid;
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.15s;
  box-shadow: 4px 4px 0 ${shadowBase};
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 ${shadowMid};
}

.card-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 400;
  margin-bottom: 12px;
  color: var(--fg);
}

.card-date {
  color: ${yellow};
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 10px;
  line-height: 2;
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
  padding: 4px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 2px solid ${accent};
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 0.05em;
  color: ${accent};
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 4px solid ${accent};
}

.archive-year-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: ${yellow};
  margin-bottom: 16px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 10px;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${red};
}

.archive-item-date {
  color: var(--muted);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 0.05em;
  color: ${green};
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 6px 14px;
  background: var(--card-bg);
  color: ${accent};
  border: 2px solid ${accent};
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: ${red};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px dashed var(--border);
  font-weight: 400;
  letter-spacing: 0.05em;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 10px;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${red};
}

.tag-post-date {
  color: var(--muted);
  font-size: 9px;
  margin-left: 12px;
  font-weight: 400;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 4px solid var(--border);
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  line-height: 1.8;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  color: var(--fg);
  position: relative;
  display: inline-block;
  width: 100%;
  text-shadow: 2px 2px 0 ${accent}44;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 9px;
  margin-bottom: 32px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  font-size: 11px;
  line-height: 2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Press Start 2P', monospace;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 400;
  letter-spacing: 0.05em;
}

.post-content h2::before {
  content: '\\25B6 ';
  color: ${accent};
  font-size: 0.7em;
}

.post-content pre {
  background: ${isDark ? '#0a0a1e' : '#d8d8d8'};
  padding: 16px 20px;
  border: 3px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 10px;
  line-height: 1.8;
  box-shadow: 4px 4px 0 ${shadowBase};
}

.post-content code {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.85em;
  color: ${red};
}

.post-content blockquote {
  border-left: 4px solid ${accent};
  padding: 12px 16px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 3px solid var(--border);
  box-shadow: 4px 4px 0 ${shadowBase};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 2px dashed ${accent}66;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 2;
  font-family: 'Press Start 2P', monospace;
}

.post-toc::-webkit-scrollbar { width: 4px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}44; }

.toc-title {
  font-weight: 400;
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
  padding: 4px 0 4px 12px;
  border-left: 2px solid var(--border);
  transition: all 0.15s;
  font-size: 0.85em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${accent};
  border-left-color: ${accent};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
  transition: color 0.15s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

@keyframes pixelFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: pixelFadeIn 0.4s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 14px; padding: 16px 20px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 16px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 8px; padding: 6px 8px; }
  .post-title { font-size: 12px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

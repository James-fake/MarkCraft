/**
 * getOrigamiCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Origami — 「纸艺几何」──────────────────────────────────────
export function getOrigamiCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#fefefe'
  const fg = isDark ? '#c0c0d0' : '#2d3748'
  const muted = isDark ? '#8090a0' : '#718096'
  const accent = isDark ? '#90b0e0' : '#4a7ab5'
  const accentLight = isDark ? 'rgba(144,176,224,0.1)' : 'rgba(74,122,181,0.08)'
  const cardBg = isDark ? '#252540' : '#ffffff'
  const border = isDark ? '#3a3a5c' : '#bfdbfe'
  const shadowBase = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)'
  const shadowFar = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'
  const foldLine = isDark ? 'rgba(144,176,224,0.1)' : 'rgba(74,122,181,0.08)'

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
  font-family: 'Nunito', 'Quicksand', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 48px 0 24px;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  font-family: 'Nunito', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.05em;
  margin-bottom: 24px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 20px 10px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

/* 折纸标签页折叠角效果 */
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(135deg, var(--border) 50%, transparent 50%);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 0);
}

.nav-link:hover {
  color: var(--accent);
  background: var(--accent-light);
  transform: translateY(-2px);
}

.nav-link.active {
  color: var(--accent);
  background: var(--card-bg);
  border-color: var(--accent);
  border-bottom-color: var(--card-bg);
  z-index: 1;
}

.nav-link.active::after {
  background: linear-gradient(135deg, var(--accent) 50%, transparent 50%);
}

.blog-hero {
  text-align: center;
  padding: 72px 0 48px;
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.02em;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -12px;
  width: 20px;
  height: 20px;
  border-top: 2px solid var(--accent);
  border-right: 2px solid var(--accent);
  border-radius: 0 4px 0 0;
}

.hero-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: -12px;
  width: 20px;
  height: 20px;
  border-bottom: 2px solid var(--accent);
  border-left: 2px solid var(--accent);
  border-radius: 0 0 0 4px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 0.02em;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  box-shadow:
    0 2px 4px ${shadowBase},
    0 4px 8px ${shadowMid},
    0 8px 16px ${shadowFar};
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation: origamiUnfold 0.6s ease-out both;
}

/* 折痕线装饰 */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 32px;
  right: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${foldLine}, ${foldLine}, transparent);
  pointer-events: none;
}

/* 纸角折叠效果 */
.card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: linear-gradient(225deg, var(--bg) 50%, var(--border) 50%);
  border-radius: 0 8px 0 0;
}

.card:hover {
  transform: translateY(-4px) perspective(800px) rotateX(1deg);
  box-shadow:
    0 4px 8px ${shadowBase},
    0 8px 16px ${shadowMid},
    0 16px 32px ${shadowFar},
    0 24px 48px ${shadowFar};
  border-color: var(--accent);
}

@keyframes origamiUnfold {
  from {
    opacity: 0;
    transform: scaleY(0.8) perspective(600px) rotateX(-5deg);
    transform-origin: top center;
  }
  to {
    opacity: 1;
    transform: scaleY(1) perspective(600px) rotateX(0deg);
  }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

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
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
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
  border-radius: 12px;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0.05em;
  color: var(--fg);
  font-weight: 700;
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
  color: var(--accent);
  margin-bottom: 16px;
  font-weight: 700;
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
  transition: all 0.3s;
  font-weight: 600;
}

.archive-item a:hover {
  color: var(--accent);
  padding-left: 4px;
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0.05em;
  color: var(--fg);
  font-weight: 700;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: var(--bg);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px ${shadowBase}, 0 8px 24px ${shadowMid};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
  font-weight: 700;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 600;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-weight: 600;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 2px dashed var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  letter-spacing: 0.05em;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Nunito', sans-serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.03em;
  color: var(--fg);
  font-weight: 700;
  position: relative;
  display: inline-block;
  width: 100%;
}

/* 标题折纸装饰角 */
.post-title::before {
  content: '';
  position: absolute;
  top: -6px;
  right: calc(50% - 120px);
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--accent);
  border-right: 2px solid var(--accent);
  transform: rotate(45deg);
}

.post-title::after {
  content: '';
  position: absolute;
  top: -6px;
  left: calc(50% - 120px);
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--accent);
  border-left: 2px solid var(--accent);
  transform: rotate(-45deg);
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-weight: 600;
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
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

/* 引用块如便签纸 */
.post-content blockquote {
  border-left: none;
  padding: 16px 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: var(--accent-light);
  border-radius: 4px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
  transform: rotate(-0.5deg);
  position: relative;
}

.post-content blockquote::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 20px;
  width: 24px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.5;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--border);
  font-weight: 600;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
  border-bottom-style: solid;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Nunito', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.05em;
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
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: var(--accent);
  border-left-color: var(--accent);
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: var(--accent);
  transform: translateX(-4px);
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card { padding: 20px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 6px 12px 8px; }
  .post-title { font-size: 24px; }
  .post-title::before, .post-title::after { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 24px; }
  .card::after { width: 16px; height: 16px; }
  .archive-item { flex-direction: column; align-items: flex-start; gap: 4px; }
}
`
}

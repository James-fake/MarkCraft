/**
 * getTypewriterCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Typewriter — 「机械印记」───────────────────────────────
export function getTypewriterCss(isDark: boolean): string {
  const bg = isDark ? '#1a1810' : '#f5f0e1'
  const fg = isDark ? '#d4c9a8' : '#3d3522'
  const muted = isDark ? '#8a7e5f' : '#8b7d5e'
  const accent = isDark ? '#c9a84c' : '#8b6914'
  const accentLight = isDark ? 'rgba(201,168,76,0.1)' : 'rgba(139,105,20,0.08)'
  const cardBg = isDark ? '#252218' : '#fffdf5'
  const border = isDark ? '#3d3625' : '#d4c9a8'
  const ribbonColor = isDark ? '#8b2020' : '#c0392b'
  const paperLine = isDark ? 'rgba(212,201,168,0.06)' : 'rgba(61,53,34,0.06)'

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
  font-family: 'Courier New', 'Courier', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: '';
  display: block;
  height: 6px;
  background: ${ribbonColor};
  margin-bottom: 24px;
}

.blog-header-site {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 18px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 16px;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 0;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border);
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.3s;
  padding-bottom: 0;
  position: relative;
}

.nav-link::before {
  content: '[';
  color: var(--accent);
}

.nav-link::after {
  content: ']';
  color: var(--accent);
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 60px 0 40px;
}

.hero-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 16px;
  text-transform: uppercase;
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid var(--accent);
  animation: typewriterBlink 0.7s step-end infinite;
  display: inline-block;
  max-width: 100%;
}

.hero-description {
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 1px;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px 24px 24px 32px;
  position: relative;
  border: 1px solid var(--border);
  border-left: 3px solid ${ribbonColor};
  transition: none;
  text-decoration: none;
  color: inherit;
  display: block;
  animation: typewriterFadeIn 0.5s ease-out both;
  background-image: repeating-linear-gradient(
    0deg,
    ${paperLine} 0px,
    ${paperLine} 27px,
    transparent 27px,
    transparent 28px
  );
  background-size: 100% 28px;
  background-position: 0 24px;
}

.card::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(135deg, var(--card-bg) 33.33%, transparent 33.33%) 0 0,
              linear-gradient(-135deg, var(--card-bg) 33.33%, transparent 33.33%) 0 0;
  background-size: 8px 8px;
  background-repeat: repeat-x;
  background-color: var(--bg);
}

.card:hover {
  border-color: var(--border);
  border-left-color: ${ribbonColor};
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 16px;
  font-weight: 400;
  margin-bottom: 6px;
  color: var(--fg);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--accent);
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 10px;
  font-family: 'Courier New', 'Courier', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 10px;
  background: none;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 20px;
  border-left: 2px solid ${ribbonColor};
}

.archive-year-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted var(--border);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
}

.archive-item a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
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
  background: none;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s;
  text-decoration: none;
  letter-spacing: 1px;
  font-family: 'Courier New', 'Courier', monospace;
}

.tag-cloud-item::before {
  content: '[';
  color: var(--accent);
}

.tag-cloud-item::after {
  content: ']';
  color: var(--accent);
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border);
  letter-spacing: 1px;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px dashed var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-footer::before {
  content: '--- ';
  color: var(--accent);
}

.blog-footer::after {
  content: ' ---';
  color: var(--accent);
}

.post-detail {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 24px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  border-bottom: 2px dashed var(--accent);
  padding-bottom: 12px;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 32px;
  letter-spacing: 1px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Courier New', 'Courier', monospace;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 3px solid ${ribbonColor};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'Courier New', 'Courier', monospace;
}

.post-content code {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 3px solid ${ribbonColor};
  padding: 12px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
}

.post-content a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  border-bottom: none;
}

.post-content a:hover {
  color: var(--fg);
}

.post-content strong, .post-content b {
  font-weight: 400;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 3px;
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 20px;
  font-family: 'Courier New', 'Courier', monospace;
}

.back-link::before {
  content: '[';
  color: var(--accent);
}

.back-link::after {
  content: ']';
  color: var(--accent);
}

.back-link:hover {
  color: var(--accent);
}

@keyframes typewriterBlink {
  0%, 100% { border-color: var(--accent); }
  50% { border-color: transparent; }
}

@keyframes typewriterFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 22px; letter-spacing: 2px; }
  .card { padding: 16px 16px 16px 24px; }
  .blog-nav { gap: 16px; }
  .post-title { font-size: 20px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

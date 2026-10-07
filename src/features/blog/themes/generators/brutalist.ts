/**
 * getBrutalistCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Brutalist ──────────────────────────────────────────────
export function getBrutalistCss(isDark: boolean): string {
  const bg = isDark ? '#000000' : '#ffffff'
  const fg = isDark ? '#ffffff' : '#000000'
  const muted = isDark ? '#888888' : '#666666'
  const accent = fg
  const accentLight = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const cardBg = isDark ? '#0a0a0a' : '#f8f8f8'
  const border = isDark ? '#333333' : '#000000'

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

* { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }

body {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
  font-size: 16px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
}

.blog-header {
  padding: 0;
  text-align: left;
  border-bottom: 3px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 0;
  padding: 16px 0;
  flex-wrap: wrap;
}

.nav-link {
  color: ${fg};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s;
  padding: 8px 16px;
  border: 2px solid ${border};
  font-weight: 700;
}

.nav-link:hover {
  background: ${fg};
  color: ${bg};
}

.nav-link.active {
  background: ${fg};
  color: ${bg};
}

.nav-link.active::after { display: none; }

.blog-hero {
  text-align: left;
  padding: 80px 0 60px;
}

.hero-title {
  font-family: system-ui, sans-serif;
  font-size: 56px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1;
  border: 3px solid ${border};
  display: inline-block;
  padding: 16px 24px;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.card {
  padding: 24px;
  border: 3px solid ${border};
  background: ${cardBg};
  transition: all 0.1s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${isDark ? '#ffffff' : '#000000'};
  background: ${accentLight};
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 ${border};
}

.card-title {
  font-size: 16px;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 700;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.5;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${fg};
  border: 2px solid ${border};
  padding: 2px 8px;
  font-weight: 700;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; border: 3px solid ${border}; display: inline-block; padding: 8px 16px; }
.archive-year { font-size: 16px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 2px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; font-weight: 700; text-transform: uppercase; }
.archive-item a:hover { text-decoration: underline; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; font-weight: 700; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; border: 3px solid ${border}; display: inline-block; padding: 8px 16px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${fg}; text-decoration: none; border: 2px solid ${border}; padding: 4px 12px; font-weight: 700; cursor: pointer; transition: all 0.1s; }
.tag-cloud-item:hover { background: ${fg}; color: ${bg}; }
.tag-posts-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1;
}

.post-meta {
  font-size: 13px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 40px;
  font-weight: 700;
}

.post-content {
  font-size: 17px;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${fg}; text-decoration: underline; text-underline-offset: 3px; }
.post-content blockquote { border-left: 4px solid ${border}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; font-style: normal; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border: 1px solid ${border}; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#f0f0f0'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 2px solid ${border}; }
.post-content img { max-width: 100%; border: 2px solid ${border}; }

.blog-footer {
  border-top: 3px solid ${border};
  padding: 24px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
  font-weight: 700;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  border: 2px solid ${border};
  padding: 6px 12px;
}

.back-link:hover { background: ${fg}; color: ${bg}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 4px; }
  .nav-link { font-size: 11px; padding: 6px 10px; }
  .hero-title { font-size: 32px; padding: 12px 16px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

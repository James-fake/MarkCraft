/**
 * getSwissCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Swiss ──────────────────────────────────────────────────
export function getSwissCss(isDark: boolean): string {
  const bg = isDark ? '#111111' : '#ffffff'
  const fg = isDark ? '#eeeeee' : '#111111'
  const muted = isDark ? '#888888' : '#999999'
  const accent = '#e74c3c'
  const accentLight = isDark ? 'rgba(231,76,60,0.12)' : 'rgba(231,76,60,0.08)'
  const cardBg = isDark ? '#1a1a1a' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e0e0e0'

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
  font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: 1px solid ${fg};
  position: relative;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 0;
  padding: 16px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 2px;
  background: ${accent};
}

.blog-hero {
  text-align: left;
  padding: 100px 0 80px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 64px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -2px;
  text-transform: uppercase;
  margin-bottom: 24px;
  line-height: 1.05;
  position: relative;
}

.hero-title::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background: ${accent};
  margin-right: 16px;
  vertical-align: middle;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 400;
  max-width: 500px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}

.card {
  padding: 32px;
  border-radius: 0;
  border: 1px solid ${border};
  border-right: none;
  border-bottom: none;
  background: ${cardBg};
  transition: background 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:nth-child(3n) { border-right: 1px solid ${border}; }
.card:hover { background: ${accentLight}; }

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
  line-height: 1.4;
}

.card-date {
  font-size: 11px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
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
  color: ${accent};
  padding: 2px 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 36px; font-weight: 700; letter-spacing: -1px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 36px; font-weight: 700; letter-spacing: -1px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 0; border-bottom: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-bottom-color: ${accent}; }
.tag-posts-title { font-size: 18px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 700;
  letter-spacing: -0.5px;
  text-transform: uppercase;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { border-bottom-width: 2px; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#f5f5f5'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; }
.post-content img { max-width: 100%; }

.blog-footer {
  border-top: 1px solid ${fg};
  padding: 24px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .card:nth-child(3n) { border-right: none; }
  .card:nth-child(2n) { border-right: 1px solid ${border}; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 24px; }
  .blog-nav { gap: 20px; flex-wrap: wrap; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .card { border-right: 1px solid ${border}; }
  .card:nth-child(2n) { border-right: 1px solid ${border}; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getZenCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Zen ────────────────────────────────────────────────────
export function getZenCss(isDark: boolean): string {
  const bg = isDark ? '#1a1918' : '#f5f0eb'
  const fg = isDark ? '#d4c5a9' : '#3a3a3a'
  const muted = isDark ? '#8b7d6b' : '#9a8e7e'
  const accent = '#8b7d6b'
  const accentLight = isDark ? 'rgba(139,125,107,0.1)' : 'rgba(139,125,107,0.06)'
  const cardBg = isDark ? '#222120' : '#faf7f3'
  const border = isDark ? '#2e2c2a' : '#e0dbd5'

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
  font-family: 'Noto Serif SC', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 2;
  min-height: 100vh;
  font-weight: 400;
  font-size: 15px;
}

.blog-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 32px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  margin-top: 0;
  padding: 32px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 16px;
  font-weight: 400;
}

.nav-link + .nav-link::before {
  content: '·';
  margin-right: 32px;
  color: ${border};
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 160px 0 120px;
}

.hero-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 24px;
  position: relative;
}

.hero-title::before {
  content: '';
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${border};
  margin: 0 auto 40px;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  letter-spacing: 1px;
  font-weight: 400;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 28px 0;
  border-bottom: 1px solid ${border};
  background: none;
  transition: all 0.3s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover { padding-left: 12px; }

.card-title {
  font-size: 17px;
  font-weight: 400;
  margin-bottom: 8px;
  letter-spacing: 1px;
  line-height: 1.6;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.8;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 1px;
  color: ${accent};
  padding: 2px 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 20px; font-weight: 400; letter-spacing: 3px; margin-bottom: 40px; }
.archive-year { font-size: 14px; font-weight: 400; letter-spacing: 2px; color: ${accent}; margin: 40px 0 16px; }
.archive-list { list-style: none; }
.archive-item { padding: 10px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 20px; font-weight: 400; letter-spacing: 3px; margin-bottom: 40px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 16px; }
.tag-cloud-item { font-size: 13px; letter-spacing: 1px; color: ${muted}; text-decoration: none; transition: color 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${fg}; }
.tag-posts-title { font-size: 17px; font-weight: 400; letter-spacing: 2px; margin-bottom: 20px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 3px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.post-meta {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 1px;
  margin-bottom: 48px;
}

.post-content {
  font-size: 16px;
  line-height: 2.2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 400;
  letter-spacing: 2px;
  margin: 2.5em 0 0.8em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${border}; }
.post-content a:hover { border-bottom-color: ${accent}; }
.post-content blockquote { border-left: 1px solid ${border}; padding-left: 24px; color: ${muted}; margin: 2em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; }
.post-content pre { background: ${isDark ? '#1e1d1c' : '#f0ebe5'}; padding: 24px; overflow-x: auto; margin: 2em 0; font-size: 14px; line-height: 1.8; }
.post-content img { max-width: 100%; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 40px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 2px;
  color: ${muted};
  margin-top: 120px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 1px;
}

.back-link:hover { color: ${fg}; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 0; }
  .nav-link { font-size: 12px; padding: 4px 10px; }
  .blog-hero { padding: 100px 0 80px; }
  .hero-title { font-size: 20px; }
  .post-title { font-size: 20px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

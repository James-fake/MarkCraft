/**
 * getTravelCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Travel — 「旅行手帐」──────────────────────────────────
export function getTravelCss(isDark: boolean): string {
  const bg = isDark ? '#0d1b2a' : '#faf8f5'
  const fg = isDark ? '#e0e0e0' : '#2c3e50'
  const muted = isDark ? '#8899aa' : '#7f8c8d'
  const accent = isDark ? '#4da6ff' : '#1e90ff'
  const accentLight = isDark ? 'rgba(77,166,255,0.12)' : 'rgba(30,144,255,0.08)'
  const cardBg = isDark ? '#152238' : '#ffffff'
  const border = isDark ? '#1e3a5f' : '#d5dde5'

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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
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
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active {
  color: ${bg};
  background: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
  background: linear-gradient(180deg, ${isDark ? '#0d1b2a' : '#87ceeb'} 0%, ${bg} 100%);
}

.blog-hero::before {
  content: '⊕';
  position: absolute;
  right: 15%;
  top: 30%;
  font-size: 48px;
  color: ${accent}22;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 12px;
  padding: 24px;
  position: relative;
  border: 1px solid ${border};
  border-left: 3px dashed ${accent}44;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card::before {
  content: '📍';
  position: absolute;
  left: -8px;
  top: 24px;
  font-size: 14px;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(30,144,255,0.1);
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
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

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 2px 10px;
  background: ${accent}15;
  border-radius: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; border-left: 3px dashed ${accent}; padding-left: 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px dashed ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px dashed ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#0d1b2a' : '#f5f8fc'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .blog-hero::before { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 24px; }
  .blog-hero::before { display: none; }
}
`
}

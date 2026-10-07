/**
 * getTimelineCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Timeline — 「时间线」──────────────────────────────────
export function getTimelineCss(isDark: boolean): string {
  const bg = isDark ? '#0d1117' : '#f8f9fa'
  const fg = isDark ? '#c9d1d9' : '#2c3e50'
  const muted = isDark ? '#8b949e' : '#6c757d'
  const accent = isDark ? '#58a6ff' : '#3498db'
  const accentLight = isDark ? 'rgba(88,166,255,0.12)' : 'rgba(52,152,219,0.08)'
  const border = isDark ? '#21262d' : '#dee2e6'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
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
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
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
  transition: color 0.3s;
  padding: 6px 12px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 64px 0 32px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  line-height: 1.6;
  max-width: 480px;
  margin: 0 auto;
}

.card-grid {
  position: relative;
  padding: 32px 0;
}

.card-grid::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: ${accent}33;
  transform: translateX(-50%);
}

.card {
  position: relative;
  width: 45%;
  margin-left: 55%;
  padding-left: 24px;
  border: none;
  background: none;
  padding-top: 16px;
  padding-bottom: 16px;
  padding-right: 0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.card:nth-child(even) {
  margin-left: 0;
  margin-right: 55%;
  padding-left: 0;
  padding-right: 24px;
  text-align: right;
}

.card::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${accent};
  border: 2px solid ${bg};
}

.card:nth-child(even)::before {
  left: auto;
  right: -7px;
}

.card:hover {
  transform: scale(1.01);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${fg};
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${accent};
  font-weight: 600;
  margin-bottom: 8px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.card:nth-child(even) .card-tags {
  justify-content: flex-end;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 10px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', sans-serif;
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
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { border-bottom-style: dashed; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#161b22' : '#f6f8fa'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
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
  .card { width: 48%; margin-left: 52%; }
  .card:nth-child(even) { margin-right: 52%; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid::before { left: 20px; }
  .card { width: 100%; margin-left: 0; padding-left: 40px; text-align: left; }
  .card:nth-child(even) { margin-right: 0; padding-right: 0; padding-left: 40px; text-align: left; }
  .card::before { left: 14px; }
  .card:nth-child(even)::before { left: 14px; right: auto; }
  .card:nth-child(even) .card-tags { justify-content: flex-start; }
  .post-title { font-size: 24px; }
}
`
}

/**
 * getFeedCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Feed — 「社交动态」──────────────────────────────────
export function getFeedCss(isDark: boolean): string {
  const bg = isDark ? '#15202b' : '#f5f8fa'
  const fg = isDark ? '#e7e9ea' : '#14171a'
  const muted = isDark ? '#71767b' : '#536471'
  const accent = isDark ? '#1d9bf0' : '#1da1f2'
  const accentLight = isDark ? 'rgba(29,155,240,0.12)' : 'rgba(29,161,242,0.08)'
  const border = isDark ? '#2f3336' : '#eff3f4'

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
  max-width: 680px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 12px 0;
  text-align: center;
  border-bottom: 1px solid ${border};
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${bg};
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: ${fg};
  letter-spacing: -0.5px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px 16px;
  position: relative;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
  border-radius: 20px;
}

.nav-link.active {
  color: ${accent};
  font-weight: 700;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: ${accent};
  border-radius: 2px;
}

.blog-hero {
  padding: 32px 0 16px;
  text-align: left;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  line-height: 1.5;
  max-width: 480px;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 16px;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.card:hover {
  background: ${accent}05;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: ${fg};
  line-height: 1.3;
  margin-bottom: 4px;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 6px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.4;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.card-tag {
  background: ${accent}15;
  color: ${accent};
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 700; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 12px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.2s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 32px;
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

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1d2835' : '#f7f9f9'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 12px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 32px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .blog-container { max-width: 600px; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 6px 12px; }
  .hero-title { font-size: 20px; }
  .card { padding: 12px; }
  .post-title { font-size: 22px; }
}
`
}

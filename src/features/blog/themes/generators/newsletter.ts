/**
 * getNewsletterCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getNewsletterCss(isDark: boolean): string {
  const bg = isDark ? '#0d0d0d' : '#ffffff'
  const fg = isDark ? '#e0e0e0' : '#1a1a1a'
  const muted = isDark ? '#888888' : '#666666'
  const accent = isDark ? '#a29bfe' : '#6c5ce7'
  const accentLight = isDark ? 'rgba(162,155,254,0.1)' : 'rgba(108,92,231,0.06)'
  const cardBg = isDark ? '#141414' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e8e8e8'
  const navBg = isDark ? 'rgba(13,13,13,0.9)' : 'rgba(255,255,255,0.9)'

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
  font-family: Georgia, serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 0;
  padding: 16px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px 8px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
}

.blog-hero {
  text-align: left;
  padding: 40px 0 24px;
  border-bottom: 1px solid ${border};
  position: relative;
}

.hero-title {
  font-family: Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  color: ${fg};
  line-height: 1.3;
  margin-bottom: 8px;
}

.hero-description {
  font-size: 14px;
  color: ${muted};
  margin-top: 8px;
  font-family: 'Inter', sans-serif;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 20px 0;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  background: ${accentLight};
  padding-left: 8px;
}

.card-title {
  font-family: Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-bottom: 4px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.5;
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  background: ${accentLight};
  border-radius: 4px;
  padding: 2px 8px;
  font-family: 'Inter', sans-serif;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 24px; font-weight: 700; font-family: Georgia, serif; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; font-family: 'Inter', sans-serif; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; font-family: Georgia, serif; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; font-family: 'Inter', sans-serif; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 24px; font-weight: 700; font-family: Georgia, serif; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 4px; transition: all 0.2s; cursor: pointer; font-family: 'Inter', sans-serif; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; font-family: Georgia, serif; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 28px;
  font-weight: 700;
  font-family: Georgia, serif;
  margin-bottom: 16px;
  line-height: 1.3;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  font-family: Georgia, serif;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 3px; font-family: 'Inter', monospace; }
.post-content pre { background: ${isDark ? '#141414' : '#f8f8f8'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 4px; }
.post-content img { max-width: 100%; border-radius: 4px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { flex-direction: column; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 16px; padding: 12px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 22px; }
  .card-title { font-size: 16px; }
  .post-title { font-size: 22px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getRamsCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getRamsCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#f5f5f5'
  const fg = isDark ? '#e0e0e0' : '#212121'
  const muted = isDark ? '#888888' : '#999999'
  const accent = isDark ? '#9e9e9e' : '#757575'
  const accentLight = isDark ? 'rgba(158,158,158,0.1)' : 'rgba(117,117,117,0.08)'
  const cardBg = isDark ? '#222222' : '#f5f5f5'
  const border = isDark ? '#333333' : '#e0e0e0'
  const navBg = isDark ? 'rgba(26,26,26,0.9)' : 'rgba(245,245,245,0.9)'

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
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 48px;
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
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: left;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.5px;
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  font-size: 14px;
  color: ${muted};
  max-width: 400px;
  line-height: 1.6;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.card {
  border-bottom: 1px solid ${border};
  border-radius: 0;
  padding: 20px 0;
  background: none;
  transition: padding-left 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  padding-left: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  margin-bottom: 8px;
}

.card-excerpt {
  font-size: 13px;
  color: ${muted};
  line-height: 1.5;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  padding: 0;
  background: none;
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 24px; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 14px; }
.archive-item a:hover { color: ${fg}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 24px; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 0; border: none; border-bottom: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-bottom-color: ${accent}; }
.tag-posts-title { font-size: 16px; font-weight: 500; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 15px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 500;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: underline; }
.post-content a:hover { color: ${fg}; }
.post-content blockquote { border-left: 2px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; }
.post-content pre { background: ${isDark ? '#222222' : '#eeeeee'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: 1fr; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 11px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

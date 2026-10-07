/**
 * getLuxuryCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getLuxuryCss(isDark: boolean): string {
  const bg = isDark ? '#050505' : '#0a0a0a'
  const fg = isDark ? '#e8dcc8' : '#f5f0e8'
  const muted = isDark ? '#8a7e6a' : '#a09882'
  const accent = isDark ? '#d4b85c' : '#c9a84c'
  const accentLight = isDark ? 'rgba(212,184,92,0.1)' : 'rgba(201,168,76,0.08)'
  const cardBg = isDark ? '#0d0d0d' : '#0f0f0f'
  const border = isDark ? '#2a2520' : '#1a1815'
  const navBg = isDark ? 'rgba(5,5,5,0.9)' : 'rgba(10,10,10,0.9)'

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
  max-width: 1120px;
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
  border-bottom: 1px solid ${accent}22;
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
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 300;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.blog-hero {
  text-align: center;
  padding: 100px 0 80px;
  position: relative;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 300;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 1px;
  background: ${accent};
  margin: 24px auto 0;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 2px;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.card {
  background: ${isDark ? '#0d0d0d' : '#0f0f0f'};
  border: 1px solid ${accent}22;
  border-radius: 0;
  padding: 28px;
  transition: all 0.4s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 0 30px ${accent}11;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px;
  letter-spacing: 1px;
  color: ${accent};
  margin-bottom: 10px;
  font-weight: 400;
  line-height: 1.4;
}

.card-date {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 13px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-size: 12px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 10px 0; border-bottom: 1px solid ${accent}11; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 14px; letter-spacing: 1px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${accent}22; border-radius: 0; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; letter-spacing: 1px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 44px;
  font-weight: 300;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 15px;
  line-height: 1.8;
  letter-spacing: 0.3px;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  font-weight: 400;
  letter-spacing: 2px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}44; }
.post-content a:hover { border-bottom-color: ${accent}; }
.post-content blockquote { border-left: 1px solid ${accent}; padding-left: 24px; color: ${muted}; margin: 1.5em 0; font-style: italic; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; color: ${accent}; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#0d0d0d'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${accent}15; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; }

.blog-footer {
  border-top: 1px solid ${accent}22;
  padding: 32px;
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
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 11px; letter-spacing: 2px; }
  .hero-title { font-size: 32px; letter-spacing: 3px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; letter-spacing: 2px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

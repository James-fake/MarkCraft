/**
 * getIceCrystalCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getIceCrystalCss(isDark: boolean): string {
  const bg = isDark ? '#0a1a24' : '#e8f4f8'
  const fg = isDark ? '#c0d8e0' : '#1a3a4a'
  const muted = isDark ? '#7a9aaa' : '#5a7a8a'
  const accent = isDark ? '#4dd0e1' : '#00acc1'
  const accentLight = isDark ? 'rgba(77,208,225,0.1)' : 'rgba(0,172,193,0.08)'
  const cardBg = isDark ? '#0e2030' : '#e8f4f8'
  const border = isDark ? '#1a3040' : '#c0d8e8'
  const navBg = isDark ? 'rgba(10,26,36,0.7)' : 'rgba(232,244,248,0.7)'

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
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  position: fixed;
  top: 0;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: ${navBg};
  border-bottom: 1px solid ${border};
  z-index: 100;
  left: 0;
  right: 0;
  padding: 0;
  text-align: center;
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: ${accent};
  border-radius: 1px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.blog-hero::before {
  content: '❄';
  position: absolute;
  right: 12%;
  top: 20%;
  font-size: 64px;
  color: ${accent}15;
}

.blog-hero::after {
  content: '❄';
  position: absolute;
  left: 8%;
  bottom: 20%;
  font-size: 40px;
  color: ${accent}10;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  background: ${isDark ? 'rgba(10,26,36,0.5)' : 'rgba(232,244,248,0.5)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${accent}22;
  border-radius: 16px;
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 8px 32px ${accent}15;
  transform: translateY(-4px);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
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
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 4px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
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
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; }
.post-content pre { background: ${isDark ? '#0a1a24' : '#e8f4f8'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
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
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

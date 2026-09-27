/**
 * getCosmosCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getCosmosCss(isDark: boolean): string {
  const bg = isDark ? '#0b0d17' : '#0f1120'
  const fg = '#e0e0f0'
  const muted = isDark ? '#8888aa' : '#9999bb'
  const accent = '#ff6b35'
  const accentLight = isDark ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.08)'
  const cardBg = isDark ? '#141428' : '#0f1120'
  const border = isDark ? '#2a2a4a' : '#1a1a3a'
  const navBg = isDark ? 'rgba(11,13,23,0.85)' : 'rgba(15,17,32,0.85)'

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
  background-image: radial-gradient(2px 2px at 20px 30px, #ffffff22, transparent), radial-gradient(2px 2px at 40px 70px, #ffffff15, transparent), radial-gradient(1px 1px at 90px 40px, #ffffff18, transparent), radial-gradient(1px 1px at 130px 80px, #ffffff12, transparent), radial-gradient(2px 2px at 160px 30px, #ffffff10, transparent);
  background-size: 200px 100px;
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
  box-shadow: 0 0 8px ${accent}66;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 15%;
  top: 30%;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, ${accent}44, ${accent}11);
  box-shadow: 0 0 40px ${accent}22;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(15% + 40px);
  top: calc(30% + 50px);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 1px solid ${accent}22;
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
  background: ${isDark ? 'rgba(20,20,40,0.7)' : 'rgba(15,17,32,0.7)'};
  border: 1px solid ${accent}22;
  backdrop-filter: blur(8px);
  border-radius: 12px;
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 0 20px ${accent}15;
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
.post-content pre { background: ${isDark ? '#0b0d17' : '#0f1120'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
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

/**
 * getPastelCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getPastelCss(isDark: boolean): string {
  const bg = isDark ? '#1a1520' : '#fef0f2'
  const fg = isDark ? '#d0c8e0' : '#4a4a5a'
  const muted = isDark ? '#9a92aa' : '#8a8a9a'
  const accent = '#ff9ebc'
  const accentLight = isDark ? 'rgba(255,158,188,0.12)' : 'rgba(255,158,188,0.1)'
  const cardBg = isDark ? '#241e2e' : '#ffffff'
  const border = isDark ? '#3a3048' : '#f0d0da'
  const navBg = isDark ? 'rgba(26,21,32,0.85)' : 'rgba(254,240,242,0.85)'

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
  font-family: 'Nunito', sans-serif;
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
  gap: 16px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  background: ${accent};
  color: white;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
  background: linear-gradient(180deg, #ffc1cc15 0%, transparent 100%);
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 15%;
  top: 20%;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #c9b1ff15;
}

.blog-hero::after {
  content: '';
  position: absolute;
  left: 10%;
  bottom: 15%;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #a0d8ef15;
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 800;
  color: ${accent};
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
  border-radius: 20px;
  border: 1px solid ${border};
  background: ${cardBg};
  box-shadow: 0 2px 12px rgba(255,158,188,0.1);
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  box-shadow: 0 4px 20px rgba(255,158,188,0.2);
  transform: translateY(-2px);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
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
  background: linear-gradient(135deg, #ffc1cc30, #c9b1ff30);
  color: #9b59b6;
  border-radius: 12px;
  padding: 2px 10px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 800;
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

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 12px; }
.post-content pre { background: ${isDark ? '#1a1520' : '#fff5f7'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 16px; }
.post-content img { max-width: 100%; border-radius: 16px; }

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
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 4px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

/**
 * getSketchCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Sketch — 「手绘涂鸦」──────────────────────────────────
export function getSketchCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#fff9c4'
  const fg = isDark ? '#e0d0b0' : '#333333'
  const muted = isDark ? '#9a8a70' : '#888888'
  const accent = isDark ? '#ff8f00' : '#e65100'
  const accentLight = isDark ? 'rgba(255,143,0,0.12)' : 'rgba(230,81,0,0.08)'
  const cardBg = isDark ? '#2a2520' : '#fffde7'
  const border = isDark ? '#3a3530' : '#e0d0b0'

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
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 2px dashed ${border};
}

.blog-header-site {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: ${muted};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 8px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  text-decoration: underline;
  text-decoration-style: wavy;
  text-decoration-color: ${accent};
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.hero-title {
  font-family: 'Caveat', cursive;
  font-size: 48px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 0;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-title::after {
  content: '';
  display: block;
  width: 60%;
  height: 3px;
  background: ${accent};
  transform: rotate(-1deg);
  margin: 8px auto 0;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${isDark ? '#2a2520' : '#fffde7'};
  border: 2px solid ${border};
  border-radius: 2px;
  padding: 24px;
  position: relative;
  transform: rotate(-0.5deg);
  transition: transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: rotate(0deg);
  box-shadow: 4px 4px 0 ${border};
}

.card::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 40%;
  width: 40px;
  height: 12px;
  background: ${accent}33;
  border-radius: 0;
}

.card-title {
  font-family: 'Caveat', cursive;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
}

.card-date {
  color: ${muted};
  font-size: 12px;
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
  font-size: 12px;
  color: ${accent};
  padding: 2px 10px;
  background: ${accentLight};
  border-radius: 2px;
  font-weight: 500;
  border: 1px dashed ${accent}44;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Caveat', cursive; font-size: 36px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-family: 'Caveat', cursive; font-size: 20px; font-weight: 700; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px dashed ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Caveat', cursive; font-size: 36px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 14px; color: ${muted}; text-decoration: none; padding: 4px 14px; border: 2px dashed ${border}; border-radius: 2px; transition: all 0.3s; cursor: pointer; font-family: 'Caveat', cursive; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Caveat', cursive;
  font-size: 44px;
  font-weight: 700;
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
  font-family: 'Caveat', cursive;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px dashed ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 2px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1a1a1a' : '#fff8e1'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 2px dashed ${border}; border-radius: 0; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 2px; border: 2px solid ${border}; }

.blog-footer {
  border-top: 2px dashed ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 14px;
  color: ${muted};
  margin-top: 48px;
  font-family: 'Caveat', cursive;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 16px;
  font-family: 'Caveat', cursive;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; flex-wrap: wrap; }
  .nav-link { font-size: 16px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 32px; }
}
`
}

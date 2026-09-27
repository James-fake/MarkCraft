/**
 * getComicCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getComicCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#fffde7'
  const fg = isDark ? '#ffffff' : '#1a1a1a'
  const muted = isDark ? '#aaaacc' : '#666666'
  const accent = isDark ? '#ff7043' : '#ff5722'
  const accentLight = isDark ? 'rgba(255,112,67,0.15)' : 'rgba(255,87,34,0.12)'
  const cardBg = isDark ? '#252540' : '#fffde7'
  const border = isDark ? '#3a3a5c' : '#1a1a1a'
  const navBg = isDark ? 'rgba(26,26,46,0.9)' : 'rgba(255,253,231,0.9)'

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
  border-bottom: 3px solid ${fg};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Bangers', cursive;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${fg};
  text-decoration: none;
  border: 2px solid ${fg};
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  background: ${accent};
  color: white;
  border-color: ${accent};
}

.nav-link.active {
  background: ${accent};
  color: white;
  border-color: ${accent};
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, ${accent}08 1px, transparent 1px);
  background-size: 12px 12px;
  pointer-events: none;
}

.hero-title {
  font-family: 'Bangers', cursive;
  font-size: 52px;
  letter-spacing: 3px;
  text-transform: uppercase;
  -webkit-text-stroke: 2px ${fg};
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  font-size: 16px;
  color: ${muted};
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  border: 3px solid ${fg};
  border-radius: 8px;
  position: relative;
  background: ${cardBg};
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, ${accent}06 1px, transparent 1px);
  background-size: 8px 8px;
  border-radius: 5px;
  pointer-events: none;
}

.card:hover {
  transform: rotate(-1deg) scale(1.02);
  box-shadow: 6px 6px 0 ${fg};
}

.card-title {
  font-family: 'Bangers', cursive;
  font-size: 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  line-height: 1.3;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 10px;
  font-weight: 700;
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
  background: ${accent};
  color: white;
  border-radius: 0;
  padding: 2px 8px;
  font-family: 'Bangers', cursive;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Bangers', cursive; font-size: 36px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-family: 'Bangers', cursive; font-size: 20px; color: ${accent}; margin: 32px 0 12px; letter-spacing: 2px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 3px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; font-weight: 700; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; font-weight: 700; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Bangers', cursive; font-size: 36px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Bangers', cursive; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: ${fg}; text-decoration: none; padding: 4px 12px; border: 2px solid ${fg}; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { background: ${accent}; color: white; border-color: ${accent}; }
.tag-posts-title { font-family: 'Bangers', cursive; font-size: 20px; letter-spacing: 1px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Bangers', cursive;
  font-size: 48px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
  font-weight: 700;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Bangers', cursive;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 2px solid ${accent}; }
.post-content a:hover { color: ${fg}; border-bottom-color: ${fg}; }
.post-content blockquote { border-left: 4px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; font-weight: 700; }
.post-content pre { background: ${isDark ? '#12122a' : '#fff9c4'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 3px solid ${fg}; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; border: 3px solid ${fg}; }

.blog-footer {
  border-top: 3px solid ${fg};
  padding: 32px;
  text-align: center;
  font-family: 'Bangers', cursive;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Bangers', cursive;
  font-size: 14px;
  letter-spacing: 1px;
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
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 3px 8px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

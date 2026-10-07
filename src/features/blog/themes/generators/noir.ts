/**
 * getNoirCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getNoirCss(isDark: boolean): string {
  const bg = '#0a0a0a'
  const fg = isDark ? '#e0e0e0' : '#d0d0d0'
  const muted = '#888888'
  const accent = isDark ? '#666666' : '#555555'
  const cardBg = '#1a1a1a'
  const border = '#333333'
  const navBg = 'rgba(10,10,10,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
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
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #666;
  text-decoration: none;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #e0e0e0;
}

.nav-link.active {
  color: #e0e0e0;
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
  background: repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 10px);
  pointer-events: none;
}

.hero-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
  color: ${fg};
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
  background: ${cardBg};
  border-left: 3px solid ${border};
  border-radius: 0;
  position: relative;
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-left-color: ${fg};
  transform: translateX(2px);
}

.card-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  line-height: 1.3;
  color: #e0e0e0;
}

.card-date {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #555;
  margin-bottom: 10px;
}

.card-excerpt {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  margin-bottom: 12px;
  font-style: italic;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  background: #222;
  color: #888;
  padding: 2px 8px;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', system-ui, sans-serif; font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; }
.archive-year { font-family: 'Inter', system-ui, sans-serif; font-size: 20px; color: #666; margin: 32px 0 12px; letter-spacing: 2px; text-transform: uppercase; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: #e0e0e0; text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${fg}; }
.archive-item span { font-size: 12px; color: #555; letter-spacing: 1px; text-transform: uppercase; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', system-ui, sans-serif; font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Inter', system-ui, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #666; text-decoration: none; padding: 4px 12px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: #e0e0e0; }
.tag-posts-title { font-family: 'Inter', system-ui, sans-serif; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: #555;
  margin-bottom: 40px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 2em 0 0.5em;
}

.post-content a { color: #e0e0e0; text-decoration: none; border-bottom: 1px solid #555; }
.post-content a:hover { border-bottom-color: #e0e0e0; }
.post-content blockquote { border-left: 3px solid #333; padding: 12px 20px; color: #888; margin: 1.5em 0; font-style: italic; }
.post-content code { background: #1a1a1a; padding: 2px 6px; font-size: 0.9em; border-radius: 0; }
.post-content pre { background: #111; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid #222; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; filter: grayscale(30%); }

.blog-footer {
  border-top: 1px solid #222;
  padding: 32px;
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #555;
  margin-top: 80px;
}

.back-link {
  color: #555;
  text-decoration: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.back-link:hover { color: #e0e0e0; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 3px 8px; }
  .hero-title { font-size: 32px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

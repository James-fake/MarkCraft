/**
 * getSteampunkCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

export function getSteampunkCss(isDark: boolean): string {
  const bg = isDark ? '#1a1008' : '#f5e6d0'
  const fg = isDark ? '#d4a843' : '#3e2723'
  const muted = isDark ? '#8a7a5a' : '#7a6a5a'
  const accent = isDark ? '#d4a843' : '#b87333'
  const accentLight = isDark ? 'rgba(212,168,67,0.15)' : 'rgba(184,115,51,0.12)'
  const cardBg = isDark ? '#2a1a0a' : '#efe0c8'
  const border = isDark ? '#4a3a1a' : '#c8a878'
  const navBg = isDark ? 'rgba(26,16,8,0.9)' : 'rgba(245,230,208,0.9)'

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
  font-family: 'Playfair Display', serif;
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
  border-bottom: 2px solid ${accent}44;
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
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${fg};
  text-decoration: none;
  border: 1px solid ${accent}44;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  background: ${accent}15;
  border-color: ${accent};
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  border-color: ${accent};
  background: ${accent}15;
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 12%;
  top: 30%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid ${accent}44;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(12% + 25px);
  top: calc(30% + 25px);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid ${accent}33;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 700;
  color: ${accent};
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
  border: 2px solid ${accent}44;
  border-radius: 4px;
  position: relative;
  background: ${cardBg};
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card::before {
  content: '⚙';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 14px;
  color: ${accent}55;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 ${accent}33;
  border-color: ${accent};
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.3;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 10px;
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
  background: ${accent}20;
  color: ${accent};
  border: 1px solid ${accent}33;
  border-radius: 2px;
  padding: 2px 8px;
  font-size: 12px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.archive-year { font-family: 'Playfair Display', serif; font-size: 20px; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Playfair Display', serif; font-size: 14px; color: ${fg}; text-decoration: none; padding: 4px 12px; border: 1px solid ${accent}44; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { background: ${accent}15; border-color: ${accent}; color: ${accent}; }
.tag-posts-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.1;
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
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { color: ${fg}; border-bottom-color: ${fg}; }
.post-content blockquote { border-left: 4px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 2px; }
.post-content pre { background: ${isDark ? '#0d0804' : '#e8d8c0'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${accent}33; border-radius: 4px; }
.post-content img { max-width: 100%; border-radius: 4px; border: 2px solid ${accent}33; }

.blog-footer {
  border-top: 2px solid ${accent}44;
  padding: 32px;
  text-align: center;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
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

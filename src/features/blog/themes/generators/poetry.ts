/**
 * getPoetryCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Poetry — 「纸页诗行」──────────────────────────────────
export function getPoetryCss(isDark: boolean): string {
  const bg = isDark ? '#1a1025' : '#faf5ff'
  const fg = isDark ? '#e8d5f5' : '#2d1b4e'
  const muted = isDark ? '#9b8bb0' : '#7c6f8a'
  const accent = isDark ? '#c4b5fd' : '#8b5cf6'
  const accentLight = isDark ? 'rgba(196,181,253,0.1)' : 'rgba(139,92,246,0.08)'
  const cardBg = isDark ? '#231535' : '#ffffff'
  const border = isDark ? '#3d2a5c' : '#e9d5ff'

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
  font-family: 'Noto Serif SC', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 2.0;
  min-height: 100vh;
}

.blog-container {
  max-width: 580px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 60px 0 32px;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: color 0.3s;
  padding-bottom: 0;
  position: relative;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 72px 0 48px;
}

.hero-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 36px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 6px;
  margin-bottom: 20px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.hero-description {
  color: var(--muted);
  font-size: 15px;
  letter-spacing: 2px;
  line-height: 2.0;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 32px 0;
}

.card {
  background: none;
  border-radius: 0;
  padding: 28px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: none;
  text-decoration: none;
  color: inherit;
  display: block;
  animation: poetryFadeIn 0.8s ease-out both;
}

.card:hover {
  border-color: var(--border);
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 20px;
  font-weight: 400;
  margin-bottom: 6px;
  color: var(--fg);
  position: relative;
  padding-left: 16px;
}

.card-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.card-date {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.card-date::before {
  content: '◇ ';
  color: var(--accent);
  font-size: 11px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 12px;
  background: none;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 6px;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
}

.blog-archive .archive-title {
  display: block;
}

.blog-archive .archive-title::before {
  display: none;
}

.archive-year {
  margin-bottom: 36px;
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

.archive-year-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 16px;
  letter-spacing: 2px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 6px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 4px 16px;
  background: none;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s;
  text-decoration: none;
  letter-spacing: 1px;
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 2px;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: none;
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 3px;
}

.post-detail {
  max-width: 580px;
  margin: 0 auto;
  padding: 48px 24px;
}

.post-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 20px;
  letter-spacing: 4px;
  color: var(--fg);
  line-height: 1.6;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 1px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.5em;
  text-indent: 0;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  margin: 2em 0 1em;
  color: var(--fg);
  letter-spacing: 2px;
  position: relative;
  padding-left: 16px;
}

.post-content h1::before, .post-content h2::before, .post-content h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: none;
  padding: 16px 24px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: italic;
  position: relative;
  background: ${accentLight};
  border-radius: 0;
}

.post-content blockquote::before {
  content: '\\275D';
  position: absolute;
  top: -4px;
  left: 8px;
  font-size: 36px;
  color: var(--accent);
  opacity: 0.4;
  line-height: 1;
}

.post-content blockquote::after {
  content: '\\275E';
  position: absolute;
  bottom: -8px;
  right: 12px;
  font-size: 36px;
  color: var(--accent);
  opacity: 0.4;
  line-height: 1;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}

.post-content a:hover {
  border-bottom-color: var(--accent);
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 2px;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: var(--accent);
}

@keyframes poetryFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; letter-spacing: 3px; }
  .hero-title::before { left: -14px; }
  .card { padding: 20px 0; }
  .blog-nav { gap: 24px; }
  .post-title { font-size: 26px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

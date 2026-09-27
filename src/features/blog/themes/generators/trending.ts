/**
 * getTrendingCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Trending ──────────────────────────────────────────────
export function getTrendingCss(isDark: boolean): string {
  const bg = isDark ? '#0f0520' : '#f5f0ff'
  const fg = isDark ? '#f0e0ff' : '#1a0533'
  const muted = isDark ? '#8b5fc0' : '#7c3aed'
  const accent = isDark ? '#ec4899' : '#7c3aed'
  const accentLight = isDark ? 'rgba(236,72,153,0.12)' : 'rgba(124,58,237,0.06)'
  const cardBg = isDark ? '#1a0a30' : '#ffffff'
  const border = isDark ? '#3d1a60' : '#e0d0f0'
  const navBg = isDark ? 'rgba(15,5,32,0.85)' : 'rgba(245,240,255,0.85)'
  const gradientStart = isDark ? '#ec4899' : '#7c3aed'
  const gradientEnd = isDark ? '#8b5cf6' : '#a855f7'

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
  font-family: 'Poppins', 'Inter', 'Noto Serif SC', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  text-align: center;
  border-bottom: none;
  background: ${navBg};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  color: var(--fg);
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 14px 0 0;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 0;
  padding: 8px 24px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  color: ${bg};
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 72px 24px 48px;
  position: relative;
  overflow: hidden;
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, ${accentLight} 0%, transparent 50%),
              radial-gradient(circle at 70% 50%, rgba(139,92,246,0.08) 0%, transparent 50%);
  animation: heroGlow 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes heroGlow {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-5%, 5%); }
}

.hero-title {
  font-family: 'Poppins', sans-serif;
  font-size: 52px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -1px;
  margin-bottom: 16px;
  position: relative;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  color: var(--muted);
  font-size: 17px;
  letter-spacing: 0.3px;
  position: relative;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 0;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  perspective: 800px;
}

.card::before {
  content: '';
  display: block;
  height: 160px;
  background: linear-gradient(135deg, ${gradientStart}22, ${gradientEnd}22),
              linear-gradient(135deg, ${gradientStart}11, ${gradientEnd}11);
  border-bottom: 1px solid var(--border);
  position: relative;
}

.card::after {
  content: '\\1F525';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 20px;
  opacity: 0.6;
  filter: grayscale(0.3);
}

.card:hover {
  border-color: ${accent};
  box-shadow: 0 12px 40px ${isDark ? 'rgba(236,72,153,0.15)' : 'rgba(124,58,237,0.12)'};
  transform: perspective(800px) rotateY(-3deg) translateY(-4px);
}

.card-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg);
  padding: 20px 20px 0;
  line-height: 1.4;
}

.card-date {
  color: ${accent};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 20px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  padding: 0 20px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
  padding: 0 20px 20px;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, ${gradientStart}18, ${gradientEnd}18);
  color: ${accent};
  border: none;
  border-radius: 12px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0px;
  color: var(--fg);
  font-weight: 700;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid transparent;
  border-image: linear-gradient(to bottom, ${gradientStart}, ${gradientEnd}) 1;
}

.archive-year-title {
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.archive-item:hover {
  padding-left: 8px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0px;
  color: var(--fg);
  font-weight: 700;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--card-bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
  text-decoration: none;
  font-weight: 500;
}

.tag-cloud-item:hover {
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  color: ${isDark ? '#0f0520' : '#ffffff'};
  border-color: transparent;
  transform: scale(1.08);
  box-shadow: 0 4px 16px ${isDark ? 'rgba(236,72,153,0.3)' : 'rgba(124,58,237,0.2)'};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}) 1;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.tag-post-item:hover {
  padding-left: 8px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.5px;
}

.post-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-detail::before {
  content: '';
  display: block;
  height: 240px;
  background: linear-gradient(135deg, ${gradientStart}22, ${gradientEnd}22),
              linear-gradient(135deg, ${gradientStart}11, ${gradientEnd}11);
  border-radius: 20px;
  margin-bottom: 32px;
  border: 1px solid var(--border);
}

.post-title {
  font-family: 'Poppins', sans-serif;
  font-size: 40px;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
  color: var(--fg);
  font-weight: 700;
  line-height: 1.2;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Poppins', sans-serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.5em;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}, transparent) 1;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 4px solid transparent;
  border-image: linear-gradient(to bottom, ${gradientStart}, ${gradientEnd}) 1;
  padding-left: 20px;
  color: var(--muted);
  margin: 1.2em 0;
  font-style: italic;
  background: var(--accent-light);
  padding: 16px 20px;
  border-radius: 0 12px 12px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid transparent;
  background: linear-gradient(to right, ${accent}, ${accent}) no-repeat right bottom / 0 1px;
  transition: background-size 0.3s;
  background-position: left bottom;
}

.post-content a:hover {
  background-size: 100% 1px;
}

.post-toc {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 16px;
  font-size: 0.85em;
  line-height: 1.6;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}44; border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  font-size: 0.85em;
  font-family: 'Poppins', sans-serif;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: all 0.2s;
  line-height: 1.5;
  text-decoration: none;
  border-radius: 6px;
  padding-left: 8px;
}

.toc-nav a.toc-h1 { font-weight: 700; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 20px; }
.toc-nav a.toc-h4 { padding-left: 32px; }
.toc-nav a.toc-h5 { padding-left: 44px; }
.toc-nav a.toc-h6 { padding-left: 56px; }
.toc-nav a:hover, .toc-nav a.active {
  color: ${accent};
  background: var(--accent-light);
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  transition: color 0.2s;
  font-weight: 500;
}

.back-link:hover {
  color: ${accent};
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.card {
  animation: themeFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
.card:nth-child(5) { animation-delay: 0.32s; }
.card:nth-child(6) { animation-delay: 0.4s; }

@keyframes numberPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.card:hover .card-date {
  animation: numberPop 0.4s ease;
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 32px; letter-spacing: -0.5px; }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card { border-radius: 12px; }
  .card::before { height: 100px; }
  .card:hover { transform: translateY(-2px); }
  .blog-nav { gap: 2px; overflow-x: auto; }
  .nav-link { padding: 6px 12px; font-size: 12px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-hero { padding: 48px 16px 32px; }
  .post-detail::before { height: 140px; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

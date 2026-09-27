/**
 * getVaporwaveCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Vaporwave — 「蒸汽波」──────────────────────────────────
export function getVaporwaveCss(isDark: boolean): string {
  const bg = isDark ? '#0a0a1a' : '#fff0f5'
  const fg = isDark ? '#e0d0ff' : '#2a1a3a'
  const muted = isDark ? '#8070a0' : '#8a6a9a'
  const accent = isDark ? '#b967ff' : '#b967ff'
  const accentLight = isDark ? 'rgba(185,103,255,0.12)' : 'rgba(185,103,255,0.08)'
  const cardBg = isDark ? '#141028' : '#ffffff'
  const border = isDark ? '#2a2048' : '#e0d0e8'
  const pink = '#ff71ce'
  const cyan = '#01cdfe'
  const green = '#05ffa1'
  const purple = '#b967ff'
  const shadowBase = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.06)'

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
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: none;
  background: linear-gradient(90deg, ${pink}22, ${cyan}22, ${green}22, ${purple}22);
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(90deg, ${pink}, ${cyan}, ${green}, ${purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
}

.nav-link {
  color: var(--fg);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 20px;
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${accent}33;
}

.nav-link:hover {
  border-color: ${accent};
  box-shadow: 0 0 12px ${accent}44;
}

.nav-link.active {
  color: ${accent};
  border-color: ${accent};
  box-shadow: 0 0 16px ${accent}44;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: ${accent};
  border-radius: 50%;
  box-shadow: 0 0 8px ${accent};
}

.blog-hero {
  background: linear-gradient(180deg, transparent 0%, ${isDark ? '#1a0a2a' : '#f0e0ff'} 100%);
  position: relative;
  text-align: center;
  padding: 80px 0 120px;
  overflow: hidden;
}

.blog-hero::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background:
    repeating-linear-gradient(90deg, ${accent}33 0px, ${accent}33 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(0deg, ${accent}33 0px, ${accent}33 1px, transparent 1px, transparent 40px);
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 0.05em;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  z-index: 1;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 28px 24px;
  position: relative;
  border: 1px solid ${accent}33;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
}

.card:hover {
  transform: translateY(-4px);
  border-color: ${accent}66;
  box-shadow: 0 8px 32px ${accent}22;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.02em;
}

.card-date {
  color: ${cyan};
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 300;
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

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${accent}33;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  background: linear-gradient(90deg, ${pink}, ${cyan});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid ${purple}44;
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${purple};
  margin-bottom: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${pink};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  background: linear-gradient(90deg, ${green}, ${purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  color: ${purple};
  border: 1px solid ${purple}33;
  border-radius: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  border-color: ${purple};
  box-shadow: 0 0 12px ${purple}33;
  transform: translateY(-2px);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${pink};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${pink}33;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid ${accent}22;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${pink};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid ${accent}33;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 300;
  letter-spacing: 0.1em;
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
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 1em;
  background: linear-gradient(180deg, ${pink}, ${cyan});
  margin-right: 12px;
  vertical-align: middle;
  border-radius: 2px;
}

.post-content pre {
  background: ${isDark ? 'rgba(20,10,40,0.8)' : 'rgba(255,240,245,0.8)'};
  backdrop-filter: blur(8px);
  padding: 20px 24px;
  border: 1px solid ${accent}33;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${pink};
}

.post-content blockquote {
  border-left: 3px solid ${purple};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: ${isDark ? 'rgba(20,10,40,0.4)' : 'rgba(255,240,245,0.4)'};
  border-radius: 0 8px 8px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid ${accent}33;
  box-shadow: 0 4px 16px ${shadowBase};
}

.post-content a {
  color: ${cyan};
  text-decoration: none;
  border-bottom: 1px dashed ${cyan}66;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-color: ${cyan};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}33; border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 2px solid ${accent}33;
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${accent};
  border-left-color: ${accent};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${pink};
}

@keyframes vaporwaveFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: vaporwaveFadeIn 0.5s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .blog-hero { padding: 60px 0 80px; }
  .blog-hero::before { height: 100px; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 6px 12px; }
  .post-title { font-size: 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

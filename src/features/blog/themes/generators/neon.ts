/**
 * getNeonCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Neon — 「赛博夜城」──────────────────────────────────────
export function getNeonCss(_isDark: boolean): string {
  // 霓虹主题始终暗色，忽略 isDark
  const bg = '#0a0a14'
  const fg = '#e0e0ff'
  const muted = '#6060a0'
  const accent = '#ff00ff'
  const accentLight = 'rgba(255,0,255,0.1)'
  const cardBg = '#14142a'
  const border = '#2a2a4a'

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
  font-family: 'Inter', 'JetBrains Mono', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.015) 2px, rgba(255,0,255,0.015) 4px),
    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,255,255,0.01) 2px, rgba(0,255,255,0.01) 4px);
}

/* 扫描线效果 */
body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0,0,0,0.03) 1px,
    rgba(0,0,0,0.03) 2px
  );
  pointer-events: none;
  z-index: 9999;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px;
  position: relative;
}

/* 两侧霓虹装饰线 */
.blog-container::before,
.blog-container::after {
  content: '';
  position: fixed;
  top: 0;
  bottom: 0;
  width: 2px;
  z-index: 10;
}
.blog-container::before {
  left: max(calc(50% - 481px), 8px);
  background: linear-gradient(180deg, #ff00ff, #00ffff, #ff00ff);
  box-shadow: 0 0 8px #ff00ff, 0 0 16px #ff00ff, 0 0 32px rgba(255,0,255,0.3);
  animation: neonLinePulse 3s ease-in-out infinite;
}
.blog-container::after {
  right: max(calc(50% - 481px), 8px);
  background: linear-gradient(180deg, #00ffff, #ff00ff, #00ffff);
  box-shadow: 0 0 8px #00ffff, 0 0 16px #00ffff, 0 0 32px rgba(0,255,255,0.3);
  animation: neonLinePulse 3s ease-in-out infinite 1.5s;
}

@keyframes neonLinePulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.blog-header {
  padding: 48px 0 24px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  border-image: linear-gradient(90deg, transparent, #ff00ff, #00ffff, #ff00ff, transparent) 1;
}

.blog-header-site {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 500;
  color: var(--fg);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(255,0,255,0.5), 0 0 20px rgba(255,0,255,0.3), 0 0 40px rgba(255,0,255,0.1);
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 20px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 6px 16px;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: #00ffff;
  text-shadow: 0 0 8px #00ffff, 0 0 16px rgba(0,255,255,0.4), 0 0 32px rgba(0,255,255,0.2);
  border-color: rgba(0,255,255,0.3);
  animation: neonFlicker 0.15s ease-in-out;
}

.nav-link.active {
  color: #ff00ff;
  text-shadow: 0 0 8px #ff00ff, 0 0 16px rgba(255,0,255,0.4), 0 0 32px rgba(255,0,255,0.2);
  border-color: rgba(255,0,255,0.3);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: #ff00ff;
  box-shadow: 0 0 6px #ff00ff, 0 0 12px rgba(255,0,255,0.4);
}

@keyframes neonFlicker {
  0% { opacity: 1; }
  25% { opacity: 0.7; }
  50% { opacity: 1; }
  75% { opacity: 0.85; }
  100% { opacity: 1; }
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 52px;
  font-weight: 300;
  color: var(--fg);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255,0,255,0.4), 0 0 20px rgba(255,0,255,0.2), 0 0 60px rgba(255,0,255,0.1);
  animation: neonGlow 4s ease-in-out infinite;
}

@keyframes neonGlow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(255,0,255,0.4), 0 0 20px rgba(255,0,255,0.2), 0 0 60px rgba(255,0,255,0.1);
  }
  33% {
    text-shadow: 0 0 10px rgba(0,255,255,0.4), 0 0 20px rgba(0,255,255,0.2), 0 0 60px rgba(0,255,255,0.1);
  }
  66% {
    text-shadow: 0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2), 0 0 60px rgba(0,255,0,0.1);
  }
}

.hero-description {
  color: var(--muted);
  font-size: 15px;
  letter-spacing: 0.15em;
  font-family: 'JetBrains Mono', monospace;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  box-shadow:
    inset 0 0 20px rgba(255,0,255,0.03),
    0 0 8px rgba(255,0,255,0.05),
    0 0 16px rgba(0,255,255,0.03);
  transition: all 0.4s ease;
}

/* 背景微光粒子效果 */
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    radial-gradient(1px 1px at 20% 30%, rgba(255,0,255,0.3), transparent),
    radial-gradient(1px 1px at 60% 70%, rgba(0,255,255,0.2), transparent),
    radial-gradient(1px 1px at 80% 20%, rgba(0,255,0,0.2), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(255,0,255,0.15), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
}

.card:hover {
  border-color: #00ffff;
  box-shadow:
    inset 0 0 30px rgba(0,255,255,0.06),
    0 0 12px rgba(0,255,255,0.1),
    0 0 24px rgba(0,255,255,0.05),
    0 0 48px rgba(0,255,255,0.03);
  transform: translateY(-2px);
}

.card:hover::before {
  opacity: 1;
}

.card:nth-child(3n+1):hover {
  border-color: #ff00ff;
  box-shadow:
    inset 0 0 30px rgba(255,0,255,0.06),
    0 0 12px rgba(255,0,255,0.1),
    0 0 24px rgba(255,0,255,0.05),
    0 0 48px rgba(255,0,255,0.03);
}

.card:nth-child(3n+2):hover {
  border-color: #00ffff;
  box-shadow:
    inset 0 0 30px rgba(0,255,255,0.06),
    0 0 12px rgba(0,255,255,0.1),
    0 0 24px rgba(0,255,255,0.05),
    0 0 48px rgba(0,255,255,0.03);
}

.card:nth-child(3n):hover {
  border-color: #00ff00;
  box-shadow:
    inset 0 0 30px rgba(0,255,0,0.06),
    0 0 12px rgba(0,255,0,0.1),
    0 0 24px rgba(0,255,0,0.05),
    0 0 48px rgba(0,255,0,0.03);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-date {
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
  text-shadow: 0 0 6px rgba(255,0,255,0.3);
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 12px;
  background: rgba(255,0,255,0.08);
  color: #ff00ff;
  border: 1px solid rgba(255,0,255,0.25);
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-shadow: 0 0 4px rgba(255,0,255,0.3);
}

.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 10px rgba(255,0,255,0.3), 0 0 20px rgba(255,0,255,0.15);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid var(--border);
  border-image: linear-gradient(180deg, #ff00ff, transparent) 1;
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  color: #00ffff;
  margin-bottom: 16px;
  text-shadow: 0 0 8px rgba(0,255,255,0.3);
  letter-spacing: 0.15em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,0,255,0.06);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

.archive-item-date {
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.1em;
}

.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 10px rgba(255,0,255,0.3), 0 0 20px rgba(255,0,255,0.15);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: rgba(255,0,255,0.06);
  color: #ff00ff;
  border: 1px solid rgba(255,0,255,0.2);
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  text-shadow: 0 0 4px rgba(255,0,255,0.2);
}

.tag-cloud-item:hover {
  background: rgba(255,0,255,0.15);
  border-color: #ff00ff;
  box-shadow: 0 0 10px rgba(255,0,255,0.2), 0 0 20px rgba(255,0,255,0.1);
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.5);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: #00ffff;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,255,255,0.2);
  text-shadow: 0 0 6px rgba(0,255,255,0.3);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,0,255,0.06);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
}

.tag-post-item a:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

.tag-post-date {
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid var(--border);
  border-image: linear-gradient(90deg, transparent, #ff00ff, #00ffff, #ff00ff, transparent) 1;
  margin-top: 48px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.2em;
}

.post-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 32px;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 40px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 12px rgba(255,0,255,0.4), 0 0 24px rgba(255,0,255,0.2), 0 0 48px rgba(255,0,255,0.1);
  animation: neonGlow 4s ease-in-out infinite;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  margin-bottom: 32px;
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
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  letter-spacing: 0.12em;
  text-shadow: 0 0 8px rgba(255,0,255,0.2);
}

.post-content h1 { text-transform: uppercase; }

.post-content pre {
  background: #0c0c1e;
  padding: 20px;
  border: 1px solid rgba(255,0,255,0.15);
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  box-shadow: inset 0 0 20px rgba(255,0,255,0.03), 0 0 8px rgba(255,0,255,0.05);
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: #00ffff;
  text-shadow: 0 0 4px rgba(0,255,255,0.3);
}

.post-content pre code {
  color: #e0e0ff;
  text-shadow: none;
}

.post-content blockquote {
  border-left: 3px solid #ff00ff;
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  box-shadow: inset 3px 0 12px rgba(255,0,255,0.05);
}

.post-content img {
  max-width: 100%;
  border-radius: 4px;
  border: 1px solid rgba(255,0,255,0.15);
}

.post-content a {
  color: #00ffff;
  text-decoration: none;
  border-bottom: 1px solid rgba(0,255,255,0.3);
  text-shadow: 0 0 4px rgba(0,255,255,0.2);
}

.post-content a:hover {
  border-bottom-color: #00ffff;
  text-shadow: 0 0 8px rgba(0,255,255,0.4);
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(255,0,255,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
  text-shadow: 0 0 4px rgba(255,0,255,0.2);
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 1px solid rgba(255,0,255,0.15);
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: #ff00ff;
  border-left-color: #ff00ff;
  text-shadow: 0 0 4px rgba(255,0,255,0.3);
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.1em;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: themeFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-container::before, .blog-container::after { display: none; }
  .hero-title { font-size: 28px; letter-spacing: 0.1em; }
  .card { padding: 20px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 4px 10px; }
  .post-title { font-size: 24px; letter-spacing: 0.08em; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 22px; }
  .blog-header-site { font-size: 16px; letter-spacing: 0.15em; }
  .archive-item { flex-direction: column; align-items: flex-start; gap: 4px; }
}
`
}

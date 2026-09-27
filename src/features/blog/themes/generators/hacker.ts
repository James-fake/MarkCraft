/**
 * getHackerCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Hacker — 「矩阵代码雨」────────────────────────────────
export function getHackerCss(isDark: boolean): string {
  const bg = isDark ? '#000000' : '#0a0a0a'
  const fg = isDark ? '#00ff41' : '#00ff41'
  const muted = isDark ? '#008020' : '#009930'
  const accent = isDark ? '#00ff41' : '#00ff41'
  const accentLight = isDark ? 'rgba(0,255,65,0.08)' : 'rgba(0,255,65,0.06)'
  const cardBg = isDark ? '#0a0f0a' : '#0f1a0f'
  const border = isDark ? '#004010' : '#005015'
  const dimGreen = isDark ? 'rgba(0,255,65,0.2)' : 'rgba(0,255,65,0.15)'
  const darkGreen = isDark ? '#001a08' : '#002010'
  const promptColor = isDark ? '#00cc33' : '#00dd38'
  const rainColor = isDark ? 'rgba(0,255,65,0.06)' : 'rgba(0,255,65,0.04)'

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
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  background: ${bg};
  color: ${fg};
  line-height: 1.6;
  min-height: 100vh;
  font-size: 14px;
  position: relative;
  overflow-x: hidden;
}

/* ── 代码雨背景动画 ── */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    ${rainColor} 0px,
    transparent 2px,
    transparent 40px
  );
  background-size: 100% 40px;
  animation: matrixRain 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes matrixRain {
  0% { background-position: 0 0; }
  100% { background-position: 0 400px; }
}

.blog-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

/* ── 终端风格头部 ── */
.blog-header {
  padding: 16px 0 0;
  text-align: left;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: 'root@blog:~$ ';
  display: block;
  color: ${promptColor};
  font-size: 12px;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.blog-header-site {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  font-weight: 400;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 12px;
  position: relative;
  display: inline-block;
}

.blog-header-site::after {
  content: '_';
  animation: cursorBlink 1s step-end infinite;
  color: ${fg};
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── 终端命令行导航 ── */
.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 4px;
  margin-top: 0;
  padding: 8px 0;
  border-bottom: 1px solid ${border};
  flex-wrap: wrap;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  position: relative;
  padding: 4px 12px;
  display: inline-block;
}

.nav-link::before {
  content: '$ ';
  color: ${promptColor};
  font-size: 12px;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: ${fg};
  box-shadow: 0 0 6px ${fg};
}

/* ── Hero ── */
.blog-hero {
  text-align: left;
  padding: 48px 0 32px;
  position: relative;
}

.hero-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 400;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-shadow: 0 0 10px ${dimGreen}, 0 0 20px ${dimGreen};
}

.hero-title::before {
  content: '> ';
  color: ${promptColor};
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  letter-spacing: 0.5px;
}

.hero-description::before {
  content: '# ';
  color: ${dimGreen};
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 文件列表样式卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 0;
}

.card-grid::before {
  content: 'total ' attr(data-count);
  display: block;
  padding: 4px 0;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 4px;
}

.card {
  background: transparent;
  border-radius: 0;
  padding: 8px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid ${border};
  text-decoration: none;
  color: inherit;
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 12px;
  align-items: baseline;
  transition: background 0.15s;
  animation: hackerFadeIn 0.4s ease-out both;
  font-size: 13px;
}

/* 文件权限标记 + 日期 */
.card::before {
  content: 'drwxr-xr-x  ';
  color: ${dimGreen};
  font-size: 11px;
  letter-spacing: 0;
  grid-column: 1;
  white-space: nowrap;
}

.card:hover {
  background: ${accentLight};
}

@keyframes hackerFadeIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.card:nth-child(2) { animation-delay: 0.06s; }
.card:nth-child(3) { animation-delay: 0.12s; }
.card:nth-child(4) { animation-delay: 0.18s; }
.card:nth-child(5) { animation-delay: 0.24s; }

.card-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 0;
  color: ${fg};
  letter-spacing: 0.5px;
  grid-column: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title::after {
  content: '.md';
  color: ${muted};
  font-size: 12px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  grid-column: 3;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

.card-excerpt {
  color: ${muted};
  font-size: 12px;
  line-height: 1.5;
  grid-column: 2 / -1;
  padding-left: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-excerpt::before {
  content: '// ';
  color: ${dimGreen};
}

.card-tags {
  grid-column: 2 / -1;
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: transparent;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', monospace;
}

.tag::before {
  content: '[';
  color: ${dimGreen};
}

.tag::after {
  content: ']';
  color: ${dimGreen};
}

/* ── 归档 ── */
.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 1px;
  color: ${fg};
}

.archive-title::before {
  content: '$ ls -la /archive  ';
  color: ${promptColor};
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.archive-year {
  margin-bottom: 20px;
  padding-left: 16px;
  border-left: 1px solid ${border};
}

.archive-year-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  color: ${fg};
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.archive-year-title::before {
  content: 'drwxr-xr-x  ';
  color: ${dimGreen};
  font-size: 11px;
}

.archive-item {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.archive-item::before {
  content: '-rw-r--r--  ';
  color: ${dimGreen};
  font-size: 10px;
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  flex: 1;
}

.archive-item a:hover {
  color: ${fg};
  text-shadow: 0 0 8px ${dimGreen};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  margin-left: 12px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 1px;
  color: ${fg};
}

.tags-title::before {
  content: '$ find . -tags  ';
  color: ${promptColor};
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 3px 12px;
  background: transparent;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.tag-cloud-item::before {
  content: '<';
  color: ${dimGreen};
}

.tag-cloud-item::after {
  content: '/>';
  color: ${dimGreen};
}

.tag-cloud-item:hover {
  color: ${fg};
  border-color: ${fg};
  background: ${accentLight};
  text-shadow: 0 0 6px ${dimGreen};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  color: ${fg};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
  letter-spacing: 0.5px;
}

.tag-posts-title::before {
  content: '$ grep -r "';
  color: ${promptColor};
}

.tag-posts-title::after {
  content: '" .';
  color: ${promptColor};
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid ${border};
  font-size: 13px;
}

.tag-post-item::before {
  content: '-rw-r--r--  ';
  color: ${dimGreen};
  font-size: 10px;
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  text-shadow: 0 0 8px ${dimGreen};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  margin-left: 10px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: left;
  padding: 24px 0;
  border-top: 1px solid ${border};
  margin-top: 32px;
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', monospace;
}

.blog-footer::before {
  content: 'root@blog:~$ exit';
  display: block;
  color: ${promptColor};
  margin-bottom: 8px;
  font-size: 13px;
}

.blog-footer::after {
  content: '_';
  animation: cursorBlink 1s step-end infinite;
  color: ${fg};
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
}

.post-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 22px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 1px;
  color: ${fg};
  text-shadow: 0 0 10px ${dimGreen}, 0 0 20px ${dimGreen};
  position: relative;
}

.post-title::before {
  content: '$ cat ';
  color: ${promptColor};
  font-size: 16px;
  font-weight: 400;
}

.post-title::after {
  content: '.md';
  color: ${muted};
  font-size: 16px;
}

.post-meta {
  text-align: left;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 24px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${border};
}

.post-meta::before {
  content: 'root@blog:~$ stat  ';
  color: ${promptColor};
  font-size: 11px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1em;
  position: relative;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  margin: 1.3em 0 0.6em;
  color: ${fg};
  font-weight: 400;
  letter-spacing: 0.5px;
}

.post-content h2::before {
  content: '## ';
  color: ${promptColor};
}

.post-content h3::before {
  content: '### ';
  color: ${promptColor};
}

.post-content pre {
  background: ${darkGreen};
  padding: 14px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'bash';
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 9px;
  color: ${dimGreen};
  text-transform: uppercase;
  letter-spacing: 1px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${fg};
  text-shadow: 0 0 4px ${dimGreen};
}

.post-content blockquote {
  border-left: 2px solid ${fg};
  padding: 10px 16px;
  color: ${muted};
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  position: relative;
}

.post-content blockquote::before {
  content: '# ';
  color: ${promptColor};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
}

.post-content a {
  color: ${fg};
  text-decoration: none;
  border-bottom: 1px solid ${border};
  text-shadow: 0 0 4px ${dimGreen};
}

.post-content a:hover {
  border-bottom-color: ${fg};
  text-shadow: 0 0 10px ${dimGreen};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 0; }

.toc-title {
  font-weight: 400;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
}

.toc-title::before {
  content: '$ tree  ';
  color: ${promptColor};
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 400; color: ${fg}; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${fg}; text-shadow: 0 0 6px ${dimGreen}; }

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  transition: color 0.15s;
  display: inline-block;
  margin-bottom: 16px;
  font-family: 'JetBrains Mono', monospace;
}

.back-link::before {
  content: '$ cd ..  ';
  color: ${promptColor};
}

.back-link:hover {
  color: ${fg};
  text-shadow: 0 0 6px ${dimGreen};
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 20px; letter-spacing: 1px; }
  .card {
    grid-template-columns: 1fr;
    padding: 8px 0;
  }
  .card::before {
    content: '-rw-r--r-x  ';
    font-size: 10px;
  }
  .card-title { grid-column: 1; }
  .card-date { grid-column: 1; }
  .card-excerpt { grid-column: 1; }
  .card-tags { grid-column: 1; }
  .blog-nav { gap: 2px; }
  .nav-link { padding: 4px 8px; font-size: 12px; }
  .post-title { font-size: 18px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

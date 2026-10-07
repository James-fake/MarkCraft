/**
 * getDocsCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Docs ──────────────────────────────────────────────────
export function getDocsCss(isDark: boolean): string {
  const bg = isDark ? '#0f172a' : '#ffffff'
  const fg = isDark ? '#e2e8f0' : '#1e293b'
  const muted = isDark ? '#64748b' : '#94a3b8'
  const accent = isDark ? '#60a5fa' : '#2563eb'
  const accentLight = isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)'
  const cardBg = isDark ? '#1e293b' : '#f8fafc'
  const border = isDark ? '#334155' : '#e2e8f0'
  const sidebarBg = isDark ? '#1e293b' : '#f1f5f9'
  const codeBg = isDark ? '#0f172a' : '#f1f5f9'

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
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

/* ── Three-column grid layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 240px 1fr 180px;
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
}

/* ── Left sidebar: navigation ── */
.blog-header {
  grid-column: 1;
  grid-row: 1 / -1;
  background: ${sidebarBg};
  border-right: 1px solid var(--border);
  padding: 0;
  text-align: left;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.blog-header-site {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: 0.5px;
  padding: 20px 20px 8px;
  text-transform: uppercase;
  position: relative;
}

.blog-header-site::after {
  content: 'v1.0';
  font-size: 10px;
  font-weight: 400;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 8px;
  vertical-align: middle;
  letter-spacing: 0;
  text-transform: none;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 12px;
  padding: 0 8px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 8px 12px;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  display: block;
}

.nav-link:hover {
  color: var(--fg);
  background: ${accentLight};
  border-left-color: ${accent};
}

.nav-link.active {
  color: ${accent};
  background: ${accentLight};
  border-left: 2px solid ${accent};
  font-weight: 500;
}

.nav-link.active::after {
  display: none;
}

/* ── Right sidebar: TOC area ── */
.blog-hero {
  grid-column: 3;
  grid-row: 1 / -1;
  background: ${sidebarBg};
  border-left: 1px solid var(--border);
  padding: 20px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  text-align: left;
}

.hero-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.hero-description {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  letter-spacing: 0;
}

/* ── Main content area ── */
.blog-view { display: none; }
.view-home { display: block; }

.page-section {
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 0;
}

.page-section.active {
  display: block;
  animation: none;
}

/* ── Card grid: list-style docs cards ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 32px;
}

.card {
  background: var(--bg);
  border-radius: 0;
  padding: 16px 20px 16px 44px;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card::before {
  content: '\\1F4C4';
  position: absolute;
  left: 16px;
  top: 16px;
  font-size: 16px;
  line-height: 1;
}

.card:hover {
  background: ${accentLight};
  border-color: var(--border);
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--fg);
  letter-spacing: 0;
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 3px;
  font-size: 11px;
  letter-spacing: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 32px;
}

.archive-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 600;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  display: inline-block;
}

.archive-year {
  margin-bottom: 24px;
  padding-left: 0;
  border-left: none;
}

.archive-year-title {
  font-size: 16px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 0;
}

.archive-item {
  padding: 6px 0 6px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 2px solid var(--border);
  transition: border-color 0.15s;
}

.archive-item:hover {
  border-left-color: ${accent};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 32px;
}

.tags-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 600;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  display: inline-block;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 4px 12px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 3px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: var(--bg);
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 16px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 2;
  text-align: left;
  padding: 20px 32px;
  border-top: 1px solid var(--border);
  margin-top: 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
}

/* ── Post detail ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 32px;
}

.post-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
  color: var(--fg);
  position: relative;
  padding-left: 16px;
}

.post-title::before {
  content: '#';
  position: absolute;
  left: 0;
  color: ${accent};
  font-weight: 400;
  opacity: 0.5;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
}

.post-content p {
  margin-bottom: 1em;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  position: relative;
}

.post-content h2 {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 0.8em;
  background: ${accent};
  border-radius: 2px;
  margin-right: 8px;
  vertical-align: middle;
}

.post-content pre {
  background: ${codeBg};
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  position: relative;
}

.post-content pre::before {
  content: attr(data-lang);
  position: absolute;
  top: 4px;
  right: 48px;
  font-size: 10px;
  color: var(--muted);
  background: ${border};
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content pre code {
  color: var(--fg);
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  border-radius: 0 4px 4px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${accent};
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${sidebarBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.post-content td {
  padding: 8px 14px;
  border: 1px solid var(--border);
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

/* ── Animation ── */
@keyframes docsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: docsFadeIn 0.3s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.03s; }
.card:nth-child(3) { animation-delay: 0.06s; }
.card:nth-child(4) { animation-delay: 0.09s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .blog-container {
    grid-template-columns: 1fr;
  }
  .blog-header {
    grid-column: 1;
    grid-row: auto;
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .blog-nav {
    flex-direction: row;
    gap: 0;
    overflow-x: auto;
    padding: 0 12px;
    margin-top: 0;
  }
  .nav-link {
    border-left: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    white-space: nowrap;
    padding: 10px 12px;
  }
  .nav-link:hover,
  .nav-link.active {
    border-left: none;
    border-bottom-color: ${accent};
    background: none;
  }
  .blog-hero {
    display: none;
  }
  .page-section {
    grid-column: 1;
    grid-row: auto;
  }
  .blog-footer {
    grid-column: 1;
  }
  .post-body-layout {
    grid-template-columns: 1fr;
  }
  .post-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .blog-container {
    padding: 0;
  }
  .card-grid {
    padding: 16px;
  }
  .card {
    padding: 12px 16px 12px 40px;
  }
  .post-detail {
    padding: 16px;
  }
  .post-title {
    font-size: 22px;
  }
  .blog-archive,
  .blog-tags {
    padding: 16px;
  }
  .blog-footer {
    padding: 16px;
  }
}
`
}

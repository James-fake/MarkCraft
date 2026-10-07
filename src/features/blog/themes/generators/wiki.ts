/**
 * getWikiCss —— 从 newThemes.ts 拆分而来的主题 CSS 生成器（P1-3 巨型文件治理）。
 * 内容与拆分前逐字一致（含注释头），仅文件位置变化；对外 API 经 newThemes.ts 桶保持不变。
 */

// ─── Wiki ──────────────────────────────────────────────────
export function getWikiCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#ffffff'
  const fg = isDark ? '#e0e0e0' : '#202122'
  const muted = isDark ? '#72777d' : '#72777d'
  const accent = isDark ? '#6ea8ff' : '#336699'
  const accentLight = isDark ? 'rgba(110,168,255,0.1)' : 'rgba(51,102,153,0.08)'
  const cardBg = isDark ? '#252540' : '#f8f9fa'
  const border = isDark ? '#3a3a5c' : '#c8ccd1'
  const sidebarBg = isDark ? '#16162a' : '#f8f9fa'
  const infobg = isDark ? '#1e1e38' : '#f8f9fa'

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
  font-family: 'Georgia', 'Noto Serif SC', 'Times New Roman', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.65;
  min-height: 100vh;
  font-size: 14px;
}

/* ── Two-column grid layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Left sidebar: directory ── */
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
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--border);
}

.blog-header-site::after {
  content: '';
  display: block;
  width: 24px;
  height: 2px;
  background: ${accent};
  margin-top: 6px;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 7px 16px;
  border-left: 3px solid transparent;
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
  border-left: 3px solid ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero area (used as content header) ── */
.blog-hero {
  grid-column: 2;
  padding: 0;
  text-align: left;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.hero-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 0;
  margin-bottom: 4px;
  padding: 20px 28px 0;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0;
  padding: 0 28px 16px;
  font-style: italic;
}

/* ── Tab-style navigation at top of content ── */
.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
  padding: 0;
}

/* ── Main content ── */
.blog-view { display: none; }
.view-home { display: block; }

.page-section {
  grid-column: 2;
  grid-row: auto;
  padding: 0;
}

.page-section.active {
  display: block;
  animation: none;
}

/* ── Card grid with infobox ── */
.card-grid {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 24px;
  padding: 24px 28px;
  align-items: start;
}

/* Infobox: first card in right column gets special styling */
.card-grid .card:nth-child(1) {
  grid-column: 1;
}

.card-grid .card:nth-child(2) {
  grid-column: 2;
  grid-row: 1 / 4;
  background: ${infobg};
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
}

.card-grid .card:nth-child(2)::before {
  content: '\\2139\\FE0F  Summary';
  display: block;
  font-weight: 700;
  font-size: 14px;
  color: var(--fg);
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 2px solid ${accent};
  font-family: 'Georgia', 'Noto Serif SC', serif;
  letter-spacing: 0.5px;
}

.card-grid .card:nth-child(n+3) {
  grid-column: 1;
}

.card {
  background: var(--bg);
  border-radius: 0;
  padding: 12px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card:hover {
  background: ${accentLight};
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${accent};
  letter-spacing: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
}

.card:hover .card-title {
  text-decoration-color: ${accent};
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
  margin-bottom: 4px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.card-tags {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  background: ${accentLight};
  color: ${accent};
  border: none;
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 0;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 28px;
}

.archive-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 20px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.archive-year {
  margin-bottom: 20px;
  padding-left: 16px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-size: 17px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 8px;
  font-family: 'Georgia', 'Noto Serif SC', serif;
  letter-spacing: 0;
}

.archive-item {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
  font-size: 14px;
  transition: text-decoration-color 0.15s;
}

.archive-item a:hover {
  text-decoration-color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 28px;
}

.tags-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 20px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: var(--bg);
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 17px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
  font-size: 14px;
  transition: text-decoration-color 0.15s;
}

.tag-post-item a:hover {
  text-decoration-color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 2;
  text-align: left;
  padding: 16px 28px;
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
  padding: 28px;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 26px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 8px;
  letter-spacing: 0;
  color: var(--fg);
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 28px;
  align-items: start;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px;
  font-size: 0.85em;
  line-height: 1.5;
  background: ${infobg};
  border: 1px solid var(--border);
  border-radius: 0;
}

.post-content p {
  margin-bottom: 0.8em;
  font-size: 14px;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 1.3em 0 0.5em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2 {
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.post-content pre {
  background: ${infobg};
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 4px;
}

.post-content pre code {
  background: none;
  padding: 0;
  color: var(--fg);
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 6px 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
}

.post-content a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
}

.post-content a:hover {
  text-decoration-color: ${accent};
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 13px;
}

.post-content th {
  background: ${infobg};
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.post-content td {
  padding: 6px 12px;
  border: 1px solid var(--border);
}

.post-content tr:hover td {
  background: ${accentLight};
}

/* Footnotes */
.post-content sup a {
  color: ${accent};
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8em;
  vertical-align: super;
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
  text-decoration: underline;
}

/* ── Edit button decoration ── */
.blog-footer::before {
  content: '\\270E  Edit';
  display: inline-block;
  font-size: 11px;
  color: ${accent};
  border: 1px solid ${border};
  padding: 2px 8px;
  margin-right: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Georgia', serif;
}

.blog-footer:hover::before {
  background: ${accentLight};
  border-color: ${accent};
}

/* ── Animation ── */
@keyframes wikiFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: wikiFadeIn 0.25s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.02s; }
.card:nth-child(3) { animation-delay: 0.04s; }

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
    border-bottom: 1px solid var(--border);
  }
  .nav-link {
    border-left: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    padding: 10px 14px;
    font-size: 13px;
  }
  .nav-link:hover,
  .nav-link.active {
    border-left: none;
    border-bottom-color: ${accent};
    background: none;
  }
  .blog-hero {
    grid-column: 1;
  }
  .page-section {
    grid-column: 1;
  }
  .blog-footer {
    grid-column: 1;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card-grid .card:nth-child(2) {
    grid-column: 1;
    grid-row: auto;
  }
  .card-grid .card:nth-child(n+3) {
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
    padding: 10px 0;
  }
  .post-detail {
    padding: 16px;
  }
  .post-title {
    font-size: 20px;
  }
  .blog-archive,
  .blog-tags {
    padding: 16px;
  }
  .blog-footer {
    padding: 12px 16px;
  }
  .hero-title {
    font-size: 20px;
    padding: 16px 16px 0;
  }
  .hero-description {
    padding: 0 16px 12px;
  }
}
`
}

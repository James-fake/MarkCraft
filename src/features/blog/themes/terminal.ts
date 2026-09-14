import { ThemeIndexData, escapeHtml } from './types'

export function getTerminalCss(_isDark: boolean): string {
  return `
:root {
  --term-black: #0a0a0a;
  --term-green: #00ff41;
  --term-dark-green: #003300;
  --term-amber: #ffb000;
  --term-dim-green: #00aa2a;
  --term-bg: #0a0a0a;
  --term-fg: #00ff41;
  --term-border: #00ff41;
  --term-card-bg: #0d0d0d;
  --term-muted: #00aa2a;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  background: var(--term-bg);
  color: var(--term-fg);
  line-height: 1.6;
  min-height: 100vh;
  position: relative;
}

body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.15) 0px,
    rgba(0,0,0,0.15) 1px,
    transparent 1px,
    transparent 3px
  );
}

.blog-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 20px 0;
  border-bottom: 1px solid var(--term-dark-green);
}

.blog-header-site {
  color: var(--term-green);
  font-size: 14px;
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
}

.blog-header-site::before {
  content: '$ ';
  color: var(--term-amber);
}

.blog-nav {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}

.nav-link {
  color: var(--term-dim-green);
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s, text-shadow 0.2s;
  position: relative;
}

.nav-link::before {
  content: '> ';
  color: var(--term-amber);
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-link:hover, .nav-link.active {
  color: var(--term-green);
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
}

.nav-link:hover::before, .nav-link.active::before {
  opacity: 1;
}

.blog-view { display: none; }
.view-home { display: block; }

.blog-hero {
  padding: 40px 0 20px;
}

.hero-title {
  font-size: 28px;
  color: var(--term-green);
  text-shadow: 0 0 12px rgba(0,255,65,0.6);
  margin-bottom: 8px;
}

.hero-title::before {
  content: '# ';
  color: var(--term-amber);
}

.hero-description {
  color: var(--term-dim-green);
  font-size: 14px;
}

.hero-description::before {
  content: '// ';
  color: var(--term-muted);
}

.hero-cursor {
  display: inline-block;
  width: 10px;
  height: 18px;
  background: var(--term-green);
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 4px;
}

@keyframes blink {
  50% { opacity: 0; }
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 0;
}

.card {
  background: var(--term-card-bg);
  border: 1px solid var(--term-dark-green);
  border-left: 3px solid var(--term-green);
  padding: 20px 24px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
}

.card::before {
  content: '$ ';
  color: var(--term-amber);
  position: absolute;
  top: 20px;
  left: 8px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover {
  border-color: var(--term-green);
  box-shadow: 0 0 15px rgba(0,255,65,0.15), inset 0 0 15px rgba(0,255,65,0.03);
}

.card:hover::before {
  opacity: 1;
}

.card-title {
  font-size: 16px;
  color: var(--term-green);
  text-shadow: 0 0 6px rgba(0,255,65,0.3);
  margin-bottom: 6px;
  padding-left: 16px;
}

.card-date {
  color: var(--term-muted);
  font-size: 12px;
  padding-left: 16px;
  margin-bottom: 10px;
}

.card-date::before {
  content: '[';
  color: var(--term-dark-green);
}

.card-date::after {
  content: ']';
  color: var(--term-dark-green);
}

.card-excerpt {
  color: var(--term-dim-green);
  font-size: 13px;
  padding-left: 16px;
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-left: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--term-dark-green);
  color: var(--term-green);
  font-size: 11px;
  border-radius: 0;
}

.tag::before {
  content: '--';
  color: var(--term-amber);
  margin-right: 4px;
  font-size: 10px;
}

.blog-archive {
  padding: 24px 0;
}

.archive-title {
  font-size: 20px;
  color: var(--term-green);
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
  margin-bottom: 24px;
}

.archive-title::before {
  content: '$ ls -la /archive/';
  color: var(--term-amber);
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.archive-year {
  margin-bottom: 24px;
}

.archive-year-title {
  font-size: 16px;
  color: var(--term-amber);
  margin-bottom: 8px;
}

.archive-year-title::before {
  content: 'drwxr-xr-x  ';
  color: var(--term-dim-green);
  font-size: 12px;
}

.archive-item {
  padding: 4px 0 4px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.archive-item::before {
  content: '-rw-r--r--  ';
  color: var(--term-muted);
  font-size: 11px;
}

.archive-item a {
  color: var(--term-green);
  text-decoration: none;
  transition: text-shadow 0.2s;
}

.archive-item a:hover {
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
}

.archive-item-date {
  color: var(--term-muted);
  font-size: 12px;
}

.blog-tags {
  padding: 24px 0;
}

.tags-title {
  font-size: 20px;
  color: var(--term-green);
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
  margin-bottom: 24px;
}

.tags-title::before {
  content: '$ grep -r . /tags/';
  color: var(--term-amber);
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 4px 12px;
  border: 1px solid var(--term-dark-green);
  color: var(--term-green);
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s, text-shadow 0.2s;
}

.tag-cloud-item:hover {
  border-color: var(--term-green);
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 16px;
  color: var(--term-amber);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--term-dark-green);
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px dashed var(--term-dark-green);
  font-size: 13px;
}

.tag-post-item a {
  color: var(--term-green);
  text-decoration: none;
}

.tag-post-item a:hover {
  text-shadow: 0 0 8px rgba(0,255,65,0.5);
}

.tag-post-date {
  color: var(--term-muted);
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  padding: 24px 0;
  border-top: 1px solid var(--term-dark-green);
  margin-top: 40px;
  font-size: 12px;
  color: var(--term-muted);
}

.footer-sys-info {
  margin-bottom: 4px;
}

.footer-sys-info::before {
  content: 'SYSTEM> ';
  color: var(--term-amber);
}

.post-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-size: 24px;
  color: var(--term-green);
  text-shadow: 0 0 10px rgba(0,255,65,0.5);
  margin-bottom: 12px;
}

.post-title::before {
  content: '# ';
  color: var(--term-amber);
}

.post-meta {
  color: var(--term-muted);
  font-size: 13px;
  margin-bottom: 24px;
}

.post-meta::before {
  content: '/* ';
}

.post-meta::after {
  content: ' */';
}

.post-content {
  border-left: 2px solid var(--term-dark-green);
  padding-left: 20px;
}

.post-content h1::before { content: '# '; color: var(--term-amber); }
.post-content h2::before { content: '## '; color: var(--term-amber); }
.post-content h3::before { content: '### '; color: var(--term-amber); }

.post-content h1, .post-content h2, .post-content h3 {
  color: var(--term-green);
  text-shadow: 0 0 6px rgba(0,255,65,0.3);
  margin: 1.5em 0 0.8em;
}

.post-content p {
  margin-bottom: 1em;
  line-height: 1.7;
}

.post-content pre {
  background: #050505;
  border: 1px solid var(--term-dark-green);
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--term-green);
}

.post-content blockquote {
  border-left: 2px solid var(--term-amber);
  padding-left: 16px;
  color: var(--term-dim-green);
  margin: 1em 0;
}

.post-content blockquote::before {
  content: '> ';
  color: var(--term-amber);
}

.post-content a {
  color: var(--term-green);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.post-content img {
  max-width: 100%;
  border: 1px solid var(--term-dark-green);
}

@keyframes termGlow {
  0%, 100% { text-shadow: 0 0 8px rgba(0,255,65,0.4); }
  50% { text-shadow: 0 0 16px rgba(0,255,65,0.7); }
}

.hero-title {
  animation: termGlow 3s ease-in-out infinite;
}

@keyframes termFadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.card {
  animation: termFadeIn 0.4s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 12px; }
  .hero-title { font-size: 20px; }
  .card { padding: 14px 16px; }
  .card-title { font-size: 14px; }
  .blog-nav { gap: 12px; flex-wrap: wrap; }
}
`
}

export function getTerminalIndexHtml(data: ThemeIndexData): string {
  const archiveEntries = Array.from(data.archiveByYear.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  const tagEntries = Array.from(data.tagMap.entries())

  const cardsHtml = data.published.map(post => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    return `
      <a class="card" href="${escapeHtml(post.slug)}.html">
        <div class="card-title">${escapeHtml(post.title)}</div>
        <div class="card-date">${escapeHtml(post.date)}</div>
        <div class="card-excerpt">${escapeHtml(post.excerpt || post.description)}</div>
        <div class="card-tags">${tagsHtml}</div>
      </a>
    `
  }).join('')

  const archiveHtml = archiveEntries.map(([year, posts]) => {
    const itemsHtml = posts.map(p => `
      <div class="archive-item">
        <a href="${escapeHtml(p.slug)}.html">${escapeHtml(p.title)}</a>
        <span class="archive-item-date">${escapeHtml(p.date)}</span>
      </div>
    `).join('')
    return `
      <div class="archive-year">
        <div class="archive-year-title">${escapeHtml(year)}/</div>
        ${itemsHtml}
      </div>
    `
  }).join('')

  const tagCloudHtml = data.sortedTags.map(tag => {
    const count = data.tagMap.get(tag)?.length || 0
    return `<a class="tag-cloud-item" data-tag="${escapeHtml(tag)}" href="javascript:void(0)">${escapeHtml(tag)}[${count}]</a>`
  }).join('')

  const tagPostsHtml = tagEntries.map(([tag, posts]) => {
    const itemsHtml = posts.map(p => `
      <div class="tag-post-item">
        <a href="${escapeHtml(p.slug)}.html">${escapeHtml(p.title)}</a>
        <span class="tag-post-date">${escapeHtml(p.date)}</span>
      </div>
    `).join('')
    return `
      <div class="tag-posts-section" id="tag-posts-${escapeHtml(tag)}">
        <div class="tag-posts-title">// ${escapeHtml(tag)}</div>
        ${itemsHtml}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>${getTerminalCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="blog-header-site">${escapeHtml(data.siteTitle)}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">ls home</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">cat archive</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">grep tags</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}<span class="hero-cursor"></span></h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title"></div>
    ${archiveHtml}
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title"></div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="footer-sys-info">Blog engine v1.0.0 | Uptime: ${new Date().toISOString().split('T')[0]}</div>
    <div class="footer-sys-info">&copy; ${escapeHtml(data.author)} | All rights reserved</div>
  </footer>
</div>
<script>
document.querySelectorAll('.nav-link').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    this.classList.add('active');
    var view = this.getAttribute('data-view');
    document.querySelectorAll('.blog-view').forEach(function(v) { v.style.display = 'none'; });
    var el = document.querySelector('.view-' + view);
    if (el) el.style.display = 'block';
  });
});
document.querySelectorAll('.tag-cloud-item').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.tag-posts-section').forEach(function(s) { s.classList.remove('active'); s.style.display = 'none'; });
    var tag = this.getAttribute('data-tag');
    var sec = document.getElementById('tag-posts-' + tag);
    if (sec) { sec.classList.add('active'); sec.style.display = 'block'; }
  });
});
</script>
</body>
</html>`
}

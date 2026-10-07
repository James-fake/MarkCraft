import { ThemeIndexData, escapeHtml } from './types'

export function getNewspaperCss(isDark: boolean): string {
  return `
:root {
  --news-cream: #f5f0e1;
  --news-black: #1a1a1a;
  --news-dark-red: #8b0000;
  --news-grey: #666666;
  --news-light-grey: #999999;
  --news-rule: #1a1a1a;
  --news-bg: ${isDark ? '#1a1a1a' : '#f5f0e1'};
  --news-fg: ${isDark ? '#f5f0e1' : '#1a1a1a'};
  --news-card-bg: ${isDark ? '#252525' : '#faf6eb'};
  --news-border: ${isDark ? '#444' : '#1a1a1a'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', serif;
  background: var(--news-bg);
  color: var(--news-fg);
  line-height: 1.7;
  min-height: 100vh;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 24px 0;
  border-top: 4px double var(--news-border);
  border-bottom: 4px double var(--news-border);
  text-align: center;
}

.masthead {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--news-fg);
  margin-bottom: 4px;
}

.masthead-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--news-grey);
  text-transform: uppercase;
  letter-spacing: 2px;
  padding: 4px 0;
  border-top: 1px solid var(--news-border);
  border-bottom: 1px solid var(--news-border);
  margin-top: 8px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 12px;
}

.nav-link {
  font-family: 'Playfair Display', Georgia, serif;
  color: var(--news-grey);
  text-decoration: none;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-link:hover, .nav-link.active {
  color: var(--news-dark-red);
}

.blog-view { display: none; }
.view-home { display: block; }

.blog-hero {
  padding: 48px 0 32px;
  text-align: center;
  border-bottom: 2px solid var(--news-border);
}

.hero-title {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 52px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.hero-description {
  font-size: 16px;
  color: var(--news-grey);
  font-style: italic;
  max-width: 600px;
  margin: 0 auto;
}

.hero-rule {
  border: none;
  border-top: 1px solid var(--news-border);
  margin: 20px auto;
  width: 40%;
}

.hero-rule-thick {
  border: none;
  border-top: 3px solid var(--news-border);
  margin: 4px auto 0;
  width: 20%;
}

.card-grid {
  padding: 32px 0;
  column-count: 2;
  column-gap: 28px;
}

.card {
  background: var(--news-card-bg);
  break-inside: avoid;
  margin-bottom: 28px;
  padding: 24px;
  border-top: 3px solid var(--news-border);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: border-color 0.3s;
}

.card:hover {
  border-top-color: var(--news-dark-red);
}

.card-category {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--news-dark-red);
  margin-bottom: 8px;
}

.card-title {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
}

.card-byline {
  font-size: 11px;
  color: var(--news-grey);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: var(--news-grey);
  line-height: 1.6;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--news-dark-red);
  border: 1px solid var(--news-dark-red);
}

.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 32px;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-bottom: 32px;
  padding-bottom: 12px;
  border-bottom: 3px double var(--news-border);
}

.archive-year {
  margin-bottom: 28px;
}

.archive-year-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  border-bottom: 2px solid var(--news-border);
  padding-bottom: 6px;
  margin-bottom: 12px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted var(--news-border);
}

.archive-item a {
  color: var(--news-fg);
  text-decoration: none;
  font-size: 15px;
}

.archive-item a:hover {
  color: var(--news-dark-red);
}

.archive-item-date {
  color: var(--news-grey);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 32px;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-bottom: 32px;
  padding-bottom: 12px;
  border-bottom: 3px double var(--news-border);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 4px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--news-dark-red);
  border: 1px solid var(--news-dark-red);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}

.tag-cloud-item:hover {
  background: var(--news-dark-red);
  color: var(--news-cream);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--news-border);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted var(--news-border);
}

.tag-post-item a {
  color: var(--news-fg);
  text-decoration: none;
  font-size: 15px;
}

.tag-post-item a:hover {
  color: var(--news-dark-red);
}

.tag-post-date {
  color: var(--news-grey);
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  padding: 24px 0;
  border-top: 4px double var(--news-border);
  margin-top: 40px;
  text-align: center;
}

.footer-colophon {
  font-size: 11px;
  color: var(--news-grey);
  text-transform: uppercase;
  letter-spacing: 3px;
  line-height: 1.8;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  font-size: 40px;
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  margin-bottom: 16px;
}

.post-meta {
  text-align: center;
  font-size: 12px;
  color: var(--news-grey);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--news-border);
}

.post-content {
  column-count: 1;
  font-size: 16px;
  line-height: 1.8;
}

.post-content p {
  margin-bottom: 1em;
  text-indent: 2em;
}

.drop-cap::first-letter {
  float: left;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 4.5em;
  line-height: 0.8;
  padding-right: 8px;
  padding-top: 4px;
  color: var(--news-dark-red);
  font-weight: 900;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  margin: 1.5em 0 0.5em;
  text-indent: 0;
}

.post-content h2 {
  font-size: 24px;
  border-bottom: 1px solid var(--news-border);
  padding-bottom: 4px;
}

.post-content pre {
  background: ${isDark ? '#1a1a1a' : '#f0ebe0'};
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  border-left: 3px solid var(--news-dark-red);
  text-indent: 0;
}

.post-content code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.post-content blockquote {
  border-left: 3px solid var(--news-dark-red);
  padding-left: 16px;
  color: var(--news-grey);
  margin: 1em 0;
  font-style: italic;
  text-indent: 0;
}

.post-content img {
  max-width: 100%;
}

.post-content a {
  color: var(--news-dark-red);
  text-decoration: none;
  border-bottom: 1px solid var(--news-dark-red);
}

.post-content hr {
  border: none;
  border-top: 1px solid var(--news-border);
  margin: 2em auto;
  width: 60%;
}

@keyframes newsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: newsFadeIn 0.5s ease-out both;
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .masthead { font-size: 28px; letter-spacing: 3px; }
  .hero-title { font-size: 32px; }
  .card-grid { column-count: 1; }
  .blog-nav { gap: 16px; }
}
`
}

export function getNewspaperIndexHtml(data: ThemeIndexData): string {
  const archiveEntries = Array.from(data.archiveByYear.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  const tagEntries = Array.from(data.tagMap.entries())
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const cardsHtml = data.published.map(post => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    return `
      <a class="card" href="${escapeHtml(post.slug)}.html">
        <div class="card-category">${escapeHtml(post.category || 'General')}</div>
        <div class="card-title">${escapeHtml(post.title)}</div>
        <div class="card-byline">By ${escapeHtml(post.author)} &middot; ${escapeHtml(post.date)}</div>
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
        <div class="archive-year-title">${escapeHtml(year)}</div>
        ${itemsHtml}
      </div>
    `
  }).join('')

  const tagCloudHtml = data.sortedTags.map(tag => {
    const count = data.tagMap.get(tag)?.length || 0
    return `<a class="tag-cloud-item" data-tag="${escapeHtml(tag)}" href="javascript:void(0)">${escapeHtml(tag)} (${count})</a>`
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
        <div class="tag-posts-title">${escapeHtml(tag)}</div>
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
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getNewspaperCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="masthead">${escapeHtml(data.siteTitle)}</div>
    <div class="masthead-meta">
      <span>Vol. I &middot; No. 1</span>
      <span>${today}</span>
      <span>${escapeHtml(data.author)}</span>
    </div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">Front Page</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">Archive</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">Index</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <hr class="hero-rule">
    <hr class="hero-rule-thick">
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title">Archive</div>
    ${archiveHtml}
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">Index</div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="footer-colophon">
      ${escapeHtml(data.siteTitle)} &middot; Published by ${escapeHtml(data.author)}<br>
      All rights reserved &middot; Printed with care
    </div>
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

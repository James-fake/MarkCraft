import { ThemeIndexData, escapeHtml } from './types'

export function getRetroCss(isDark: boolean): string {
  return `
:root {
  --avocado: #6b8e23;
  --harvest-gold: #daa520;
  --burnt-orange: #cc5500;
  --warm-bg: #f4efe0;
  --warm-card: #faf5e8;
  --warm-border: #d4c9a8;
  --retro-brown: #8b6914;
  --bg: ${isDark ? '#2a2518' : '#f4efe0'};
  --fg: ${isDark ? '#e8dcc8' : '#3d3220'};
  --accent: #cc5500;
  --accent2: #daa520;
  --muted: ${isDark ? '#a09070' : '#8b7d5e'};
  --card-bg: ${isDark ? '#3a3220' : '#faf5e8'};
  --border: ${isDark ? '#5a4d30' : '#d4c9a8'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Courier', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(0,0,0,0.02) 3px,
      rgba(0,0,0,0.02) 4px
    );
}

.blog-container {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 40px 0 20px;
  text-align: center;
  border-bottom: 3px dotted var(--border);
  position: relative;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Courier', monospace;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  padding-bottom: 4px;
  text-transform: uppercase;
}

.nav-link:hover, .nav-link.active {
  color: var(--burnt-orange);
}

.nav-link.active::after {
  content: '\u25C6';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  color: var(--harvest-gold);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Georgia', serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 3px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
  text-shadow: 2px 2px 0 rgba(218,165,32,0.15);
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 1px;
  font-style: italic;
}

.hero-retro-line {
  display: inline-block;
  margin-top: 24px;
  width: 200px;
  height: 4px;
  background: repeating-linear-gradient(
    90deg,
    var(--harvest-gold),
    var(--harvest-gold) 8px,
    transparent 8px,
    transparent 12px
  );
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 2px;
  padding: 28px 32px;
  position: relative;
  border: 2px dotted var(--border);
  transition: box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  box-shadow: 4px 4px 0 rgba(139,105,20,0.12);
}

.card::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px;
  right: -1px; bottom: -1px;
  border: 1px solid var(--harvest-gold);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.card:hover {
  box-shadow: 6px 6px 0 rgba(139,105,20,0.18);
  transform: translate(-2px, -2px);
}

.card:hover::before {
  opacity: 1;
}

.card-title {
  font-family: 'Georgia', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--harvest-gold);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 12px;
  font-family: 'Courier', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 15px;
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
  padding: 2px 14px;
  background: rgba(204,85,0,0.08);
  color: var(--burnt-orange);
  border: 1px dotted rgba(204,85,0,0.3);
  border-radius: 0;
  font-size: 12px;
  letter-spacing: 1px;
  font-family: 'Courier', monospace;
}

.blog-divider {
  border: none;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    var(--harvest-gold),
    var(--harvest-gold) 6px,
    transparent 6px,
    transparent 10px
  );
  margin: 40px auto;
  width: 80%;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Georgia', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--burnt-orange);
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 3px dotted var(--border);
}

.archive-year-title {
  font-family: 'Georgia', serif;
  font-size: 22px;
  color: var(--avocado);
  margin-bottom: 16px;
  position: relative;
}

.archive-year-title::before {
  content: '\u25C6';
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--harvest-gold);
  font-size: 10px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: var(--burnt-orange);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-family: 'Courier', monospace;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Georgia', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--burnt-orange);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: rgba(107,142,35,0.08);
  color: var(--avocado);
  border: 2px dotted rgba(107,142,35,0.3);
  border-radius: 0;
  font-size: 14px;
  font-family: 'Courier', monospace;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(107,142,35,0.15);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--avocado);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px dotted var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dotted var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--burnt-orange);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-family: 'Courier', monospace;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 3px dotted var(--border);
  position: relative;
  margin-top: 40px;
}

.footer-badge {
  display: inline-block;
  width: 48px;
  height: 48px;
  border: 2px dotted var(--harvest-gold);
  color: var(--burnt-orange);
  font-family: 'Georgia', serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 44px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: 3px 3px 0 rgba(139,105,20,0.12);
}

.footer-text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 2px;
  font-family: 'Courier', monospace;
}

.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Georgia', serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
  text-shadow: 2px 2px 0 rgba(218,165,32,0.12);
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-family: 'Courier', monospace;
}

.post-content {
  position: relative;
  padding-left: 20px;
  border-left: 3px dotted var(--harvest-gold);
}

.post-content p {
  margin-bottom: 1.2em;
  text-indent: 2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
}

.post-content pre {
  background: ${isDark ? '#2a2518' : '#f0ebe0'};
  padding: 16px;
  border: 2px dotted var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'Courier', monospace;
  font-size: 0.9em;
  color: var(--burnt-orange);
}

.post-content blockquote {
  border-left: 3px solid var(--avocado);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
}

.post-content img {
  max-width: 100%;
  border: 2px dotted var(--border);
  border-radius: 0;
  box-shadow: 4px 4px 0 rgba(139,105,20,0.1);
}

.post-content a {
  color: var(--burnt-orange);
  text-decoration: none;
  border-bottom: 1px dotted rgba(204,85,0,0.4);
}

.post-content a:hover {
  border-bottom-style: solid;
}

@keyframes retroFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: retroFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 30px; letter-spacing: 2px; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
  .hero-retro-line { width: 140px; }
}
`
}

export function getRetroIndexHtml(data: ThemeIndexData): string {
  const archiveEntries = Array.from(data.archiveByYear.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  const tagEntries = Array.from(data.tagMap.entries())

  const cardsHtml = data.published.map((post, i) => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const isFirst = i === 0
    return `
      <a class="card" href="${escapeHtml(post.slug)}.html">
        <div class="card-title">${escapeHtml(post.title)}</div>
        <div class="card-date">${escapeHtml(post.date)}</div>
        <div class="card-excerpt">${escapeHtml(post.excerpt || post.description)}</div>
        <div class="card-tags">${tagsHtml}</div>
      </a>
      ${!isFirst && i % 3 === 0 ? '<hr class="blog-divider">' : ''}
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

  const bl: 'zh' | 'en' = data.language === 'en' ? 'en' : 'zh'
  const badgeChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'R' : '复'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getRetroCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="footer-badge">${badgeChar}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'Home' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'Archive' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    <div class="hero-retro-line"></div>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title">${bl === 'en' ? 'Archive' : '归档'}</div>
    ${archiveHtml}
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">${bl === 'en' ? 'Tags' : '标签'}</div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="footer-badge">${badgeChar}</div>
    <div class="footer-text">${escapeHtml(data.siteTitle)}</div>
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

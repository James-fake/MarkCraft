import { ThemeIndexData, escapeHtml } from './types'

export function getBentoCss(isDark: boolean): string {
  return `
:root {
  --bento-beige: #fef3c7;
  --bento-orange: #f97316;
  --bento-coral: #ef4444;
  --bento-cream: #fffbeb;
  --bento-dark: #1c1917;
  --bento-card-1: #fff7ed;
  --bento-card-2: #fef3c7;
  --bento-card-3: #fed7aa;
  --bento-card-4: #fecaca;
  --bento-card-5: #fde68a;
  --bento-radius: 22px;
  --bento-shadow: 0 4px 16px rgba(28,25,23,0.08);
  --bento-shadow-hover: 0 8px 30px rgba(28,25,23,0.14);
  --bg: ${isDark ? '#1c1917' : '#fffbeb'};
  --fg: ${isDark ? '#fef3c7' : '#1c1917'};
  --muted: ${isDark ? '#a8a29e' : '#78716c'};
  --card-bg: ${isDark ? '#292524' : '#ffffff'};
  --border: ${isDark ? '#44403c' : '#e7e5e4'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Nunito', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
}

.blog-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 32px 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.blog-header-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--bento-orange);
}

.blog-nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 18px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 50px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-link:hover, .nav-link.active {
  background: var(--bento-orange);
  color: #fff;
  border-color: var(--bento-orange);
}

.blog-view { display: none; }
.view-home { display: block; }

.blog-hero {
  padding: 24px 0;
}

.hero-inner {
  background: linear-gradient(135deg, var(--bento-orange), var(--bento-coral));
  border-radius: var(--bento-radius);
  padding: 48px 40px;
  color: #fff;
  box-shadow: var(--bento-shadow);
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-description {
  font-size: 16px;
  opacity: 0.9;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 24px 0;
}

.card {
  background: var(--card-bg);
  border-radius: var(--bento-radius);
  padding: 28px;
  text-decoration: none;
  color: inherit;
  display: block;
  box-shadow: var(--bento-shadow);
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: var(--bento-shadow-hover);
}

.card-featured {
  grid-column: span 2;
  background: linear-gradient(135deg, var(--bento-card-1), var(--bento-card-2));
  border: none;
}

.card-featured .card-title {
  font-size: 24px;
}

.card-accent-1 { border-top: 4px solid var(--bento-orange); }
.card-accent-2 { border-top: 4px solid var(--bento-coral); }
.card-accent-3 { border-top: 4px solid #f59e0b; }
.card-accent-4 { border-top: 4px solid #8b5cf6; }

.card-number {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 48px;
  font-weight: 800;
  opacity: 0.06;
  line-height: 1;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.card-date {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 10px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(249,115,22,0.1);
  color: var(--bento-orange);
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
}

.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.archive-year {
  background: var(--card-bg);
  border-radius: var(--bento-radius);
  padding: 24px;
  box-shadow: var(--bento-shadow);
  border: 1px solid var(--border);
}

.archive-year-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--bento-orange);
  margin-bottom: 16px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.archive-item:last-child {
  border-bottom: none;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.archive-item a:hover {
  color: var(--bento-orange);
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
}

.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 50px;
  color: var(--fg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
}

.tag-cloud-item:hover {
  background: var(--bento-orange);
  color: #fff;
  border-color: var(--bento-orange);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--bento-orange);
  margin-bottom: 16px;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 15px;
}

.tag-post-item a:hover {
  color: var(--bento-orange);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 32px 0;
  margin-top: 40px;
  font-size: 14px;
  color: var(--muted);
}

.blog-footer-inner {
  background: var(--card-bg);
  border-radius: var(--bento-radius);
  padding: 24px;
  box-shadow: var(--bento-shadow);
  border: 1px solid var(--border);
}

.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
}

.post-meta {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
}

.post-content {
  background: var(--card-bg);
  border-radius: var(--bento-radius);
  padding: 40px;
  box-shadow: var(--bento-shadow);
  border: 1px solid var(--border);
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  margin: 1.5em 0 0.5em;
  font-weight: 600;
}

.post-content p {
  margin-bottom: 1em;
}

.post-content pre {
  background: ${isDark ? '#1c1917' : '#fef3c7'};
  border-radius: 16px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.post-content blockquote {
  border-left: 4px solid var(--bento-orange);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  border-radius: 0 12px 12px 0;
  background: rgba(249,115,22,0.05);
  padding: 12px 16px;
}

.post-content a {
  color: var(--bento-orange);
  text-decoration: none;
}

.post-content a:hover {
  text-decoration: underline;
}

.post-content img {
  max-width: 100%;
  border-radius: 16px;
}

@keyframes bentoFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.card {
  animation: bentoFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
.card:nth-child(5) { animation-delay: 0.32s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-header { flex-direction: column; gap: 16px; }
  .hero-title { font-size: 26px; }
  .hero-inner { padding: 32px 24px; }
  .card-grid { grid-template-columns: 1fr; }
  .card-featured { grid-column: span 1; }
  .archive-grid { grid-template-columns: 1fr; }
}
`
}

export function getBentoIndexHtml(data: ThemeIndexData): string {
  const archiveEntries = Array.from(data.archiveByYear.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  const tagEntries = Array.from(data.tagMap.entries())
  const accentClasses = ['card-accent-1', 'card-accent-2', 'card-accent-3', 'card-accent-4']

  const cardsHtml = data.published.map((post, i) => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const isFeatured = i === 0
    const accentClass = isFeatured ? 'card-featured' : accentClasses[i % accentClasses.length]
    return `
      <a class="card ${accentClass}" href="${escapeHtml(post.slug)}.html">
        <div class="card-number">${String(i + 1).padStart(2, '0')}</div>
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${getBentoCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="blog-header-title">${escapeHtml(data.siteTitle)}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">Home</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">Archive</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">Tags</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <div class="hero-inner">
      <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
      <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    </div>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title">Archive</div>
    <div class="archive-grid">${archiveHtml}</div>
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">Tags</div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="blog-footer-inner">
      &copy; ${escapeHtml(data.author)} &middot; ${escapeHtml(data.siteTitle)}
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

import { ThemeIndexData, escapeHtml } from './types'

export function getGlassmorphismCss(_isDark: boolean): string {
  return `
:root {
  --glass-purple: #7c3aed;
  --glass-pink: #ec4899;
  --glass-blue: #3b82f6;
  --glass-white: rgba(255,255,255,0.1);
  --glass-border: rgba(255,255,255,0.2);
  --glass-text: #ffffff;
  --glass-text-dim: rgba(255,255,255,0.7);
  --glass-radius: 20px;
  --glass-blur: blur(20px);
  --glass-shadow: 0 8px 32px rgba(0,0,0,0.2);
  --glass-glow: 0 0 20px rgba(124,58,237,0.3);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Poppins', sans-serif;
  color: var(--glass-text);
  line-height: 1.7;
  min-height: 100vh;
  background: linear-gradient(-45deg, #7c3aed, #ec4899, #3b82f6, #7c3aed);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 24px 0;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.nav-link {
  padding: 8px 20px;
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 50px;
  color: var(--glass-text);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
}

.nav-link:hover, .nav-link.active {
  background: rgba(255,255,255,0.2);
  box-shadow: var(--glass-glow);
  transform: translateY(-1px);
}

.blog-view { display: none; }
.view-home { display: block; }

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
}

.hero-inner {
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  padding: 48px 40px;
  box-shadow: var(--glass-shadow);
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff, rgba(255,255,255,0.8));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  color: var(--glass-text-dim);
  font-size: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  padding: 28px;
  text-decoration: none;
  color: inherit;
  display: block;
  box-shadow: var(--glass-shadow);
  transition: background 0.3s, box-shadow 0.3s, transform 0.3s;
}

.card:hover {
  background: rgba(255,255,255,0.18);
  box-shadow: 0 8px 40px rgba(0,0,0,0.3), var(--glass-glow);
  transform: translateY(-4px);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.card-date {
  color: var(--glass-text-dim);
  font-size: 13px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--glass-text-dim);
  font-size: 14px;
  line-height: 1.6;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 50px;
  font-size: 12px;
  color: var(--glass-text);
}

.blog-archive {
  padding: 32px 0;
}

.archive-title {
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 32px;
}

.archive-year {
  margin-bottom: 24px;
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.archive-year-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--glass-border);
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-item a {
  color: var(--glass-text);
  text-decoration: none;
  transition: text-shadow 0.3s;
}

.archive-item a:hover {
  text-shadow: 0 0 10px rgba(255,255,255,0.5);
}

.archive-item-date {
  color: var(--glass-text-dim);
  font-size: 13px;
}

.blog-tags {
  padding: 32px 0;
}

.tags-title {
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 32px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 50px;
  color: var(--glass-text);
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
}

.tag-cloud-item:hover {
  background: rgba(255,255,255,0.2);
  box-shadow: var(--glass-glow);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--glass-border);
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.tag-post-item a {
  color: var(--glass-text);
  text-decoration: none;
}

.tag-post-item a:hover {
  text-shadow: 0 0 10px rgba(255,255,255,0.5);
}

.tag-post-date {
  color: var(--glass-text-dim);
  font-size: 13px;
  margin-left: 12px;
}

.blog-footer {
  margin-top: 40px;
  padding: 24px;
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  text-align: center;
  box-shadow: var(--glass-shadow);
  margin-bottom: 40px;
}

.footer-text {
  color: var(--glass-text-dim);
  font-size: 14px;
}

.post-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 12px;
}

.post-meta {
  color: var(--glass-text-dim);
  font-size: 14px;
  margin-bottom: 32px;
}

.post-content {
  background: var(--glass-white);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  padding: 40px;
  box-shadow: var(--glass-shadow);
}

.post-content h1, .post-content h2, .post-content h3 {
  margin: 1.5em 0 0.5em;
  font-weight: 600;
}

.post-content p {
  margin-bottom: 1em;
  line-height: 1.8;
}

.post-content pre {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
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
  border-left: 3px solid var(--glass-border);
  padding-left: 16px;
  color: var(--glass-text-dim);
  margin: 1em 0;
  font-style: italic;
}

.post-content a {
  color: #c4b5fd;
  text-decoration: none;
  border-bottom: 1px solid rgba(196,181,253,0.3);
}

.post-content a:hover {
  border-bottom-color: #c4b5fd;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
}

@keyframes glassFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: glassFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; }
  .hero-inner { padding: 32px 20px; }
  .card-grid { grid-template-columns: 1fr; }
  .blog-nav { gap: 8px; flex-wrap: wrap; }
  .nav-link { padding: 6px 14px; font-size: 13px; }
}
`
}

export function getGlassmorphismIndexHtml(data: ThemeIndexData): string {
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${getGlassmorphismCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
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
    ${archiveHtml}
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">Tags</div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="footer-text">&copy; ${escapeHtml(data.author)} &middot; ${escapeHtml(data.siteTitle)}</div>
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

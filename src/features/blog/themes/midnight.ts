import { ThemeIndexData, escapeHtml } from './types'

export function getMidnightCss(isDark: boolean): string {
  return `
:root {
  --midnight-blue: #0d1b2a;
  --silver: #e0e1dd;
  --moonlight: #778da9;
  --deep-blue: #1b2838;
  --star-white: #c5c7ca;
  --midnight-card: #152238;
  --midnight-border: #1e3048;
  --bg: ${isDark ? '#0d1b2a' : '#0d1b2a'};
  --fg: ${isDark ? '#e0e1dd' : '#e0e1dd'};
  --accent: #778da9;
  --accent2: #e0e1dd;
  --muted: #5a6a7e;
  --card-bg: ${isDark ? '#152238' : '#162640'};
  --border: ${isDark ? '#1e3048' : '#243a54'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Playfair Display', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  position: relative;
  overflow-x: clip;
}

body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(1px 1px at 5% 15%, rgba(255,255,255,0.25) 0%, transparent 100%),
    radial-gradient(1px 1px at 12% 72%, rgba(255,255,255,0.15) 0%, transparent 100%),
    radial-gradient(1px 1px at 22% 8%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.12) 0%, transparent 100%),
    radial-gradient(1px 1px at 48% 25%, rgba(255,255,255,0.18) 0%, transparent 100%),
    radial-gradient(1px 1px at 55% 82%, rgba(255,255,255,0.1) 0%, transparent 100%),
    radial-gradient(1px 1px at 65% 40%, rgba(255,255,255,0.15) 0%, transparent 100%),
    radial-gradient(1px 1px at 72% 68%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 12%, rgba(255,255,255,0.12) 0%, transparent 100%),
    radial-gradient(1px 1px at 88% 50%, rgba(255,255,255,0.18) 0%, transparent 100%),
    radial-gradient(1px 1px at 92% 88%, rgba(255,255,255,0.1) 0%, transparent 100%),
    radial-gradient(1px 1px at 18% 42%, rgba(255,255,255,0.08) 0%, transparent 100%),
    radial-gradient(1px 1px at 42% 92%, rgba(255,255,255,0.12) 0%, transparent 100%),
    radial-gradient(1px 1px at 78% 30%, rgba(255,255,255,0.1) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 30% 18%, rgba(255,255,255,0.22) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 60% 60%, rgba(255,255,255,0.15) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

.blog-container {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

.blog-header {
  padding: 40px 0 20px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.blog-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--silver), var(--moonlight), var(--silver), transparent);
  opacity: 0.5;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Playfair Display', serif;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  padding-bottom: 4px;
  text-transform: uppercase;
}

.nav-link:hover, .nav-link.active {
  color: var(--silver);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 1px;
  background: var(--silver);
  box-shadow: 0 0 6px rgba(224,225,221,0.3);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 400;
  color: var(--silver);
  letter-spacing: 4px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--moonlight), transparent);
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 2px;
  margin-top: 16px;
  font-style: italic;
}

.hero-moon {
  display: inline-block;
  margin-top: 24px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, var(--silver), var(--moonlight));
  box-shadow: 0 0 20px rgba(224,225,221,0.2), 0 0 40px rgba(119,141,169,0.1);
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, var(--silver), var(--moonlight));
  opacity: 0.5;
  transition: opacity 0.3s;
}

.card:hover {
  border-color: rgba(119,141,169,0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(119,141,169,0.1);
  transform: translateY(-2px);
}

.card:hover::before {
  opacity: 1;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 1px;
  transition: color 0.3s;
}

.card:hover .card-title {
  color: var(--silver);
}

.card-date {
  color: var(--moonlight);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 12px;
  font-style: italic;
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
  background: rgba(119,141,169,0.08);
  color: var(--moonlight);
  border: 1px solid rgba(119,141,169,0.2);
  border-radius: 2px;
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--moonlight), var(--silver), var(--moonlight), transparent);
  margin: 40px auto;
  width: 80%;
  opacity: 0.4;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--silver);
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 1px solid var(--border);
}

.archive-year-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  color: var(--moonlight);
  margin-bottom: 16px;
  position: relative;
}

.archive-year-title::before {
  content: '';
  position: absolute;
  left: -29px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: var(--silver);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(224,225,221,0.3);
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
  color: var(--silver);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--silver);
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
  background: rgba(119,141,169,0.06);
  color: var(--moonlight);
  border: 1px solid rgba(119,141,169,0.15);
  border-radius: 2px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(119,141,169,0.12);
  box-shadow: 0 0 8px rgba(119,141,169,0.1);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--moonlight);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--silver);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-style: italic;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid var(--border);
  position: relative;
  margin-top: 40px;
}

.blog-footer::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--silver), var(--moonlight), var(--silver), transparent);
  opacity: 0.5;
}

.footer-moon {
  display: inline-block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, var(--silver), var(--moonlight));
  box-shadow: 0 0 16px rgba(224,225,221,0.15), 0 0 32px rgba(119,141,169,0.08);
  margin-bottom: 12px;
}

.footer-text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 3px;
}

.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 3px;
  color: var(--silver);
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-style: italic;
}

.post-content {
  position: relative;
  padding-left: 20px;
  border-left: 1px solid var(--moonlight);
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Playfair Display', serif;
  margin: 1.5em 0 0.8em;
  color: var(--silver);
}

.post-content pre {
  background: #0a1520;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 2px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--moonlight);
}

.post-content blockquote {
  border-left: 2px solid var(--silver);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
}

.post-content img {
  max-width: 100%;
  border-radius: 2px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.post-content a {
  color: var(--moonlight);
  text-decoration: none;
  border-bottom: 1px solid rgba(119,141,169,0.3);
}

.post-content a:hover {
  color: var(--silver);
  border-bottom-color: var(--silver);
}

@keyframes midnightFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: midnightFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 32px; letter-spacing: 2px; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
}
`
}

export function getMidnightIndexHtml(data: ThemeIndexData): string {
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

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getMidnightCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="hero-moon"></div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'Home' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'Archive' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    <div class="hero-moon"></div>
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
    <div class="footer-moon"></div>
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

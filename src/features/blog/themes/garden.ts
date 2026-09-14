import { ThemeIndexData, escapeHtml } from './types'

export function getGardenCss(isDark: boolean): string {
  return `
:root {
  --sage-green: #7c9a5e;
  --soft-pink: #e8b4b8;
  --lavender: #b8a9c9;
  --garden-bg: #f8f6f0;
  --garden-card: #ffffff;
  --garden-border: #d8d2c4;
  --leaf-green: #5a7a3a;
  --bg: ${isDark ? '#1a1e16' : '#f8f6f0'};
  --fg: ${isDark ? '#d8d2c4' : '#3d3a2e'};
  --accent: #7c9a5e;
  --accent2: #e8b4b8;
  --muted: ${isDark ? '#8a8670' : '#8b8470'};
  --card-bg: ${isDark ? '#242820' : '#ffffff'};
  --border: ${isDark ? '#3a3e30' : '#d8d2c4'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 40px 0 20px;
  text-align: center;
  border-bottom: 2px solid var(--border);
  position: relative;
  border-radius: 0 0 16px 16px;
}

.blog-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, var(--sage-green), var(--soft-pink), var(--lavender), var(--sage-green));
  border-radius: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Noto Serif SC', serif;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  padding-bottom: 4px;
}

.nav-link:hover, .nav-link.active {
  color: var(--sage-green);
}

.nav-link.active::after {
  content: '\u{1F33F}';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 44px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '\u{1F33A}';
  position: absolute;
  left: -36px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
}

.hero-title::after {
  content: '\u{1F33A}';
  position: absolute;
  right: -36px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 1px;
}

.hero-vine {
  display: inline-block;
  margin-top: 24px;
  width: 200px;
  height: 20px;
  background: linear-gradient(90deg, var(--sage-green), var(--soft-pink), var(--lavender));
  border-radius: 10px;
  opacity: 0.4;
  position: relative;
}

.hero-vine::before {
  content: '\u{1F33F}\u{1F33F}\u{1F33F}';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 20px;
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
  border-radius: 16px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  transition: box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  box-shadow: 0 2px 12px rgba(124,154,94,0.06);
}

.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--sage-green), var(--soft-pink), var(--lavender));
  border-radius: 16px 16px 0 0;
}

.card:hover {
  box-shadow: 0 6px 24px rgba(124,154,94,0.12);
  transform: translateY(-3px);
}

.card-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--soft-pink);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 12px;
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
  background: rgba(124,154,94,0.1);
  color: var(--sage-green);
  border: 1px solid rgba(124,154,94,0.2);
  border-radius: 12px;
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-divider {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--sage-green), var(--soft-pink), var(--lavender), transparent);
  margin: 40px auto;
  width: 80%;
  border-radius: 1px;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--sage-green);
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 22px;
  color: var(--sage-green);
  margin-bottom: 16px;
  position: relative;
}

.archive-year-title::before {
  content: '';
  position: absolute;
  left: -31px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: var(--soft-pink);
  border-radius: 50%;
  border: 2px solid var(--sage-green);
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
  color: var(--sage-green);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--sage-green);
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
  background: rgba(124,154,94,0.08);
  color: var(--sage-green);
  border: 1px solid rgba(124,154,94,0.2);
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(124,154,94,0.15);
  box-shadow: 0 2px 8px rgba(124,154,94,0.12);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--sage-green);
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
  color: var(--sage-green);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 2px solid var(--border);
  position: relative;
  margin-top: 40px;
  border-radius: 16px 16px 0 0;
}

.blog-footer::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, var(--sage-green), var(--soft-pink), var(--lavender), var(--sage-green));
  border-radius: 1px;
}

.footer-emblem {
  display: inline-block;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--sage-green);
  color: var(--sage-green);
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  line-height: 44px;
  text-align: center;
  margin-bottom: 12px;
  background: rgba(124,154,94,0.06);
}

.footer-text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 2px;
}

.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 3px;
  color: var(--fg);
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
}

.post-content {
  position: relative;
  padding-left: 20px;
  border-left: 2px solid var(--sage-green);
  border-radius: 1px;
}

.post-content p {
  margin-bottom: 1.2em;
  text-indent: 2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Noto Serif SC', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
}

.post-content pre {
  background: ${isDark ? '#1e2218' : '#f4f2ec'};
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--sage-green);
}

.post-content blockquote {
  border-left: 3px solid var(--lavender);
  padding: 12px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  background: rgba(184,169,201,0.06);
  border-radius: 0 8px 8px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(124,154,94,0.1);
}

.post-content a {
  color: var(--sage-green);
  text-decoration: none;
  border-bottom: 1px solid rgba(124,154,94,0.3);
  border-radius: 0;
}

.post-content a:hover {
  border-bottom-color: var(--sage-green);
}

@keyframes gardenFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: gardenFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 30px; letter-spacing: 2px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
  .hero-vine { width: 140px; }
}
`
}

export function getGardenIndexHtml(data: ThemeIndexData): string {
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
  const emblemChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'G' : '花'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getGardenCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="footer-emblem">${emblemChar}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'Home' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'Archive' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    <div class="hero-vine"></div>
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
    <div class="footer-emblem">${emblemChar}</div>
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

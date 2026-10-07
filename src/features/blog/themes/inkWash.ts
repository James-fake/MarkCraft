import { ThemeIndexData, escapeHtml } from './types'

export function getInkWashCss(isDark: boolean): string {
  return `
:root {
  --ink-black: #1a1a1a;
  --rice-paper: #f5f0e8;
  --cinnabar: #c23b22;
  --ink-grey: #6b6b6b;
  --ink-white: #faf8f0;
  --ink-light: #e8e0d0;
  --ink-shadow: rgba(26,26,26,0.08);
  --bg: ${isDark ? '#1a1a1a' : '#f5f0e8'};
  --fg: ${isDark ? '#f5f0e8' : '#1a1a1a'};
  --accent: #c23b22;
  --muted: #6b6b6b;
  --card-bg: ${isDark ? '#2a2a2a' : '#faf8f0'};
  --border: ${isDark ? '#3a3a3a' : '#e0d8c8'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Serif SC', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.015) 2px,
      rgba(0,0,0,0.015) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(0,0,0,0.01) 3px,
      rgba(0,0,0,0.01) 6px
    );
}

.blog-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
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
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cinnabar), transparent);
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
  color: var(--cinnabar);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--cinnabar);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Ma Shan Zheng', 'Noto Serif SC', serif;
  font-size: 48px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 8px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--cinnabar);
  writing-mode: vertical-rl;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 3px;
}

.hero-seal {
  display: inline-block;
  width: 40px;
  height: 40px;
  background: var(--cinnabar);
  color: var(--ink-white);
  font-family: 'Ma Shan Zheng', serif;
  font-size: 18px;
  line-height: 40px;
  text-align: center;
  margin-top: 24px;
  border-radius: 2px;
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
  border-radius: 2px;
  padding: 28px 32px;
  position: relative;
  box-shadow: 0 2px 12px var(--ink-shadow);
  border-left: 3px solid var(--cinnabar);
  transition: box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card:hover {
  box-shadow: 0 4px 20px rgba(194,59,34,0.12);
  transform: translateY(-2px);
}

.card-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--muted);
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
  background: rgba(194,59,34,0.1);
  color: var(--cinnabar);
  border-radius: 20px;
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-divider {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cinnabar), var(--border), transparent);
  margin: 40px auto;
  width: 80%;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Ma Shan Zheng', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
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
  color: var(--cinnabar);
  margin-bottom: 16px;
  position: relative;
}

.archive-year-title::before {
  content: '';
  position: absolute;
  left: -31px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: var(--cinnabar);
  border-radius: 50%;
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
  color: var(--cinnabar);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Ma Shan Zheng', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
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
  background: rgba(194,59,34,0.08);
  color: var(--cinnabar);
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(194,59,34,0.18);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--cinnabar);
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
}

.tag-post-item a:hover {
  color: var(--cinnabar);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
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
  top: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cinnabar), transparent);
}

.footer-seal {
  display: inline-block;
  width: 48px;
  height: 48px;
  background: var(--cinnabar);
  color: var(--ink-white);
  font-family: 'Ma Shan Zheng', serif;
  font-size: 22px;
  line-height: 48px;
  text-align: center;
  border-radius: 3px;
  margin-bottom: 12px;
}

.footer-text {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 2px;
}

.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Ma Shan Zheng', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 4px;
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
  border-left: 2px solid var(--cinnabar);
}

.post-content p {
  margin-bottom: 1.2em;
  text-indent: 2em;
}

.drop-cap::first-letter {
  float: left;
  font-size: 3.5em;
  line-height: 1;
  padding-right: 8px;
  color: var(--cinnabar);
  font-family: 'Ma Shan Zheng', serif;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Noto Serif SC', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
}

.post-content pre {
  background: ${isDark ? '#1a1a1a' : '#f0ebe0'};
  padding: 16px;
  border-radius: 2px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.post-content blockquote {
  border-left: 3px solid var(--cinnabar);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
}

.post-content img {
  max-width: 100%;
  border-radius: 2px;
}

.post-content a {
  color: var(--cinnabar);
  text-decoration: none;
  border-bottom: 1px solid rgba(194,59,34,0.3);
}

.post-content a:hover {
  border-bottom-color: var(--cinnabar);
}

@keyframes inkFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: inkFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 32px; letter-spacing: 4px; }
  .hero-title::before { display: none; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
}
`
}

export function getInkWashIndexHtml(data: ThemeIndexData): string {
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
  const sealChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'I' : '墨'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Ma+Shan+Zheng&display=swap" rel="stylesheet">
<style>${getInkWashCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="hero-seal">${sealChar}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'Home' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'Archive' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
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
    <div class="footer-seal">${sealChar}</div>
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

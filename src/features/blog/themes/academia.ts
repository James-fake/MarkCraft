import { ThemeIndexData, escapeHtml } from './types'

export function getAcademiaCss(isDark: boolean): string {
  return `
:root {
  --navy: #1a2744;
  --burgundy: #8b1a1a;
  --gold: #c4a35a;
  --cream: #faf6ee;
  --dark-text: #2c2c2c;
  --light-border: #d4c9a8;
  --dark-card: #1e2d4d;
  --dark-border: #2a3d5e;
  --bg: ${isDark ? '#1a2744' : '#faf6ee'};
  --fg: ${isDark ? '#e8e0d0' : '#2c2c2c'};
  --accent: #8b1a1a;
  --accent2: #c4a35a;
  --muted: ${isDark ? '#8899aa' : '#6b6b6b'};
  --card-bg: ${isDark ? '#1e2d4d' : '#ffffff'};
  --border: ${isDark ? '#2a3d5e' : '#d4c9a8'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', 'Noto Serif SC', serif;
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
}

.blog-header::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: var(--gold);
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Georgia', 'Noto Serif SC', serif;
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
  color: var(--burgundy);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--gold);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 42px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 3px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::before,
.hero-title::after {
  content: '\u201C';
  position: absolute;
  font-size: 60px;
  color: var(--gold);
  opacity: 0.4;
  font-family: Georgia, serif;
}

.hero-title::before {
  left: -30px;
  top: -10px;
}

.hero-title::after {
  content: '\u201D';
  right: -30px;
  bottom: -20px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 1px;
  font-style: italic;
}

.hero-ornament {
  display: inline-block;
  margin-top: 24px;
  color: var(--gold);
  font-size: 24px;
  letter-spacing: 12px;
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
  border-radius: 0;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  transition: box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 4px;
  height: 100%;
  background: var(--burgundy);
}

.card::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 2px;
  background: var(--gold);
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(26,39,68,0.12);
  transform: translateY(-2px);
}

.card:hover::after {
  opacity: 1;
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--gold);
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
  background: rgba(139,26,26,0.08);
  color: var(--burgundy);
  border: 1px solid rgba(139,26,26,0.2);
  border-radius: 0;
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-divider {
  border: none;
  height: 1px;
  background: var(--border);
  margin: 40px auto;
  width: 80%;
  position: relative;
}

.blog-divider::before {
  content: '\u00A7';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg);
  padding: 0 12px;
  color: var(--gold);
  font-size: 16px;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--burgundy);
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  color: var(--burgundy);
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
  background: var(--gold);
  border: 2px solid var(--burgundy);
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
  color: var(--burgundy);
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
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--burgundy);
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
  background: rgba(139,26,26,0.06);
  color: var(--burgundy);
  border: 1px solid rgba(139,26,26,0.2);
  border-radius: 0;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(139,26,26,0.12);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--burgundy);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--burgundy);
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
  border-top: 2px solid var(--border);
  position: relative;
  margin-top: 40px;
}

.blog-footer::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: var(--gold);
}

.footer-emblem {
  display: inline-block;
  width: 48px;
  height: 48px;
  border: 2px solid var(--gold);
  color: var(--burgundy);
  font-family: 'Georgia', serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 44px;
  text-align: center;
  margin-bottom: 12px;
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
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
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
  border-left: 2px solid var(--burgundy);
}

.post-content p {
  margin-bottom: 1.2em;
  text-indent: 2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
}

.post-content pre {
  background: ${isDark ? '#15203a' : '#f0ebe0'};
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.post-content blockquote {
  border-left: 3px solid var(--gold);
  padding: 12px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  background: ${isDark ? 'rgba(196,163,90,0.05)' : 'rgba(196,163,90,0.06)'};
  position: relative;
}

.post-content blockquote::before {
  content: '\u201C';
  position: absolute;
  left: 4px;
  top: -4px;
  font-size: 28px;
  color: var(--gold);
  opacity: 0.4;
}

.post-content img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 0;
}

.post-content a {
  color: var(--burgundy);
  text-decoration: none;
  border-bottom: 1px solid rgba(139,26,26,0.3);
}

.post-content a:hover {
  border-bottom-color: var(--burgundy);
}

@keyframes academiaFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: academiaFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; letter-spacing: 2px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
}
`
}

export function getAcademiaIndexHtml(data: ThemeIndexData): string {
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
  const emblemChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'A' : '学'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getAcademiaCss(false)}</style>
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
    <div class="hero-ornament">\u2022 \u2022 \u2022</div>
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

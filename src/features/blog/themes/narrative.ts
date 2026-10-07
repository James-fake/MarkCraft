import { ThemeIndexData, escapeHtml } from './types'

export function getNarrativeCss(isDark: boolean): string {
  return `
:root {
  --narr-parchment: #faf5eb;
  --narr-brown: #3c2415;
  --narr-gold: #b8860b;
  --narr-cream: #f5ead6;
  --narr-light-gold: #d4a853;
  --narr-muted: #8b7355;
  --narr-border: #d4c5a9;
  --bg: ${isDark ? '#2c1e10' : '#faf5eb'};
  --fg: ${isDark ? '#f5ead6' : '#3c2415'};
  --muted: ${isDark ? '#a89070' : '#8b7355'};
  --card-bg: ${isDark ? '#3a2a1a' : '#ffffff'};
  --border: ${isDark ? '#5a4a3a' : '#d4c5a9'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Lora', 'Noto Serif SC', Georgia, serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 900px;
  margin: 0 auto;
}

.blog-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(250,245,235,0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

${isDark ? '.blog-header { background: rgba(44,30,16,0.95); }' : ''}

.blog-header-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--narr-gold);
}

.blog-nav {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.3s;
  font-family: 'Lora', Georgia, serif;
}

.nav-link:hover, .nav-link.active {
  color: var(--narr-gold);
}

.blog-view { display: none; }
.view-home { display: block; }

.blog-hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  background: linear-gradient(180deg, rgba(184,134,11,0.08) 0%, rgba(250,245,235,0) 100%);
  padding: 80px 24px 40px;
}

.hero-inner {
  position: relative;
}

.hero-ornament-top, .hero-ornament-bottom {
  color: var(--narr-gold);
  font-size: 28px;
  opacity: 0.5;
  line-height: 1;
}

.hero-ornament-top { margin-bottom: 24px; }

.hero-title {
  font-family: 'Lora', 'Noto Serif SC', Georgia, serif;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 16px;
  color: var(--fg);
}

.hero-description {
  font-size: 18px;
  color: var(--muted);
  font-style: italic;
  max-width: 500px;
  margin: 0 auto;
}

.hero-ornament-bottom { margin-top: 24px; }

.hero-scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--narr-gold);
  font-size: 13px;
  opacity: 0.6;
  animation: gentleBounce 2s ease-in-out infinite;
  white-space: nowrap;
}

@keyframes gentleBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 20px 24px 60px;
}

.card {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 32px 36px;
  text-decoration: none;
  color: inherit;
  display: block;
  box-shadow: 0 2px 16px rgba(60,36,21,0.06);
  transition: box-shadow 0.3s, transform 0.3s;
  position: relative;
  border: 1px solid var(--border);
  overflow: hidden;
}

.card:hover {
  box-shadow: 0 6px 28px rgba(60,36,21,0.12);
  transform: translateY(-3px);
}

.card-chapter {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--narr-gold);
  margin-bottom: 10px;
}

.card-title {
  font-family: 'Lora', 'Noto Serif SC', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.4;
}

.card-date {
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-ornament {
  text-align: center;
  color: var(--narr-gold);
  opacity: 0.4;
  margin-top: 14px;
  font-size: 18px;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 14px;
  background: rgba(184,134,11,0.1);
  color: var(--narr-gold);
  border: 1px solid rgba(184,134,11,0.25);
  border-radius: 2px;
  font-size: 12px;
  font-family: 'Lora', Georgia, serif;
  letter-spacing: 0.5px;
}

.blog-archive {
  padding: 100px 24px 60px;
}

.archive-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: var(--narr-gold);
}

.archive-timeline {
  position: relative;
  padding-left: 40px;
}

.archive-timeline::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.archive-year {
  margin-bottom: 36px;
  position: relative;
}

.archive-year-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--narr-gold);
  margin-bottom: 16px;
}

.archive-year-title::before {
  content: '';
  position: absolute;
  left: -33px;
  top: 6px;
  width: 12px;
  height: 12px;
  background: var(--narr-gold);
  border-radius: 50%;
  border: 3px solid var(--bg);
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-item a:hover {
  color: var(--narr-gold);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
  flex-shrink: 0;
}

.blog-tags {
  padding: 100px 24px 60px;
}

.tags-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: var(--narr-gold);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: rgba(184,134,11,0.08);
  border: 1px solid rgba(184,134,11,0.25);
  color: var(--narr-gold);
  font-size: 14px;
  font-family: 'Lora', Georgia, serif;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
  border-radius: 2px;
}

.tag-cloud-item:hover {
  background: var(--narr-gold);
  color: var(--narr-parchment);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--narr-gold);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-post-item a:hover {
  color: var(--narr-gold);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
  flex-shrink: 0;
}

.blog-footer {
  text-align: center;
  padding: 60px 24px;
  margin-top: 40px;
  position: relative;
}

.footer-ornament {
  color: var(--narr-gold);
  font-size: 24px;
  opacity: 0.5;
  margin-bottom: 16px;
}

.footer-end-mark {
  font-family: 'Lora', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--narr-gold);
  letter-spacing: 6px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.footer-text {
  color: var(--muted);
  font-size: 13px;
  font-style: italic;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 90px 24px 60px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--narr-gold);
  text-decoration: none;
  font-size: 14px;
  font-style: italic;
  margin-bottom: 32px;
  transition: opacity 0.3s;
}

.back-link:hover {
  opacity: 0.7;
}

.post-title {
  font-family: 'Lora', 'Noto Serif SC', Georgia, serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  margin-bottom: 16px;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  font-style: italic;
  margin-bottom: 32px;
}

.post-divider {
  text-align: center;
  color: var(--narr-gold);
  opacity: 0.4;
  font-size: 20px;
  margin-bottom: 32px;
}

.post-content {
  font-size: 16px;
  line-height: 1.9;
  max-width: 680px;
  margin: 0 auto;
}

.post-content p {
  margin-bottom: 1.2em;
  text-indent: 2em;
}

.drop-cap::first-letter {
  float: left;
  font-size: 3.2em;
  line-height: 0.85;
  padding-right: 10px;
  color: var(--narr-gold);
  font-family: 'Lora', Georgia, serif;
  font-weight: 700;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Lora', 'Noto Serif SC', Georgia, serif;
  margin: 1.8em 0 0.8em;
  text-indent: 0;
  color: var(--fg);
}

.post-content h2 {
  font-size: 22px;
  text-align: center;
}

.post-content h2::before, .post-content h2::after {
  content: ' \u2022 ';
  color: var(--narr-gold);
}

.post-content h3 {
  font-size: 18px;
}

.post-content ul, .post-content ol {
  margin-bottom: 1.2em;
  padding-left: 1.8em;
  text-indent: 0;
}

.post-content li {
  margin-bottom: 0.4em;
}

.post-content pre {
  background: ${isDark ? '#1c1917' : '#f5ead6'};
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  text-indent: 0;
  border: 1px solid var(--border);
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

.post-content :not(pre) > code {
  background: rgba(184,134,11,0.08);
  padding: 2px 8px;
  border-radius: 3px;
  color: var(--narr-gold);
  font-size: 0.85em;
}

.post-content blockquote {
  border-left: 3px solid var(--narr-gold);
  padding: 16px 24px;
  color: var(--muted);
  margin: 1.2em 0;
  font-style: italic;
  text-indent: 0;
  background: rgba(184,134,11,0.04);
  position: relative;
}

.post-content blockquote::before {
  content: '\\201C';
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 48px;
  color: var(--narr-gold);
  opacity: 0.2;
  line-height: 1;
  font-family: 'Lora', Georgia, serif;
}

.post-content a {
  color: var(--narr-gold);
  text-decoration: none;
  border-bottom: 1px solid rgba(184,134,11,0.3);
}

.post-content a:hover {
  border-bottom-color: var(--narr-gold);
}

.post-content img {
  max-width: 100%;
  border-radius: 4px;
  margin: 1.5em 0;
}

.post-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.2em 0;
  border: 1px solid var(--border);
  font-size: 14px;
  text-indent: 0;
}

.post-content th {
  background: rgba(184,134,11,0.06);
  font-weight: 600;
}

.post-content th, .post-content td {
  border: 1px solid var(--border);
  padding: 8px 14px;
  text-align: left;
}

.post-content hr {
  border: none;
  text-align: center;
  margin: 2em 0;
  color: var(--narr-gold);
  opacity: 0.4;
  font-size: 18px;
  line-height: 1;
  height: auto;
}

.post-tags-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

@keyframes narrativeFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: narrativeFadeIn 0.7s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.15s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.45s; }

@media (max-width: 768px) {
  .blog-container { padding: 0; }
  .blog-header { padding: 10px 16px; }
  .hero-title { font-size: 28px; }
  .hero-description { font-size: 15px; }
  .card { padding: 20px; margin: 0 16px; }
  .card-grid { padding: 20px 0 40px; }
  .blog-nav { gap: 16px; }
  .post-detail { padding-top: 80px; }
  .post-title { font-size: 24px; }
  .post-content { max-width: 100%; }
  .blog-archive, .blog-tags { padding-top: 80px; }
  .archive-item { flex-direction: column; gap: 2px; }
  .tag-post-item { flex-direction: column; gap: 2px; }
}
`
}

export function getNarrativeIndexHtml(data: ThemeIndexData): string {
  const archiveEntries = Array.from(data.archiveByYear.entries()).sort((a, b) => Number(b[0]) - Number(a[0]))
  const tagEntries = Array.from(data.tagMap.entries())

  const cardsHtml = data.published.map((post, i) => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const chapterNum = i + 1
    return `
      <a class="card" href="${escapeHtml(post.slug)}.html">
        <div class="card-chapter">Chapter ${chapterNum}</div>
        <div class="card-title">${escapeHtml(post.title)}</div>
        <div class="card-date">${escapeHtml(post.date)}</div>
        <div class="card-excerpt">${escapeHtml(post.excerpt || post.description)}</div>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-ornament">\u2756</div>
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
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getNarrativeCss(false)}</style>
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
      <div class="hero-ornament-top">\u2756</div>
      <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
      <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
      <div class="hero-ornament-bottom">\u2756</div>
    </div>
    <div class="hero-scroll-hint">Scroll to begin the story</div>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title">Chronicle</div>
    <div class="archive-timeline">${archiveHtml}</div>
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">Topics</div>
    <div class="tag-cloud">${tagCloudHtml}</div>
    ${tagPostsHtml}
  </section>

  <footer class="blog-footer">
    <div class="footer-ornament">\u2756</div>
    <div class="footer-the-end">The End</div>
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

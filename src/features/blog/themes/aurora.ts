import { ThemeIndexData, escapeHtml } from './types'

export function getAuroraCss(isDark: boolean): string {
  return `
:root {
  --aurora-green: #00ff88;
  --aurora-blue: #0088ff;
  --aurora-purple: #8800ff;
  --dark-bg: #0a0f1a;
  --dark-card: #111827;
  --dark-border: #1e293b;
  --glass-bg: rgba(17,24,39,0.7);
  --glass-border: rgba(255,255,255,0.08);
  --bg: ${isDark ? '#0a0f1a' : '#0f172a'};
  --fg: ${isDark ? '#e2e8f0' : '#e2e8f0'};
  --accent: #00ff88;
  --accent2: #0088ff;
  --muted: #64748b;
  --card-bg: ${isDark ? 'rgba(17,24,39,0.7)' : 'rgba(15,23,42,0.8)'};
  --border: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  overflow-x: clip;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 60%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.25) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.15) 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 15% 90%, rgba(255,255,255,0.15) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 45%, rgba(255,255,255,0.1) 0%, transparent 100%),
    radial-gradient(1px 1px at 80% 15%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.15) 0%, transparent 100%),
    radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.1) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

.blog-container {
  max-width: 800px;
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
  backdrop-filter: blur(10px);
}

.blog-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--aurora-green), var(--aurora-blue), var(--aurora-purple));
  animation: auroraShift 6s ease-in-out infinite;
}

@keyframes auroraShift {
  0%, 100% { background: linear-gradient(90deg, var(--aurora-green), var(--aurora-blue), var(--aurora-purple)); }
  33% { background: linear-gradient(90deg, var(--aurora-blue), var(--aurora-purple), var(--aurora-green)); }
  66% { background: linear-gradient(90deg, var(--aurora-purple), var(--aurora-green), var(--aurora-blue)); }
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Inter', sans-serif;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s, text-shadow 0.3s;
  position: relative;
  padding-bottom: 4px;
}

.nav-link:hover, .nav-link.active {
  color: var(--aurora-green);
  text-shadow: 0 0 12px rgba(0,255,136,0.3);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--aurora-green);
  box-shadow: 0 0 8px var(--aurora-green);
  border-radius: 1px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--aurora-green), var(--aurora-blue), var(--aurora-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
  animation: auroraText 8s ease-in-out infinite;
  background-size: 200% 200%;
}

@keyframes auroraText {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 1px;
}

.hero-aurora-bar {
  display: inline-block;
  width: 200px;
  height: 3px;
  margin-top: 24px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--aurora-green), var(--aurora-blue), var(--aurora-purple));
  background-size: 200% 100%;
  animation: auroraBar 4s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(0,255,136,0.3);
}

@keyframes auroraBar {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
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
  border-radius: 12px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--aurora-green), var(--aurora-blue));
  border-radius: 3px 0 0 3px;
  transition: width 0.3s;
}

.card:hover {
  border-color: rgba(0,255,136,0.2);
  box-shadow: 0 8px 32px rgba(0,255,136,0.08), 0 0 0 1px rgba(0,255,136,0.05);
  transform: translateY(-3px);
}

.card:hover::before {
  width: 4px;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg);
  transition: color 0.3s;
}

.card:hover .card-title {
  color: var(--aurora-green);
}

.card-date {
  color: var(--aurora-blue);
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
  background: rgba(0,255,136,0.08);
  color: var(--aurora-green);
  border: 1px solid rgba(0,255,136,0.15);
  border-radius: 20px;
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-divider {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--aurora-green), var(--aurora-blue), var(--aurora-purple), transparent);
  margin: 40px auto;
  width: 80%;
  border-radius: 1px;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  background: linear-gradient(135deg, var(--aurora-green), var(--aurora-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  color: var(--aurora-blue);
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
  background: var(--aurora-blue);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--aurora-blue);
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
  color: var(--aurora-green);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  background: linear-gradient(135deg, var(--aurora-green), var(--aurora-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  background: rgba(0,255,136,0.06);
  color: var(--aurora-green);
  border: 1px solid rgba(0,255,136,0.15);
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(0,255,136,0.12);
  box-shadow: 0 0 12px rgba(0,255,136,0.15);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--aurora-blue);
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
  color: var(--aurora-green);
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
  top: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--aurora-green), var(--aurora-blue), var(--aurora-purple));
  animation: auroraShift 6s ease-in-out infinite;
}

.footer-logo {
  display: inline-block;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(0,255,136,0.3);
  color: var(--aurora-green);
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 48px;
  text-align: center;
  margin-bottom: 12px;
  background: rgba(0,255,136,0.05);
  backdrop-filter: blur(8px);
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
  position: relative;
  z-index: 1;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 2px;
  background: linear-gradient(135deg, var(--aurora-green), var(--aurora-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  border-left: 2px solid var(--aurora-green);
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
}

.post-content pre {
  background: rgba(10,15,26,0.8);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  backdrop-filter: blur(8px);
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--aurora-green);
}

.post-content blockquote {
  border-left: 3px solid var(--aurora-blue);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.post-content a {
  color: var(--aurora-green);
  text-decoration: none;
  border-bottom: 1px solid rgba(0,255,136,0.3);
}

.post-content a:hover {
  border-bottom-color: var(--aurora-green);
}

@keyframes auroraFadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: auroraFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 32px; letter-spacing: 1px; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
  .hero-aurora-bar { width: 140px; }
}
`
}

export function getAuroraIndexHtml(data: ThemeIndexData): string {
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
  const logoChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'A' : '极'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${getAuroraCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="footer-logo">${logoChar}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'Home' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'Archive' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'Tags' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    <div class="hero-aurora-bar"></div>
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
    <div class="footer-logo">${logoChar}</div>
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

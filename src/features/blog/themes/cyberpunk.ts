import { ThemeIndexData, escapeHtml } from './types'

export function getCyberpunkCss(isDark: boolean): string {
  return `
:root {
  --neon-cyan: #00f0ff;
  --neon-magenta: #ff00aa;
  --neon-yellow: #f0ff00;
  --dark-bg: #0a0a14;
  --dark-card: #12121e;
  --dark-border: #1e1e3a;
  --grid-color: rgba(0,240,255,0.06);
  --scanline-color: rgba(0,0,0,0.08);
  --bg: ${isDark ? '#0a0a14' : '#0e0e1a'};
  --fg: ${isDark ? '#e0e0f0' : '#e0e0f0'};
  --accent: #00f0ff;
  --accent2: #ff00aa;
  --muted: #7a7a9e;
  --card-bg: ${isDark ? '#12121e' : '#16162a'};
  --border: ${isDark ? '#1e1e3a' : '#2a2a4a'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
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
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      var(--grid-color) 2px,
      var(--grid-color) 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      var(--grid-color) 2px,
      var(--grid-color) 3px
    );
  pointer-events: none;
  z-index: 0;
}

body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    var(--scanline-color) 1px,
    var(--scanline-color) 2px
  );
  pointer-events: none;
  z-index: 9999;
  animation: scanlineMove 8s linear infinite;
}

@keyframes scanlineMove {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
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
}

.blog-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-yellow));
  box-shadow: 0 0 10px var(--neon-cyan), 0 0 10px var(--neon-magenta);
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.nav-link {
  font-family: 'Share Tech Mono', monospace;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s, text-shadow 0.3s;
  position: relative;
  padding-bottom: 4px;
}

.nav-link:hover, .nav-link.active {
  color: var(--neon-cyan);
  text-shadow: 0 0 8px var(--neon-cyan), 0 0 20px rgba(0,240,255,0.3);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--neon-cyan);
  box-shadow: 0 0 6px var(--neon-cyan);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 48px;
  font-weight: 400;
  color: var(--neon-cyan);
  letter-spacing: 8px;
  text-transform: uppercase;
  margin-bottom: 16px;
  text-shadow: 0 0 10px var(--neon-cyan), 0 0 30px rgba(0,240,255,0.3);
  position: relative;
  display: inline-block;
}

.hero-title:hover {
  animation: glitch 0.3s ease-in-out;
}

@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-3px, 2px); text-shadow: -3px 0 var(--neon-magenta), 3px 0 var(--neon-cyan); }
  40% { transform: translate(3px, -2px); text-shadow: 3px 0 var(--neon-magenta), -3px 0 var(--neon-cyan); }
  60% { transform: translate(-2px, -1px); text-shadow: -2px 0 var(--neon-yellow), 2px 0 var(--neon-magenta); }
  80% { transform: translate(2px, 1px); text-shadow: 2px 0 var(--neon-cyan), -2px 0 var(--neon-yellow); }
  100% { transform: translate(0); text-shadow: 0 0 10px var(--neon-cyan), 0 0 30px rgba(0,240,255,0.3); }
}

.hero-description {
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.hero-glitch-bar {
  display: inline-block;
  width: 200px;
  height: 2px;
  margin-top: 24px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-yellow));
  box-shadow: 0 0 8px var(--neon-cyan);
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
  border: 1px solid var(--border);
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
  background: var(--neon-cyan);
  box-shadow: 0 0 8px var(--neon-cyan);
  transition: width 0.3s;
}

.card:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 15px rgba(0,240,255,0.15), inset 0 0 15px rgba(0,240,255,0.03);
  transform: translateY(-2px);
}

.card:hover::before {
  width: 4px;
  box-shadow: 0 0 12px var(--neon-cyan);
}

.card:hover .card-title {
  color: var(--neon-cyan);
  text-shadow: 0 0 8px rgba(0,240,255,0.3);
  animation: glitch 0.2s ease-in-out;
}

.card-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 18px;
  font-weight: 400;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 1px;
  transition: color 0.3s, text-shadow 0.3s;
}

.card-date {
  color: var(--neon-magenta);
  font-size: 12px;
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
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
  background: rgba(0,240,255,0.08);
  color: var(--neon-cyan);
  border: 1px solid rgba(0,240,255,0.2);
  border-radius: 2px;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.blog-divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-magenta), transparent);
  margin: 40px auto;
  width: 80%;
  box-shadow: 0 0 4px var(--neon-cyan);
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--neon-cyan);
  text-shadow: 0 0 8px rgba(0,240,255,0.3);
}

.archive-year {
  margin-bottom: 32px;
  position: relative;
  padding-left: 24px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 22px;
  color: var(--neon-magenta);
  margin-bottom: 16px;
  text-shadow: 0 0 6px rgba(255,0,170,0.3);
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
  background: var(--neon-magenta);
  box-shadow: 0 0 8px var(--neon-magenta);
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
  transition: color 0.3s, text-shadow 0.3s;
}

.archive-item a:hover {
  color: var(--neon-cyan);
  text-shadow: 0 0 6px rgba(0,240,255,0.3);
}

.archive-item-date {
  color: var(--neon-magenta);
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--neon-cyan);
  text-shadow: 0 0 8px rgba(0,240,255,0.3);
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
  background: rgba(0,240,255,0.06);
  color: var(--neon-cyan);
  border: 1px solid rgba(0,240,255,0.2);
  border-radius: 2px;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: rgba(0,240,255,0.12);
  box-shadow: 0 0 10px rgba(0,240,255,0.2);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: var(--neon-magenta);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  text-shadow: 0 0 6px rgba(255,0,170,0.3);
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
  color: var(--neon-cyan);
  text-shadow: 0 0 6px rgba(0,240,255,0.3);
}

.tag-post-date {
  color: var(--neon-magenta);
  font-size: 12px;
  margin-left: 12px;
  letter-spacing: 1px;
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
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-yellow));
  box-shadow: 0 0 10px var(--neon-cyan), 0 0 10px var(--neon-magenta);
}

.footer-logo {
  display: inline-block;
  width: 48px;
  height: 48px;
  border: 2px solid var(--neon-cyan);
  color: var(--neon-cyan);
  font-family: 'Share Tech Mono', monospace;
  font-size: 20px;
  line-height: 44px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: 0 0 10px rgba(0,240,255,0.3);
}

.footer-text {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
}

.post-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 4px;
  color: var(--neon-cyan);
  text-shadow: 0 0 10px rgba(0,240,255,0.3);
}

.post-meta {
  text-align: center;
  color: var(--neon-magenta);
  font-size: 13px;
  margin-bottom: 32px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.post-content {
  position: relative;
  padding-left: 20px;
  border-left: 2px solid var(--neon-cyan);
  box-shadow: -2px 0 8px rgba(0,240,255,0.1);
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Share Tech Mono', monospace;
  margin: 1.5em 0 0.8em;
  color: var(--neon-cyan);
  text-shadow: 0 0 6px rgba(0,240,255,0.2);
}

.post-content pre {
  background: #0a0a14;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 2px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  box-shadow: 0 0 8px rgba(0,240,255,0.05);
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--neon-yellow);
}

.post-content blockquote {
  border-left: 3px solid var(--neon-magenta);
  padding-left: 16px;
  color: var(--muted);
  margin: 1em 0;
  box-shadow: -3px 0 8px rgba(255,0,170,0.1);
}

.post-content img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(0,240,255,0.1);
}

.post-content a {
  color: var(--neon-cyan);
  text-decoration: none;
  border-bottom: 1px solid rgba(0,240,255,0.3);
  text-shadow: 0 0 4px rgba(0,240,255,0.2);
}

.post-content a:hover {
  border-bottom-color: var(--neon-cyan);
  text-shadow: 0 0 8px rgba(0,240,255,0.4);
}

@keyframes cyberFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: cyberFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; letter-spacing: 4px; }
  .card { padding: 20px; }
  .blog-nav { gap: 20px; }
  .hero-glitch-bar { width: 140px; }
}
`
}

export function getCyberpunkIndexHtml(data: ThemeIndexData): string {
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
  const logoChar = escapeHtml(data.siteTitle.charAt(0) || (bl === 'en' ? 'C' : '赛'))

  return `<!DOCTYPE html>
<html lang="${data.language || 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.siteTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${getCyberpunkCss(false)}</style>
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    <div class="footer-logo">${logoChar}</div>
    <nav class="blog-nav">
      <a class="nav-link active" data-view="home" href="javascript:void(0)">${bl === 'en' ? 'HOME' : '首页'}</a>
      <a class="nav-link" data-view="archive" href="javascript:void(0)">${bl === 'en' ? 'ARCHIVE' : '归档'}</a>
      <a class="nav-link" data-view="tags" href="javascript:void(0)">${bl === 'en' ? 'TAGS' : '标签'}</a>
    </nav>
  </header>

  <section class="blog-hero blog-view view-home">
    <h1 class="hero-title">${escapeHtml(data.siteTitle)}</h1>
    <p class="hero-description">${escapeHtml(data.siteDescription)}</p>
    <div class="hero-glitch-bar"></div>
  </section>

  <section class="blog-home blog-view view-home">
    <div class="card-grid">${cardsHtml}</div>
  </section>

  <section class="blog-archive blog-view view-archive">
    <div class="archive-title">${bl === 'en' ? 'ARCHIVE' : '归档'}</div>
    ${archiveHtml}
  </section>

  <section class="blog-tags blog-view view-tags">
    <div class="tags-title">${bl === 'en' ? 'TAGS' : '标签'}</div>
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

/**
 * New theme CSS generators for the 18 additional themes
 * (poetry, typewriter, ocean, sunset, editorial, trending, dispatch,
 *  carbon, blueprint, hacker, showcase, mosaic, gallery, cinematic,
 *  docs, wiki, neon, origami)
 */

// ─── Poetry — 「纸页诗行」──────────────────────────────────
export function getPoetryCss(isDark: boolean): string {
  const bg = isDark ? '#1a1025' : '#faf5ff'
  const fg = isDark ? '#e8d5f5' : '#2d1b4e'
  const muted = isDark ? '#9b8bb0' : '#7c6f8a'
  const accent = isDark ? '#c4b5fd' : '#8b5cf6'
  const accentLight = isDark ? 'rgba(196,181,253,0.1)' : 'rgba(139,92,246,0.08)'
  const cardBg = isDark ? '#231535' : '#ffffff'
  const border = isDark ? '#3d2a5c' : '#e9d5ff'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 2.0;
  min-height: 100vh;
}

.blog-container {
  max-width: 580px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 60px 0 32px;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: color 0.3s;
  padding-bottom: 0;
  position: relative;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 72px 0 48px;
}

.hero-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 36px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 6px;
  margin-bottom: 20px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.hero-description {
  color: var(--muted);
  font-size: 15px;
  letter-spacing: 2px;
  line-height: 2.0;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 32px 0;
}

.card {
  background: none;
  border-radius: 0;
  padding: 28px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: none;
  text-decoration: none;
  color: inherit;
  display: block;
  animation: poetryFadeIn 0.8s ease-out both;
}

.card:hover {
  border-color: var(--border);
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 20px;
  font-weight: 400;
  margin-bottom: 6px;
  color: var(--fg);
  position: relative;
  padding-left: 16px;
}

.card-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 5px;
  bottom: 5px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.card-date {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.card-date::before {
  content: '◇ ';
  color: var(--accent);
  font-size: 11px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 12px;
  background: none;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 6px;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
}

.blog-archive .archive-title {
  display: block;
}

.blog-archive .archive-title::before {
  display: none;
}

.archive-year {
  margin-bottom: 36px;
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

.archive-year-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 16px;
  letter-spacing: 2px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 24px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 6px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 4px 16px;
  background: none;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s;
  text-decoration: none;
  letter-spacing: 1px;
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 2px;
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
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: none;
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 3px;
}

.post-detail {
  max-width: 580px;
  margin: 0 auto;
  padding: 48px 24px;
}

.post-title {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 20px;
  letter-spacing: 4px;
  color: var(--fg);
  line-height: 1.6;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 1px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.5em;
  text-indent: 0;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  margin: 2em 0 1em;
  color: var(--fg);
  letter-spacing: 2px;
  position: relative;
  padding-left: 16px;
}

.post-content h1::before, .post-content h2::before, .post-content h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: none;
  padding: 16px 24px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: italic;
  position: relative;
  background: ${accentLight};
  border-radius: 0;
}

.post-content blockquote::before {
  content: '\\275D';
  position: absolute;
  top: -4px;
  left: 8px;
  font-size: 36px;
  color: var(--accent);
  opacity: 0.4;
  line-height: 1;
}

.post-content blockquote::after {
  content: '\\275E';
  position: absolute;
  bottom: -8px;
  right: 12px;
  font-size: 36px;
  color: var(--accent);
  opacity: 0.4;
  line-height: 1;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}

.post-content a:hover {
  border-bottom-color: var(--accent);
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 2px;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: var(--accent);
}

@keyframes poetryFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; letter-spacing: 3px; }
  .hero-title::before { left: -14px; }
  .card { padding: 20px 0; }
  .blog-nav { gap: 24px; }
  .post-title { font-size: 26px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Typewriter — 「机械印记」───────────────────────────────
export function getTypewriterCss(isDark: boolean): string {
  const bg = isDark ? '#1a1810' : '#f5f0e1'
  const fg = isDark ? '#d4c9a8' : '#3d3522'
  const muted = isDark ? '#8a7e5f' : '#8b7d5e'
  const accent = isDark ? '#c9a84c' : '#8b6914'
  const accentLight = isDark ? 'rgba(201,168,76,0.1)' : 'rgba(139,105,20,0.08)'
  const cardBg = isDark ? '#252218' : '#fffdf5'
  const border = isDark ? '#3d3625' : '#d4c9a8'
  const ribbonColor = isDark ? '#8b2020' : '#c0392b'
  const paperLine = isDark ? 'rgba(212,201,168,0.06)' : 'rgba(61,53,34,0.06)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Courier New', 'Courier', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: '';
  display: block;
  height: 6px;
  background: ${ribbonColor};
  margin-bottom: 24px;
}

.blog-header-site {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 18px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 16px;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 0;
  padding: 12px 0;
  border-bottom: 1px dashed var(--border);
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.3s;
  padding-bottom: 0;
  position: relative;
}

.nav-link::before {
  content: '[';
  color: var(--accent);
}

.nav-link::after {
  content: ']';
  color: var(--accent);
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 60px 0 40px;
}

.hero-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 16px;
  text-transform: uppercase;
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid var(--accent);
  animation: typewriterBlink 0.7s step-end infinite;
  display: inline-block;
  max-width: 100%;
}

.hero-description {
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 1px;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px 24px 24px 32px;
  position: relative;
  border: 1px solid var(--border);
  border-left: 3px solid ${ribbonColor};
  transition: none;
  text-decoration: none;
  color: inherit;
  display: block;
  animation: typewriterFadeIn 0.5s ease-out both;
  background-image: repeating-linear-gradient(
    0deg,
    ${paperLine} 0px,
    ${paperLine} 27px,
    transparent 27px,
    transparent 28px
  );
  background-size: 100% 28px;
  background-position: 0 24px;
}

.card::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(135deg, var(--card-bg) 33.33%, transparent 33.33%) 0 0,
              linear-gradient(-135deg, var(--card-bg) 33.33%, transparent 33.33%) 0 0;
  background-size: 8px 8px;
  background-repeat: repeat-x;
  background-color: var(--bg);
}

.card:hover {
  border-color: var(--border);
  border-left-color: ${ribbonColor};
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 16px;
  font-weight: 400;
  margin-bottom: 6px;
  color: var(--fg);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--accent);
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 10px;
  font-family: 'Courier New', 'Courier', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 10px;
  background: none;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 20px;
  border-left: 2px solid ${ribbonColor};
}

.archive-year-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted var(--border);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
}

.archive-item a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 4px 14px;
  background: none;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s;
  text-decoration: none;
  letter-spacing: 1px;
  font-family: 'Courier New', 'Courier', monospace;
}

.tag-cloud-item::before {
  content: '[';
  color: var(--accent);
}

.tag-cloud-item::after {
  content: ']';
  color: var(--accent);
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border);
  letter-spacing: 1px;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px dashed var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  font-family: 'Courier New', 'Courier', monospace;
}

.blog-footer::before {
  content: '--- ';
  color: var(--accent);
}

.blog-footer::after {
  content: ' ---';
  color: var(--accent);
}

.post-detail {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 24px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  border-bottom: 2px dashed var(--accent);
  padding-bottom: 12px;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 32px;
  letter-spacing: 1px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Courier New', 'Courier', monospace;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 3px solid ${ribbonColor};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'Courier New', 'Courier', monospace;
}

.post-content code {
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 3px solid ${ribbonColor};
  padding: 12px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
}

.post-content a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  border-bottom: none;
}

.post-content a:hover {
  color: var(--fg);
}

.post-content strong, .post-content b {
  font-weight: 400;
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-underline-offset: 3px;
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 20px;
  font-family: 'Courier New', 'Courier', monospace;
}

.back-link::before {
  content: '[';
  color: var(--accent);
}

.back-link::after {
  content: ']';
  color: var(--accent);
}

.back-link:hover {
  color: var(--accent);
}

@keyframes typewriterBlink {
  0%, 100% { border-color: var(--accent); }
  50% { border-color: transparent; }
}

@keyframes typewriterFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 22px; letter-spacing: 2px; }
  .card { padding: 16px 16px 16px 24px; }
  .blog-nav { gap: 16px; }
  .post-title { font-size: 20px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Ocean — 「潮汐韵律」─────────────────────────────────────
export function getOceanCss(isDark: boolean): string {
  const bg = isDark ? '#001a2e' : '#f0f9ff'
  const fg = isDark ? '#caf0f8' : '#023e8a'
  const muted = isDark ? '#4895b8' : '#5e8fac'
  const accent = isDark ? '#90e0ef' : '#0077b6'
  const accentLight = isDark ? 'rgba(144,224,239,0.12)' : 'rgba(0,119,182,0.08)'
  const cardBg = isDark ? '#002d4a' : '#ffffff'
  const border = isDark ? '#004060' : '#caf0f8'
  const waveColor1 = isDark ? 'rgba(0,119,182,0.25)' : 'rgba(0,119,182,0.12)'
  const waveColor2 = isDark ? 'rgba(144,224,239,0.15)' : 'rgba(144,224,239,0.10)'
  const shadowWaveHover = isDark ? '0 16px 48px rgba(0,64,96,0.5)' : '0 16px 48px rgba(0,119,182,0.18)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.9;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── 顶部波浪装饰带 ── */
.blog-container::before {
  content: '';
  display: block;
  height: 6px;
  background: linear-gradient(90deg, ${accent}, ${isDark ? '#4895b8' : '#90e0ef'}, ${accent});
  background-size: 200% 100%;
  animation: oceanWaveShift 4s ease-in-out infinite;
  border-radius: 0 0 4px 4px;
}

@keyframes oceanWaveShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.blog-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 28px;
}

/* ── 头部 ── */
.blog-header {
  padding: 48px 0 0;
  text-align: center;
  position: relative;
}

.blog-header-site {
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

/* ── 半透明胶囊导航 ── */
.blog-nav {
  display: inline-flex;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
  padding: 6px 12px;
  background: ${isDark ? 'rgba(0,45,74,0.6)' : 'rgba(255,255,255,0.7)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 40px;
  border: 1px solid ${border};
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 18px;
  border-radius: 24px;
  position: relative;
}

.nav-link:hover, .nav-link.active {
  color: ${isDark ? '#001a2e' : '#ffffff'};
  background: var(--accent);
}

.nav-link.active::after {
  display: none;
}

/* ── SVG波浪分隔线 ── */
.blog-hero {
  text-align: center;
  padding: 60px 0 0;
  position: relative;
}

.blog-hero::after {
  content: '';
  display: block;
  width: 100%;
  height: 24px;
  margin-top: 40px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 24'%3E%3Cpath d='M0,12 C200,24 400,0 600,12 C800,24 1000,0 1200,12 L1200,24 L0,24 Z' fill='${encodeURIComponent(waveColor1)}'/%3E%3C/svg%3E") repeat-x;
  background-size: 1200px 24px;
  animation: oceanWaveScroll 8s linear infinite;
}

@keyframes oceanWaveScroll {
  from { background-position-x: 0; }
  to { background-position-x: 1200px; }
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.hero-description {
  color: var(--muted);
  font-size: 17px;
  line-height: 1.7;
  letter-spacing: 0.5px;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 卡片网格 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease, border-color 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
}

/* 波浪阴影 */
.card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, ${waveColor1}, ${waveColor2}, ${waveColor1});
  background-size: 200% 100%;
  border-radius: 0 0 16px 16px;
  animation: oceanWaveShift 3s ease-in-out infinite;
}

.card:hover {
  border-color: var(--accent);
  box-shadow: ${shadowWaveHover};
  transform: translateY(-6px);
}

.card-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.8;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 14px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
  position: relative;
}

.archive-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--accent);
  margin: 12px auto 0;
  border-radius: 2px;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid var(--accent);
  border-radius: 2px;
}

.archive-year-title {
  font-family: 'Nunito', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
  position: relative;
}

.tags-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background: var(--accent);
  margin: 12px auto 0;
  border-radius: 2px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#001a2e' : '#ffffff'};
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${waveColor1};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-weight: 500;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 0;
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  position: relative;
}

.blog-footer::before {
  content: '';
  display: block;
  width: 100%;
  height: 20px;
  margin-bottom: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 20'%3E%3Cpath d='M0,10 C150,20 350,0 600,10 C850,20 1050,0 1200,10 L1200,20 L0,20 Z' fill='${encodeURIComponent(waveColor2)}'/%3E%3C/svg%3E") repeat-x;
  background-size: 1200px 20px;
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 28px;
}

.post-title {
  font-family: 'Nunito', sans-serif;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  color: var(--fg);
  position: relative;
  padding-bottom: 20px;
}

/* 波浪装饰线 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 2px;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 32px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Nunito', sans-serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
}

.post-content pre {
  background: var(--card-bg);
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
  color: var(--accent);
}

/* 波浪左边框引用块 */
.post-content blockquote {
  border-left: 4px solid var(--accent);
  border-image: linear-gradient(to bottom, var(--accent), ${isDark ? '#4895b8' : '#90e0ef'}) 1;
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  position: relative;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--border);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.9em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: var(--accent); }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 16px;
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画：潮水涌来 ── */
@keyframes oceanTideIn {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: oceanTideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }
.card:nth-child(5) { animation-delay: 0.48s; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 30px; }
  .card { padding: 20px 24px; border-radius: 12px; }
  .blog-nav { gap: 2px; padding: 4px 8px; }
  .nav-link { padding: 6px 14px; font-size: 13px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Sunset — 「光影长廊」─────────────────────────────────────
export function getSunsetCss(isDark: boolean): string {
  const bg = isDark ? '#1a0a05' : '#fff7ed'
  const fg = isDark ? '#fde68a' : '#7c2d12'
  const muted = isDark ? '#b87333' : '#9a6b3d'
  const accent = isDark ? '#f48c06' : '#dc2f02'
  const accentLight = isDark ? 'rgba(244,140,6,0.12)' : 'rgba(220,47,2,0.08)'
  const cardBg = isDark ? '#2a1208' : '#ffffff'
  const border = isDark ? '#4a2010' : '#fed7aa'
  const sidebarBg = isDark ? 'rgba(26,10,5,0.95)' : 'rgba(255,247,237,0.95)'
  const glowColor = isDark ? 'rgba(244,140,6,0.3)' : 'rgba(220,47,2,0.2)'
  const gradientStart = isDark ? '#1a0a05' : '#fff7ed'
  const gradientMid = isDark ? '#2a1208' : '#ffedd5'
  const gradientEnd = isDark ? '#1a0520' : '#fde68a'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientMid}, ${gradientEnd}, ${gradientMid}, ${gradientStart});
  background-size: 400% 400%;
  animation: sunsetGradientShift 20s ease infinite;
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

@keyframes sunsetGradientShift {
  0% { background-position: 0% 50%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 50%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 50%; }
}

/* ── 非对称布局：侧边栏 + 内容 ── */
.blog-container {
  display: flex;
  min-height: 100vh;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* ── 左侧固定侧边栏 ── */
.blog-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 200px;
  height: 100vh;
  background: ${sidebarBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--border);
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  overflow-y: auto;
}

.blog-header-site {
  font-family: 'Georgia', serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--fg);
  margin-bottom: 32px;
  writing-mode: horizontal-tb;
}

/* ── 竖排导航 ── */
.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 0;
  width: 100%;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 10px 16px;
  border-radius: 8px;
  position: relative;
  text-align: left;
  display: block;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
  background: ${accentLight};
  box-shadow: 0 0 16px ${glowColor};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 2px;
}

/* 侧边栏底部太阳图标装饰 */
.blog-header::after {
  content: '☀';
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 28px;
  opacity: 0.3;
  color: var(--accent);
}

/* ── 右侧内容区 ── */
.blog-hero,
.blog-home,
.blog-archive,
.blog-tags,
.blog-about,
.blog-links,
.blog-series,
.blog-footer,
.post-detail,
.not-found-page {
  margin-left: 200px;
}

.blog-hero {
  text-align: left;
  padding: 80px 48px 40px;
  position: relative;
}

.hero-title {
  font-family: 'Georgia', serif;
  font-size: 52px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  color: var(--muted);
  font-size: 18px;
  line-height: 1.6;
  max-width: 600px;
  font-family: 'Inter', sans-serif;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 封面式卡片网格 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 28px;
  padding: 0 48px 40px;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 320px;
}

/* 卡片顶部渐变模拟封面图（占2/3） */
.card::before {
  content: '';
  display: block;
  min-height: 200px;
  background: linear-gradient(135deg,
    ${isDark ? '#4a2010' : '#fed7aa'},
    ${isDark ? '#7c2d12' : '#fdba74'},
    ${isDark ? '#9a3412' : '#fb923c'},
    ${isDark ? '#7c2d12' : '#f97316'});
  background-size: 200% 200%;
  animation: sunsetCardGlow 6s ease infinite;
  flex-shrink: 0;
}

@keyframes sunsetCardGlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* 卡片右上角光晕效果 */
.card::after {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, ${glowColor}, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px ${isDark ? 'rgba(244,140,6,0.15)' : 'rgba(220,47,2,0.1)'};
}

.card-title {
  font-family: 'Georgia', serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  padding: 16px 20px 4px;
  color: var(--fg);
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 0 20px;
  margin-bottom: 4px;
  font-family: 'Inter', sans-serif;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  padding: 0 20px;
  flex: 1;
  font-family: 'Inter', sans-serif;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 8px 20px 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  font-family: 'Inter', sans-serif;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 48px;
}

.archive-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid var(--accent);
}

.archive-year-title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
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
  font-weight: 500;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 48px;
}

.tags-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 1px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#1a0a05' : '#ffffff'};
  box-shadow: 0 0 20px ${glowColor};
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Georgia', serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-family: 'Inter', sans-serif;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 48px;
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 1px;
  border-top: 1px solid var(--border);
  font-family: 'Inter', sans-serif;
}

/* ── 文章详情：全宽头图+渐变遮罩+标题叠加 ── */
.post-detail {
  margin-left: 200px;
  padding: 0;
  max-width: none;
}

.post-detail > .back-link {
  display: inline-block;
  margin: 24px 48px 0;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
  font-family: 'Inter', sans-serif;
}

.post-detail > .back-link:hover {
  color: var(--accent);
}

.post-detail > .breadcrumb {
  margin: 12px 48px 0;
}

/* 全宽头图区域 */
.post-title {
  font-family: 'Georgia', serif;
  font-size: 42px;
  font-weight: 700;
  text-align: left;
  margin: 0;
  letter-spacing: -0.5px;
  color: ${isDark ? '#1a0a05' : '#ffffff'};
  position: relative;
  padding: 80px 48px 40px;
  background: linear-gradient(135deg,
    ${isDark ? '#7c2d12' : '#f97316'},
    ${isDark ? '#9a3412' : '#ea580c'},
    ${isDark ? '#4a2010' : '#dc2f02'});
  background-size: 200% 200%;
  animation: sunsetCardGlow 8s ease infinite;
}

/* 渐变遮罩 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, ${bg});
  pointer-events: none;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  padding: 16px 48px 32px;
  font-family: 'Inter', sans-serif;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
  padding: 0 48px;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.6em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 4px solid var(--accent);
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.9em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: var(--accent); }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画 ── */
@keyframes sunsetFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: sunsetFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── 移动端响应式：侧边栏隐藏，顶部汉堡菜单 ── */
@media (max-width: 768px) {
  .blog-container {
    flex-direction: column;
  }

  .blog-header {
    position: relative;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 16px 20px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .blog-header::after {
    display: none;
  }

  .blog-header-site {
    margin-bottom: 0;
    font-size: 14px;
  }

  .blog-nav {
    flex-direction: row;
    gap: 4px;
    width: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 13px;
    text-align: center;
  }

  .nav-link.active::after {
    display: none;
  }

  .blog-hero,
  .blog-home,
  .blog-archive,
  .blog-tags,
  .blog-about,
  .blog-links,
  .blog-series,
  .blog-footer,
  .post-detail {
    margin-left: 0;
  }

  .blog-hero {
    padding: 40px 20px 24px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-description {
    font-size: 15px;
  }

  .card-grid {
    grid-template-columns: 1fr;
    padding: 0 20px 24px;
    gap: 20px;
  }

  .card {
    min-height: 260px;
  }

  .card::before {
    min-height: 140px;
  }

  .blog-archive,
  .blog-tags {
    padding: 24px 20px;
  }

  .blog-footer {
    padding: 24px 20px;
  }

  .post-title {
    font-size: 28px;
    padding: 48px 20px 32px;
  }

  .post-meta {
    padding: 12px 20px 24px;
  }

  .post-body-layout {
    grid-template-columns: 1fr;
    padding: 0 20px;
  }

  .post-toc {
    display: none;
  }

  .post-detail > .back-link {
    margin: 16px 20px 0;
  }

  .post-detail > .breadcrumb {
    margin: 8px 20px 0;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .post-body-layout {
    grid-template-columns: 1fr;
  }
  .post-toc {
    display: none;
  }
}
`
}

// ─── Editorial ─────────────────────────────────────────────
export function getEditorialCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#ffffff'
  const fg = isDark ? '#e8e8e8' : '#1a1a1a'
  const muted = isDark ? '#999999' : '#666666'
  const accent = isDark ? '#ff4444' : '#cc0000'
  const accentLight = isDark ? 'rgba(255,68,68,0.12)' : 'rgba(204,0,0,0.06)'
  const cardBg = isDark ? '#242424' : '#fafafa'
  const border = isDark ? '#3a3a3a' : '#d4d4d4'
  const navBg = isDark ? '#111111' : '#1a1a1a'
  const navFg = '#ffffff'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0;
}

.blog-header {
  background: ${navBg};
  padding: 0;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  color: ${navFg};
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 4px;
  padding: 16px 0 0;
  text-transform: uppercase;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-top: 0;
  padding: 0 24px;
  border-top: 1px solid rgba(255,255,255,0.15);
}

.nav-link {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  position: relative;
  padding: 12px 20px;
  font-weight: 600;
}

.nav-link:hover, .nav-link.active {
  color: ${navFg};
  background: rgba(255,255,255,0.08);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${accent};
}

.blog-hero {
  text-align: center;
  padding: 48px 24px 32px;
  border-bottom: 2px solid ${accent};
}

.hero-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 56px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
  line-height: 1.1;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 0.5px;
  font-style: italic;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0;
  padding: 0;
}

.card-grid .card:nth-child(n+5) {
  display: none;
}

.card-grid::after {
  content: '';
  display: block;
  background: var(--card-bg);
  border-left: 1px solid var(--border);
  padding: 24px;
  grid-column: 2;
  grid-row: 1 / 5;
}

.card {
  background: transparent;
  border-radius: 0;
  padding: 20px 24px;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card:hover {
  background: var(--accent-light);
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--fg);
  line-height: 1.3;
}

.card-date {
  color: ${accent};
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 700;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: transparent;
  color: ${accent};
  border: 1px solid ${accent};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
}

.blog-archive {
  padding: 40px 24px;
}

.archive-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  font-weight: 900;
  border-bottom: 3px solid ${accent};
  padding-bottom: 12px;
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 3px solid ${accent};
}

.archive-year-title {
  font-size: 24px;
  color: ${accent};
  margin-bottom: 12px;
  font-weight: 900;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted var(--border);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 15px;
}

.archive-item a:hover {
  color: ${accent};
  text-decoration: underline;
}

.archive-item-date {
  color: ${accent};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  margin-left: 16px;
}

.blog-tags {
  padding: 40px 24px;
}

.tags-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 36px;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  font-weight: 900;
  border-bottom: 3px solid ${accent};
  padding-bottom: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  font-weight: 600;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${navFg};
  border-color: ${accent};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 20px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  font-weight: 900;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
  text-decoration: underline;
}

.tag-post-date {
  color: ${accent};
  font-size: 12px;
  margin-left: 12px;
  font-weight: 700;
}

.blog-footer {
  text-align: center;
  padding: 32px 24px;
  border-top: 3px solid ${accent};
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 48px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 1px;
  color: var(--fg);
  font-weight: 900;
  line-height: 1.15;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-style: italic;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  text-align: justify;
  hyphens: auto;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  font-weight: 900;
}

.post-content h2 {
  font-size: 1.6em;
  border-bottom: 2px solid ${accent};
  padding-bottom: 8px;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 3px solid ${accent};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 4px solid ${accent};
  padding-left: 20px;
  color: var(--muted);
  margin: 1.2em 0;
  font-style: italic;
  background: var(--accent-light);
  padding: 12px 20px;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid ${accent};
}

.post-content a:hover {
  border-bottom-width: 2px;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 2px solid var(--border);
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 16px;
  transition: color 0.2s;
}

.back-link:hover {
  color: ${accent};
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: themeFadeIn 0.4s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.1s; }
.card:nth-child(4) { animation-delay: 0.15s; }

@media (max-width: 768px) {
  .blog-container { padding: 0; }
  .hero-title { font-size: 32px; letter-spacing: 1px; }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card-grid::after { display: none; }
  .card-grid .card:nth-child(n+5) { display: block; }
  .card { padding: 16px; }
  .blog-nav { gap: 0; overflow-x: auto; }
  .nav-link { padding: 10px 14px; font-size: 12px; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-hero { padding: 32px 16px 24px; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Trending ──────────────────────────────────────────────
export function getTrendingCss(isDark: boolean): string {
  const bg = isDark ? '#0f0520' : '#f5f0ff'
  const fg = isDark ? '#f0e0ff' : '#1a0533'
  const muted = isDark ? '#8b5fc0' : '#7c3aed'
  const accent = isDark ? '#ec4899' : '#7c3aed'
  const accentLight = isDark ? 'rgba(236,72,153,0.12)' : 'rgba(124,58,237,0.06)'
  const cardBg = isDark ? '#1a0a30' : '#ffffff'
  const border = isDark ? '#3d1a60' : '#e0d0f0'
  const navBg = isDark ? 'rgba(15,5,32,0.85)' : 'rgba(245,240,255,0.85)'
  const gradientStart = isDark ? '#ec4899' : '#7c3aed'
  const gradientEnd = isDark ? '#8b5cf6' : '#a855f7'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Poppins', 'Inter', 'Noto Serif SC', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  text-align: center;
  border-bottom: none;
  background: ${navBg};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  color: var(--fg);
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 14px 0 0;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 0;
  padding: 8px 24px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  color: ${bg};
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 72px 24px 48px;
  position: relative;
  overflow: hidden;
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, ${accentLight} 0%, transparent 50%),
              radial-gradient(circle at 70% 50%, rgba(139,92,246,0.08) 0%, transparent 50%);
  animation: heroGlow 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes heroGlow {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-5%, 5%); }
}

.hero-title {
  font-family: 'Poppins', sans-serif;
  font-size: 52px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -1px;
  margin-bottom: 16px;
  position: relative;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  color: var(--muted);
  font-size: 17px;
  letter-spacing: 0.3px;
  position: relative;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 0;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  perspective: 800px;
}

.card::before {
  content: '';
  display: block;
  height: 160px;
  background: linear-gradient(135deg, ${gradientStart}22, ${gradientEnd}22),
              linear-gradient(135deg, ${gradientStart}11, ${gradientEnd}11);
  border-bottom: 1px solid var(--border);
  position: relative;
}

.card::after {
  content: '\\1F525';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 20px;
  opacity: 0.6;
  filter: grayscale(0.3);
}

.card:hover {
  border-color: ${accent};
  box-shadow: 0 12px 40px ${isDark ? 'rgba(236,72,153,0.15)' : 'rgba(124,58,237,0.12)'};
  transform: perspective(800px) rotateY(-3deg) translateY(-4px);
}

.card-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--fg);
  padding: 20px 20px 0;
  line-height: 1.4;
}

.card-date {
  color: ${accent};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 20px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  padding: 0 20px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
  padding: 0 20px 20px;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, ${gradientStart}18, ${gradientEnd}18);
  color: ${accent};
  border: none;
  border-radius: 12px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0px;
  color: var(--fg);
  font-weight: 700;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid transparent;
  border-image: linear-gradient(to bottom, ${gradientStart}, ${gradientEnd}) 1;
}

.archive-year-title {
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.archive-item:hover {
  padding-left: 8px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0px;
  color: var(--fg);
  font-weight: 700;
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--card-bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
  text-decoration: none;
  font-weight: 500;
}

.tag-cloud-item:hover {
  background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
  color: ${isDark ? '#0f0520' : '#ffffff'};
  border-color: transparent;
  transform: scale(1.08);
  box-shadow: 0 4px 16px ${isDark ? 'rgba(236,72,153,0.3)' : 'rgba(124,58,237,0.2)'};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}) 1;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.tag-post-item:hover {
  padding-left: 8px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.5px;
}

.post-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-detail::before {
  content: '';
  display: block;
  height: 240px;
  background: linear-gradient(135deg, ${gradientStart}22, ${gradientEnd}22),
              linear-gradient(135deg, ${gradientStart}11, ${gradientEnd}11);
  border-radius: 20px;
  margin-bottom: 32px;
  border: 1px solid var(--border);
}

.post-title {
  font-family: 'Poppins', sans-serif;
  font-size: 40px;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
  color: var(--fg);
  font-weight: 700;
  line-height: 1.2;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Poppins', sans-serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.5em;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}, transparent) 1;
}

.post-content pre {
  background: var(--card-bg);
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
  color: ${accent};
}

.post-content blockquote {
  border-left: 4px solid transparent;
  border-image: linear-gradient(to bottom, ${gradientStart}, ${gradientEnd}) 1;
  padding-left: 20px;
  color: var(--muted);
  margin: 1.2em 0;
  font-style: italic;
  background: var(--accent-light);
  padding: 16px 20px;
  border-radius: 0 12px 12px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid transparent;
  background: linear-gradient(to right, ${accent}, ${accent}) no-repeat right bottom / 0 1px;
  transition: background-size 0.3s;
  background-position: left bottom;
}

.post-content a:hover {
  background-size: 100% 1px;
}

.post-toc {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 16px;
  font-size: 0.85em;
  line-height: 1.6;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}44; border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  font-size: 0.85em;
  font-family: 'Poppins', sans-serif;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: all 0.2s;
  line-height: 1.5;
  text-decoration: none;
  border-radius: 6px;
  padding-left: 8px;
}

.toc-nav a.toc-h1 { font-weight: 700; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 20px; }
.toc-nav a.toc-h4 { padding-left: 32px; }
.toc-nav a.toc-h5 { padding-left: 44px; }
.toc-nav a.toc-h6 { padding-left: 56px; }
.toc-nav a:hover, .toc-nav a.active {
  color: ${accent};
  background: var(--accent-light);
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  transition: color 0.2s;
  font-weight: 500;
}

.back-link:hover {
  color: ${accent};
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.card {
  animation: themeFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
.card:nth-child(5) { animation-delay: 0.32s; }
.card:nth-child(6) { animation-delay: 0.4s; }

@keyframes numberPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.card:hover .card-date {
  animation: numberPop 0.4s ease;
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 32px; letter-spacing: -0.5px; }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card { border-radius: 12px; }
  .card::before { height: 100px; }
  .card:hover { transform: translateY(-2px); }
  .blog-nav { gap: 2px; overflow-x: auto; }
  .nav-link { padding: 6px 12px; font-size: 12px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-hero { padding: 48px 16px 32px; }
  .post-detail::before { height: 140px; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Dispatch ──────────────────────────────────────────────
export function getDispatchCss(isDark: boolean): string {
  const bg = isDark ? '#0a1520' : '#f0f4f8'
  const fg = isDark ? '#c8d8e8' : '#1e3a5f'
  const muted = isDark ? '#5a7a9a' : '#6b8aab'
  const accent = isDark ? '#ea580c' : '#d44800'
  const accentLight = isDark ? 'rgba(234,88,12,0.12)' : 'rgba(212,72,0,0.08)'
  const cardBg = isDark ? '#0f1e2e' : '#ffffff'
  const border = isDark ? '#1a3050' : '#c8d4e0'
  const redDot = isDark ? '#ef4444' : '#dc2626'
  const headerLine = isDark ? '#ea580c' : '#d44800'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'JetBrains Mono', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.5;
  min-height: 100vh;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* ── Single-column compact layout ── */
.blog-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px;
}

/* ── Telegram header: thin line + text nav ── */
.blog-header {
  padding: 0;
  border-bottom: 2px solid ${headerLine};
  position: relative;
}

.blog-header::before {
  content: '▶ BREAKING │';
  display: block;
  padding: 8px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: ${accent};
  font-weight: 600;
  text-transform: uppercase;
}

.blog-header-site {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--muted);
  padding: 4px 0 0;
  letter-spacing: 0.5px;
}

.blog-nav {
  display: flex;
  gap: 0;
  margin-top: 4px;
  border-top: 1px solid ${border};
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  padding: 6px 14px;
  position: relative;
  border-right: 1px solid ${border};
}

.nav-link:last-child {
  border-right: none;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: ${accent};
}

/* ── Hero: compact dispatch banner ── */
.blog-hero {
  padding: 24px 0 16px;
  border-bottom: 1px dashed ${border};
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.3px;
  margin-bottom: 6px;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card grid: compact list ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 14px;
  padding: 14px 0;
  border-bottom: 1px dashed ${border};
  position: relative;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  animation: dispatchSlideIn 0.4s ease-out both;
}

.card:hover {
  background: ${accentLight};
}

@keyframes dispatchSlideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.1s; }
.card:nth-child(4) { animation-delay: 0.15s; }
.card:nth-child(5) { animation-delay: 0.2s; }
.card:nth-child(6) { animation-delay: 0.25s; }

/* Red dot ● for new articles */
.card::before {
  content: '●';
  position: absolute;
  left: -14px;
  top: 16px;
  font-size: 8px;
  color: ${redDot};
  line-height: 1;
}

/* ── Card date: vertical red text on left ── */
.card-date {
  writing-mode: vertical-lr;
  text-orientation: mixed;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: ${accent};
  letter-spacing: 1px;
  padding-top: 2px;
  white-space: nowrap;
  grid-row: 1 / 3;
  align-self: start;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: ${accentLight};
  color: ${accent};
  border: 1px dashed ${border};
  border-radius: 2px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

/* ── Page sections ── */
.page-section { display: none; }
.page-section.active {
  display: block;
  animation: dispatchSlideIn 0.4s ease;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  margin-bottom: 20px;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.archive-title::before {
  content: '▶ ';
  color: ${accent};
}

.archive-year {
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 2px solid ${accent};
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.archive-item {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
  border-bottom: 1px dashed ${border};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  margin-bottom: 20px;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.tags-title::before {
  content: '▶ ';
  color: ${accent};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px dashed ${border};
  border-radius: 2px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed ${border};
}

.tag-posts-title::before {
  content: '▶ ';
}

.tag-post-item {
  padding: 5px 0;
  border-bottom: 1px dashed ${border};
  font-size: 13px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 24px 0;
  border-top: 2px solid ${headerLine};
  margin-top: 32px;
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 1px;
}

.blog-footer::before {
  content: '■ ■ ■  ';
  color: ${accent};
  font-size: 8px;
}

/* ── Post detail ── */
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0;
}

.back-link {
  display: inline-block;
  color: var(--muted);
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  margin: 16px 0 8px;
  transition: color 0.2s;
  letter-spacing: 0.5px;
}

.back-link:hover {
  color: ${accent};
}

.back-link::before {
  content: '◀ ';
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  padding: 16px 0 8px;
  color: var(--fg);
  letter-spacing: -0.3px;
  border-bottom: 2px solid ${accent};
  padding-bottom: 12px;
}

.post-title::before {
  content: '▶ ';
  color: ${accent};
  font-weight: 400;
}

.post-meta {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
  padding: 8px 0;
  font-family: 'JetBrains Mono', monospace;
  border-bottom: 1px dashed ${border};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
  padding: 20px 0;
}

.post-content p {
  margin-bottom: 0.8em;
  font-size: 14px;
  line-height: 1.6;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.2em 0 0.5em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2::before {
  content: '▶ ';
  color: ${accent};
  font-size: 0.8em;
}

.post-content pre {
  background: ${isDark ? '#0c1a28' : '#e8eef4'};
  padding: 12px;
  border: 1px solid ${border};
  border-left: 3px solid ${accent};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${border};
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.5;
  font-family: 'JetBrains Mono', monospace;
  border-left: 2px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 600; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 14px; }

  .card::before {
    left: -10px;
  }

  .card-date {
    writing-mode: horizontal-tb;
    font-size: 11px;
  }

  .card {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .card-date {
    grid-row: auto;
  }

  .hero-title { font-size: 18px; }
  .post-title { font-size: 18px; }

  .blog-nav {
    overflow-x: auto;
  }

  .nav-link {
    font-size: 11px;
    padding: 5px 10px;
  }
}
`
}

// ─── Carbon ────────────────────────────────────────────────
export function getCarbonCss(isDark: boolean): string {
  const bg = isDark ? '#0d1117' : '#f6f8fa'
  const fg = isDark ? '#c9d1d9' : '#24292f'
  const muted = isDark ? '#8b949e' : '#57606a'
  const accent = isDark ? '#4ade80' : '#1f6feb'
  const cardBg = isDark ? '#161b22' : '#ffffff'
  const border = isDark ? '#30363d' : '#d0d7de'
  const accentLight = isDark ? 'rgba(74,222,128,0.1)' : 'rgba(31,111,235,0.08)'
  const sidebarBg = isDark ? '#0d1117' : '#f0f3f6'
  const lineNumColor = isDark ? '#484f58' : '#afb8c1'
  const hoverBg = isDark ? 'rgba(74,222,128,0.06)' : 'rgba(31,111,235,0.04)'
  const tabActiveBg = isDark ? '#161b22' : '#ffffff'
  const tabInactiveBg = isDark ? '#0d1117' : '#eaeef2'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
  font-size: 14px;
}

/* ── Three-column IDE layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 200px 1fr 160px;
  min-height: 100vh;
}

/* ── Left sidebar: file tree ── */
.blog-header {
  grid-column: 1;
  grid-row: 1;
  background: ${sidebarBg};
  border-right: 1px solid ${border};
  padding: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 10;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.blog-nav::before {
  content: 'EXPLORER';
  display: block;
  padding: 8px 16px;
  font-size: 11px;
  letter-spacing: 1px;
  color: ${muted};
  font-weight: 600;
  border-bottom: 1px solid ${border};
}

.nav-link {
  color: ${fg};
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 6px 16px 6px 28px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link::before {
  content: '📄';
  font-size: 12px;
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 1;
}

.nav-link:hover, .nav-link.active {
  background: ${hoverBg};
  color: ${accent};
}

.nav-link.active {
  background: ${accentLight};
  border-left: 2px solid ${accent};
  padding-left: 26px;
}

/* ── Center: main content ── */
.blog-hero,
.blog-home,
.blog-archive,
.blog-tags,
.blog-about,
.blog-links,
.blog-series,
.post-detail {
  grid-column: 2;
}

.blog-hero {
  padding: 32px 24px 20px;
  border-bottom: 1px solid ${border};
  background: ${cardBg};
}

.hero-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 6px;
}

.hero-title::before {
  content: '# ';
  color: ${muted};
  font-weight: 400;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Tab bar above content ── */
.card-grid {
  padding: 0;
}

.card-grid::before {
  content: 'README.md ✕';
  display: block;
  padding: 8px 16px;
  font-size: 12px;
  color: ${muted};
  background: ${tabInactiveBg};
  border-bottom: 1px solid ${border};
}

.card {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 0;
  padding: 8px 16px 8px 0;
  border-bottom: 1px solid ${border};
  position: relative;
  text-decoration: none;
  color: inherit;
  transition: background 0.1s;
  font-size: 13px;
  align-items: center;
  animation: carbonFadeIn 0.3s ease-out both;
}

.card:hover {
  background: ${hoverBg};
}

@keyframes carbonFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.03s; }
.card:nth-child(3) { animation-delay: 0.06s; }
.card:nth-child(4) { animation-delay: 0.09s; }
.card:nth-child(5) { animation-delay: 0.12s; }

/* Line number column */
.card::before {
  content: counter(carbon-line);
  counter-increment: carbon-line;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: ${lineNumColor};
  text-align: right;
  padding: 0 12px 0 8px;
  user-select: none;
  min-width: 36px;
}

.card-grid {
  counter-reset: carbon-line;
}

.card-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: ${accent};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title::before {
  content: '📄 ';
  font-size: 12px;
}

.card-date {
  font-size: 11px;
  color: ${muted};
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

.card-excerpt {
  grid-column: 2 / -1;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  padding-left: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  grid-column: 2 / -1;
  display: flex;
  gap: 4px;
  margin-top: 2px;
  padding-left: 36px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  background: ${accentLight};
  color: ${accent};
  border-radius: 10px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Right sidebar: mini map ── */
.blog-hero {
  grid-column: 2;
}

/* Use the right column area for mini-map simulation via blog-hero siblings */
.page-section {
  grid-column: 2;
}

.page-section.active {
  display: block;
  animation: carbonFadeIn 0.3s ease;
}

.page-section { display: none; }

/* ── Archive ── */
.blog-archive {
  padding: 24px;
}

.archive-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  margin-bottom: 20px;
  color: var(--fg);
}

.archive-title::before {
  content: 'git log --oneline  ';
  color: ${muted};
  font-weight: 400;
}

.archive-year {
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 2px solid ${border};
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 8px;
}

.archive-year-title::before {
  content: 'tag: ';
  color: ${muted};
}

.archive-item {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px;
}

.tags-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  margin-bottom: 20px;
  color: var(--fg);
}

.tags-title::before {
  content: 'git tag -l  ';
  color: ${muted};
  font-weight: 400;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 12px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: ${accent};
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.tag-posts-title::before {
  content: '$ grep -r "';
}

.tag-posts-title::after {
  content: '" .';
}

.tag-post-item {
  padding: 4px 0;
  border-bottom: 1px solid ${border};
  font-size: 13px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px 0;
  border-top: 1px solid ${border};
  margin-top: 0;
  color: var(--muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  background: ${sidebarBg};
}

/* ── Post detail ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.back-link {
  display: inline-block;
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  margin: 12px 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

.back-link::before {
  content: '← ';
}

.post-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  padding: 12px 24px;
  color: var(--fg);
  background: ${tabActiveBg};
  border-bottom: 1px solid ${border};
  border-top: 1px solid ${border};
}

.post-title::after {
  content: '.md';
  color: ${muted};
  font-weight: 400;
}

.post-meta {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
  padding: 8px 24px;
  font-family: 'JetBrains Mono', monospace;
  background: ${sidebarBg};
  border-bottom: 1px solid ${border};
}

.post-meta::before {
  content: 'git blame  ';
  color: ${lineNumColor};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 24px;
  align-items: start;
  padding: 24px;
}

.post-content p {
  margin-bottom: 1em;
  font-size: 14px;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', monospace;
  margin: 1.3em 0 0.6em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2::before {
  content: '## ';
  color: ${muted};
  font-weight: 400;
}

.post-content pre {
  background: ${isDark ? '#161b22' : '#f6f8fa'};
  padding: 14px;
  border: 1px solid ${border};
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'bash';
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: ${lineNumColor};
  text-transform: uppercase;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding-left: 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${hoverBg};
  padding: 8px 14px;
  border-radius: 0 6px 6px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid ${border};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${border};
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 600; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive: collapse to single column on mobile ── */
@media (max-width: 1024px) {
  .blog-container {
    grid-template-columns: 1fr;
  }

  .blog-header {
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid ${border};
  }

  .blog-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 12px;
  }

  .blog-nav::before {
    display: none;
  }

  .nav-link {
    padding: 8px 12px;
    font-size: 12px;
  }

  .nav-link::before {
    display: none;
  }

  .nav-link.active {
    border-left: none;
    border-bottom: 2px solid ${accent};
    padding-left: 12px;
  }

  .blog-footer {
    grid-column: 1;
  }

  .post-body-layout {
    grid-template-columns: 1fr;
  }

  .post-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .card {
    grid-template-columns: 30px 1fr;
  }

  .card-excerpt, .card-tags {
    padding-left: 30px;
  }

  .card-date {
    grid-column: 2;
  }

  .post-title {
    font-size: 16px;
    padding: 10px 16px;
  }

  .post-body-layout {
    padding: 16px;
  }
}
`
}

// ─── Blueprint — 「工程制图」────────────────────────────────
export function getBlueprintCss(isDark: boolean): string {
  const bg = isDark ? '#0a1628' : '#f0f7ff'
  const fg = isDark ? '#b0c8e8' : '#1e3a5f'
  const muted = isDark ? '#5080a8' : '#5a7a9a'
  const accent = isDark ? '#60a5fa' : '#2563eb'
  const accentLight = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.08)'
  const cardBg = isDark ? '#0f1f35' : '#ffffff'
  const border = isDark ? '#1e3a5f' : '#bfdbfe'
  const gridLine = isDark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.06)'
  const gridLineStrong = isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)'
  const dimColor = isDark ? 'rgba(176,200,232,0.35)' : 'rgba(30,58,95,0.3)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', 'Share Tech Mono', 'Consolas', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(0deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(90deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(0deg, ${gridLineStrong} 0px, ${gridLineStrong} 1px, transparent 1px, transparent 200px),
    repeating-linear-gradient(90deg, ${gridLineStrong} 0px, ${gridLineStrong} 1px, transparent 1px, transparent 200px);
  background-size: 40px 40px, 40px 40px, 200px 200px, 200px 200px;
}

.blog-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 32px;
  position: relative;
}

/* ── 刻度尺导航 ── */
.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: '';
  display: block;
  height: 24px;
  background: repeating-linear-gradient(
    90deg,
    ${accent} 0px, ${accent} 1px,
    transparent 1px, transparent 10px,
    ${dimColor} 10px, ${dimColor} 11px,
    transparent 11px, transparent 20px
  );
  margin-bottom: 4px;
  opacity: 0.5;
}

.blog-header-site {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 16px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 12px;
  position: relative;
  display: inline-block;
}

.blog-header-site::before {
  content: '[ ';
  color: var(--accent);
}

.blog-header-site::after {
  content: ' ]';
  color: var(--accent);
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  padding: 12px 0;
  border-bottom: 2px dashed ${border};
  position: relative;
}

/* 导航下方刻度线 */
.blog-nav::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: repeating-linear-gradient(
    90deg,
    ${accent} 0px, ${accent} 2px,
    transparent 2px, transparent 8px
  );
  opacity: 0.4;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding: 6px 16px;
  text-transform: uppercase;
}

.nav-link::before {
  content: 'X:';
  color: ${dimColor};
  font-size: 10px;
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-link:hover::before {
  opacity: 1;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
  border: 1px dashed ${accent};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px solid ${accent};
}

/* ── Hero 区域 ── */
.blog-hero {
  text-align: center;
  padding: 64px 0 48px;
  position: relative;
}

/* 十字准线装饰 */
.blog-hero::before {
  content: '+';
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 28px;
  color: ${accent};
  opacity: 0.3;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}

.hero-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 36px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 3px;
  margin-bottom: 16px;
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

/* 标题下划线标注 */
.hero-title::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -8px;
  right: -8px;
  height: 0;
  border-top: 2px dashed ${accent};
}

.hero-description {
  color: var(--muted);
  font-size: 14px;
  letter-spacing: 1px;
}

.hero-description::before {
  content: '// ';
  color: ${dimColor};
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 蓝图线框卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 24px 28px;
  position: relative;
  border: 2px dashed ${border};
  text-decoration: none;
  color: inherit;
  display: block;
  animation: borderDraw 0.8s ease-out both;
  background-image:
    repeating-linear-gradient(0deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 20px),
    repeating-linear-gradient(90deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent 20px);
  background-size: 20px 20px;
}

/* 角落尺寸标注 */
.card::before {
  content: '280\\00D7180';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 9px;
  color: ${dimColor};
  background: ${bg};
  padding: 0 4px;
  letter-spacing: 0.5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-top: 1px solid ${accent};
  border-right: 1px solid ${accent};
  opacity: 0.3;
}

.card:hover {
  border-color: ${accent};
  box-shadow: 0 0 0 1px ${accentLight}, 0 0 20px ${accentLight};
}

.card:hover::before {
  opacity: 1;
}

@keyframes borderDraw {
  0% {
    border-color: transparent;
    clip-path: inset(0 100% 100% 0);
  }
  25% {
    border-color: ${border};
    clip-path: inset(0 0 100% 0);
  }
  50% {
    border-color: ${border};
    clip-path: inset(0 0 0 0);
  }
  100% {
    border-color: ${border};
    clip-path: inset(0 0 0 0);
  }
}

.card:nth-child(2) { animation-delay: 0.12s; }
.card:nth-child(3) { animation-delay: 0.24s; }
.card:nth-child(4) { animation-delay: 0.36s; }

.card-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 1px;
  position: relative;
  padding-left: 16px;
}

.card-title::before {
  content: '\\25B8';
  position: absolute;
  left: 0;
  color: ${accent};
  font-size: 12px;
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.card-date::before {
  content: 'REV: ';
  color: ${dimColor};
  font-size: 10px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: transparent;
  color: var(--accent);
  border: 1px dashed ${border};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-family: 'JetBrains Mono', monospace;
}

.tag::before {
  content: '\\25C6 ';
  font-size: 8px;
  color: ${dimColor};
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

.blog-archive .archive-title {
  display: block;
}

.archive-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: -4px;
  right: -4px;
  border-top: 2px dashed ${accent};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 2px dashed ${border};
  position: relative;
}

.archive-year::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 0;
  width: 8px;
  height: 8px;
  border: 1px solid ${accent};
  border-radius: 50%;
  background: ${bg};
}

.archive-year-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 14px;
  letter-spacing: 2px;
}

.archive-year-title::before {
  content: 'SHT: ';
  color: ${dimColor};
  font-size: 11px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px dotted ${border};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 14px;
}

.archive-item a:hover {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-style: dashed;
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 22px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 4px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  display: inline-block;
}

.blog-tags .tags-title {
  display: block;
}

.tags-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: -4px;
  right: -4px;
  border-top: 2px dashed ${accent};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 4px 14px;
  background: transparent;
  color: var(--muted);
  border: 1px dashed ${border};
  border-radius: 0;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.tag-cloud-item:hover {
  color: var(--accent);
  border-color: ${accent};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px dashed ${border};
  letter-spacing: 1px;
}

.tag-posts-title::before {
  content: '\\25B8 ';
  color: ${dimColor};
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dotted ${border};
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 2px dashed ${border};
  margin-top: 40px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 2px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.blog-footer::before {
  content: '// EOF';
  display: block;
  color: ${dimColor};
  margin-bottom: 8px;
  font-size: 10px;
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 32px;
}

.post-title {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  font-size: 28px;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
  text-transform: uppercase;
  position: relative;
  padding-bottom: 12px;
}

/* 标题下划线标注 */
.post-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 2px dashed ${accent};
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.post-meta::before {
  content: 'DWG: ';
  color: ${dimColor};
  font-size: 11px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  position: relative;
  padding-left: 32px;
}

/* 段落编号标记 */
.post-content p::before {
  content: '\\00A7';
  position: absolute;
  left: 0;
  color: ${dimColor};
  font-size: 13px;
  top: 2px;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  letter-spacing: 1px;
  text-transform: uppercase;
  position: relative;
  padding-bottom: 6px;
}

.post-content h1::after, .post-content h2::after, .post-content h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  border-top: 2px dashed ${accent};
}

.post-content pre {
  background: ${cardBg};
  padding: 16px;
  border: 1px dashed ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'CODE';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 9px;
  color: ${dimColor};
  background: ${bg};
  padding: 0 4px;
  letter-spacing: 1px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 2px dashed ${accent};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  position: relative;
}

.post-content blockquote::before {
  content: 'NOTE:';
  display: block;
  font-size: 10px;
  color: ${accent};
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px dashed ${border};
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed ${border};
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px dashed ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 0; }

.toc-title {
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-title::before {
  content: '\\25B8 ';
  color: ${accent};
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 600; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  transition: color 0.2s;
  display: inline-block;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
}

.back-link::before {
  content: '\\25C0 ';
  color: ${accent};
}

.back-link:hover {
  color: var(--accent);
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 24px; letter-spacing: 2px; }
  .card { padding: 16px 20px; }
  .blog-nav { gap: 4px; }
  .nav-link { padding: 4px 10px; font-size: 12px; }
  .post-title { font-size: 22px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Hacker — 「矩阵代码雨」────────────────────────────────
export function getHackerCss(isDark: boolean): string {
  const bg = isDark ? '#000000' : '#0a0a0a'
  const fg = isDark ? '#00ff41' : '#00ff41'
  const muted = isDark ? '#008020' : '#009930'
  const accent = isDark ? '#00ff41' : '#00ff41'
  const accentLight = isDark ? 'rgba(0,255,65,0.08)' : 'rgba(0,255,65,0.06)'
  const cardBg = isDark ? '#0a0f0a' : '#0f1a0f'
  const border = isDark ? '#004010' : '#005015'
  const dimGreen = isDark ? 'rgba(0,255,65,0.2)' : 'rgba(0,255,65,0.15)'
  const darkGreen = isDark ? '#001a08' : '#002010'
  const promptColor = isDark ? '#00cc33' : '#00dd38'
  const rainColor = isDark ? 'rgba(0,255,65,0.06)' : 'rgba(0,255,65,0.04)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  background: ${bg};
  color: ${fg};
  line-height: 1.6;
  min-height: 100vh;
  font-size: 14px;
  position: relative;
  overflow-x: hidden;
}

/* ── 代码雨背景动画 ── */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    ${rainColor} 0px,
    transparent 2px,
    transparent 40px
  );
  background-size: 100% 40px;
  animation: matrixRain 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes matrixRain {
  0% { background-position: 0 0; }
  100% { background-position: 0 400px; }
}

.blog-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

/* ── 终端风格头部 ── */
.blog-header {
  padding: 16px 0 0;
  text-align: left;
  border-bottom: none;
  position: relative;
}

.blog-header::before {
  content: 'root@blog:~$ ';
  display: block;
  color: ${promptColor};
  font-size: 12px;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.blog-header-site {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  font-weight: 400;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 12px;
  position: relative;
  display: inline-block;
}

.blog-header-site::after {
  content: '_';
  animation: cursorBlink 1s step-end infinite;
  color: ${fg};
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── 终端命令行导航 ── */
.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 4px;
  margin-top: 0;
  padding: 8px 0;
  border-bottom: 1px solid ${border};
  flex-wrap: wrap;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  position: relative;
  padding: 4px 12px;
  display: inline-block;
}

.nav-link::before {
  content: '$ ';
  color: ${promptColor};
  font-size: 12px;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
  background: ${accentLight};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: ${fg};
  box-shadow: 0 0 6px ${fg};
}

/* ── Hero ── */
.blog-hero {
  text-align: left;
  padding: 48px 0 32px;
  position: relative;
}

.hero-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 400;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-shadow: 0 0 10px ${dimGreen}, 0 0 20px ${dimGreen};
}

.hero-title::before {
  content: '> ';
  color: ${promptColor};
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  letter-spacing: 0.5px;
}

.hero-description::before {
  content: '# ';
  color: ${dimGreen};
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 文件列表样式卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 0;
}

.card-grid::before {
  content: 'total ' attr(data-count);
  display: block;
  padding: 4px 0;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 4px;
}

.card {
  background: transparent;
  border-radius: 0;
  padding: 8px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid ${border};
  text-decoration: none;
  color: inherit;
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 12px;
  align-items: baseline;
  transition: background 0.15s;
  animation: hackerFadeIn 0.4s ease-out both;
  font-size: 13px;
}

/* 文件权限标记 + 日期 */
.card::before {
  content: 'drwxr-xr-x  ';
  color: ${dimGreen};
  font-size: 11px;
  letter-spacing: 0;
  grid-column: 1;
  white-space: nowrap;
}

.card:hover {
  background: ${accentLight};
}

@keyframes hackerFadeIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.card:nth-child(2) { animation-delay: 0.06s; }
.card:nth-child(3) { animation-delay: 0.12s; }
.card:nth-child(4) { animation-delay: 0.18s; }
.card:nth-child(5) { animation-delay: 0.24s; }

.card-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 0;
  color: ${fg};
  letter-spacing: 0.5px;
  grid-column: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title::after {
  content: '.md';
  color: ${muted};
  font-size: 12px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  grid-column: 3;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

.card-excerpt {
  color: ${muted};
  font-size: 12px;
  line-height: 1.5;
  grid-column: 2 / -1;
  padding-left: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-excerpt::before {
  content: '// ';
  color: ${dimGreen};
}

.card-tags {
  grid-column: 2 / -1;
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: transparent;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', monospace;
}

.tag::before {
  content: '[';
  color: ${dimGreen};
}

.tag::after {
  content: ']';
  color: ${dimGreen};
}

/* ── 归档 ── */
.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 1px;
  color: ${fg};
}

.archive-title::before {
  content: '$ ls -la /archive  ';
  color: ${promptColor};
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.archive-year {
  margin-bottom: 20px;
  padding-left: 16px;
  border-left: 1px solid ${border};
}

.archive-year-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  color: ${fg};
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.archive-year-title::before {
  content: 'drwxr-xr-x  ';
  color: ${dimGreen};
  font-size: 11px;
}

.archive-item {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.archive-item::before {
  content: '-rw-r--r--  ';
  color: ${dimGreen};
  font-size: 10px;
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  flex: 1;
}

.archive-item a:hover {
  color: ${fg};
  text-shadow: 0 0 8px ${dimGreen};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  margin-left: 12px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 18px;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 1px;
  color: ${fg};
}

.tags-title::before {
  content: '$ find . -tags  ';
  color: ${promptColor};
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 3px 12px;
  background: transparent;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
}

.tag-cloud-item::before {
  content: '<';
  color: ${dimGreen};
}

.tag-cloud-item::after {
  content: '/>';
  color: ${dimGreen};
}

.tag-cloud-item:hover {
  color: ${fg};
  border-color: ${fg};
  background: ${accentLight};
  text-shadow: 0 0 6px ${dimGreen};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  color: ${fg};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
  letter-spacing: 0.5px;
}

.tag-posts-title::before {
  content: '$ grep -r "';
  color: ${promptColor};
}

.tag-posts-title::after {
  content: '" .';
  color: ${promptColor};
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid ${border};
  font-size: 13px;
}

.tag-post-item::before {
  content: '-rw-r--r--  ';
  color: ${dimGreen};
  font-size: 10px;
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  text-shadow: 0 0 8px ${dimGreen};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  margin-left: 10px;
  font-family: 'JetBrains Mono', monospace;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: left;
  padding: 24px 0;
  border-top: 1px solid ${border};
  margin-top: 32px;
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  font-family: 'JetBrains Mono', monospace;
}

.blog-footer::before {
  content: 'root@blog:~$ exit';
  display: block;
  color: ${promptColor};
  margin-bottom: 8px;
  font-size: 13px;
}

.blog-footer::after {
  content: '_';
  animation: cursorBlink 1s step-end infinite;
  color: ${fg};
}

/* ── 文章详情 ── */
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
}

.post-title {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 22px;
  text-align: left;
  margin-bottom: 12px;
  letter-spacing: 1px;
  color: ${fg};
  text-shadow: 0 0 10px ${dimGreen}, 0 0 20px ${dimGreen};
  position: relative;
}

.post-title::before {
  content: '$ cat ';
  color: ${promptColor};
  font-size: 16px;
  font-weight: 400;
}

.post-title::after {
  content: '.md';
  color: ${muted};
  font-size: 16px;
}

.post-meta {
  text-align: left;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 24px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.5px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${border};
}

.post-meta::before {
  content: 'root@blog:~$ stat  ';
  color: ${promptColor};
  font-size: 11px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1em;
  position: relative;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  margin: 1.3em 0 0.6em;
  color: ${fg};
  font-weight: 400;
  letter-spacing: 0.5px;
}

.post-content h2::before {
  content: '## ';
  color: ${promptColor};
}

.post-content h3::before {
  content: '### ';
  color: ${promptColor};
}

.post-content pre {
  background: ${darkGreen};
  padding: 14px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
}

.post-content pre::before {
  content: 'bash';
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 9px;
  color: ${dimGreen};
  text-transform: uppercase;
  letter-spacing: 1px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${fg};
  text-shadow: 0 0 4px ${dimGreen};
}

.post-content blockquote {
  border-left: 2px solid ${fg};
  padding: 10px 16px;
  color: ${muted};
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  position: relative;
}

.post-content blockquote::before {
  content: '# ';
  color: ${promptColor};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
}

.post-content a {
  color: ${fg};
  text-decoration: none;
  border-bottom: 1px solid ${border};
  text-shadow: 0 0 4px ${dimGreen};
}

.post-content a:hover {
  border-bottom-color: ${fg};
  text-shadow: 0 0 10px ${dimGreen};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 0; }

.toc-title {
  font-weight: 400;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
}

.toc-title::before {
  content: '$ tree  ';
  color: ${promptColor};
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 400; color: ${fg}; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${fg}; text-shadow: 0 0 6px ${dimGreen}; }

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  transition: color 0.15s;
  display: inline-block;
  margin-bottom: 16px;
  font-family: 'JetBrains Mono', monospace;
}

.back-link::before {
  content: '$ cd ..  ';
  color: ${promptColor};
}

.back-link:hover {
  color: ${fg};
  text-shadow: 0 0 6px ${dimGreen};
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 20px; letter-spacing: 1px; }
  .card {
    grid-template-columns: 1fr;
    padding: 8px 0;
  }
  .card::before {
    content: '-rw-r--r-x  ';
    font-size: 10px;
  }
  .card-title { grid-column: 1; }
  .card-date { grid-column: 1; }
  .card-excerpt { grid-column: 1; }
  .card-tags { grid-column: 1; }
  .blog-nav { gap: 2px; }
  .nav-link { padding: 4px 8px; font-size: 12px; }
  .post-title { font-size: 18px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Showcase — 「作品橱窗」────────────────────────────────
export function getShowcaseCss(isDark: boolean): string {
  const bg = isDark ? '#111827' : '#ffffff'
  const fg = isDark ? '#f9fafb' : '#111827'
  const muted = isDark ? '#6b7280' : '#9ca3af'
  const accent = isDark ? '#60a5fa' : '#3b82f6'
  const accentLight = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.08)'
  const cardBg = isDark ? '#1f2937' : '#f9fafb'
  const border = isDark ? '#374151' : '#e5e7eb'
  const overlayBg = isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.88)'
  const heroGradient1 = isDark ? '#1e3a5f' : '#dbeafe'
  const heroGradient2 = isDark ? '#111827' : '#eff6ff'
  const cardImgBg1 = isDark ? '#1e3a5f' : '#dbeafe'
  const cardImgBg2 = isDark ? '#1f2937' : '#bfdbfe'
  const cardImgBg3 = isDark ? '#312e81' : '#c7d2fe'
  const cardImgBg4 = isDark ? '#1e1b4b' : '#e0e7ff'
  const cardImgBg5 = isDark ? '#164e63' : '#cffafe'
  const shadowHover = isDark ? '0 20px 60px rgba(96,165,250,0.2)' : '0 20px 60px rgba(59,130,246,0.12)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
}

/* ── 全宽布局 ── */
.blog-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

/* ── 头部：左Logo + 右汉堡菜单导航 ── */
.blog-header {
  padding: 24px 0;
  text-align: left;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* 汉堡菜单风格导航 */
.blog-nav {
  display: flex;
  justify-content: flex-end;
  gap: 0;
  margin-top: 0;
  position: relative;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  padding: 8px 16px;
  position: relative;
  font-weight: 500;
}

.nav-link::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 2px;
  background: var(--border);
  margin-right: 8px;
  vertical-align: middle;
  transition: background 0.3s, width 0.3s;
}

.nav-link:hover::before, .nav-link.active::before {
  background: var(--accent);
  width: 24px;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent);
}

.nav-link.active::after {
  display: none;
}

/* ── Hero区域 ── */
.blog-hero {
  text-align: left;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 72px;
  font-weight: 800;
  color: var(--fg);
  letter-spacing: -2px;
  margin-bottom: 20px;
  line-height: 1.05;
}

.hero-description {
  color: var(--muted);
  font-size: 18px;
  letter-spacing: 0.5px;
  max-width: 500px;
  font-weight: 300;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 瀑布流/砖石网格 ── */
.card-grid {
  columns: 2;
  column-gap: 24px;
  padding: 40px 0;
}

.card {
  break-inside: avoid;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0;
  position: relative;
  border: 1px solid var(--border);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.5s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  margin-bottom: 24px;
  perspective: 1000px;
  animation: showcaseFadeIn 0.8s ease-out both;
}

/* 卡片顶部图片区域 - 不同高度模拟不同尺寸 */
.card::before {
  content: '';
  display: block;
  min-height: 200px;
  background: linear-gradient(135deg, ${cardImgBg1}, ${cardImgBg2});
  transition: transform 0.5s ease, opacity 0.3s;
}

.card:nth-child(3n+1)::before {
  min-height: 280px;
  background: linear-gradient(135deg, ${cardImgBg1}, ${cardImgBg2});
}

.card:nth-child(3n+2)::before {
  min-height: 180px;
  background: linear-gradient(135deg, ${cardImgBg3}, ${cardImgBg4});
}

.card:nth-child(3n)::before {
  min-height: 240px;
  background: linear-gradient(135deg, ${cardImgBg5}, ${cardImgBg1});
}

/* 悬停遮罩层 */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: ${overlayBg};
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 1;
}

.card:hover::after {
  opacity: 1;
}

.card:hover::before {
  transform: scale(1.08);
}

/* 卡片悬停3D效果 */
.card:hover {
  transform: perspective(1000px) translateY(-8px);
  box-shadow: ${shadowHover};
  border-color: var(--accent);
}

/* 卡片文字区域 */
.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  padding: 20px 24px 4px;
  color: var(--fg);
  position: relative;
  z-index: 2;
  transition: color 0.3s;
}

.card-date {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 0 24px;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.1s, transform 0.3s 0.1s;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  padding: 0 24px;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.15s, transform 0.3s 0.15s;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 12px 24px 20px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s 0.2s, transform 0.3s 0.2s;
}

/* 悬停显示信息 */
.card:hover .card-date,
.card:hover .card-excerpt,
.card:hover .card-tags {
  opacity: 1;
  transform: translateY(0);
}

/* 项目编号装饰 */
.card-title::before {
  content: counter(showcase-item) ' / ';
  color: var(--accent);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
  margin-right: 8px;
}

.card-grid {
  counter-reset: showcase-item;
}

.card {
  counter-increment: showcase-item;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── 归档 ── */
.blog-archive {
  padding: 60px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: -1px;
  color: var(--fg);
}

.archive-year {
  margin-bottom: 40px;
  padding-left: 32px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  color: var(--accent);
  margin-bottom: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.archive-item {
  padding: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.archive-item:hover {
  padding-left: 12px;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 16px;
  font-weight: 500;
}

.archive-item a:hover {
  color: var(--accent);
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 60px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: -1px;
  color: var(--fg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: ${isDark ? '#111827' : '#ffffff'};
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.2)'};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.tag-post-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  transition: padding-left 0.2s;
}

.tag-post-item:hover {
  padding-left: 12px;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 16px;
  font-weight: 400;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: left;
  padding: 40px 0;
  border-top: 1px solid var(--border);
  margin-top: 60px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ── 文章详情：全屏图片头图 + 窄栏内容 ── */
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 800;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: -1px;
  color: ${isDark ? '#f9fafb' : '#ffffff'};
  padding: 120px 60px 40px;
  background: linear-gradient(135deg, ${heroGradient1}, ${heroGradient2});
  max-width: none;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  line-height: 1.1;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 40px;
  padding-top: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 24px;
  letter-spacing: 0.5px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.4em;
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 2em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.post-content h2 {
  font-size: 1.6em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.post-content pre {
  background: var(--card-bg);
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: var(--accent);
}

.post-content blockquote {
  border-left: 3px solid var(--accent);
  padding: 16px 24px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: var(--accent-light);
  border-radius: 0 8px 8px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 16px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 2px solid var(--border);
  padding-left: 16px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
  font-size: 0.88em;
  color: var(--muted);
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: var(--accent); }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
  font-weight: 500;
}

.back-link:hover {
  color: var(--accent);
}

/* ── 入场动画 ── */
@keyframes showcaseFadeIn {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }
.card:nth-child(5) { animation-delay: 0.4s; }
.card:nth-child(6) { animation-delay: 0.5s; }

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 40px; letter-spacing: -1px; }
  .card-grid { columns: 1; }
  .blog-header { padding: 16px 0; }
  .blog-nav { gap: 0; }
  .nav-link { padding: 6px 10px; font-size: 12px; }
  .nav-link::before { width: 12px; }
  .post-title {
    font-size: 32px;
    padding: 80px 24px 32px;
    margin-left: -20px;
    margin-right: -20px;
  }
  .archive-title, .tags-title { font-size: 36px; }
}
`
}

// ─── Mosaic — 「色块拼图」──────────────────────────────────
export function getMosaicCss(isDark: boolean): string {
  const bg = isDark ? '#0f0520' : '#faf5ff'
  const fg = isDark ? '#f0d0ff' : '#1a0533'
  const muted = isDark ? '#a070c0' : '#7c3aed'
  const accent = isDark ? '#ec4899' : '#8b5cf6'
  const accentLight = isDark ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.08)'
  const cardBg = isDark ? '#1a0a30' : '#ffffff'
  const border = isDark ? '#3d1a60' : '#e9d5ff'
  const mondrianRed = isDark ? '#dc2626' : '#ef4444'
  const mondrianYellow = isDark ? '#ca8a04' : '#eab308'
  const mondrianBlue = isDark ? '#2563eb' : '#3b82f6'
  const mondrianBlack = isDark ? '#000000' : '#000000'
  const mondrianWhite = isDark ? '#1a0a30' : '#ffffff'
  const navBlockBg1 = isDark ? '#7c3aed' : '#8b5cf6'
  const navBlockBg2 = isDark ? '#ec4899' : '#ec4899'
  const navBlockBg3 = isDark ? '#2563eb' : '#6366f1'
  const navBlockFg = '#ffffff'
  const quoteBg = isDark ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.08)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
}

/* ── 全宽布局 ── */
.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  border: 4px solid ${mondrianBlack};
  min-height: 100vh;
}

/* ── 头部：色块导航 ── */
.blog-header {
  padding: 0;
  text-align: left;
  border-bottom: 4px solid ${mondrianBlack};
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: ${mondrianWhite};
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 16px 24px;
  background: ${mondrianBlack};
  display: flex;
  align-items: center;
}

/* 色块导航 */
.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 0;
  margin-top: 0;
  flex: 1;
}

.nav-link {
  color: ${navBlockFg};
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
  padding: 16px 24px;
  position: relative;
  font-weight: 700;
  display: flex;
  align-items: center;
  border-right: 4px solid ${mondrianBlack};
  border-radius: 0;
}

.nav-link:nth-child(1) {
  background: ${navBlockBg1};
}

.nav-link:nth-child(2) {
  background: ${navBlockBg2};
}

.nav-link:nth-child(3) {
  background: ${navBlockBg3};
}

.nav-link:nth-child(n+4) {
  background: ${navBlockBg1};
}

.nav-link:hover, .nav-link.active {
  filter: brightness(1.2);
  transform: none;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero区域 ── */
.blog-hero {
  text-align: left;
  padding: 0;
  position: relative;
  border-bottom: 4px solid ${mondrianBlack};
  display: grid;
  grid-template-columns: 2fr 1fr;
  min-height: 200px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 56px;
  font-weight: 900;
  color: ${mondrianWhite};
  letter-spacing: -1px;
  margin-bottom: 0;
  line-height: 1;
  padding: 48px 40px;
  background: ${mondrianRed};
  border-right: 4px solid ${mondrianBlack};
  display: flex;
  align-items: flex-end;
}

.hero-description {
  color: ${mondrianWhite};
  font-size: 16px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 40px;
  background: ${mondrianYellow};
  display: flex;
  align-items: center;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── CSS Grid不规则网格 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding: 0;
}

/* 不同尺寸色块卡片 */
.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px;
  position: relative;
  border: 4px solid ${mondrianBlack};
  border-top: none;
  border-left: none;
  transition: filter 0.3s, transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 200px;
  overflow: hidden;
  perspective: 800px;
  animation: mosaicFadeIn 0.6s ease-out both;
}

/* 第1张卡片：2列宽 */
.card:nth-child(1) {
  grid-column: span 2;
  background: ${mondrianBlue};
  color: ${mondrianWhite};
  min-height: 280px;
}

/* 第2张卡片：1列 */
.card:nth-child(2) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
}

/* 第3张卡片：1列 */
.card:nth-child(3) {
  background: ${mondrianRed};
  color: ${mondrianWhite};
}

/* 第4张卡片：1列 */
.card:nth-child(4) {
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

/* 第5张卡片：2列宽 */
.card:nth-child(5) {
  grid-column: span 2;
  background: ${mondrianBlack};
  color: ${mondrianWhite};
  min-height: 240px;
}

/* 第6张及以后：交替色块 */
.card:nth-child(6n+6) {
  background: ${mondrianBlue};
  color: ${mondrianWhite};
}

.card:nth-child(6n+7) {
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

.card:nth-child(6n+8) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
  grid-column: span 2;
}

/* 色块悬停加深 */
.card:hover {
  filter: brightness(0.85);
  z-index: 2;
}

/* 色块翻转效果 */
.card:active {
  transform: perspective(800px) rotateY(8deg);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 8px;
  color: inherit;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.card-date {
  color: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  opacity: 0.8;
}

.card-excerpt {
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(0,0,0,0.2);
  color: inherit;
  border: 2px solid ${mondrianBlack};
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── 归档 ── */
.blog-archive {
  padding: 40px;
  border-top: 4px solid ${mondrianBlack};
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: -1px;
  color: var(--fg);
  background: ${mondrianYellow};
  color: ${mondrianBlack};
  padding: 16px 24px;
  display: inline-block;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 0;
  border-left: 4px solid ${mondrianBlack};
  padding-left: 24px;
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  color: ${accent};
  margin-bottom: 16px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 2px solid ${mondrianBlack};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 15px;
  font-weight: 700;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ── 标签页 ── */
.blog-tags {
  padding: 40px;
  border-top: 4px solid ${mondrianBlack};
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: -1px;
  color: var(--fg);
  background: ${mondrianRed};
  color: ${mondrianWhite};
  padding: 16px 24px;
  display: inline-block;
}

.tag-cloud {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 12px 16px;
  background: ${mondrianWhite};
  color: ${mondrianBlack};
  border: 4px solid ${mondrianBlack};
  border-radius: 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
  text-decoration: none;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
}

.tag-cloud-item:nth-child(3n+1) {
  background: ${mondrianBlue};
  color: ${mondrianWhite};
}

.tag-cloud-item:nth-child(3n+2) {
  background: ${mondrianYellow};
  color: ${mondrianBlack};
}

.tag-cloud-item:nth-child(3n) {
  background: ${mondrianRed};
  color: ${mondrianWhite};
}

.tag-cloud-item:hover {
  filter: brightness(0.8);
  transform: scale(1.02);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 4px solid ${mondrianBlack};
  font-weight: 900;
  letter-spacing: -0.5px;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 2px solid ${mondrianBlack};
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.2s;
  font-weight: 700;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 16px;
  font-weight: 700;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 24px;
  border-top: 4px solid ${mondrianBlack};
  margin-top: 0;
  color: ${mondrianWhite};
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  background: ${mondrianBlack};
}

/* ── 文章详情：标题在色块中 ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 0;
  letter-spacing: -1px;
  color: ${mondrianWhite};
  padding: 60px 48px;
  background: ${mondrianRed};
  line-height: 1.1;
}

.post-meta {
  text-align: left;
  color: ${mondrianBlack};
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 0;
  padding: 16px 48px;
  background: ${mondrianYellow};
  letter-spacing: 0.5px;
  border-bottom: 4px solid ${mondrianBlack};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 0;
  align-items: start;
}

.post-content {
  padding: 40px 48px;
  background: ${mondrianWhite};
  color: ${mondrianBlack};
}

.post-content p {
  margin-bottom: 1.4em;
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: ${mondrianBlack};
  font-weight: 900;
  letter-spacing: -0.5px;
}

.post-content h2 {
  font-size: 1.5em;
  padding: 8px 16px;
  background: ${mondrianYellow};
  display: inline-block;
}

.post-content pre {
  background: ${mondrianBlack};
  color: #e0e0e0;
  padding: 20px;
  border: 4px solid ${mondrianBlack};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 14px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

/* 引用块用彩色背景 */
.post-content blockquote {
  border-left: none;
  padding: 20px 24px;
  color: ${mondrianBlack};
  margin: 1.5em 0;
  font-style: normal;
  font-weight: 500;
  background: ${quoteBg};
  border-left: 4px solid ${accent};
  border-radius: 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 4px solid ${mondrianBlack};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 2px solid ${accent};
  font-weight: 700;
}

.post-content a:hover {
  background: ${accent};
  color: ${mondrianWhite};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
  font-size: 0.85em;
  line-height: 1.6;
  background: ${mondrianBlack};
  color: #e0e0e0;
  border-left: 4px solid ${mondrianRed};
  min-height: 100%;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}; border-radius: 0; }

.toc-title {
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${mondrianYellow};
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 4px 0;
  font-size: 0.88em;
  color: #a0a0a0;
  transition: color 0.2s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h1 { font-weight: 700; color: #e0e0e0; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

.back-link {
  color: ${mondrianWhite};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: filter 0.2s;
  display: inline-block;
  margin-bottom: 0;
  font-weight: 700;
  background: ${mondrianBlue};
  padding: 12px 24px;
}

.back-link:hover {
  filter: brightness(1.2);
}

/* ── 入场动画 ── */
@keyframes mosaicFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
.card:nth-child(5) { animation-delay: 0.32s; }
.card:nth-child(6) { animation-delay: 0.4s; }

/* ── 滚动导航按钮避开底部导航栏 ── */
.scroll-nav {
  bottom: 80px !important;
  z-index: 101 !important;
}

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { border-width: 2px; }
  .scroll-nav { bottom: 60px !important; z-index: 101 !important; }
  .blog-header { flex-direction: column; }
  .blog-header-site { padding: 12px 20px; }
  .blog-nav { flex-wrap: wrap; }
  .nav-link {
    padding: 10px 16px;
    font-size: 12px;
    border-right: 2px solid ${mondrianBlack};
    border-bottom: 2px solid ${mondrianBlack};
  }
  .blog-hero {
    grid-template-columns: 1fr;
  }
  .hero-title {
    font-size: 36px;
    padding: 32px 20px;
    border-right: none;
    border-bottom: 2px solid ${mondrianBlack};
  }
  .hero-description {
    padding: 20px;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card:nth-child(1),
  .card:nth-child(5),
  .card:nth-child(6n+8) {
    grid-column: span 1;
  }
  .card { min-height: 160px; border-width: 2px; }
  .post-title {
    font-size: 28px;
    padding: 40px 20px;
  }
  .post-meta {
    padding: 12px 20px;
  }
  .post-content {
    padding: 24px 20px;
  }
  .archive-title, .tags-title { font-size: 28px; }
  .blog-archive, .blog-tags { padding: 24px 20px; }
}
`
}

// ─── Gallery — 「白墙展览」──────────────────────────────────
export function getGalleryCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#ffffff'
  const fg = isDark ? '#e5e5e5' : '#171717'
  const muted = isDark ? '#737373' : '#a3a3a3'
  const accent = isDark ? '#a3a3a3' : '#525252'
  const accentLight = isDark ? 'rgba(163,163,163,0.06)' : 'rgba(23,23,23,0.04)'
  const cardBg = isDark ? '#1a1a1a' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e5e5e5'
  const navBg = isDark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)'
  const labelBorder = isDark ? '#404040' : '#d4d4d4'
  const frameBorder = isDark ? '#3a3a3a' : '#c0c0c0'
  const frameShadow = isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 2.2;
  min-height: 100vh;
  font-weight: 300;
  font-size: 14px;
  padding-bottom: 56px;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 64px;
}

/* ── 底部固定细线导航 ── */
.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  padding-bottom: 0;
  font-weight: 300;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 1px;
  background: ${fg};
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 120px 0 80px;
}

.hero-title {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 36px;
  font-weight: 300;
  color: var(--fg);
  letter-spacing: 8px;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.hero-description {
  color: ${muted};
  font-size: 13px;
  letter-spacing: 2px;
  font-weight: 300;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 展品编号计数器 ── */
.card-grid {
  counter-reset: gallery-item;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

/* ── 无边框无背景卡片 ── */
.card {
  background: none;
  border-radius: 0;
  padding: 40px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid ${border};
  transition: none;
  text-decoration: none;
  color: inherit;
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 0;
  align-items: baseline;
  animation: galleryFadeIn 0.8s ease-out both;
  counter-increment: gallery-item;
}

.card:hover {
  border-color: ${border};
  box-shadow: none;
  transform: none;
}

/* 展品编号 No.01, No.02 ... */
.card::before {
  content: 'No.' counter(gallery-item, decimal-leading-zero);
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 1px;
  color: ${muted};
  padding-top: 4px;
  align-self: start;
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 18px;
  font-weight: 400;
  margin-bottom: 4px;
  color: var(--fg);
  letter-spacing: 1px;
  transition: text-decoration-color 0.3s;
  text-decoration: underline transparent;
  text-underline-offset: 4px;
}

.card:hover .card-title {
  text-decoration-color: ${fg};
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

.card-excerpt {
  color: ${muted};
  font-size: 13px;
  line-height: 2.0;
  font-weight: 300;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 0;
  background: none;
  color: ${muted};
  border: none;
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

/* ── 归档 ── */
.blog-archive {
  padding: 80px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${muted};
  font-weight: 300;
}

.archive-year {
  margin-bottom: 40px;
  padding-left: 24px;
  border-left: 1px solid ${border};
}

.archive-year-title {
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: ${fg};
  margin-bottom: 16px;
  letter-spacing: 2px;
  font-weight: 400;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
  font-weight: 300;
}

.archive-item a:hover {
  color: ${fg};
  text-decoration: underline;
  text-underline-offset: 3px;
}

.archive-item-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

/* ── 标签 ── */
.blog-tags {
  padding: 80px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  text-align: left;
  margin-bottom: 48px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: ${muted};
  font-weight: 300;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: flex-start;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 0;
  background: none;
  color: ${muted};
  border: none;
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.3s;
  text-decoration: none;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

.tag-cloud-item:hover {
  color: ${fg};
  background: none;
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: ${fg};
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${border};
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 300;
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: none;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 300;
}

.tag-post-item a:hover {
  color: ${fg};
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 16px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid ${border};
  margin-top: 80px;
  color: ${muted};
  font-size: 11px;
  letter-spacing: 3px;
  font-weight: 300;
  text-transform: uppercase;
}

/* ── 文章详情：展品名牌 ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 80px 0;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 2px;
  color: var(--fg);
  font-weight: 400;
  line-height: 1.6;
  border: 1px solid ${labelBorder};
  padding: 24px 40px;
  display: inline-block;
}

.post-detail > .post-title,
.post-detail .post-title {
  display: block;
  text-align: center;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 56px;
  letter-spacing: 2px;
  font-weight: 300;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 48px;
  align-items: start;
}

.post-content p {
  margin-bottom: 2em;
  line-height: 2.2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 2.5em 0 1.2em;
  color: var(--fg);
  font-weight: 400;
  letter-spacing: 1px;
}

.post-content pre {
  background: ${isDark ? '#222222' : '#f8f8f8'};
  padding: 20px 24px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 2em 0;
  font-size: 13px;
  line-height: 1.8;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 1px solid ${border};
  padding-left: 24px;
  color: ${muted};
  margin: 2em 0;
  font-style: italic;
  font-weight: 300;
}

/* 图片画框效果 */
.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${frameBorder};
  box-shadow: ${frameShadow};
  padding: 8px;
  background: ${isDark ? '#222' : '#fafafa'};
}

.post-content a {
  color: var(--fg);
  text-decoration: none;
  border-bottom: 1px solid ${border};
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: ${fg};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 2.0;
  border-left: 1px solid ${border};
  padding-left: 16px;
}

.post-toc::-webkit-scrollbar { width: 1px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; }

.toc-title {
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 12px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 2.0;
  text-decoration: none;
  font-weight: 300;
}

.toc-nav a.toc-h1 { font-weight: 400; color: var(--fg); }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${fg}; }

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 40px;
  font-weight: 300;
}

.back-link:hover {
  color: ${fg};
}

/* ── 极简淡入动画 ── */
@keyframes galleryFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card:nth-child(2) { animation-delay: 0.15s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.45s; }
.card:nth-child(5) { animation-delay: 0.6s; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 24px; }
  body { padding-bottom: 48px; font-size: 13px; }
  .hero-title { font-size: 24px; letter-spacing: 4px; }
  .blog-hero { padding: 80px 0 48px; }
  .card { padding: 24px 0; grid-template-columns: 60px 1fr; }
  .card::before { font-size: 10px; }
  .card-title { font-size: 16px; }
  .blog-nav { gap: 24px; }
  .nav-link { font-size: 10px; letter-spacing: 2px; }
  .post-detail { padding: 48px 0; }
  .post-title { font-size: 22px; padding: 16px 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Cinematic — 「银幕叙事」──────────────────────────────────
export function getCinematicCss(_isDark: boolean): string {
  // 电影主题始终暗色
  const bg = '#0a0a0a'
  const fg = '#d4a843'
  const muted = '#6b7280'
  const accent = '#d4a843'
  const accentLight = 'rgba(212,168,67,0.1)'
  const cardBg = '#111111'
  const border = '#1f1f1f'
  const navBg = 'rgba(0,0,0,0.85)'
  const subtitleBg = 'rgba(0,0,0,0.75)'
  const filmHole = '#1a1a1a'
  const filmHoleBorder = '#2a2a2a'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  letter-spacing: 0.03em;
  padding-bottom: 56px;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
}

/* ── 银幕上下黑边装饰 ── */
.blog-container::before,
.blog-container::after {
  content: '';
  display: block;
  height: 40px;
  background: #000;
  position: relative;
}

.blog-container::before {
  margin-bottom: 0;
  border-bottom: 1px solid ${border};
}

.blog-container::after {
  margin-top: 0;
  border-top: 1px solid ${border};
}

/* ── 底部字幕式导航 ── */
.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  padding: 12px 24px;
}

.nav-link {
  color: rgba(255,255,255,0.5);
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s, background 0.3s;
  position: relative;
  padding: 6px 16px;
  font-weight: 400;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
  background: ${subtitleBg};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 42px;
  font-weight: 400;
  color: ${accent};
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.hero-description {
  color: ${muted};
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── 宽屏横向卡片 ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 0;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  animation: cinematicZoomIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* 播放按钮装饰 */
.card::before {
  content: '\\25B6';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  color: rgba(212,168,67,0.3);
  z-index: 2;
  transition: color 0.3s, transform 0.3s;
  pointer-events: none;
}

.card:hover::before {
  color: rgba(212,168,67,0.6);
  transform: translate(-50%, -50%) scale(1.2);
}

/* 胶片孔边框 - 左侧 */
.card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 28px;
  background: repeating-linear-gradient(
    to bottom,
    ${filmHole} 0px,
    ${filmHole} 8px,
    transparent 8px,
    transparent 16px
  );
  border-right: 1px solid ${filmHoleBorder};
  z-index: 1;
  opacity: 0.6;
}

.card:hover {
  box-shadow: 0 8px 32px rgba(212,168,67,0.1);
  transform: scale(1);
}

/* 宽屏图片区域 */
.card > .card-title {
  margin-top: 0;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 4px;
  color: ${accent};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 16px 20px 0 40px;
}

.card-date {
  color: ${muted};
  font-size: 11px;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
  padding: 0 20px 0 40px;
  text-transform: uppercase;
}

.card-excerpt {
  color: rgba(255,255,255,0.45);
  font-size: 13px;
  line-height: 1.6;
  padding: 0 20px 16px 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0 20px 16px 40px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(212,168,67,0.08);
  color: ${accent};
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* ── 归档 ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  position: relative;
}

.archive-title::before,
.archive-title::after {
  content: '\\2014';
  margin: 0 12px;
  color: ${muted};
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid rgba(212,168,67,0.3);
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  color: ${accent};
  margin-bottom: 16px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 400;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
  letter-spacing: 0.05em;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── 标签 ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  position: relative;
}

.tags-title::before,
.tags-title::after {
  content: '\\2014';
  margin: 0 12px;
  color: ${muted};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: rgba(212,168,67,0.06);
  color: ${accent};
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: ${accent};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 400;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: color 0.3s;
  letter-spacing: 0.05em;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 11px;
  margin-left: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── 页脚 ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid ${border};
  margin-top: 48px;
  color: ${muted};
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* ── 文章详情：电影标题卡 ── */
.post-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 0;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${accent};
  font-weight: 400;
  line-height: 1.3;
  padding: 48px 24px;
  position: relative;
  background: ${cardBg};
  border: 1px solid ${border};
}

/* 电影标题卡装饰线 */
.post-title::before,
.post-title::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  height: 1px;
  background: linear-gradient(90deg, transparent, ${accent}, transparent);
}

.post-title::before {
  top: 16px;
  width: 80px;
}

.post-title::after {
  bottom: 16px;
  width: 80px;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 11px;
  margin-bottom: 40px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 12px 0;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
  padding: 0 24px;
}

/* 剧本格式正文 */
.post-content p {
  margin-bottom: 1.6em;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 2em 0 1em;
  color: ${accent};
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-content h2 {
  font-size: 1.3em;
  border-bottom: 1px solid ${border};
  padding-bottom: 8px;
}

.post-content pre {
  background: #0d0d0d;
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content blockquote {
  border-left: 2px solid rgba(212,168,67,0.3);
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: normal;
  background: rgba(212,168,67,0.03);
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${border};
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid rgba(212,168,67,0.3);
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.82em;
  line-height: 1.8;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; }

.toc-title {
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 1.6;
  text-decoration: none;
  letter-spacing: 0.05em;
}

.toc-nav a.toc-h1 { font-weight: 400; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── 镜头推进动画 ── */
@keyframes cinematicZoomIn {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

.card:nth-child(2) { animation-delay: 0.15s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.45s; }
.card:nth-child(5) { animation-delay: 0.6s; }

/* ── 滚动导航按钮避开底部导航栏 ── */
.scroll-nav {
  bottom: 76px !important;
  z-index: 101 !important;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .scroll-nav { bottom: 60px !important; z-index: 101 !important; }
  body { padding-bottom: 48px; }
  .blog-container::before,
  .blog-container::after { height: 24px; }
  .hero-title { font-size: 26px; letter-spacing: 0.12em; }
  .blog-hero { padding: 48px 0 32px; }
  .card-title { font-size: 12px; padding-left: 36px; }
  .card-date { padding-left: 36px; }
  .card-excerpt { padding-left: 36px; }
  .card-tags { padding-left: 36px; }
  .card::after { width: 20px; }
  .blog-nav { gap: 4px; padding: 10px 12px; }
  .nav-link { padding: 6px 10px; font-size: 10px; }
  .post-title { font-size: 24px; padding: 32px 16px; letter-spacing: 0.12em; }
  .post-body-layout { grid-template-columns: 1fr; padding: 0 16px; }
  .post-toc { display: none; }
}

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Docs ──────────────────────────────────────────────────
export function getDocsCss(isDark: boolean): string {
  const bg = isDark ? '#0f172a' : '#ffffff'
  const fg = isDark ? '#e2e8f0' : '#1e293b'
  const muted = isDark ? '#64748b' : '#94a3b8'
  const accent = isDark ? '#60a5fa' : '#2563eb'
  const accentLight = isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)'
  const cardBg = isDark ? '#1e293b' : '#f8fafc'
  const border = isDark ? '#334155' : '#e2e8f0'
  const sidebarBg = isDark ? '#1e293b' : '#f1f5f9'
  const codeBg = isDark ? '#0f172a' : '#f1f5f9'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

/* ── Three-column grid layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 240px 1fr 180px;
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
}

/* ── Left sidebar: navigation ── */
.blog-header {
  grid-column: 1;
  grid-row: 1 / -1;
  background: ${sidebarBg};
  border-right: 1px solid var(--border);
  padding: 0;
  text-align: left;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.blog-header-site {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: 0.5px;
  padding: 20px 20px 8px;
  text-transform: uppercase;
  position: relative;
}

.blog-header-site::after {
  content: 'v1.0';
  font-size: 10px;
  font-weight: 400;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 8px;
  vertical-align: middle;
  letter-spacing: 0;
  text-transform: none;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 12px;
  padding: 0 8px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 8px 12px;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  display: block;
}

.nav-link:hover {
  color: var(--fg);
  background: ${accentLight};
  border-left-color: ${accent};
}

.nav-link.active {
  color: ${accent};
  background: ${accentLight};
  border-left: 2px solid ${accent};
  font-weight: 500;
}

.nav-link.active::after {
  display: none;
}

/* ── Right sidebar: TOC area ── */
.blog-hero {
  grid-column: 3;
  grid-row: 1 / -1;
  background: ${sidebarBg};
  border-left: 1px solid var(--border);
  padding: 20px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  text-align: left;
}

.hero-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.hero-description {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  letter-spacing: 0;
}

/* ── Main content area ── */
.blog-view { display: none; }
.view-home { display: block; }

.page-section {
  grid-column: 2;
  grid-row: 1 / -1;
  padding: 0;
}

.page-section.active {
  display: block;
  animation: none;
}

/* ── Card grid: list-style docs cards ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 32px;
}

.card {
  background: var(--bg);
  border-radius: 0;
  padding: 16px 20px 16px 44px;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card::before {
  content: '\\1F4C4';
  position: absolute;
  left: 16px;
  top: 16px;
  font-size: 16px;
  line-height: 1;
}

.card:hover {
  background: ${accentLight};
  border-color: var(--border);
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--fg);
  letter-spacing: 0;
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 3px;
  font-size: 11px;
  letter-spacing: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 32px;
}

.archive-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 600;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  display: inline-block;
}

.archive-year {
  margin-bottom: 24px;
  padding-left: 0;
  border-left: none;
}

.archive-year-title {
  font-size: 16px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 0;
}

.archive-item {
  padding: 6px 0 6px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 2px solid var(--border);
  transition: border-color 0.15s;
}

.archive-item:hover {
  border-left-color: ${accent};
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 32px;
}

.tags-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 600;
  text-align: left;
  margin-bottom: 24px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 2px solid ${accent};
  display: inline-block;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 4px 12px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 3px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: var(--bg);
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 16px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 2;
  text-align: left;
  padding: 20px 32px;
  border-top: 1px solid var(--border);
  margin-top: 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
}

/* ── Post detail ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 32px;
}

.post-title {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
  color: var(--fg);
  position: relative;
  padding-left: 16px;
}

.post-title::before {
  content: '#';
  position: absolute;
  left: 0;
  color: ${accent};
  font-weight: 400;
  opacity: 0.5;
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
}

.post-content p {
  margin-bottom: 1em;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  margin: 1.5em 0 0.6em;
  color: var(--fg);
  position: relative;
}

.post-content h2 {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 0.8em;
  background: ${accent};
  border-radius: 2px;
  margin-right: 8px;
  vertical-align: middle;
}

.post-content pre {
  background: ${codeBg};
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
  position: relative;
}

.post-content pre::before {
  content: attr(data-lang);
  position: absolute;
  top: 4px;
  right: 48px;
  font-size: 10px;
  color: var(--muted);
  background: ${border};
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content pre code {
  color: var(--fg);
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 16px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  border-radius: 0 4px 4px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${accent};
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${sidebarBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.post-content td {
  padding: 8px 14px;
  border: 1px solid var(--border);
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

/* ── Animation ── */
@keyframes docsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: docsFadeIn 0.3s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.03s; }
.card:nth-child(3) { animation-delay: 0.06s; }
.card:nth-child(4) { animation-delay: 0.09s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .blog-container {
    grid-template-columns: 1fr;
  }
  .blog-header {
    grid-column: 1;
    grid-row: auto;
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .blog-nav {
    flex-direction: row;
    gap: 0;
    overflow-x: auto;
    padding: 0 12px;
    margin-top: 0;
  }
  .nav-link {
    border-left: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    white-space: nowrap;
    padding: 10px 12px;
  }
  .nav-link:hover,
  .nav-link.active {
    border-left: none;
    border-bottom-color: ${accent};
    background: none;
  }
  .blog-hero {
    display: none;
  }
  .page-section {
    grid-column: 1;
    grid-row: auto;
  }
  .blog-footer {
    grid-column: 1;
  }
  .post-body-layout {
    grid-template-columns: 1fr;
  }
  .post-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .blog-container {
    padding: 0;
  }
  .card-grid {
    padding: 16px;
  }
  .card {
    padding: 12px 16px 12px 40px;
  }
  .post-detail {
    padding: 16px;
  }
  .post-title {
    font-size: 22px;
  }
  .blog-archive,
  .blog-tags {
    padding: 16px;
  }
  .blog-footer {
    padding: 16px;
  }
}
`
}

// ─── Wiki ──────────────────────────────────────────────────
export function getWikiCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#ffffff'
  const fg = isDark ? '#e0e0e0' : '#202122'
  const muted = isDark ? '#72777d' : '#72777d'
  const accent = isDark ? '#6ea8ff' : '#336699'
  const accentLight = isDark ? 'rgba(110,168,255,0.1)' : 'rgba(51,102,153,0.08)'
  const cardBg = isDark ? '#252540' : '#f8f9fa'
  const border = isDark ? '#3a3a5c' : '#c8ccd1'
  const sidebarBg = isDark ? '#16162a' : '#f8f9fa'
  const infobg = isDark ? '#1e1e38' : '#f8f9fa'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Georgia', 'Noto Serif SC', 'Times New Roman', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.65;
  min-height: 100vh;
  font-size: 14px;
}

/* ── Two-column grid layout ── */
.blog-container {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Left sidebar: directory ── */
.blog-header {
  grid-column: 1;
  grid-row: 1 / -1;
  background: ${sidebarBg};
  border-right: 1px solid var(--border);
  padding: 0;
  text-align: left;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.blog-header-site {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0;
  padding: 16px 16px 8px;
  border-bottom: 1px solid var(--border);
}

.blog-header-site::after {
  content: '';
  display: block;
  width: 24px;
  height: 2px;
  background: ${accent};
  margin-top: 6px;
}

.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 7px 16px;
  border-left: 3px solid transparent;
  display: block;
}

.nav-link:hover {
  color: var(--fg);
  background: ${accentLight};
  border-left-color: ${accent};
}

.nav-link.active {
  color: ${accent};
  background: ${accentLight};
  border-left: 3px solid ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero area (used as content header) ── */
.blog-hero {
  grid-column: 2;
  padding: 0;
  text-align: left;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.hero-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 0;
  margin-bottom: 4px;
  padding: 20px 28px 0;
}

.hero-description {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0;
  padding: 0 28px 16px;
  font-style: italic;
}

/* ── Tab-style navigation at top of content ── */
.blog-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0;
  padding: 0;
}

/* ── Main content ── */
.blog-view { display: none; }
.view-home { display: block; }

.page-section {
  grid-column: 2;
  grid-row: auto;
  padding: 0;
}

.page-section.active {
  display: block;
  animation: none;
}

/* ── Card grid with infobox ── */
.card-grid {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 24px;
  padding: 24px 28px;
  align-items: start;
}

/* Infobox: first card in right column gets special styling */
.card-grid .card:nth-child(1) {
  grid-column: 1;
}

.card-grid .card:nth-child(2) {
  grid-column: 2;
  grid-row: 1 / 4;
  background: ${infobg};
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
}

.card-grid .card:nth-child(2)::before {
  content: '\\2139\\FE0F  Summary';
  display: block;
  font-weight: 700;
  font-size: 14px;
  color: var(--fg);
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 2px solid ${accent};
  font-family: 'Georgia', 'Noto Serif SC', serif;
  letter-spacing: 0.5px;
}

.card-grid .card:nth-child(n+3) {
  grid-column: 1;
}

.card {
  background: var(--bg);
  border-radius: 0;
  padding: 12px 0;
  position: relative;
  border: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card:hover {
  background: ${accentLight};
  box-shadow: none;
  transform: none;
}

.card-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${accent};
  letter-spacing: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
}

.card:hover .card-title {
  text-decoration-color: ${accent};
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
  margin-bottom: 4px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.card-tags {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  background: ${accentLight};
  color: ${accent};
  border: none;
  border-radius: 0;
  font-size: 11px;
  letter-spacing: 0;
}

/* ── Archive ── */
.blog-archive {
  padding: 24px 28px;
}

.archive-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 20px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.archive-year {
  margin-bottom: 20px;
  padding-left: 16px;
  border-left: 2px solid var(--border);
}

.archive-year-title {
  font-size: 17px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 8px;
  font-family: 'Georgia', 'Noto Serif SC', serif;
  letter-spacing: 0;
}

.archive-item {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
  font-size: 14px;
  transition: text-decoration-color 0.15s;
}

.archive-item a:hover {
  text-decoration-color: ${accent};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
}

/* ── Tags ── */
.blog-tags {
  padding: 24px 28px;
}

.tags-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 20px;
  letter-spacing: 0;
  color: var(--fg);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 3px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: var(--bg);
  transform: none;
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 17px;
  font-weight: 600;
  color: ${accent};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  letter-spacing: 0;
  font-family: 'Georgia', 'Noto Serif SC', serif;
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
  font-size: 14px;
  transition: text-decoration-color 0.15s;
}

.tag-post-item a:hover {
  text-decoration-color: ${accent};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 10px;
}

/* ── Footer ── */
.blog-footer {
  grid-column: 2;
  text-align: left;
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  margin-top: 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
}

/* ── Post detail ── */
.post-detail {
  max-width: 100%;
  margin: 0;
  padding: 28px;
}

.post-title {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  font-size: 26px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 8px;
  letter-spacing: 0;
  color: var(--fg);
}

.post-meta {
  text-align: left;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 28px;
  align-items: start;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px;
  font-size: 0.85em;
  line-height: 1.5;
  background: ${infobg};
  border: 1px solid var(--border);
  border-radius: 0;
}

.post-content p {
  margin-bottom: 0.8em;
  font-size: 14px;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Georgia', 'Noto Serif SC', serif;
  margin: 1.3em 0 0.5em;
  color: var(--fg);
  font-weight: 600;
}

.post-content h2 {
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

.post-content pre {
  background: ${infobg};
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 4px;
}

.post-content pre code {
  background: none;
  padding: 0;
  color: var(--fg);
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 6px 14px;
  color: var(--muted);
  margin: 1em 0;
  font-style: italic;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
}

.post-content a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: ${accent}44;
}

.post-content a:hover {
  text-decoration-color: ${accent};
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 13px;
}

.post-content th {
  background: ${infobg};
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.post-content td {
  padding: 6px 12px;
  border: 1px solid var(--border);
}

.post-content tr:hover td {
  background: ${accentLight};
}

/* Footnotes */
.post-content sup a {
  color: ${accent};
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8em;
  vertical-align: super;
}

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
  text-decoration: underline;
}

/* ── Edit button decoration ── */
.blog-footer::before {
  content: '\\270E  Edit';
  display: inline-block;
  font-size: 11px;
  color: ${accent};
  border: 1px solid ${border};
  padding: 2px 8px;
  margin-right: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Georgia', serif;
}

.blog-footer:hover::before {
  background: ${accentLight};
  border-color: ${accent};
}

/* ── Animation ── */
@keyframes wikiFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card {
  animation: wikiFadeIn 0.25s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.02s; }
.card:nth-child(3) { animation-delay: 0.04s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .blog-container {
    grid-template-columns: 1fr;
  }
  .blog-header {
    grid-column: 1;
    grid-row: auto;
    position: relative;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .blog-nav {
    flex-direction: row;
    gap: 0;
    overflow-x: auto;
    padding: 0 12px;
    margin-top: 0;
    border-bottom: 1px solid var(--border);
  }
  .nav-link {
    border-left: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    padding: 10px 14px;
    font-size: 13px;
  }
  .nav-link:hover,
  .nav-link.active {
    border-left: none;
    border-bottom-color: ${accent};
    background: none;
  }
  .blog-hero {
    grid-column: 1;
  }
  .page-section {
    grid-column: 1;
  }
  .blog-footer {
    grid-column: 1;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .card-grid .card:nth-child(2) {
    grid-column: 1;
    grid-row: auto;
  }
  .card-grid .card:nth-child(n+3) {
    grid-column: 1;
  }
  .post-body-layout {
    grid-template-columns: 1fr;
  }
  .post-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .blog-container {
    padding: 0;
  }
  .card-grid {
    padding: 16px;
  }
  .card {
    padding: 10px 0;
  }
  .post-detail {
    padding: 16px;
  }
  .post-title {
    font-size: 20px;
  }
  .blog-archive,
  .blog-tags {
    padding: 16px;
  }
  .blog-footer {
    padding: 12px 16px;
  }
  .hero-title {
    font-size: 20px;
    padding: 16px 16px 0;
  }
  .hero-description {
    padding: 0 16px 12px;
  }
}
`
}

// ─── Neon — 「赛博夜城」──────────────────────────────────────
export function getNeonCss(_isDark: boolean): string {
  // 霓虹主题始终暗色，忽略 isDark
  const bg = '#0a0a14'
  const fg = '#e0e0ff'
  const muted = '#6060a0'
  const accent = '#ff00ff'
  const accentLight = 'rgba(255,0,255,0.1)'
  const cardBg = '#14142a'
  const border = '#2a2a4a'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'JetBrains Mono', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,255,0.015) 2px, rgba(255,0,255,0.015) 4px),
    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,255,255,0.01) 2px, rgba(0,255,255,0.01) 4px);
}

/* 扫描线效果 */
body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0,0,0,0.03) 1px,
    rgba(0,0,0,0.03) 2px
  );
  pointer-events: none;
  z-index: 9999;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px;
  position: relative;
}

/* 两侧霓虹装饰线 */
.blog-container::before,
.blog-container::after {
  content: '';
  position: fixed;
  top: 0;
  bottom: 0;
  width: 2px;
  z-index: 10;
}
.blog-container::before {
  left: max(calc(50% - 481px), 8px);
  background: linear-gradient(180deg, #ff00ff, #00ffff, #ff00ff);
  box-shadow: 0 0 8px #ff00ff, 0 0 16px #ff00ff, 0 0 32px rgba(255,0,255,0.3);
  animation: neonLinePulse 3s ease-in-out infinite;
}
.blog-container::after {
  right: max(calc(50% - 481px), 8px);
  background: linear-gradient(180deg, #00ffff, #ff00ff, #00ffff);
  box-shadow: 0 0 8px #00ffff, 0 0 16px #00ffff, 0 0 32px rgba(0,255,255,0.3);
  animation: neonLinePulse 3s ease-in-out infinite 1.5s;
}

@keyframes neonLinePulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.blog-header {
  padding: 48px 0 24px;
  text-align: center;
  border-bottom: 1px solid var(--border);
  border-image: linear-gradient(90deg, transparent, #ff00ff, #00ffff, #ff00ff, transparent) 1;
}

.blog-header-site {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 500;
  color: var(--fg);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(255,0,255,0.5), 0 0 20px rgba(255,0,255,0.3), 0 0 40px rgba(255,0,255,0.1);
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 20px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 6px 16px;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: #00ffff;
  text-shadow: 0 0 8px #00ffff, 0 0 16px rgba(0,255,255,0.4), 0 0 32px rgba(0,255,255,0.2);
  border-color: rgba(0,255,255,0.3);
  animation: neonFlicker 0.15s ease-in-out;
}

.nav-link.active {
  color: #ff00ff;
  text-shadow: 0 0 8px #ff00ff, 0 0 16px rgba(255,0,255,0.4), 0 0 32px rgba(255,0,255,0.2);
  border-color: rgba(255,0,255,0.3);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: #ff00ff;
  box-shadow: 0 0 6px #ff00ff, 0 0 12px rgba(255,0,255,0.4);
}

@keyframes neonFlicker {
  0% { opacity: 1; }
  25% { opacity: 0.7; }
  50% { opacity: 1; }
  75% { opacity: 0.85; }
  100% { opacity: 1; }
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 52px;
  font-weight: 300;
  color: var(--fg);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255,0,255,0.4), 0 0 20px rgba(255,0,255,0.2), 0 0 60px rgba(255,0,255,0.1);
  animation: neonGlow 4s ease-in-out infinite;
}

@keyframes neonGlow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(255,0,255,0.4), 0 0 20px rgba(255,0,255,0.2), 0 0 60px rgba(255,0,255,0.1);
  }
  33% {
    text-shadow: 0 0 10px rgba(0,255,255,0.4), 0 0 20px rgba(0,255,255,0.2), 0 0 60px rgba(0,255,255,0.1);
  }
  66% {
    text-shadow: 0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2), 0 0 60px rgba(0,255,0,0.1);
  }
}

.hero-description {
  color: var(--muted);
  font-size: 15px;
  letter-spacing: 0.15em;
  font-family: 'JetBrains Mono', monospace;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 4px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  box-shadow:
    inset 0 0 20px rgba(255,0,255,0.03),
    0 0 8px rgba(255,0,255,0.05),
    0 0 16px rgba(0,255,255,0.03);
  transition: all 0.4s ease;
}

/* 背景微光粒子效果 */
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    radial-gradient(1px 1px at 20% 30%, rgba(255,0,255,0.3), transparent),
    radial-gradient(1px 1px at 60% 70%, rgba(0,255,255,0.2), transparent),
    radial-gradient(1px 1px at 80% 20%, rgba(0,255,0,0.2), transparent),
    radial-gradient(1px 1px at 40% 80%, rgba(255,0,255,0.15), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
}

.card:hover {
  border-color: #00ffff;
  box-shadow:
    inset 0 0 30px rgba(0,255,255,0.06),
    0 0 12px rgba(0,255,255,0.1),
    0 0 24px rgba(0,255,255,0.05),
    0 0 48px rgba(0,255,255,0.03);
  transform: translateY(-2px);
}

.card:hover::before {
  opacity: 1;
}

.card:nth-child(3n+1):hover {
  border-color: #ff00ff;
  box-shadow:
    inset 0 0 30px rgba(255,0,255,0.06),
    0 0 12px rgba(255,0,255,0.1),
    0 0 24px rgba(255,0,255,0.05),
    0 0 48px rgba(255,0,255,0.03);
}

.card:nth-child(3n+2):hover {
  border-color: #00ffff;
  box-shadow:
    inset 0 0 30px rgba(0,255,255,0.06),
    0 0 12px rgba(0,255,255,0.1),
    0 0 24px rgba(0,255,255,0.05),
    0 0 48px rgba(0,255,255,0.03);
}

.card:nth-child(3n):hover {
  border-color: #00ff00;
  box-shadow:
    inset 0 0 30px rgba(0,255,0,0.06),
    0 0 12px rgba(0,255,0,0.1),
    0 0 24px rgba(0,255,0,0.05),
    0 0 48px rgba(0,255,0,0.03);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-date {
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
  text-shadow: 0 0 6px rgba(255,0,255,0.3);
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
  padding: 2px 12px;
  background: rgba(255,0,255,0.08);
  color: #ff00ff;
  border: 1px solid rgba(255,0,255,0.25);
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-shadow: 0 0 4px rgba(255,0,255,0.3);
}

.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 10px rgba(255,0,255,0.3), 0 0 20px rgba(255,0,255,0.15);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid var(--border);
  border-image: linear-gradient(180deg, #ff00ff, transparent) 1;
}

.archive-year-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  color: #00ffff;
  margin-bottom: 16px;
  text-shadow: 0 0 8px rgba(0,255,255,0.3);
  letter-spacing: 0.15em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,0,255,0.06);
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

.archive-item-date {
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.1em;
}

.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 10px rgba(255,0,255,0.3), 0 0 20px rgba(255,0,255,0.15);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: rgba(255,0,255,0.06);
  color: #ff00ff;
  border: 1px solid rgba(255,0,255,0.2);
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  text-shadow: 0 0 4px rgba(255,0,255,0.2);
}

.tag-cloud-item:hover {
  background: rgba(255,0,255,0.15);
  border-color: #ff00ff;
  box-shadow: 0 0 10px rgba(255,0,255,0.2), 0 0 20px rgba(255,0,255,0.1);
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.5);
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: #00ffff;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,255,255,0.2);
  text-shadow: 0 0 6px rgba(0,255,255,0.3);
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,0,255,0.06);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
}

.tag-post-item a:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

.tag-post-date {
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin-left: 12px;
}

.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid var(--border);
  border-image: linear-gradient(90deg, transparent, #ff00ff, #00ffff, #ff00ff, transparent) 1;
  margin-top: 48px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.2em;
}

.post-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 32px;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 40px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--fg);
  text-shadow: 0 0 12px rgba(255,0,255,0.4), 0 0 24px rgba(255,0,255,0.2), 0 0 48px rgba(255,0,255,0.1);
  animation: neonGlow 4s ease-in-out infinite;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  margin-bottom: 32px;
  letter-spacing: 0.1em;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  letter-spacing: 0.12em;
  text-shadow: 0 0 8px rgba(255,0,255,0.2);
}

.post-content h1 { text-transform: uppercase; }

.post-content pre {
  background: #0c0c1e;
  padding: 20px;
  border: 1px solid rgba(255,0,255,0.15);
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  box-shadow: inset 0 0 20px rgba(255,0,255,0.03), 0 0 8px rgba(255,0,255,0.05);
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: #00ffff;
  text-shadow: 0 0 4px rgba(0,255,255,0.3);
}

.post-content pre code {
  color: #e0e0ff;
  text-shadow: none;
}

.post-content blockquote {
  border-left: 3px solid #ff00ff;
  padding-left: 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  box-shadow: inset 3px 0 12px rgba(255,0,255,0.05);
}

.post-content img {
  max-width: 100%;
  border-radius: 4px;
  border: 1px solid rgba(255,0,255,0.15);
}

.post-content a {
  color: #00ffff;
  text-decoration: none;
  border-bottom: 1px solid rgba(0,255,255,0.3);
  text-shadow: 0 0 4px rgba(0,255,255,0.2);
}

.post-content a:hover {
  border-bottom-color: #00ffff;
  text-shadow: 0 0 8px rgba(0,255,255,0.4);
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'JetBrains Mono', monospace;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(255,0,255,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
  text-shadow: 0 0 4px rgba(255,0,255,0.2);
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 1px solid rgba(255,0,255,0.15);
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: #ff00ff;
  border-left-color: #ff00ff;
  text-shadow: 0 0 4px rgba(255,0,255,0.3);
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 0.1em;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: #ff00ff;
  text-shadow: 0 0 8px rgba(255,0,255,0.4);
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: themeFadeIn 0.6s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-container::before, .blog-container::after { display: none; }
  .hero-title { font-size: 28px; letter-spacing: 0.1em; }
  .card { padding: 20px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 4px 10px; }
  .post-title { font-size: 24px; letter-spacing: 0.08em; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 22px; }
  .blog-header-site { font-size: 16px; letter-spacing: 0.15em; }
  .archive-item { flex-direction: column; align-items: flex-start; gap: 4px; }
}
`
}

// ─── Origami — 「纸艺几何」──────────────────────────────────────
export function getOrigamiCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#fefefe'
  const fg = isDark ? '#c0c0d0' : '#2d3748'
  const muted = isDark ? '#8090a0' : '#718096'
  const accent = isDark ? '#90b0e0' : '#4a7ab5'
  const accentLight = isDark ? 'rgba(144,176,224,0.1)' : 'rgba(74,122,181,0.08)'
  const cardBg = isDark ? '#252540' : '#ffffff'
  const border = isDark ? '#3a3a5c' : '#bfdbfe'
  const shadowBase = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)'
  const shadowFar = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'
  const foldLine = isDark ? 'rgba(144,176,224,0.1)' : 'rgba(74,122,181,0.08)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Nunito', 'Quicksand', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
}

.blog-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 48px 0 24px;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  font-family: 'Nunito', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.05em;
  margin-bottom: 24px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 20px 10px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

/* 折纸标签页折叠角效果 */
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(135deg, var(--border) 50%, transparent 50%);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 0);
}

.nav-link:hover {
  color: var(--accent);
  background: var(--accent-light);
  transform: translateY(-2px);
}

.nav-link.active {
  color: var(--accent);
  background: var(--card-bg);
  border-color: var(--accent);
  border-bottom-color: var(--card-bg);
  z-index: 1;
}

.nav-link.active::after {
  background: linear-gradient(135deg, var(--accent) 50%, transparent 50%);
}

.blog-hero {
  text-align: center;
  padding: 72px 0 48px;
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: 0.02em;
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -12px;
  width: 20px;
  height: 20px;
  border-top: 2px solid var(--accent);
  border-right: 2px solid var(--accent);
  border-radius: 0 4px 0 0;
}

.hero-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: -12px;
  width: 20px;
  height: 20px;
  border-bottom: 2px solid var(--accent);
  border-left: 2px solid var(--accent);
  border-radius: 0 0 0 4px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  letter-spacing: 0.02em;
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
  border-radius: 8px;
  padding: 28px 32px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  overflow: hidden;
  box-shadow:
    0 2px 4px ${shadowBase},
    0 4px 8px ${shadowMid},
    0 8px 16px ${shadowFar};
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation: origamiUnfold 0.6s ease-out both;
}

/* 折痕线装饰 */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 32px;
  right: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${foldLine}, ${foldLine}, transparent);
  pointer-events: none;
}

/* 纸角折叠效果 */
.card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: linear-gradient(225deg, var(--bg) 50%, var(--border) 50%);
  border-radius: 0 8px 0 0;
}

.card:hover {
  transform: translateY(-4px) perspective(800px) rotateX(1deg);
  box-shadow:
    0 4px 8px ${shadowBase},
    0 8px 16px ${shadowMid},
    0 16px 32px ${shadowFar},
    0 24px 48px ${shadowFar};
  border-color: var(--accent);
}

@keyframes origamiUnfold {
  from {
    opacity: 0;
    transform: scaleY(0.8) perspective(600px) rotateX(-5deg);
    transform-origin: top center;
  }
  to {
    opacity: 1;
    transform: scaleY(1) perspective(600px) rotateX(0deg);
  }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

.card-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
}

.card-date {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
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
  padding: 3px 14px;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: 'Nunito', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0.05em;
  color: var(--fg);
  font-weight: 700;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 3px solid var(--accent);
  border-radius: 2px;
}

.archive-year-title {
  font-family: 'Nunito', sans-serif;
  font-size: 22px;
  color: var(--accent);
  margin-bottom: 16px;
  font-weight: 700;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 600;
}

.archive-item a:hover {
  color: var(--accent);
  padding-left: 4px;
}

.archive-item-date {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Nunito', sans-serif;
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: 0.05em;
  color: var(--fg);
  font-weight: 700;
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
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: var(--accent);
  color: var(--bg);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px ${shadowBase}, 0 8px 24px ${shadowMid};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Nunito', sans-serif;
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
  font-weight: 700;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  transition: all 0.3s;
  font-weight: 600;
}

.tag-post-item a:hover {
  color: var(--accent);
}

.tag-post-date {
  color: var(--muted);
  font-size: 13px;
  margin-left: 12px;
  font-weight: 600;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 2px dashed var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  letter-spacing: 0.05em;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px;
}

.post-title {
  font-family: 'Nunito', sans-serif;
  font-size: 36px;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.03em;
  color: var(--fg);
  font-weight: 700;
  position: relative;
  display: inline-block;
  width: 100%;
}

/* 标题折纸装饰角 */
.post-title::before {
  content: '';
  position: absolute;
  top: -6px;
  right: calc(50% - 120px);
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--accent);
  border-right: 2px solid var(--accent);
  transform: rotate(45deg);
}

.post-title::after {
  content: '';
  position: absolute;
  top: -6px;
  left: calc(50% - 120px);
  width: 16px;
  height: 16px;
  border-top: 2px solid var(--accent);
  border-left: 2px solid var(--accent);
  transform: rotate(-45deg);
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 32px;
  font-weight: 600;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Nunito', sans-serif;
  margin: 1.5em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
}

.post-content pre {
  background: var(--card-bg);
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 14px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  color: var(--accent);
}

/* 引用块如便签纸 */
.post-content blockquote {
  border-left: none;
  padding: 16px 20px;
  color: var(--muted);
  margin: 1em 0;
  font-style: normal;
  background: var(--accent-light);
  border-radius: 4px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
  transform: rotate(-0.5deg);
  position: relative;
}

.post-content blockquote::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 20px;
  width: 24px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0.5;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 4px ${shadowBase}, 0 4px 8px ${shadowMid};
}

.post-content a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--border);
  font-weight: 600;
}

.post-content a:hover {
  border-bottom-color: var(--accent);
  border-bottom-style: solid;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Nunito', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 2px solid var(--border);
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: var(--accent);
  border-left-color: var(--accent);
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: var(--accent);
  transform: translateX(-4px);
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 28px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card { padding: 20px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 6px 12px 8px; }
  .post-title { font-size: 24px; }
  .post-title::before, .post-title::after { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 24px; }
  .card::after { width: 16px; height: 16px; }
  .archive-item { flex-direction: column; align-items: flex-start; gap: 4px; }
}
`
}

// ─── Bauhaus — 「包豪斯」──────────────────────────────────
export function getBauhausCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#f8f8f8'
  const fg = isDark ? '#f0f0f0' : '#1a1a1a'
  const muted = isDark ? '#888888' : '#666666'
  const accent = isDark ? '#e63946' : '#e63946'
  const accentLight = isDark ? 'rgba(230,57,70,0.1)' : 'rgba(230,57,70,0.08)'
  const cardBg = isDark ? '#242424' : '#ffffff'
  const border = isDark ? '#333333' : '#dddddd'
  const red = '#e63946'
  const yellow = '#f1c40f'
  const blue = '#2980b9'
  const shadowBase = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: none;
  position: relative;
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  position: relative;
}

.nav-link {
  color: var(--fg);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 10px 20px;
  background: ${cardBg};
  border: 2px solid var(--border);
}

.nav-link:nth-child(3n+1) { border-top: 4px solid ${red}; }
.nav-link:nth-child(3n+2) { border-top: 4px solid ${yellow}; }
.nav-link:nth-child(3n+3) { border-top: 4px solid ${blue}; }

.nav-link:hover {
  background: var(--accent-light);
  transform: translateY(-2px);
}

.nav-link.active {
  color: var(--accent);
  border-color: var(--accent);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
}

.blog-hero {
  text-align: center;
  padding: 80px 0 56px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 20px;
  position: relative;
  display: inline-block;
}

.hero-title::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${red};
  opacity: 0.15;
  top: -20px;
  left: -20px;
}

.hero-title::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  background: ${blue};
  opacity: 0.15;
  bottom: -10px;
  right: -10px;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 28px 24px;
  position: relative;
  border: 1px solid var(--border);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
  box-shadow: 0 2px 8px ${shadowBase};
}

.card:nth-child(3n+1) { border-top: 4px solid ${red}; }
.card:nth-child(3n+2) { border-top: 4px solid ${yellow}; }
.card:nth-child(3n+3) { border-top: 4px solid ${blue}; }

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px ${shadowMid};
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.card-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 300;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: var(--accent-light);
  color: var(--accent);
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 60px;
  height: 4px;
  background: ${red};
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 4px solid ${blue};
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${blue};
  margin-bottom: 16px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${red};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.tags-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 60px;
  height: 4px;
  background: ${yellow};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: ${cardBg};
  color: var(--fg);
  border: 2px solid var(--border);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:nth-child(3n+1):hover { border-color: ${red}; color: ${red}; }
.tag-cloud-item:nth-child(3n+2):hover { border-color: ${yellow}; color: ${yellow}; }
.tag-cloud-item:nth-child(3n+3):hover { border-color: ${blue}; color: ${blue}; }

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${red};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${red};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 4px solid var(--border);
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.post-title::before {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${red};
  opacity: 0.1;
  top: -10px;
  left: -16px;
}

.post-meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: ${red};
  margin-right: 12px;
  vertical-align: middle;
}

.post-content pre {
  background: ${isDark ? '#242424' : '#f0f0f0'};
  padding: 20px 24px;
  border: 2px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${red};
}

.post-content blockquote {
  border-left: 4px solid ${blue};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: var(--accent-light);
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  box-shadow: 0 4px 12px ${shadowBase};
}

.post-content a {
  color: ${red};
  text-decoration: none;
  border-bottom: 2px solid ${red}33;
  font-weight: 700;
}

.post-content a:hover {
  border-bottom-color: ${red};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); }

.toc-title {
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 2px solid var(--border);
  transition: all 0.3s;
  font-size: 0.9em;
  font-weight: 300;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${red};
  border-left-color: ${red};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${red};
}

@keyframes bauhausFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: bauhausFadeIn 0.5s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 8px 12px; }
  .post-title { font-size: 24px; }
  .post-title::before { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Art Deco — 「装饰艺术」──────────────────────────────────
export function getArtdecoCss(isDark: boolean): string {
  const bg = isDark ? '#0d0d1a' : '#faf8f5'
  const fg = isDark ? '#e8dcc8' : '#1a1a2e'
  const muted = isDark ? '#8a7e6a' : '#6b6356'
  const accent = '#d4a843'
  const accentLight = isDark ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.08)'
  const cardBg = isDark ? '#161625' : '#ffffff'
  const border = isDark ? '#2a2a3e' : '#e0d8c8'
  const gold = '#d4a843'
  const shadowBase = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Playfair Display', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 40px 0 32px;
  text-align: center;
  border-bottom: 1px solid ${gold};
  position: relative;
}

.blog-header::before {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 2px;
  background: ${gold};
}

.blog-header-site {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  font-weight: 700;
  color: ${gold};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 0;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 1px;
  background: ${gold};
  transition: width 0.3s;
}

.nav-link:hover {
  color: ${gold};
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.active {
  color: ${gold};
}

.nav-link.active::after {
  width: 100%;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 56px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 60px;
  border: 1px solid ${gold}33;
  border-radius: 50% 50% 0 0;
  border-bottom: none;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  letter-spacing: 4px;
  font-weight: 700;
  color: ${gold};
  margin-bottom: 20px;
  text-transform: uppercase;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  font-style: italic;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px;
  padding: 40px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 28px 24px;
  position: relative;
  border: 1px solid ${gold}33;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
  box-shadow: 0 2px 8px ${shadowBase};
}

.card::before {
  content: '\\25C6';
  position: absolute;
  top: -8px;
  left: 16px;
  color: ${gold};
  font-size: 12px;
  background: ${bg};
  padding: 0 4px;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px ${shadowMid};
  border-color: ${gold}66;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.05em;
}

.card-date {
  color: ${gold};
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: ${accentLight};
  color: ${gold};
  border: 1px solid ${gold}33;
  font-family: 'Playfair Display', serif;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.archive-title::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 8px;
  background: ${gold};
  transform: translateY(-50%) rotate(45deg);
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 1px solid ${gold}44;
}

.archive-year-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: ${gold};
  margin-bottom: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${gold};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  position: relative;
  display: inline-block;
}

.tags-title::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 8px;
  background: ${gold};
  transform: translateY(-50%) rotate(45deg);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: ${cardBg};
  color: ${gold};
  border: 1px solid ${gold}33;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  border-color: ${gold};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: ${gold};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${gold}33;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid ${gold}22;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${gold};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid ${gold}33;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.blog-footer::before {
  content: '\\25C6  ';
  color: ${gold};
}

.blog-footer::after {
  content: '  \\25C6';
  color: ${gold};
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.1em;
  color: var(--fg);
  position: relative;
  display: inline-block;
  width: 100%;
}

.post-title::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 30px;
  border: 1px solid ${gold}33;
  border-radius: 50% 50% 0 0;
  border-bottom: none;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Playfair Display', serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.post-content h2::before {
  content: '\\25C6 ';
  color: ${gold};
  font-size: 0.7em;
}

.post-content pre {
  background: ${isDark ? '#161625' : '#f5f0e8'};
  padding: 20px 24px;
  border: 1px solid ${gold}22;
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${gold};
}

.post-content blockquote {
  border-left: 2px solid ${gold};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: italic;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 1px solid ${gold}22;
  box-shadow: 0 4px 12px ${shadowBase};
}

.post-content a {
  color: ${gold};
  text-decoration: none;
  border-bottom: 1px solid ${gold}44;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-color: ${gold};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Playfair Display', serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${gold}33; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 1px solid ${gold}33;
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${gold};
  border-left-color: ${gold};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${gold};
}

@keyframes artdecoFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: artdecoFadeIn 0.6s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; letter-spacing: 2px; }
  .blog-hero::before { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; }
  .post-title { font-size: 24px; }
  .post-title::before { display: none; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Vaporwave — 「蒸汽波」──────────────────────────────────
export function getVaporwaveCss(isDark: boolean): string {
  const bg = isDark ? '#0a0a1a' : '#fff0f5'
  const fg = isDark ? '#e0d0ff' : '#2a1a3a'
  const muted = isDark ? '#8070a0' : '#8a6a9a'
  const accent = isDark ? '#b967ff' : '#b967ff'
  const accentLight = isDark ? 'rgba(185,103,255,0.12)' : 'rgba(185,103,255,0.08)'
  const cardBg = isDark ? '#141028' : '#ffffff'
  const border = isDark ? '#2a2048' : '#e0d0e8'
  const pink = '#ff71ce'
  const cyan = '#01cdfe'
  const green = '#05ffa1'
  const purple = '#b967ff'
  const shadowBase = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.06)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.8;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: none;
  background: linear-gradient(90deg, ${pink}22, ${cyan}22, ${green}22, ${purple}22);
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(90deg, ${pink}, ${cyan}, ${green}, ${purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
}

.nav-link {
  color: var(--fg);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding: 8px 20px;
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${accent}33;
}

.nav-link:hover {
  border-color: ${accent};
  box-shadow: 0 0 12px ${accent}44;
}

.nav-link.active {
  color: ${accent};
  border-color: ${accent};
  box-shadow: 0 0 16px ${accent}44;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: ${accent};
  border-radius: 50%;
  box-shadow: 0 0 8px ${accent};
}

.blog-hero {
  background: linear-gradient(180deg, transparent 0%, ${isDark ? '#1a0a2a' : '#f0e0ff'} 100%);
  position: relative;
  text-align: center;
  padding: 80px 0 120px;
  overflow: hidden;
}

.blog-hero::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background:
    repeating-linear-gradient(90deg, ${accent}33 0px, ${accent}33 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(0deg, ${accent}33 0px, ${accent}33 1px, transparent 1px, transparent 40px);
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 0.05em;
  margin-bottom: 20px;
  background: linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  z-index: 1;
}

.hero-description {
  color: var(--muted);
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 40px 0;
}

.card {
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 28px 24px;
  position: relative;
  border: 1px solid ${accent}33;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.3s;
}

.card:hover {
  transform: translateY(-4px);
  border-color: ${accent}66;
  box-shadow: 0 8px 32px ${accent}22;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--fg);
  letter-spacing: 0.02em;
}

.card-date {
  color: ${cyan};
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 300;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${accent}33;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  background: linear-gradient(90deg, ${pink}, ${cyan});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 2px solid ${purple}44;
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${purple};
  margin-bottom: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.archive-item a:hover {
  color: ${pink};
}

.archive-item-date {
  color: var(--muted);
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 900;
  text-align: left;
  margin-bottom: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
  background: linear-gradient(90deg, ${green}, ${purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 40px;
}

.tag-cloud-item {
  padding: 6px 16px;
  background: ${isDark ? 'rgba(20,10,40,0.6)' : 'rgba(255,240,245,0.6)'};
  backdrop-filter: blur(8px);
  color: ${purple};
  border: 1px solid ${purple}33;
  border-radius: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  border-color: ${purple};
  box-shadow: 0 0 12px ${purple}33;
  transform: translateY(-2px);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  color: ${pink};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${pink}33;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.tag-post-item {
  padding: 10px 0;
  border-bottom: 1px solid ${accent}22;
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
}

.tag-post-item a:hover {
  color: ${pink};
}

.tag-post-date {
  color: var(--muted);
  font-size: 12px;
  margin-left: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid ${accent}33;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 32px;
  font-weight: 300;
  letter-spacing: 0.1em;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Inter', sans-serif;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.post-content h2::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 1em;
  background: linear-gradient(180deg, ${pink}, ${cyan});
  margin-right: 12px;
  vertical-align: middle;
  border-radius: 2px;
}

.post-content pre {
  background: ${isDark ? 'rgba(20,10,40,0.8)' : 'rgba(255,240,245,0.8)'};
  backdrop-filter: blur(8px);
  padding: 20px 24px;
  border: 1px solid ${accent}33;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
  line-height: 1.7;
}

.post-content code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
  color: ${pink};
}

.post-content blockquote {
  border-left: 3px solid ${purple};
  padding: 12px 20px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: ${isDark ? 'rgba(20,10,40,0.4)' : 'rgba(255,240,245,0.4)'};
  border-radius: 0 8px 8px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid ${accent}33;
  box-shadow: 0 4px 16px ${shadowBase};
}

.post-content a {
  color: ${cyan};
  text-decoration: none;
  border-bottom: 1px dashed ${cyan}66;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-color: ${cyan};
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}33; border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 3px 0 3px 12px;
  border-left: 2px solid ${accent}33;
  transition: all 0.3s;
  font-size: 0.9em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${accent};
  border-left-color: ${accent};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${pink};
}

@keyframes vaporwaveFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: vaporwaveFadeIn 0.5s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .blog-hero { padding: 60px 0 80px; }
  .blog-hero::before { height: 100px; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 6px 12px; }
  .post-title { font-size: 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Pixel — 「像素复古」──────────────────────────────────
export function getPixelCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#e8e8e8'
  const fg = isDark ? '#e0e0e0' : '#2a2a2a'
  const muted = isDark ? '#7a7a9a' : '#6a6a6a'
  const accent = '#6b8cff'
  const accentLight = isDark ? 'rgba(107,140,255,0.12)' : 'rgba(107,140,255,0.08)'
  const cardBg = isDark ? '#242440' : '#ffffff'
  const border = isDark ? '#3a3a5c' : '#c0c0c0'
  const red = '#ff6b6b'
  const green = '#6bff6b'
  const yellow = '#ffe66b'
  const shadowBase = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'
  const shadowMid = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Press Start 2P', monospace;
  background: var(--bg);
  color: var(--fg);
  line-height: 2;
  min-height: 100vh;
  font-size: 12px;
}

.blog-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 24px 0 16px;
  text-align: center;
  border-bottom: 4px solid var(--border);
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
}

.blog-header-site {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  color: ${accent};
  letter-spacing: 0.1em;
  margin-bottom: 16px;
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
  flex-wrap: wrap;
}

.nav-link {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--fg);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 3px solid var(--fg);
  text-transform: uppercase;
}

.nav-link:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  transform: scale(1.05);
}

.nav-link.active {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
  box-shadow: 4px 4px 0 ${isDark ? '#0a0a1e' : '#a0a0a0'};
}

.blog-hero {
  text-align: center;
  padding: 60px 0 40px;
  position: relative;
}

.hero-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 20px;
  line-height: 1.6;
  font-weight: 400;
  color: var(--fg);
  margin-bottom: 20px;
  text-shadow: 3px 3px 0 ${accent}44;
  position: relative;
  display: inline-block;
  padding: 20px 28px;
  border: 4px solid var(--fg);
  background: var(--card-bg);
}

.hero-title::before {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 8px;
  height: 8px;
  background: ${red};
}

.hero-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: -8px;
  width: 8px;
  height: 8px;
  background: ${green};
}

.hero-description {
  color: var(--muted);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.05em;
  max-width: 600px;
  margin: 0 auto;
  line-height: 2;
}

.blog-view { display: none; }
.view-home { display: block; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 32px 0;
}

.card {
  background: var(--card-bg);
  border-radius: 0;
  padding: 24px 20px;
  position: relative;
  border: 4px solid;
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.15s;
  box-shadow: 4px 4px 0 ${shadowBase};
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 ${shadowMid};
}

.card-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 400;
  margin-bottom: 12px;
  color: var(--fg);
}

.card-date {
  color: ${yellow};
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.card-excerpt {
  color: var(--muted);
  font-size: 10px;
  line-height: 2;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 4px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 2px solid ${accent};
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.blog-archive {
  padding: 40px 0;
}

.archive-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 0.05em;
  color: ${accent};
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 4px solid ${accent};
}

.archive-year-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: ${yellow};
  margin-bottom: 16px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 10px;
  transition: color 0.15s;
}

.archive-item a:hover {
  color: ${red};
}

.archive-item-date {
  color: var(--muted);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.blog-tags {
  padding: 40px 0;
}

.tags-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin-bottom: 32px;
  letter-spacing: 0.05em;
  color: ${green};
  text-shadow: 2px 2px 0 ${isDark ? '#0a0a1e' : '#c0c0c0'};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 6px 14px;
  background: var(--card-bg);
  color: ${accent};
  border: 2px solid ${accent};
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  transform: scale(1.05);
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: ${red};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px dashed var(--border);
  font-weight: 400;
  letter-spacing: 0.05em;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
}

.tag-post-item a {
  color: var(--fg);
  text-decoration: none;
  font-size: 10px;
  transition: color 0.15s;
}

.tag-post-item a:hover {
  color: ${red};
}

.tag-post-date {
  color: var(--muted);
  font-size: 9px;
  margin-left: 12px;
  font-weight: 400;
}

.blog-about,
.blog-links,
.blog-series {
  padding: 40px 0;
}

.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 4px solid var(--border);
  border-image: repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 4px, transparent 4px, transparent 8px) 4;
  margin-top: 40px;
  color: var(--muted);
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.post-detail {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 0;
}

.post-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  line-height: 1.8;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
  color: var(--fg);
  position: relative;
  display: inline-block;
  width: 100%;
  text-shadow: 2px 2px 0 ${accent}44;
}

.post-meta {
  text-align: center;
  color: var(--muted);
  font-size: 9px;
  margin-bottom: 32px;
  font-weight: 400;
  letter-spacing: 0.1em;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 24px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  font-size: 11px;
  line-height: 2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-family: 'Press Start 2P', monospace;
  margin: 1.8em 0 0.8em;
  color: var(--fg);
  font-weight: 400;
  letter-spacing: 0.05em;
}

.post-content h2::before {
  content: '\\25B6 ';
  color: ${accent};
  font-size: 0.7em;
}

.post-content pre {
  background: ${isDark ? '#0a0a1e' : '#d8d8d8'};
  padding: 16px 20px;
  border: 3px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 10px;
  line-height: 1.8;
  box-shadow: 4px 4px 0 ${shadowBase};
}

.post-content code {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.85em;
  color: ${red};
}

.post-content blockquote {
  border-left: 4px solid ${accent};
  padding: 12px 16px;
  color: var(--muted);
  margin: 1.5em 0;
  font-style: normal;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
  border: 3px solid var(--border);
  box-shadow: 4px 4px 0 ${shadowBase};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 2px dashed ${accent}66;
  font-weight: 400;
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 2;
  font-family: 'Press Start 2P', monospace;
}

.post-toc::-webkit-scrollbar { width: 4px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${accent}44; }

.toc-title {
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-size: 0.85em;
  margin-bottom: 8px;
}

.toc-nav a {
  color: var(--muted);
  text-decoration: none;
  display: block;
  padding: 4px 0 4px 12px;
  border-left: 2px solid var(--border);
  transition: all 0.15s;
  font-size: 0.85em;
}

.toc-nav a:hover,
.toc-nav a.toc-active {
  color: ${accent};
  border-left-color: ${accent};
}

.toc-nav .toc-h2 { padding-left: 20px; }
.toc-nav .toc-h3 { padding-left: 28px; }

.back-link {
  color: var(--muted);
  text-decoration: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.05em;
  transition: color 0.15s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

@keyframes pixelFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card { animation: pixelFadeIn 0.4s ease-out both; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .hero-title { font-size: 14px; padding: 16px 20px; }
  .hero-title::before, .hero-title::after { display: none; }
  .card-grid { grid-template-columns: 1fr; }
  .card { padding: 16px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 8px; padding: 6px 8px; }
  .post-title { font-size: 12px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Neumorphism ──────────────────────────────────────────
export function getNeumorphismCss(isDark: boolean): string {
  const bg = isDark ? '#2d2d35' : '#e0e5ec'
  const fg = isDark ? '#c8c8d0' : '#3a3f47'
  const muted = isDark ? '#8a8a95' : '#6b7280'
  const accentLight = isDark ? 'rgba(200,200,208,0.08)' : 'rgba(58,63,71,0.06)'
  const cardBg = isDark ? '#2d2d35' : '#e0e5ec'
  const border = isDark ? '#3b3b43' : '#d1d9e6'
  const raised = isDark
    ? '8px 8px 16px #1f1f27, -8px -8px 16px #3b3b43'
    : '8px 8px 16px #b8bec7, -8px -8px 16px #ffffff'
  const sunken = isDark
    ? 'inset 8px 8px 16px #1f1f27, inset -8px -8px 16px #3b3b43'
    : 'inset 8px 8px 16px #b8bec7, inset -8px -8px 16px #ffffff'
  const accentColor = isDark ? '#9b9ba8' : '#6b7280'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accentColor};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${bg};
  border-bottom: none;
  padding: 16px 0;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
  padding: 10px 20px;
  background: ${bg};
  border-radius: 12px;
  box-shadow: ${raised};
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  box-shadow: ${sunken};
  color: ${fg};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 42px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  display: inline-block;
  padding: 24px 48px;
  border-radius: 24px;
  box-shadow: ${raised};
  background: ${bg};
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 560px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
  padding: 32px 0;
}

.card {
  background: ${bg};
  border-radius: 24px;
  padding: 28px;
  position: relative;
  border: none;
  box-shadow: ${raised};
  transition: box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  box-shadow: ${sunken};
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  font-weight: 500;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 4px 12px;
  background: ${bg};
  color: ${muted};
  border: none;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
  box-shadow: ${sunken};
}

/* ── Archive ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
  display: inline-block;
  padding: 12px 28px;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 24px;
  border-left: 3px solid ${border};
}

.archive-year-title {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 12px;
}

.archive-item {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: ${accentColor};
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
  font-weight: 500;
}

/* ── Tags ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
  display: inline-block;
  padding: 12px 28px;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 8px 20px;
  background: ${bg};
  color: ${muted};
  border: none;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-weight: 500;
  box-shadow: ${raised};
}

.tag-cloud-item:hover {
  box-shadow: ${sunken};
  color: ${fg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 18px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
}

.tag-post-item a:hover {
  color: ${accentColor};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
  font-weight: 500;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 48px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: none;
  margin-top: 48px;
  color: ${muted};
  font-size: 13px;
  letter-spacing: 0.5px;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 48px 0;
}

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  line-height: 1.3;
  display: inline-block;
  padding: 20px 40px;
  border-radius: 20px;
  box-shadow: ${raised};
  background: ${bg};
}

.post-detail > .post-title,
.post-detail .post-title {
  display: block;
  text-align: center;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', sans-serif;
  margin: 1.5em 0 0.6em;
  color: ${fg};
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.4em;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${bg};
  padding: 16px 20px;
  border: none;
  border-radius: 16px;
  box-shadow: ${sunken};
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accentColor};
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accentColor};
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: normal;
  background: ${bg};
  border-radius: 0 16px 16px 0;
  box-shadow: ${sunken};
}

.post-content img {
  max-width: 100%;
  border-radius: 20px;
  box-shadow: ${raised};
}

.post-content a {
  color: ${accentColor};
  text-decoration: none;
  border-bottom: 1px dashed ${accentColor};
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${bg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  box-shadow: ${sunken};
}

.post-content td {
  padding: 8px 14px;
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
  padding: 8px 16px;
  border-radius: 12px;
  box-shadow: ${raised};
  background: ${bg};
}

.back-link:hover {
  box-shadow: ${sunken};
  color: ${fg};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 16px;
  font-size: 0.85em;
  line-height: 1.8;
  border-radius: 16px;
  box-shadow: ${raised};
  background: ${bg};
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0.5px;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 1.6;
  text-decoration: none;
}

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accentColor}; }

/* ── Animation ── */
@keyframes neumorphFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card {
  animation: neumorphFadeIn 0.5s ease-out both;
}

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; padding: 16px 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 24px; }
  .card { padding: 20px; }
  .blog-nav { gap: 8px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 8px 14px; }
  .post-title { font-size: 24px; padding: 16px 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 32px 0; }
}
`
}

// ─── Fashion ──────────────────────────────────────────
export function getFashionCss(isDark: boolean): string {
  const bg = isDark ? '#0a0a0a' : '#fff'
  const fg = isDark ? '#f0f0f0' : '#1a1a1a'
  const muted = isDark ? '#888' : '#999'
  const accent = '#c8a97e'
  const accentLight = isDark ? 'rgba(200,169,126,0.1)' : 'rgba(200,169,126,0.08)'
  const cardBg = isDark ? '#111' : '#fafafa'
  const border = isDark ? '#222' : '#e5e5e5'
  const navBg = isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 20px 0;
  text-align: center;
}

.blog-header-site {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 4px;
  text-transform: uppercase;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 0;
  font-weight: 400;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 100px 0 64px;
  position: relative;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 56px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 2px;
  margin-bottom: 20px;
  line-height: 1.1;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 300;
  max-width: 520px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid: editorial mixed layout ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 0;
  padding: 32px;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  animation: fashionFadeIn 0.6s ease-out both;
}

.card:nth-child(1) { grid-column: span 6; }
.card:nth-child(2) { grid-column: span 6; }
.card:nth-child(n+3) { grid-column: span 4; }

.card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: 0.5px;
}

.card-date {
  color: ${accent};
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 400;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  padding: 3px 12px;
  background: none;
  color: ${accent};
  border: 1px solid ${accent};
  border-radius: 0;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

/* ── Archive ── */
.blog-archive {
  padding: 64px 0;
}

.archive-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: ${fg};
  letter-spacing: 2px;
  text-transform: uppercase;
}

.archive-year {
  margin-bottom: 32px;
  padding-left: 24px;
  border-left: 1px solid ${accent};
}

.archive-year-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
  font-weight: 300;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 300;
}

/* ── Tags ── */
.blog-tags {
  padding: 64px 0;
}

.tags-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 48px;
  color: ${fg};
  letter-spacing: 2px;
  text-transform: uppercase;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: none;
  color: ${muted};
  border: 1px solid ${border};
  border-radius: 0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

.tag-cloud-item:hover {
  color: ${accent};
  border-color: ${accent};
  background: ${accentLight};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
  letter-spacing: 1px;
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
  font-weight: 300;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
  letter-spacing: 1px;
  font-weight: 300;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 64px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 48px 0;
  border-top: 1px solid ${border};
  margin-top: 64px;
  color: ${muted};
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 300;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 64px 0;
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  letter-spacing: 1px;
  line-height: 1.2;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 12px;
  margin-bottom: 48px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.4em;
  line-height: 1.8;
  font-weight: 300;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  margin: 1.8em 0 0.8em;
  color: ${fg};
  font-weight: 700;
  letter-spacing: 0.5px;
}

.post-content h2 {
  font-size: 1.5em;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${cardBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 0;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 2px solid ${accent};
  padding: 16px 24px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: italic;
  font-family: 'Playfair Display', serif;
  background: ${accentLight};
}

.post-content img {
  max-width: 100%;
  border-radius: 0;
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px solid ${accent};
  transition: opacity 0.3s;
}

.post-content a:hover {
  opacity: 0.7;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${cardBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid ${border};
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.post-content td {
  padding: 8px 14px;
  border: 1px solid ${border};
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: color 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.8;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.8em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 1.6;
  text-decoration: none;
}

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Animation ── */
@keyframes fashionFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(6, 1fr); }
  .card:nth-child(1) { grid-column: span 6; }
  .card:nth-child(2) { grid-column: span 3; }
  .card:nth-child(n+3) { grid-column: span 3; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .card:nth-child(1),
  .card:nth-child(2),
  .card:nth-child(n+3) { grid-column: span 1; }
  .card { padding: 24px; }
  .blog-nav { gap: 16px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; letter-spacing: 2px; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 40px 0; }
}
`
}

// ─── Forest ──────────────────────────────────────────
export function getForestCss(isDark: boolean): string {
  const bg = isDark ? '#1a2416' : '#f5f0e8'
  const fg = isDark ? '#d4cbb8' : '#2d3436'
  const muted = isDark ? '#8a9a7a' : '#7a8a6a'
  const accent = isDark ? '#6ba33e' : '#5a8a32'
  const accentLight = isDark ? 'rgba(107,163,62,0.12)' : 'rgba(90,138,50,0.08)'
  const cardBg = isDark ? '#223020' : '#faf7f0'
  const border = isDark ? '#2e3e28' : '#ddd5c5'
  const navBg = isDark ? 'rgba(26,36,22,0.95)' : 'rgba(245,240,232,0.95)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Lora', 'Georgia', serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 16px 0;
  text-align: center;
}

.blog-header-site {
  font-family: 'Lora', serif;
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Lora', serif;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 400;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active {
  color: ${bg};
  background: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero ── */
.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
  background: linear-gradient(180deg, ${accent}08 0%, transparent 100%);
}

.blog-hero::before {
  content: '';
  position: absolute;
  top: 20px;
  right: 10%;
  width: 200px;
  height: 200px;
  border-radius: 60% 40% 50% 50% / 50% 60% 40% 50%;
  background: ${accent}15;
}

.hero-title {
  font-family: 'Lora', serif;
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 16px;
  padding: 28px;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  animation: forestFadeIn 0.6s ease-out both;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(90,138,50,0.1);
}

.card-title {
  font-family: 'Lora', serif;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  background: ${accent}15;
  color: ${accent};
  border: none;
  border-radius: 20px;
  font-size: 11px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── Archive ── */
.blog-archive {
  padding: 48px 0;
}

.archive-title {
  font-family: 'Lora', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
}

.archive-year {
  margin-bottom: 28px;
  padding-left: 24px;
  border-left: 3px solid ${accent};
}

.archive-year-title {
  font-family: 'Lora', serif;
  font-size: 18px;
  font-weight: 700;
  color: ${accent};
  margin-bottom: 12px;
}

.archive-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.archive-item a:hover {
  color: ${accent};
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
}

/* ── Tags ── */
.blog-tags {
  padding: 48px 0;
}

.tags-title {
  font-family: 'Lora', serif;
  font-size: 28px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 32px;
  color: ${fg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  margin-bottom: 32px;
}

.tag-cloud-item {
  padding: 6px 18px;
  background: ${accent}15;
  color: ${accent};
  border: none;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  font-weight: 500;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-family: 'Lora', serif;
  font-size: 18px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.tag-post-item {
  padding: 8px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.3s;
  font-size: 14px;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 48px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid ${border};
  margin-top: 48px;
  color: ${muted};
  font-size: 13px;
  letter-spacing: 0.5px;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 48px 0;
}

.post-title {
  font-family: 'Lora', serif;
  font-size: 34px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  color: ${fg};
  line-height: 1.3;
  letter-spacing: -0.5px;
}

.post-meta {
  text-align: center;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 40px;
  letter-spacing: 0.5px;
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1.2em;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Lora', serif;
  margin: 1.5em 0 0.6em;
  color: ${fg};
  font-weight: 700;
}

.post-content h2 {
  font-size: 1.4em;
  padding-bottom: 8px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${cardBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 12px;
  overflow-x: auto;
  margin: 1.5em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 12px 20px;
  color: ${muted};
  margin: 1.5em 0;
  font-style: italic;
  background: ${accentLight};
  border-radius: 0 12px 12px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid ${border};
}

.post-content a {
  color: ${accent};
  text-decoration: none;
  border-bottom: 1px dashed ${accent};
  transition: border-color 0.3s;
}

.post-content a:hover {
  border-bottom-style: solid;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${cardBg};
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border: 1px solid ${border};
}

.post-content td {
  padding: 8px 14px;
  border: 1px solid ${border};
}

.post-content tr:hover td {
  background: ${accentLight};
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  display: inline-block;
  margin-bottom: 24px;
}

.back-link:hover {
  color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.8;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${muted};
  margin-bottom: 10px;
  font-size: 0.85em;
}

.toc-nav a {
  display: block;
  padding: 3px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.3s;
  line-height: 1.6;
  text-decoration: none;
}

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Animation ── */
@keyframes forestFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 28px; }
  .blog-hero::before { display: none; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 6px 14px; }
  .post-title { font-size: 24px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 32px 0; }
}
`
}

// ─── Notion ──────────────────────────────────────────
export function getNotionCss(isDark: boolean): string {
  const bg = isDark ? '#191919' : '#fff'
  const fg = isDark ? '#e0e0e0' : '#37352f'
  const muted = isDark ? '#6b6b6b' : '#9b9a97'
  const accent = isDark ? '#529cca' : '#2383e2'
  const accentLight = isDark ? 'rgba(82,156,202,0.1)' : 'rgba(35,131,226,0.08)'
  const cardBg = isDark ? '#191919' : '#fff'
  const border = isDark ? '#2e2e2e' : '#e3e3e3'
  const navBg = isDark ? 'rgba(25,25,25,0.95)' : 'rgba(255,255,255,0.95)'
  const codeBg = isDark ? '#2e2e2e' : '#f7f6f3'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Header ── */
.blog-header {
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
  padding: 12px 0;
  text-align: center;
}

.blog-header-site {
  font-size: 14px;
  font-weight: 600;
  color: ${fg};
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 400;
}

.nav-link:hover {
  background: ${accent}15;
  color: ${fg};
}

.nav-link.active {
  background: ${accent}20;
  color: ${accent};
  font-weight: 500;
}

.nav-link.active::after {
  display: none;
}

/* ── Hero: minimal, no hero feel ── */
.blog-hero {
  padding: 48px 0 24px;
  text-align: left;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: ${fg};
  margin-bottom: 4px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  line-height: 1.5;
}

.blog-view { display: none; }
.view-home { display: block; }

/* ── Card Grid: list style ── */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.card {
  padding: 12px 0;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  box-shadow: none;
  position: relative;
  transition: background 0.15s;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 16px;
}

.card:hover {
  background: ${accent}08;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
  color: ${fg};
  margin-bottom: 0;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  white-space: nowrap;
  margin-bottom: 0;
}

.card-excerpt {
  display: none;
}

.card-tags {
  display: none;
}

/* ── Archive ── */
.blog-archive {
  padding: 32px 0;
}

.archive-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 24px;
  color: ${fg};
}

.archive-year {
  margin-bottom: 24px;
  padding-left: 0;
  border-left: none;
}

.archive-year-title {
  font-size: 14px;
  font-weight: 600;
  color: ${muted};
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.archive-item {
  padding: 6px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid ${border};
}

.archive-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  font-size: 14px;
}

.archive-item a:hover {
  color: ${accent};
  background: ${accent}08;
  border-radius: 2px;
}

.archive-item-date {
  color: ${muted};
  font-size: 13px;
}

/* ── Tags ── */
.blog-tags {
  padding: 32px 0;
}

.tags-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 24px;
  color: ${fg};
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.tag-cloud-item {
  padding: 4px 10px;
  background: ${accentLight};
  color: ${accent};
  border: 1px solid ${border};
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.tag-cloud-item:hover {
  background: ${accent};
  color: ${bg};
  border-color: ${accent};
}

.tag-posts-section { display: none; }
.tag-posts-section.active { display: block; }

.tag-posts-title {
  font-size: 16px;
  font-weight: 600;
  color: ${fg};
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.tag-post-item {
  padding: 6px 0;
  border-bottom: 1px solid ${border};
}

.tag-post-item a {
  color: ${fg};
  text-decoration: none;
  transition: color 0.15s;
  font-size: 14px;
}

.tag-post-item a:hover {
  color: ${accent};
}

.tag-post-date {
  color: ${muted};
  font-size: 12px;
  margin-left: 12px;
}

/* ── About / Links / Series ── */
.blog-about,
.blog-links,
.blog-series {
  padding: 32px 0;
}

/* ── Footer ── */
.blog-footer {
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid ${border};
  margin-top: 32px;
  color: ${muted};
  font-size: 13px;
}

/* ── Post Detail ── */
.post-detail {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 0;
}

.post-title {
  font-size: 32px;
  font-weight: 700;
  text-align: left;
  margin-bottom: 8px;
  color: ${fg};
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.post-meta {
  text-align: left;
  color: ${muted};
  font-size: 13px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${border};
}

.post-body-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: start;
}

.post-content p {
  margin-bottom: 1em;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', system-ui, sans-serif;
  margin: 1.5em 0 0.5em;
  color: ${fg};
  font-weight: 600;
}

.post-content h2 {
  font-size: 1.3em;
  padding-bottom: 6px;
  border-bottom: 1px solid ${border};
}

.post-content pre {
  background: ${codeBg};
  padding: 16px 20px;
  border: 1px solid ${border};
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
  font-size: 13px;
}

.post-content code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  color: ${accent};
  background: ${accentLight};
  padding: 1px 4px;
  border-radius: 3px;
}

.post-content pre code {
  color: ${fg};
  background: none;
  padding: 0;
  border-radius: 0;
}

.post-content blockquote {
  border-left: 3px solid ${accent};
  padding: 8px 16px;
  color: ${muted};
  margin: 1em 0;
  font-style: normal;
  background: ${accentLight};
  border-radius: 0 3px 3px 0;
}

.post-content img {
  max-width: 100%;
  border-radius: 4px;
}

.post-content a {
  color: ${accent};
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: opacity 0.15s;
}

.post-content a:hover {
  opacity: 0.7;
}

.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
}

.post-content th {
  background: ${accentLight};
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid ${border};
  font-size: 13px;
}

.post-content td {
  padding: 8px 12px;
  border: 1px solid ${border};
}

.post-content tr:hover td {
  background: ${accent}08;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  transition: color 0.15s;
}

.back-link:hover {
  color: ${accent};
}

/* ── TOC ── */
.post-toc {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 12px 0;
  font-size: 0.85em;
  line-height: 1.6;
  border-left: 1px solid ${border};
  padding-left: 12px;
}

.post-toc::-webkit-scrollbar { width: 2px; }
.post-toc::-webkit-scrollbar-track { background: transparent; }
.post-toc::-webkit-scrollbar-thumb { background: ${border}; border-radius: 2px; }

.toc-title {
  font-weight: 600;
  letter-spacing: 0;
  color: ${muted};
  margin-bottom: 8px;
  font-size: 0.85em;
  text-transform: uppercase;
}

.toc-nav a {
  display: block;
  padding: 2px 0;
  font-size: 0.88em;
  color: ${muted};
  transition: color 0.15s;
  line-height: 1.5;
  text-decoration: none;
}

.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover, .toc-nav a.active { color: ${accent}; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .hero-title { font-size: 24px; }
  .post-title { font-size: 24px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 4px 6px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
  .blog-about,
  .blog-links,
  .blog-series { padding: 24px 0; }
}
`
}

// ─── Swiss ──────────────────────────────────────────────────
export function getSwissCss(isDark: boolean): string {
  const bg = isDark ? '#111111' : '#ffffff'
  const fg = isDark ? '#eeeeee' : '#111111'
  const muted = isDark ? '#888888' : '#999999'
  const accent = '#e74c3c'
  const accentLight = isDark ? 'rgba(231,76,60,0.12)' : 'rgba(231,76,60,0.08)'
  const cardBg = isDark ? '#1a1a1a' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e0e0e0'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: 1px solid ${fg};
  position: relative;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 0;
  padding: 16px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
  font-weight: 500;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 2px;
  background: ${accent};
}

.blog-hero {
  text-align: left;
  padding: 100px 0 80px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', 'Helvetica Neue', sans-serif;
  font-size: 64px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -2px;
  text-transform: uppercase;
  margin-bottom: 24px;
  line-height: 1.05;
  position: relative;
}

.hero-title::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background: ${accent};
  margin-right: 16px;
  vertical-align: middle;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 400;
  max-width: 500px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}

.card {
  padding: 32px;
  border-radius: 0;
  border: 1px solid ${border};
  border-right: none;
  border-bottom: none;
  background: ${cardBg};
  transition: background 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:nth-child(3n) { border-right: 1px solid ${border}; }
.card:hover { background: ${accentLight}; }

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
  line-height: 1.4;
}

.card-date {
  font-size: 11px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${accent};
  padding: 2px 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 36px; font-weight: 700; letter-spacing: -1px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 36px; font-weight: 700; letter-spacing: -1px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 0; border-bottom: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-bottom-color: ${accent}; }
.tag-posts-title { font-size: 18px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 700;
  letter-spacing: -0.5px;
  text-transform: uppercase;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { border-bottom-width: 2px; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#f5f5f5'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; }
.post-content img { max-width: 100%; }

.blog-footer {
  border-top: 1px solid ${fg};
  padding: 24px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .card:nth-child(3n) { border-right: none; }
  .card:nth-child(2n) { border-right: 1px solid ${border}; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 24px; }
  .blog-nav { gap: 20px; flex-wrap: wrap; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .card { border-right: 1px solid ${border}; }
  .card:nth-child(2n) { border-right: 1px solid ${border}; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Zen ────────────────────────────────────────────────────
export function getZenCss(isDark: boolean): string {
  const bg = isDark ? '#1a1918' : '#f5f0eb'
  const fg = isDark ? '#d4c5a9' : '#3a3a3a'
  const muted = isDark ? '#8b7d6b' : '#9a8e7e'
  const accent = '#8b7d6b'
  const accentLight = isDark ? 'rgba(139,125,107,0.1)' : 'rgba(139,125,107,0.06)'
  const cardBg = isDark ? '#222120' : '#faf7f3'
  const border = isDark ? '#2e2c2a' : '#e0dbd5'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Noto Serif SC', 'Georgia', serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 2;
  min-height: 100vh;
  font-weight: 400;
  font-size: 15px;
}

.blog-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 32px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  margin-top: 0;
  padding: 32px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 16px;
  font-weight: 400;
}

.nav-link + .nav-link::before {
  content: '·';
  margin-right: 32px;
  color: ${border};
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.nav-link.active::after {
  content: '';
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 160px 0 120px;
}

.hero-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--fg);
  letter-spacing: 4px;
  margin-bottom: 24px;
  position: relative;
}

.hero-title::before {
  content: '';
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${border};
  margin: 0 auto 40px;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  letter-spacing: 1px;
  font-weight: 400;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 28px 0;
  border-bottom: 1px solid ${border};
  background: none;
  transition: all 0.3s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover { padding-left: 12px; }

.card-title {
  font-size: 17px;
  font-weight: 400;
  margin-bottom: 8px;
  letter-spacing: 1px;
  line-height: 1.6;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.8;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 1px;
  color: ${accent};
  padding: 2px 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 20px; font-weight: 400; letter-spacing: 3px; margin-bottom: 40px; }
.archive-year { font-size: 14px; font-weight: 400; letter-spacing: 2px; color: ${accent}; margin: 40px 0 16px; }
.archive-list { list-style: none; }
.archive-item { padding: 10px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 20px; font-weight: 400; letter-spacing: 3px; margin-bottom: 40px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 16px; }
.tag-cloud-item { font-size: 13px; letter-spacing: 1px; color: ${muted}; text-decoration: none; transition: color 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${fg}; }
.tag-posts-title { font-size: 17px; font-weight: 400; letter-spacing: 2px; margin-bottom: 20px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 3px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.post-meta {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 1px;
  margin-bottom: 48px;
}

.post-content {
  font-size: 16px;
  line-height: 2.2;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 400;
  letter-spacing: 2px;
  margin: 2.5em 0 0.8em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${border}; }
.post-content a:hover { border-bottom-color: ${accent}; }
.post-content blockquote { border-left: 1px solid ${border}; padding-left: 24px; color: ${muted}; margin: 2em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; }
.post-content pre { background: ${isDark ? '#1e1d1c' : '#f0ebe5'}; padding: 24px; overflow-x: auto; margin: 2em 0; font-size: 14px; line-height: 1.8; }
.post-content img { max-width: 100%; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 40px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 2px;
  color: ${muted};
  margin-top: 120px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 1px;
}

.back-link:hover { color: ${fg}; }

@media (max-width: 1024px) {
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 0; }
  .nav-link { font-size: 12px; padding: 4px 10px; }
  .blog-hero { padding: 100px 0 80px; }
  .hero-title { font-size: 20px; }
  .post-title { font-size: 20px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Brutalist ──────────────────────────────────────────────
export function getBrutalistCss(isDark: boolean): string {
  const bg = isDark ? '#000000' : '#ffffff'
  const fg = isDark ? '#ffffff' : '#000000'
  const muted = isDark ? '#888888' : '#666666'
  const accent = fg
  const accentLight = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const cardBg = isDark ? '#0a0a0a' : '#f8f8f8'
  const border = isDark ? '#333333' : '#000000'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }

body {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  min-height: 100vh;
  font-size: 16px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
}

.blog-header {
  padding: 0;
  text-align: left;
  border-bottom: 3px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 0;
  padding: 16px 0;
  flex-wrap: wrap;
}

.nav-link {
  color: ${fg};
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s;
  padding: 8px 16px;
  border: 2px solid ${border};
  font-weight: 700;
}

.nav-link:hover {
  background: ${fg};
  color: ${bg};
}

.nav-link.active {
  background: ${fg};
  color: ${bg};
}

.nav-link.active::after { display: none; }

.blog-hero {
  text-align: left;
  padding: 80px 0 60px;
}

.hero-title {
  font-family: system-ui, sans-serif;
  font-size: 56px;
  font-weight: 900;
  color: var(--fg);
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1;
  border: 3px solid ${border};
  display: inline-block;
  padding: 16px 24px;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.card {
  padding: 24px;
  border: 3px solid ${border};
  background: ${cardBg};
  transition: all 0.1s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${isDark ? '#ffffff' : '#000000'};
  background: ${accentLight};
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 ${border};
}

.card-title {
  font-size: 16px;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 700;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.5;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${fg};
  border: 2px solid ${border};
  padding: 2px 8px;
  font-weight: 700;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; border: 3px solid ${border}; display: inline-block; padding: 8px 16px; }
.archive-year { font-size: 16px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 2px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; font-weight: 700; text-transform: uppercase; }
.archive-item a:hover { text-decoration: underline; }
.archive-item span { font-size: 12px; color: ${muted}; letter-spacing: 1px; font-weight: 700; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; border: 3px solid ${border}; display: inline-block; padding: 8px 16px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${fg}; text-decoration: none; border: 2px solid ${border}; padding: 4px 12px; font-weight: 700; cursor: pointer; transition: all 0.1s; }
.tag-cloud-item:hover { background: ${fg}; color: ${bg}; }
.tag-posts-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1;
}

.post-meta {
  font-size: 13px;
  color: ${muted};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 40px;
  font-weight: 700;
}

.post-content {
  font-size: 17px;
  line-height: 1.7;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${fg}; text-decoration: underline; text-underline-offset: 3px; }
.post-content blockquote { border-left: 4px solid ${border}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; font-style: normal; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border: 1px solid ${border}; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#f0f0f0'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 2px solid ${border}; }
.post-content img { max-width: 100%; border: 2px solid ${border}; }

.blog-footer {
  border-top: 3px solid ${border};
  padding: 24px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
  font-weight: 700;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  border: 2px solid ${border};
  padding: 6px 12px;
}

.back-link:hover { background: ${fg}; color: ${bg}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 4px; }
  .nav-link { font-size: 11px; padding: 6px 10px; }
  .hero-title { font-size: 32px; padding: 12px 16px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Corporate ──────────────────────────────────────────────
export function getCorporateCss(isDark: boolean): string {
  const bg = isDark ? '#0f172a' : '#ffffff'
  const fg = isDark ? '#e2e8f0' : '#1a1a2e'
  const muted = isDark ? '#94a3b8' : '#64748b'
  const accent = isDark ? '#60a5fa' : '#2563eb'
  const accentLight = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.06)'
  const cardBg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const navBg = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: ${accent};
  border-radius: 1px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-title::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: linear-gradient(90deg, ${accent}, ${isDark ? '#a78bfa' : '#7c3aed'});
  margin: 20px auto 0;
  border-radius: 2px;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  border-radius: 12px;
  border: 1px solid ${border};
  background: ${cardBg};
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-color: ${accent}33;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 4px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; }
.post-content pre { background: ${isDark ? '#0f172a' : '#f8fafc'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getCosmosCss(isDark: boolean): string {
  const bg = isDark ? '#0b0d17' : '#0f1120'
  const fg = '#e0e0f0'
  const muted = isDark ? '#8888aa' : '#9999bb'
  const accent = '#ff6b35'
  const accentLight = isDark ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.08)'
  const cardBg = isDark ? '#141428' : '#0f1120'
  const border = isDark ? '#2a2a4a' : '#1a1a3a'
  const navBg = isDark ? 'rgba(11,13,23,0.85)' : 'rgba(15,17,32,0.85)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  background-image: radial-gradient(2px 2px at 20px 30px, #ffffff22, transparent), radial-gradient(2px 2px at 40px 70px, #ffffff15, transparent), radial-gradient(1px 1px at 90px 40px, #ffffff18, transparent), radial-gradient(1px 1px at 130px 80px, #ffffff12, transparent), radial-gradient(2px 2px at 160px 30px, #ffffff10, transparent);
  background-size: 200px 100px;
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: ${accent};
  border-radius: 1px;
  box-shadow: 0 0 8px ${accent}66;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 15%;
  top: 30%;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, ${accent}44, ${accent}11);
  box-shadow: 0 0 40px ${accent}22;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(15% + 40px);
  top: calc(30% + 50px);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 1px solid ${accent}22;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  background: ${isDark ? 'rgba(20,20,40,0.7)' : 'rgba(15,17,32,0.7)'};
  border: 1px solid ${accent}22;
  backdrop-filter: blur(8px);
  border-radius: 12px;
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 0 20px ${accent}15;
  transform: translateY(-4px);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 4px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; }
.post-content pre { background: ${isDark ? '#0b0d17' : '#0f1120'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getClaymorphismCss(isDark: boolean): string {
  const bg = isDark ? '#1a1825' : '#f0eef5'
  const fg = isDark ? '#e0ddf0' : '#2d2b3d'
  const muted = isDark ? '#9995aa' : '#6b6880'
  const accent = isDark ? '#ff8a80' : '#ff6b6b'
  const accentLight = isDark ? 'rgba(255,138,128,0.1)' : 'rgba(255,107,107,0.08)'
  const cardBg = bg
  const border = isDark ? '#2e2c3d' : '#d8d5e5'
  const navBg = isDark ? 'rgba(26,24,37,0.9)' : 'rgba(240,238,245,0.9)'
  const raised = isDark ? '10px 10px 20px #0e0c17, -10px -10px 20px #262433' : '10px 10px 20px #d1cfe0, -10px -10px 20px #ffffff'
  const raisedHover = isDark ? '12px 12px 24px #0e0c17, -12px -12px 24px #262433' : '12px 12px 24px #d1cfe0, -12px -12px 24px #ffffff'
  const raisedSmall = isDark ? '6px 6px 12px #0e0c17, -6px -6px 12px #262433' : '6px 6px 12px #d1cfe0, -6px -6px 12px #ffffff'
  const raisedLarge = isDark ? '14px 14px 28px #0e0c17, -14px -14px 28px #262433' : '14px 14px 28px #d1cfe0, -14px -14px 28px #ffffff'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: ${raisedSmall};
  background: ${bg};
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.blog-hero {
  text-align: center;
  padding: 48px;
  position: relative;
  background: ${bg};
  border-radius: 32px;
  box-shadow: ${raisedLarge};
  margin: 24px 0;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  background: ${bg};
  border-radius: 24px;
  box-shadow: ${raised};
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  box-shadow: ${raisedHover};
  transform: translateY(-4px);
}

.card:nth-child(4n+1) { border-top: 4px solid #ff6b6b; }
.card:nth-child(4n+2) { border-top: 4px solid #feca57; }
.card:nth-child(4n+3) { border-top: 4px solid #48dbfb; }
.card:nth-child(4n+4) { border-top: 4px solid #ff9ff3; }

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 4px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; }
.post-content pre { background: ${isDark ? '#1a1825' : '#f0eef5'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getIceCrystalCss(isDark: boolean): string {
  const bg = isDark ? '#0a1a24' : '#e8f4f8'
  const fg = isDark ? '#c0d8e0' : '#1a3a4a'
  const muted = isDark ? '#7a9aaa' : '#5a7a8a'
  const accent = isDark ? '#4dd0e1' : '#00acc1'
  const accentLight = isDark ? 'rgba(77,208,225,0.1)' : 'rgba(0,172,193,0.08)'
  const cardBg = isDark ? '#0e2030' : '#e8f4f8'
  const border = isDark ? '#1a3040' : '#c0d8e8'
  const navBg = isDark ? 'rgba(10,26,36,0.7)' : 'rgba(232,244,248,0.7)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  position: fixed;
  top: 0;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: ${navBg};
  border-bottom: 1px solid ${border};
  z-index: 100;
  left: 0;
  right: 0;
  padding: 0;
  text-align: center;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 0;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: ${accent};
  border-radius: 1px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
}

.blog-hero::before {
  content: '❄';
  position: absolute;
  right: 12%;
  top: 20%;
  font-size: 64px;
  color: ${accent}15;
}

.blog-hero::after {
  content: '❄';
  position: absolute;
  left: 8%;
  bottom: 20%;
  font-size: 40px;
  color: ${accent}10;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  background: ${isDark ? 'rgba(10,26,36,0.5)' : 'rgba(232,244,248,0.5)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${accent}22;
  border-radius: 16px;
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 8px 32px ${accent}15;
  transform: translateY(-4px);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 4px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; }
.post-content pre { background: ${isDark ? '#0a1a24' : '#e8f4f8'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Café — 「咖啡时光」──────────────────────────────────
export function getCafeCss(isDark: boolean): string {
  const bg = isDark ? '#1a1510' : '#f5f0e8'
  const fg = isDark ? '#d4c5a9' : '#3a2a1a'
  const muted = isDark ? '#9a8a70' : '#8a7a6a'
  const accent = isDark ? '#c8a882' : '#6b4226'
  const accentLight = isDark ? 'rgba(200,168,130,0.12)' : 'rgba(107,66,38,0.08)'
  const cardBg = isDark ? '#252015' : '#fffcf5'
  const border = isDark ? '#3a3020' : '#e0d5c5'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Lora', 'Georgia', serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-family: 'Lora', serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  background: ${accentLight};
  color: ${accent};
}

.nav-link.active {
  color: ${bg};
  background: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 80px;
  height: 80px;
  border: 3px solid ${accent}33;
  border-radius: 50%;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(10% - 16px);
  top: calc(50% - 10px);
  width: 16px;
  height: 20px;
  border: 3px solid ${accent}33;
  border-left: none;
  border-radius: 0 12px 12px 0;
}

.hero-title {
  font-family: 'Lora', serif;
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 16px;
  padding: 24px;
  position: relative;
  border: 1px solid ${border};
  box-shadow: 0 2px 12px rgba(107,66,38,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(107,66,38,0.12);
}

.card-title {
  font-family: 'Lora', serif;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 3px 12px;
  background: ${accentLight};
  border-radius: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Lora', serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; border-left: 3px solid ${accent}; padding-left: 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Lora', serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Lora', serif;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Lora', serif;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0 12px 12px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1a1510' : '#faf5ee'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 12px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 12px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .blog-hero::before, .blog-hero::after { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 24px; }
  .blog-hero::before, .blog-hero::after { display: none; }
}
`
}

// ─── Travel — 「旅行手帐」──────────────────────────────────
export function getTravelCss(isDark: boolean): string {
  const bg = isDark ? '#0d1b2a' : '#faf8f5'
  const fg = isDark ? '#e0e0e0' : '#2c3e50'
  const muted = isDark ? '#8899aa' : '#7f8c8d'
  const accent = isDark ? '#4da6ff' : '#1e90ff'
  const accentLight = isDark ? 'rgba(77,166,255,0.12)' : 'rgba(30,144,255,0.08)'
  const cardBg = isDark ? '#152238' : '#ffffff'
  const border = isDark ? '#1e3a5f' : '#d5dde5'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
}

.nav-link.active {
  color: ${bg};
  background: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
  background: linear-gradient(180deg, ${isDark ? '#0d1b2a' : '#87ceeb'} 0%, ${bg} 100%);
}

.blog-hero::before {
  content: '⊕';
  position: absolute;
  right: 15%;
  top: 30%;
  font-size: 48px;
  color: ${accent}22;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 12px;
  padding: 24px;
  position: relative;
  border: 1px solid ${border};
  border-left: 3px dashed ${accent}44;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card::before {
  content: '📍';
  position: absolute;
  left: -8px;
  top: 24px;
  font-size: 14px;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(30,144,255,0.1);
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 2px 10px;
  background: ${accent}15;
  border-radius: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; border-left: 3px dashed ${accent}; padding-left: 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px dashed ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px dashed ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#0d1b2a' : '#f5f8fc'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .blog-hero::before { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 24px; }
  .blog-hero::before { display: none; }
}
`
}

// ─── Music — 「音乐律动」──────────────────────────────────
export function getMusicCss(isDark: boolean): string {
  const bg = isDark ? '#121212' : '#f8f8f8'
  const fg = isDark ? '#ffffff' : '#191414'
  const muted = isDark ? '#a0a0a0' : '#666666'
  const accent = '#1db954'
  const accentLight = isDark ? 'rgba(29,185,84,0.15)' : 'rgba(29,185,84,0.1)'
  const cardBg = isDark ? '#1e1e1e' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e0e0e0'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-size: 20px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding-bottom: 4px;
}

.nav-link:hover {
  color: ${fg};
}

.nav-link.active {
  color: ${accent};
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: ${accent};
  border-radius: 1px;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid ${accent}33;
  background: radial-gradient(circle, ${accent}15 30%, transparent 30%);
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(10% + 120px);
  top: calc(50% - 15px);
  width: 4px;
  height: 30px;
  background: ${accent};
  border-radius: 2px;
  box-shadow: 10px 5px 0 ${accent}88, 20px -3px 0 ${accent}66, 30px 8px 0 ${accent}44;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 32px 0;
}

.card {
  background: ${isDark ? '#1e1e1e' : '#fff'};
  border-radius: 8px;
  padding: 20px;
  position: relative;
  border: 1px solid ${border};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  color: ${muted};
  font-size: 12px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 2px 10px;
  background: ${accent}20;
  border-radius: 4px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#f0f0f0'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .blog-hero::before, .blog-hero::after { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 12px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 16px; }
  .card { padding: 16px; }
  .post-title { font-size: 24px; }
  .blog-hero::before, .blog-hero::after { display: none; }
}
`
}

// ─── Sketch — 「手绘涂鸦」──────────────────────────────────
export function getSketchCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#fff9c4'
  const fg = isDark ? '#e0d0b0' : '#333333'
  const muted = isDark ? '#9a8a70' : '#888888'
  const accent = isDark ? '#ff8f00' : '#e65100'
  const accentLight = isDark ? 'rgba(255,143,0,0.12)' : 'rgba(230,81,0,0.08)'
  const cardBg = isDark ? '#2a2520' : '#fffde7'
  const border = isDark ? '#3a3530' : '#e0d0b0'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 2px dashed ${border};
}

.blog-header-site {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: ${muted};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px 8px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  text-decoration: underline;
  text-decoration-style: wavy;
  text-decoration-color: ${accent};
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.hero-title {
  font-family: 'Caveat', cursive;
  font-size: 48px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 0;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-title::after {
  content: '';
  display: block;
  width: 60%;
  height: 3px;
  background: ${accent};
  transform: rotate(-1deg);
  margin: 8px auto 0;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${isDark ? '#2a2520' : '#fffde7'};
  border: 2px solid ${border};
  border-radius: 2px;
  padding: 24px;
  position: relative;
  transform: rotate(-0.5deg);
  transition: transform 0.3s;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: rotate(0deg);
  box-shadow: 4px 4px 0 ${border};
}

.card::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 40%;
  width: 40px;
  height: 12px;
  background: ${accent}33;
  border-radius: 0;
}

.card-title {
  font-family: 'Caveat', cursive;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
}

.card-date {
  color: ${muted};
  font-size: 12px;
  margin-bottom: 12px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 12px;
  color: ${accent};
  padding: 2px 10px;
  background: ${accentLight};
  border-radius: 2px;
  font-weight: 500;
  border: 1px dashed ${accent}44;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Caveat', cursive; font-size: 36px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-family: 'Caveat', cursive; font-size: 20px; font-weight: 700; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px dashed ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Caveat', cursive; font-size: 36px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 14px; color: ${muted}; text-decoration: none; padding: 4px 14px; border: 2px dashed ${border}; border-radius: 2px; transition: all 0.3s; cursor: pointer; font-family: 'Caveat', cursive; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Caveat', cursive;
  font-size: 44px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Caveat', cursive;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px dashed ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 2px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1a1a1a' : '#fff8e1'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 2px dashed ${border}; border-radius: 0; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 2px; border: 2px solid ${border}; }

.blog-footer {
  border-top: 2px dashed ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 14px;
  color: ${muted};
  margin-top: 48px;
  font-family: 'Caveat', cursive;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 16px;
  font-family: 'Caveat', cursive;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; flex-wrap: wrap; }
  .nav-link { font-size: 16px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 32px; }
}
`
}

export function getRamsCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#f5f5f5'
  const fg = isDark ? '#e0e0e0' : '#212121'
  const muted = isDark ? '#888888' : '#999999'
  const accent = isDark ? '#9e9e9e' : '#757575'
  const accentLight = isDark ? 'rgba(158,158,158,0.1)' : 'rgba(117,117,117,0.08)'
  const cardBg = isDark ? '#222222' : '#f5f5f5'
  const border = isDark ? '#333333' : '#e0e0e0'
  const navBg = isDark ? 'rgba(26,26,26,0.9)' : 'rgba(245,245,245,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-link:hover, .nav-link.active {
  color: ${fg};
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: left;
  position: relative;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.5px;
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  font-size: 14px;
  color: ${muted};
  max-width: 400px;
  line-height: 1.6;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.card {
  border-bottom: 1px solid ${border};
  border-radius: 0;
  padding: 20px 0;
  background: none;
  transition: padding-left 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  padding-left: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  letter-spacing: -0.2px;
  line-height: 1.4;
}

.card-date {
  font-size: 12px;
  color: ${muted};
  margin-bottom: 8px;
}

.card-excerpt {
  font-size: 13px;
  color: ${muted};
  line-height: 1.5;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  padding: 0;
  background: none;
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 24px; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 32px; }
.archive-year { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 14px; }
.archive-item a:hover { color: ${fg}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 24px; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 0; border: none; border-bottom: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-bottom-color: ${accent}; }
.tag-posts-title { font-size: 16px; font-weight: 500; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 15px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 500;
  letter-spacing: -0.3px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: underline; }
.post-content a:hover { color: ${fg}; }
.post-content blockquote { border-left: 2px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; }
.post-content pre { background: ${isDark ? '#222222' : '#eeeeee'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: 1fr; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 11px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getLuxuryCss(isDark: boolean): string {
  const bg = isDark ? '#050505' : '#0a0a0a'
  const fg = isDark ? '#e8dcc8' : '#f5f0e8'
  const muted = isDark ? '#8a7e6a' : '#a09882'
  const accent = isDark ? '#d4b85c' : '#c9a84c'
  const accentLight = isDark ? 'rgba(212,184,92,0.1)' : 'rgba(201,168,76,0.08)'
  const cardBg = isDark ? '#0d0d0d' : '#0f0f0f'
  const border = isDark ? '#2a2520' : '#1a1815'
  const navBg = isDark ? 'rgba(5,5,5,0.9)' : 'rgba(10,10,10,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${accent}22;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 0;
  padding: 18px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 12px;
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 300;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-link:hover, .nav-link.active {
  color: ${accent};
}

.blog-hero {
  text-align: center;
  padding: 100px 0 80px;
  position: relative;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 300;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-title::after {
  content: '';
  display: block;
  width: 60px;
  height: 1px;
  background: ${accent};
  margin: 24px auto 0;
}

.hero-description {
  color: ${muted};
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 2px;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.card {
  background: ${isDark ? '#0d0d0d' : '#0f0f0f'};
  border: 1px solid ${accent}22;
  border-radius: 0;
  padding: 28px;
  transition: all 0.4s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-color: ${accent}55;
  box-shadow: 0 0 30px ${accent}11;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px;
  letter-spacing: 1px;
  color: ${accent};
  margin-bottom: 10px;
  font-weight: 400;
  line-height: 1.4;
}

.card-date {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 13px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-size: 12px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 10px 0; border-bottom: 1px solid ${accent}11; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 14px; letter-spacing: 1px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${accent}22; border-radius: 0; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; letter-spacing: 1px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 44px;
  font-weight: 300;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 15px;
  line-height: 1.8;
  letter-spacing: 0.3px;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  font-weight: 400;
  letter-spacing: 2px;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}44; }
.post-content a:hover { border-bottom-color: ${accent}; }
.post-content blockquote { border-left: 1px solid ${accent}; padding-left: 24px; color: ${muted}; margin: 1.5em 0; font-style: italic; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; color: ${accent}; }
.post-content pre { background: ${isDark ? '#0a0a0a' : '#0d0d0d'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${accent}15; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; }

.blog-footer {
  border-top: 1px solid ${accent}22;
  padding: 32px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 16px; padding: 14px 16px; }
  .nav-link { font-size: 11px; letter-spacing: 2px; }
  .hero-title { font-size: 32px; letter-spacing: 3px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; letter-spacing: 2px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getComicCss(isDark: boolean): string {
  const bg = isDark ? '#1a1a2e' : '#fffde7'
  const fg = isDark ? '#ffffff' : '#1a1a1a'
  const muted = isDark ? '#aaaacc' : '#666666'
  const accent = isDark ? '#ff7043' : '#ff5722'
  const accentLight = isDark ? 'rgba(255,112,67,0.15)' : 'rgba(255,87,34,0.12)'
  const cardBg = isDark ? '#252540' : '#fffde7'
  const border = isDark ? '#3a3a5c' : '#1a1a1a'
  const navBg = isDark ? 'rgba(26,26,46,0.9)' : 'rgba(255,253,231,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 3px solid ${fg};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Bangers', cursive;
  font-size: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${fg};
  text-decoration: none;
  border: 2px solid ${fg};
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  background: ${accent};
  color: white;
  border-color: ${accent};
}

.nav-link.active {
  background: ${accent};
  color: white;
  border-color: ${accent};
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, ${accent}08 1px, transparent 1px);
  background-size: 12px 12px;
  pointer-events: none;
}

.hero-title {
  font-family: 'Bangers', cursive;
  font-size: 52px;
  letter-spacing: 3px;
  text-transform: uppercase;
  -webkit-text-stroke: 2px ${fg};
  color: var(--fg);
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  font-size: 16px;
  color: ${muted};
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  border: 3px solid ${fg};
  border-radius: 8px;
  position: relative;
  background: ${cardBg};
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, ${accent}06 1px, transparent 1px);
  background-size: 8px 8px;
  border-radius: 5px;
  pointer-events: none;
}

.card:hover {
  transform: rotate(-1deg) scale(1.02);
  box-shadow: 6px 6px 0 ${fg};
}

.card-title {
  font-family: 'Bangers', cursive;
  font-size: 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 8px;
  line-height: 1.3;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 10px;
  font-weight: 700;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  background: ${accent};
  color: white;
  border-radius: 0;
  padding: 2px 8px;
  font-family: 'Bangers', cursive;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Bangers', cursive; font-size: 36px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
.archive-year { font-family: 'Bangers', cursive; font-size: 20px; color: ${accent}; margin: 32px 0 12px; letter-spacing: 2px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 3px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; font-weight: 700; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; font-weight: 700; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Bangers', cursive; font-size: 36px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Bangers', cursive; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: ${fg}; text-decoration: none; padding: 4px 12px; border: 2px solid ${fg}; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { background: ${accent}; color: white; border-color: ${accent}; }
.tag-posts-title { font-family: 'Bangers', cursive; font-size: 20px; letter-spacing: 1px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Bangers', cursive;
  font-size: 48px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
  font-weight: 700;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Bangers', cursive;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 2px solid ${accent}; }
.post-content a:hover { color: ${fg}; border-bottom-color: ${fg}; }
.post-content blockquote { border-left: 4px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 0; font-weight: 700; }
.post-content pre { background: ${isDark ? '#12122a' : '#fff9c4'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 3px solid ${fg}; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; border: 3px solid ${fg}; }

.blog-footer {
  border-top: 3px solid ${fg};
  padding: 32px;
  text-align: center;
  font-family: 'Bangers', cursive;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Bangers', cursive;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 3px 8px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getSteampunkCss(isDark: boolean): string {
  const bg = isDark ? '#1a1008' : '#f5e6d0'
  const fg = isDark ? '#d4a843' : '#3e2723'
  const muted = isDark ? '#8a7a5a' : '#7a6a5a'
  const accent = isDark ? '#d4a843' : '#b87333'
  const accentLight = isDark ? 'rgba(212,168,67,0.15)' : 'rgba(184,115,51,0.12)'
  const cardBg = isDark ? '#2a1a0a' : '#efe0c8'
  const border = isDark ? '#4a3a1a' : '#c8a878'
  const navBg = isDark ? 'rgba(26,16,8,0.9)' : 'rgba(245,230,208,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Playfair Display', serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 2px solid ${accent}44;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${fg};
  text-decoration: none;
  border: 1px solid ${accent}44;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  background: ${accent}15;
  border-color: ${accent};
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  border-color: ${accent};
  background: ${accent}15;
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 12%;
  top: 30%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid ${accent}44;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(12% + 25px);
  top: calc(30% + 25px);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid ${accent}33;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 700;
  color: ${accent};
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  font-size: 16px;
  color: ${muted};
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  border: 2px solid ${accent}44;
  border-radius: 4px;
  position: relative;
  background: ${cardBg};
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card::before {
  content: '⚙';
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 14px;
  color: ${accent}55;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 ${accent}33;
  border-color: ${accent};
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.3;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 10px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  background: ${accent}20;
  color: ${accent};
  border: 1px solid ${accent}33;
  border-radius: 2px;
  padding: 2px 8px;
  font-size: 12px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.archive-year { font-family: 'Playfair Display', serif; font-size: 20px; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Playfair Display', serif; font-size: 14px; color: ${fg}; text-decoration: none; padding: 4px 12px; border: 1px solid ${accent}44; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { background: ${accent}15; border-color: ${accent}; color: ${accent}; }
.tag-posts-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { color: ${fg}; border-bottom-color: ${fg}; }
.post-content blockquote { border-left: 4px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 2px; }
.post-content pre { background: ${isDark ? '#0d0804' : '#e8d8c0'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${accent}33; border-radius: 4px; }
.post-content img { max-width: 100%; border-radius: 4px; border: 2px solid ${accent}33; }

.blog-footer {
  border-top: 2px solid ${accent}44;
  padding: 32px;
  text-align: center;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 3px 8px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getGothicCss(isDark: boolean): string {
  const bg = isDark ? '#0a0010' : '#1a0a20'
  const fg = isDark ? '#c8b0d0' : '#d0c0e0'
  const muted = isDark ? '#8a7090' : '#9080a0'
  const accent = '#8b0000'
  const accentLight = 'rgba(139,0,0,0.15)'
  const cardBg = isDark ? 'rgba(20,5,30,0.8)' : 'rgba(26,10,32,0.8)'
  const border = isDark ? '#2a1a3a' : '#3a2a4a'
  const navBg = isDark ? 'rgba(10,0,16,0.9)' : 'rgba(26,10,32,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Playfair Display', serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${accent}33;
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${fg};
  text-decoration: none;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 15%;
  top: 10%;
  width: 60px;
  height: 80px;
  border: 2px solid ${accent}33;
  border-bottom: none;
  border-radius: 60px 60px 0 0;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(15% + 20px);
  top: calc(10% + 20px);
  width: 20px;
  height: 40px;
  border: 1px solid ${accent}22;
  border-bottom: none;
  border-radius: 20px 20px 0 0;
}

.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 700;
  color: ${accent};
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  font-size: 16px;
  color: ${muted};
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  background: ${cardBg};
  border: 1px solid ${accent}33;
  border-radius: 0 0 8px 8px;
  position: relative;
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 12px;
  border: 1px solid ${accent}33;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: ${bg};
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px ${accent}22;
  border-color: ${accent}55;
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.3;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 10px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  background: ${accent}25;
  color: ${accent};
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 2px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.archive-year { font-family: 'Playfair Display', serif; font-size: 20px; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: var(--fg); text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Playfair Display', serif; font-size: 36px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Playfair Display', serif; font-size: 14px; color: ${fg}; text-decoration: none; padding: 4px 12px; border: 1px solid ${accent}33; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { background: ${accent}15; border-color: ${accent}; color: ${accent}; }
.tag-posts-title { font-family: 'Playfair Display', serif; font-size: 20px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { color: ${fg}; border-bottom-color: ${fg}; }
.post-content blockquote { border-left: 4px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 2px; }
.post-content pre { background: ${isDark ? '#050008' : '#100818'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${accent}33; border-radius: 4px; }
.post-content img { max-width: 100%; border-radius: 4px; border: 1px solid ${accent}33; }

.blog-footer {
  border-top: 1px solid ${accent}33;
  padding: 32px;
  text-align: center;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 3px 8px; }
  .hero-title { font-size: 36px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getNoirCss(isDark: boolean): string {
  const bg = '#0a0a0a'
  const fg = isDark ? '#e0e0e0' : '#d0d0d0'
  const muted = '#888888'
  const accent = isDark ? '#666666' : '#555555'
  const cardBg = '#1a1a1a'
  const border = '#333333'
  const navBg = 'rgba(10,10,10,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #666;
  text-decoration: none;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #e0e0e0;
}

.nav-link.active {
  color: #e0e0e0;
}

.blog-hero {
  padding: 80px 0 60px;
  text-align: center;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 10px);
  pointer-events: none;
}

.hero-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
  color: ${fg};
  margin-bottom: 16px;
  line-height: 1.1;
}

.hero-description {
  font-size: 16px;
  color: ${muted};
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  background: ${cardBg};
  border-left: 3px solid ${border};
  border-radius: 0;
  position: relative;
  padding: 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  border-left-color: ${fg};
  transform: translateX(2px);
}

.card-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  line-height: 1.3;
  color: #e0e0e0;
}

.card-date {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #555;
  margin-bottom: 10px;
}

.card-excerpt {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  margin-bottom: 12px;
  font-style: italic;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  background: #222;
  color: #888;
  padding: 2px 8px;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-radius: 0;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', system-ui, sans-serif; font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; }
.archive-year { font-family: 'Inter', system-ui, sans-serif; font-size: 20px; color: #666; margin: 32px 0 12px; letter-spacing: 2px; text-transform: uppercase; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: #e0e0e0; text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${fg}; }
.archive-item span { font-size: 12px; color: #555; letter-spacing: 1px; text-transform: uppercase; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', system-ui, sans-serif; font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-family: 'Inter', system-ui, sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #666; text-decoration: none; padding: 4px 12px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: #e0e0e0; }
.tag-posts-title { font-family: 'Inter', system-ui, sans-serif; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 48px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
  margin-bottom: 16px;
  line-height: 1.1;
}

.post-meta {
  font-size: 14px;
  color: #555;
  margin-bottom: 40px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 2em 0 0.5em;
}

.post-content a { color: #e0e0e0; text-decoration: none; border-bottom: 1px solid #555; }
.post-content a:hover { border-bottom-color: #e0e0e0; }
.post-content blockquote { border-left: 3px solid #333; padding: 12px 20px; color: #888; margin: 1.5em 0; font-style: italic; }
.post-content code { background: #1a1a1a; padding: 2px 6px; font-size: 0.9em; border-radius: 0; }
.post-content pre { background: #111; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid #222; border-radius: 0; }
.post-content img { max-width: 100%; border-radius: 0; filter: grayscale(30%); }

.blog-footer {
  border-top: 1px solid #222;
  padding: 32px;
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #555;
  margin-top: 80px;
}

.back-link {
  color: #555;
  text-decoration: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.back-link:hover { color: #e0e0e0; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 11px; padding: 3px 8px; }
  .hero-title { font-size: 32px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 32px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

// ─── Recipe — 「美食博客」──────────────────────────────────
export function getRecipeCss(isDark: boolean): string {
  const bg = isDark ? '#1a1210' : '#fff8f0'
  const fg = isDark ? '#e8d8c8' : '#2c1810'
  const muted = isDark ? '#a09080' : '#8a7060'
  const accent = isDark ? '#ff6b6b' : '#e74c3c'
  const accentLight = isDark ? 'rgba(255,107,107,0.12)' : 'rgba(231,76,60,0.08)'
  const cardBg = isDark ? '#251c18' : '#ffffff'
  const border = isDark ? '#3a2a22' : '#f0e0d0'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Lora', 'Georgia', serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-family: 'Lora', serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: 1px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  background: ${accentLight};
  color: ${accent};
}

.nav-link.active {
  background: ${accent};
  color: white;
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 48px;
  position: relative;
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 12%;
  top: 40%;
  transform: translateY(-50%);
  width: 70px;
  height: 35px;
  border: 3px solid ${accent}33;
  border-radius: 0 0 70px 70px;
}

.blog-hero::after {
  content: '';
  position: absolute;
  right: calc(12% + 20px);
  top: calc(40% - 30px);
  width: 4px;
  height: 30px;
  background: ${accent}33;
  border-radius: 2px;
}

.hero-title {
  font-family: 'Lora', serif;
  font-size: 40px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.card {
  background: ${cardBg};
  border-radius: 16px;
  border: 1px solid ${border};
  overflow: hidden;
  padding: 24px;
  position: relative;
  box-shadow: 0 2px 12px rgba(231,76,60,0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(231,76,60,0.1);
}

.card-title {
  font-family: 'Lora', serif;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${fg};
  letter-spacing: -0.2px;
}

.card-date {
  background: ${accent}10;
  color: ${accent};
  border-radius: 8px;
  padding: 2px 8px;
  display: inline-block;
  font-size: 12px;
  margin-bottom: 12px;
  font-weight: 500;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 8px;
  margin-top: auto;
  flex-wrap: wrap;
}

.card-tag {
  background: #27ae6020;
  color: #27ae60;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Lora', serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; border-left: 3px solid ${accent}; padding-left: 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Lora', serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Lora', serif;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Lora', serif;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px dashed ${accent}; }
.post-content a:hover { border-bottom-style: solid; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; background: ${accentLight}; border-radius: 0 12px 12px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1a1210' : '#fff5ee'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 12px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 12px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .blog-hero::before, .blog-hero::after { display: none; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .card { padding: 20px; }
  .post-title { font-size: 24px; }
  .blog-hero::before, .blog-hero::after { display: none; }
}
`
}

// ─── Timeline — 「时间线」──────────────────────────────────
export function getTimelineCss(isDark: boolean): string {
  const bg = isDark ? '#0d1117' : '#f8f9fa'
  const fg = isDark ? '#c9d1d9' : '#2c3e50'
  const muted = isDark ? '#8b949e' : '#6c757d'
  const accent = isDark ? '#58a6ff' : '#3498db'
  const accentLight = isDark ? 'rgba(88,166,255,0.12)' : 'rgba(52,152,219,0.08)'
  const border = isDark ? '#21262d' : '#dee2e6'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 32px 0 24px;
  text-align: center;
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.3s;
  padding: 6px 12px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
  font-weight: 600;
}

.nav-link.active::after {
  display: none;
}

.blog-hero {
  text-align: center;
  padding: 64px 0 32px;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  line-height: 1.6;
  max-width: 480px;
  margin: 0 auto;
}

.card-grid {
  position: relative;
  padding: 32px 0;
}

.card-grid::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: ${accent}33;
  transform: translateX(-50%);
}

.card {
  position: relative;
  width: 45%;
  margin-left: 55%;
  padding-left: 24px;
  border: none;
  background: none;
  padding-top: 16px;
  padding-bottom: 16px;
  padding-right: 0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.card:nth-child(even) {
  margin-left: 0;
  margin-right: 55%;
  padding-left: 0;
  padding-right: 24px;
  text-align: right;
}

.card::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 20px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${accent};
  border: 2px solid ${bg};
}

.card:nth-child(even)::before {
  left: auto;
  right: -7px;
}

.card:hover {
  transform: scale(1.01);
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${fg};
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${accent};
  font-weight: 600;
  margin-bottom: 8px;
}

.card-excerpt {
  color: ${muted};
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.card:nth-child(even) .card-tags {
  justify-content: flex-end;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  padding: 2px 8px;
  background: ${accentLight};
  border-radius: 10px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.3s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.3s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; border-bottom: 1px solid ${accent}; }
.post-content a:hover { border-bottom-style: dashed; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#161b22' : '#f6f8fa'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 8px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 48px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card { width: 48%; margin-left: 52%; }
  .card:nth-child(even) { margin-right: 52%; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 4px; flex-wrap: wrap; }
  .nav-link { font-size: 12px; padding: 5px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid::before { left: 20px; }
  .card { width: 100%; margin-left: 0; padding-left: 40px; text-align: left; }
  .card:nth-child(even) { margin-right: 0; padding-right: 0; padding-left: 40px; text-align: left; }
  .card::before { left: 14px; }
  .card:nth-child(even)::before { left: 14px; right: auto; }
  .card:nth-child(even) .card-tags { justify-content: flex-start; }
  .post-title { font-size: 24px; }
}
`
}

// ─── Feed — 「社交动态」──────────────────────────────────
export function getFeedCss(isDark: boolean): string {
  const bg = isDark ? '#15202b' : '#f5f8fa'
  const fg = isDark ? '#e7e9ea' : '#14171a'
  const muted = isDark ? '#71767b' : '#536471'
  const accent = isDark ? '#1d9bf0' : '#1da1f2'
  const accentLight = isDark ? 'rgba(29,155,240,0.12)' : 'rgba(29,161,242,0.08)'
  const border = isDark ? '#2f3336' : '#eff3f4'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
}

.blog-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 12px 0;
  text-align: center;
  border-bottom: 1px solid ${border};
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${bg};
}

.blog-header-site {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: ${fg};
  letter-spacing: -0.5px;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px 16px;
  position: relative;
}

.nav-link:hover {
  color: ${accent};
  background: ${accentLight};
  border-radius: 20px;
}

.nav-link.active {
  color: ${accent};
  font-weight: 700;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: ${accent};
  border-radius: 2px;
}

.blog-hero {
  padding: 32px 0 16px;
  text-align: left;
}

.hero-title {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: ${fg};
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  line-height: 1.2;
}

.hero-description {
  color: ${muted};
  font-size: 15px;
  line-height: 1.5;
  max-width: 480px;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 16px;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.card:hover {
  background: ${accent}05;
}

.card-title {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: ${fg};
  line-height: 1.3;
  margin-bottom: 4px;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 6px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.4;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.card-tag {
  background: ${accent}15;
  color: ${accent};
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 32px; color: ${fg}; }
.archive-year { font-size: 14px; font-weight: 700; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 12px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; transition: color 0.2s; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 32px; color: ${fg}; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 6px 16px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: ${fg}; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  line-height: 1.3;
  color: ${fg};
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 32px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3,
.post-content h4, .post-content h5, .post-content h6 {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  margin: 1.5em 0 0.6em;
  color: ${fg};
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding: 12px 20px; color: ${muted}; margin: 1.5em 0; background: ${accentLight}; border-radius: 0 8px 8px 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 4px; color: ${accent}; }
.post-content pre { background: ${isDark ? '#1d2835' : '#f7f9f9'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 8px; }
.post-content pre code { color: ${fg}; background: none; padding: 0; }
.post-content img { max-width: 100%; border-radius: 12px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 32px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .blog-container { max-width: 600px; }
}

@media (max-width: 768px) {
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 2px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 6px 12px; }
  .hero-title { font-size: 20px; }
  .card { padding: 12px; }
  .post-title { font-size: 22px; }
}
`
}

export function getPastelCss(isDark: boolean): string {
  const bg = isDark ? '#1a1520' : '#fef0f2'
  const fg = isDark ? '#d0c8e0' : '#4a4a5a'
  const muted = isDark ? '#9a92aa' : '#8a8a9a'
  const accent = '#ff9ebc'
  const accentLight = isDark ? 'rgba(255,158,188,0.12)' : 'rgba(255,158,188,0.1)'
  const cardBg = isDark ? '#241e2e' : '#ffffff'
  const border = isDark ? '#3a3048' : '#f0d0da'
  const navBg = isDark ? 'rgba(26,21,32,0.85)' : 'rgba(254,240,242,0.85)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Nunito', sans-serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 48px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 0;
  padding: 14px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 20px;
  padding: 6px 16px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  background: ${accent};
  color: white;
}

.blog-hero {
  text-align: center;
  padding: 80px 0 60px;
  position: relative;
  background: linear-gradient(180deg, #ffc1cc15 0%, transparent 100%);
}

.blog-hero::before {
  content: '';
  position: absolute;
  right: 15%;
  top: 20%;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #c9b1ff15;
}

.blog-hero::after {
  content: '';
  position: absolute;
  left: 10%;
  bottom: 15%;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #a0d8ef15;
}

.hero-title {
  font-family: 'Nunito', sans-serif;
  font-size: 44px;
  font-weight: 800;
  color: ${accent};
  letter-spacing: -0.5px;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-description {
  color: ${muted};
  font-size: 16px;
  font-weight: 400;
  max-width: 520px;
  margin: 0 auto;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.card {
  padding: 24px;
  border-radius: 20px;
  border: 1px solid ${border};
  background: ${cardBg};
  box-shadow: 0 2px 12px rgba(255,158,188,0.1);
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  box-shadow: 0 4px 20px rgba(255,158,188,0.2);
  transform: translateY(-2px);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.4;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  margin-bottom: 12px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  background: linear-gradient(135deg, #ffc1cc30, #c9b1ff30);
  color: #9b59b6;
  border-radius: 12px;
  padding: 2px 10px;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 20px; transition: all 0.2s; cursor: pointer; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 40px;
  font-weight: 800;
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 12px; }
.post-content pre { background: ${isDark ? '#1a1520' : '#fff5f7'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 16px; }
.post-content img { max-width: 100%; border-radius: 16px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 20px; }
  .blog-nav { gap: 8px; padding: 10px 12px; flex-wrap: wrap; }
  .nav-link { font-size: 13px; padding: 4px 12px; }
  .hero-title { font-size: 28px; }
  .card-grid { grid-template-columns: 1fr; }
  .post-title { font-size: 28px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

export function getNewsletterCss(isDark: boolean): string {
  const bg = isDark ? '#0d0d0d' : '#ffffff'
  const fg = isDark ? '#e0e0e0' : '#1a1a1a'
  const muted = isDark ? '#888888' : '#666666'
  const accent = isDark ? '#a29bfe' : '#6c5ce7'
  const accentLight = isDark ? 'rgba(162,155,254,0.1)' : 'rgba(108,92,231,0.06)'
  const cardBg = isDark ? '#141414' : '#ffffff'
  const border = isDark ? '#2a2a2a' : '#e8e8e8'
  const navBg = isDark ? 'rgba(13,13,13,0.9)' : 'rgba(255,255,255,0.9)'

  return `
:root {
  --bg: ${bg};
  --fg: ${fg};
  --muted: ${muted};
  --accent: ${accent};
  --accent-light: ${accentLight};
  --card-bg: ${cardBg};
  --border: ${border};
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: Georgia, serif;
  background: ${bg};
  color: ${fg};
  line-height: 1.7;
  min-height: 100vh;
  font-size: 15px;
  padding-top: 64px;
}

.blog-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px;
}

.blog-header {
  padding: 0;
  text-align: center;
  border-bottom: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${navBg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid ${border};
}

.blog-header-site {
  display: none;
}

.blog-nav {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 0;
  padding: 16px 24px;
}

.nav-link {
  color: ${muted};
  text-decoration: none;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px 8px;
}

.nav-link:hover {
  color: ${accent};
}

.nav-link.active {
  color: ${accent};
}

.blog-hero {
  text-align: left;
  padding: 40px 0 24px;
  border-bottom: 1px solid ${border};
  position: relative;
}

.hero-title {
  font-family: Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  color: ${fg};
  line-height: 1.3;
  margin-bottom: 8px;
}

.hero-description {
  font-size: 14px;
  color: ${muted};
  margin-top: 8px;
  font-family: 'Inter', sans-serif;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.card {
  padding: 20px 0;
  border-bottom: 1px solid ${border};
  border-radius: 0;
  background: none;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.card:hover {
  background: ${accentLight};
  padding-left: 8px;
}

.card-title {
  font-family: Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
}

.card-date {
  font-size: 13px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-bottom: 4px;
}

.card-excerpt {
  font-size: 14px;
  color: ${muted};
  line-height: 1.5;
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.card-tag {
  font-size: 11px;
  color: ${accent};
  background: ${accentLight};
  border-radius: 4px;
  padding: 2px 8px;
  font-family: 'Inter', sans-serif;
}

.blog-archive { padding: 48px 0; }
.archive-title { font-size: 24px; font-weight: 700; font-family: Georgia, serif; margin-bottom: 32px; }
.archive-year { font-size: 14px; font-weight: 600; color: ${accent}; font-family: 'Inter', sans-serif; margin: 32px 0 12px; }
.archive-list { list-style: none; }
.archive-item { padding: 8px 0; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
.archive-item a { color: ${fg}; text-decoration: none; font-size: 15px; font-family: Georgia, serif; }
.archive-item a:hover { color: ${accent}; }
.archive-item span { font-size: 12px; color: ${muted}; font-family: 'Inter', sans-serif; }

.blog-tags { padding: 48px 0; }
.tags-title { font-size: 24px; font-weight: 700; font-family: Georgia, serif; margin-bottom: 32px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { font-size: 13px; color: ${muted}; text-decoration: none; padding: 4px 12px; border: 1px solid ${border}; border-radius: 4px; transition: all 0.2s; cursor: pointer; font-family: 'Inter', sans-serif; }
.tag-cloud-item:hover { color: ${accent}; border-color: ${accent}; background: ${accentLight}; }
.tag-posts-title { font-size: 18px; font-weight: 600; font-family: Georgia, serif; margin-bottom: 16px; }

.blog-about, .blog-links, .blog-series { padding: 48px 0; }

.post-title {
  font-size: 28px;
  font-weight: 700;
  font-family: Georgia, serif;
  margin-bottom: 16px;
  line-height: 1.3;
}

.post-meta {
  font-size: 14px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-bottom: 40px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content h6 {
  font-weight: 700;
  font-family: Georgia, serif;
  margin: 2em 0 0.5em;
}

.post-content a { color: ${accent}; text-decoration: none; }
.post-content a:hover { text-decoration: underline; }
.post-content blockquote { border-left: 3px solid ${accent}; padding-left: 20px; color: ${muted}; margin: 1.5em 0; font-style: italic; }
.post-content code { background: ${accentLight}; padding: 2px 6px; font-size: 0.9em; border-radius: 3px; font-family: 'Inter', monospace; }
.post-content pre { background: ${isDark ? '#141414' : '#f8f8f8'}; padding: 20px; overflow-x: auto; margin: 1.5em 0; font-size: 14px; border: 1px solid ${border}; border-radius: 4px; }
.post-content img { max-width: 100%; border-radius: 4px; }

.blog-footer {
  border-top: 1px solid ${border};
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: ${muted};
  font-family: 'Inter', sans-serif;
  margin-top: 80px;
}

.back-link {
  color: ${muted};
  text-decoration: none;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
}

.back-link:hover { color: ${accent}; }

@media (max-width: 1024px) {
  .card-grid { flex-direction: column; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}

@media (max-width: 768px) {
  body { padding-top: 56px; }
  .blog-container { padding: 0 16px; }
  .blog-nav { gap: 16px; padding: 12px 16px; }
  .nav-link { font-size: 13px; }
  .hero-title { font-size: 22px; }
  .card-title { font-size: 16px; }
  .post-title { font-size: 22px; }
  .post-body-layout { grid-template-columns: 1fr; }
  .post-toc { display: none; }
}
`
}

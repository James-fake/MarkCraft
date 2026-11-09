/**
 * 多文件站点 · 主题渲染器（专项：部署站点与预览同源，2026-11-03）
 *
 * 背景：预览走单文件管线（newThemeTemplate / themes），63 主题模板都在那套系统里；
 * 多文件管线（htmlWrapper → getStyles）从不消费 config.themeStyle，只认配色方案 +
 * 明暗 + 字体 —— 部署上去永远"默认样式"（用户实测：宇宙主题部署无效）。
 *
 * 本模块把单文件主题系统的 **DOM 词汇表** 移植到多文件站：
 *   .blog-container > .blog-header > .blog-nav / .page-section(.active) / .blog-footer
 *   首页 .blog-hero + .card-grid > .card · 归档 .archive-year/.archive-item
 *   标签 .tag-cloud/.tag-posts-section · 文章 .post-detail > .post-body-layout(.post-content+.post-toc)
 * 60 个非经典主题（48 生成器 + 12 独立）共用这套类名（已核对 terminal.ts 与
 * newThemeTemplate 完全一致），CSS 由 getThemeStyleCss(themeStyle) 按 themeStyle 出。
 *
 * 与 SPA（单文件包）的差异（有意为之）：
 *   - 链接直出真实 URL（posts/<slug>/index.html），不再 #post/<slug> 哈希路由
 *   - 无 showPage/showView 视图切换 JS；每页只渲染一个 .page-section.active
 *   - 标签页静态化（全部 tag-posts-section 可见，tag-cloud 为页内锚点）
 *   - TOC 用原生锚点跳转（无 scroll-spy JS）
 *
 * ⚠️ Phase 2 债务（收敛单一数据源）：fragments/supportCss 与 newThemeTemplate
 * 的同名实现目前是**平行拷贝**（本模块刻意不 import SPA 内部实现，避免为复用
 * 而重构现役预览路径引入回归）。收敛时：把 fragment 构建器抽到共享模块，
 * SPA 与本模块共同消费，并以上文 DOM 约定清单为回归锚点。
 */

import { BlogConfig, BlogPost } from '../../templates'
import { escapeHtml, escapeAttr, formatDate } from '../../templates/utils'
import { getThemeStyleCss } from '../../themes'
import { generateCustomColorOverrideCss } from '../singleFile/colorSchemes'
import { getMermaidCss, getMermaidScript } from '../singleFile/mermaidHelpers'
import { THEME_NAV_LABELS } from '../singleFile/newThemeTemplate'
import { sanitizeCssFast } from '../cssSanitizer'
import { safeJsonLd } from '../jsonLd'

/** 与 blogMultiFileGenerator.BlogFile 同构（本地定义避免模块循环导入） */
export interface BlogFile {
  path: string
  content: string
}

type BlogLang = 'zh' | 'en'

/** 页面深度 → 站内链接解析器（rootPrefix：'' 根页面 / '../' 一层 / '../../' 两层） */
interface ThemeLinks {
  home: string
  archive: string
  tags: string
  about: string
  links: string
  series: string
  post: (slug: string) => string
}

function makeLinks(rootPrefix: string): ThemeLinks {
  return {
    home: `${rootPrefix}index.html`,
    archive: `${rootPrefix}archive.html`,
    tags: `${rootPrefix}tags.html`,
    about: `${rootPrefix}about.html`,
    links: `${rootPrefix}links.html`,
    series: `${rootPrefix}series/index.html`,
    post: (slug) => `${rootPrefix}posts/${slug}/index.html`,
  }
}

/* ---- 共享支持样式：与 newThemeTemplate 内联 <style> 的支持层一致（Phase 2 收敛）----
 * 变量名与多文件 baseStyles 同源（--accent/--bg-card/--border-color/--text-muted/...），
 * 均带兜底值，两套样式叠加不会裸奔。 */
const SHARED_THEME_UI_CSS = `
.post-body-layout { display: grid; grid-template-columns: 1fr 200px; gap: 32px; align-items: start; }
.post-toc { position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto; padding: 12px 0; font-size: 0.85em; line-height: 1.6; }
.post-toc::-webkit-scrollbar { width: 3px; }
.post-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }
.toc-title { font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted, #888); margin-bottom: 10px; font-size: 0.9em; }
.toc-nav a { display: block; padding: 3px 0; font-size: 0.88em; color: var(--text-muted, #888); transition: color 0.2s; line-height: 1.5; text-decoration: none; }
.toc-nav a.toc-h1 { font-weight: 600; }
.toc-nav a.toc-h3 { padding-left: 12px; }
.toc-nav a.toc-h4 { padding-left: 24px; }
.toc-nav a.toc-h5 { padding-left: 36px; }
.toc-nav a.toc-h6 { padding-left: 48px; }
.toc-nav a:hover { color: var(--accent, #e74c3c); }
.vote-section { display: flex; justify-content: center; align-items: center; gap: 24px; margin: 32px 0; padding: 24px 0; border-top: 1px solid var(--border-color, rgba(128,128,128,0.2)); }
.vote-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: 2px solid var(--border-color, rgba(128,128,128,0.2)); border-radius: 24px; padding: 8px 18px; cursor: pointer; transition: all 0.25s ease; font-size: 14px; color: #888; font-family: inherit; }
.vote-btn:hover { border-color: var(--accent, #e74c3c); background: var(--accent-light, rgba(231,76,60,0.08)); transform: scale(1.05); }
.vote-btn.active.vote-up { border-color: #22c55e; background: rgba(34,197,94,0.1); color: #22c55e; }
.vote-btn.active.vote-down { border-color: #ef4444; background: rgba(239,68,68,0.1); color: #ef4444; }
.vote-icon { font-size: 18px; line-height: 1; }
.vote-count { font-weight: 600; min-width: 12px; text-align: center; }
.about-page { text-align: center; padding: 40px 20px; }
.about-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 24px; object-fit: cover; border: 3px solid var(--accent, #e74c3c); }
.about-name { font-size: 1.8em; font-weight: 700; margin-bottom: 16px; }
.about-bio { font-size: 1.05em; color: var(--text-muted, #888); line-height: 1.8; max-width: 600px; margin: 0 auto 32px; }
.about-skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 32px; }
.about-skill-tag { padding: 6px 16px; border-radius: 20px; background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); font-size: 0.85em; font-weight: 500; }
.about-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.about-contact a { padding: 8px 20px; border-radius: 20px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); font-size: 0.9em; color: var(--text-muted, #888); transition: all 0.2s; }
.friend-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.friend-link-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: var(--radius, 12px); background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; text-decoration: none; }
.friend-link-card:hover { border-color: var(--accent, #e74c3c); transform: translateY(-2px); }
.friend-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.friend-info strong { font-size: 1em; color: var(--text-primary, #333); }
.friend-info p { font-size: 0.85em; color: var(--text-muted, #888); margin-top: 4px; }
.links-title, .series-title { font-size: 1.6em; font-weight: 700; margin-bottom: 24px; }
.series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.series-card { display: flex; gap: 16px; padding: 20px; border-radius: var(--radius, 12px); background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); transition: all 0.25s; }
.series-cover { width: 80px; height: 80px; border-radius: 8px; background: var(--accent-light, rgba(231,76,60,0.08)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.series-icon { font-size: 32px; }
.series-info { flex: 1; min-width: 0; }
.series-info .series-title { font-size: 1.05em; font-weight: 600; margin: 0 0 6px; }
.series-description { font-size: 0.85em; color: var(--text-muted, #888); margin: 0 0 8px; }
.series-meta { font-size: 0.8em; color: var(--text-muted, #888); }
.series-count { background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); padding: 2px 8px; border-radius: 10px; }
.related-posts { margin: 32px 0; padding: 24px 0; border-top: 1px solid var(--border-color, rgba(128,128,128,0.2)); }
.related-title { font-size: 1.1em; font-weight: 600; margin-bottom: 16px; color: var(--text-primary, #333); }
.related-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.related-card { display: block; padding: 16px; border-radius: 8px; background: var(--bg-card, rgba(128,128,128,0.05)); border: 1px solid var(--border-color, rgba(128,128,128,0.2)); text-decoration: none; transition: all 0.2s; }
.related-card:hover { border-color: var(--accent, #e74c3c); transform: translateY(-2px); }
.related-card-title { font-size: 0.95em; font-weight: 500; color: var(--text-primary, #333); margin-bottom: 8px; }
.related-card-meta { display: flex; align-items: center; gap: 8px; font-size: 0.8em; color: var(--text-muted, #888); }
.related-tag { padding: 2px 8px; border-radius: 10px; background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); font-size: 0.85em; }
.admonition { margin: 16px 0; padding: 16px 20px; border-radius: 8px; border-left: 4px solid; font-size: 0.95em; }
.admonition-title { font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.admonition-content { line-height: 1.7; }
.admonition.tip { background: rgba(52,211,153,0.08); border-left-color: #34d399; color: var(--text-primary, #333); }
.admonition.warning { background: rgba(251,191,36,0.08); border-left-color: #fbbf24; color: var(--text-primary, #333); }
.admonition.danger { background: rgba(239,68,68,0.08); border-left-color: #ef4444; color: var(--text-primary, #333); }
.admonition.details { background: var(--bg-card, rgba(128,128,128,0.05)); border-left-color: var(--accent, #e74c3c); }
.breadcrumb { margin-bottom: 16px; font-size: 0.85em; color: var(--text-muted, #888); }
.breadcrumb ol { display: flex; align-items: center; gap: 6px; list-style: none; padding: 0; margin: 0; flex-wrap: wrap; }
.breadcrumb li { display: flex; align-items: center; gap: 6px; }
.breadcrumb li+li::before { content: '/'; color: var(--border-color, rgba(128,128,128,0.3)); }
.breadcrumb a { color: var(--text-muted, #888); text-decoration: none; transition: color 0.2s; }
.breadcrumb a:hover { color: var(--accent, #e74c3c); }
.breadcrumb-current { color: var(--text-primary, #333); }
.not-found-page { text-align: center; padding: 120px 20px; }
.not-found-code { font-size: 8em; font-weight: 900; color: var(--text-muted, #888); opacity: 0.2; line-height: 1; margin-bottom: 16px; }
.not-found-text { font-size: 1.3em; color: var(--text-secondary, #666); margin-bottom: 32px; }
.not-found-link { display: inline-flex; align-items: center; gap: 6px; padding: 10px 24px; border-radius: 24px; background: var(--accent-light, rgba(231,76,60,0.08)); color: var(--accent, #e74c3c); font-weight: 500; font-size: 0.95em; transition: all 0.2s; text-decoration: none; }
.not-found-link:hover { background: var(--accent, #e74c3c); color: #fff; }
.post-content pre { position: relative; }
.code-copy-btn { position: absolute; top: 8px; right: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color, rgba(128,128,128,0.2)); background: var(--bg-card, rgba(128,128,128,0.05)); color: var(--text-muted, #888); font-size: 0.75em; font-family: inherit; cursor: pointer; opacity: 0; transition: all 0.2s ease; }
.post-content pre:hover .code-copy-btn { opacity: 1; }
.code-copy-btn:hover { border-color: var(--accent, #e74c3c); color: var(--accent, #e74c3c); background: var(--accent-light, rgba(231,76,60,0.08)); }
.code-copy-btn.copied { border-color: #22c55e; color: #22c55e; }
.scroll-nav { position: fixed; bottom: 32px; right: 32px; display: flex; flex-direction: column; gap: 8px; z-index: 99; }
.scroll-nav-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border-color, rgba(128,128,128,0.2)); background: var(--bg-card, rgba(128,128,128,0.05)); color: var(--text-muted, #888); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transform: translateY(20px); transition: all 0.3s ease; backdrop-filter: blur(12px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.scroll-nav-btn.visible { opacity: 1; visibility: visible; transform: translateY(0); }
.scroll-nav-btn:hover { border-color: var(--accent, #e74c3c); color: var(--accent, #e74c3c); background: var(--accent-light, rgba(231,76,60,0.08)); transform: translateY(-4px); }
@media (max-width: 1024px) { .post-body-layout { grid-template-columns: 1fr; } .post-toc { display: none; } }
@media (max-width: 768px) { .scroll-nav { bottom: 20px; right: 20px; } .scroll-nav-btn { width: 40px; height: 40px; } }
`

/** 主题装饰差异点（terminal 光标 / ink-wash 印章 / narrative 收尾），与 SPA 同源 */
function themeHeroExtra(themeStyle: string): string {
  return themeStyle === 'terminal' ? '<span class="hero-cursor"></span>' : ''
}
function themeBackLabel(themeStyle: string, lang: BlogLang): string {
  if (themeStyle === 'terminal') return 'cd ..'
  if (themeStyle === 'narrative') return 'Back to Story'
  return lang === 'en' ? 'Back' : '返回'
}

/** 文章阅读时长（与 newThemeTemplate/postTemplate 同口径；Phase 2 收敛） */
function estimateReadingTime(content: string, lang: BlogLang): string {
  const text = content.replace(/<[^>]*>/g, '')
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const minutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200))
  const wordCount = chineseChars + englishWords
  return lang === 'en' ? `~${minutes} min read · ${wordCount} words` : `约 ${minutes} 分钟 · ${wordCount} 字`
}

/** TOC：从内容抽 heading（已有 id 跳过）并注入 id（与 newThemeTemplate 同算法） */
function buildToc(content: string, lang: BlogLang): { contentWithIds: string; tocHtml: string } {
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g
  const items: Array<{ level: number; text: string; id: string; existingId: boolean }> = []
  let m: RegExpExecArray | null
  while ((m = headingRegex.exec(content)) !== null) {
    const level = Number(m[1])
    if (level < 2 || level > 4) continue // 与 SPA 预览一致的目录层级口径（h2-h4）
    const text = m[2].replace(/<[^>]*>/g, '').trim()
    if (!text) continue
    const existing = /id="([^"]*)"/.exec(m[0])
    items.push({ level, text, id: existing ? existing[1] : `heading-${items.length}-${text.slice(0, 24).replace(/\s+/g, '-')}`, existingId: !!existing })
  }
  let contentWithIds = content
  const used = new Set<string>()
  for (const item of items) {
    if (item.existingId) continue
    let finalId = item.id
    let counter = 1
    while (used.has(finalId)) { finalId = `${item.id}-${counter++}` }
    used.add(finalId)
    item.id = finalId
    contentWithIds = contentWithIds.replace(new RegExp(`<h${item.level}(?!\\s+id=)`), `<h${item.level} id="${finalId}"`)
  }
  const tocHtml = items.map(it => `<a href="#${escapeAttr(it.id)}" class="toc-h${it.level}">${escapeHtml(it.text)}</a>`).join('')
  return { contentWithIds, tocHtml: tocHtml ? `<aside class="post-toc"><div class="toc-title">${lang === 'en' ? 'Contents' : '目录'}</div><nav class="toc-nav">${tocHtml}</nav></aside>` : '' }
}

/* ---- 页面外壳：head（fonts + themeCss + 支持层）+ body（.blog-container + 单 section + footer）---- */

interface ShellOpts {
  themeStyle: string
  isDark: boolean
  lang: BlogLang
  config: BlogConfig
  title: string
  description?: string
  /** 当前页对应的高亮导航视图（home/archive/tags/about/links/series），无则不高亮 */
  activeNav?: string
  /** 导航附加项的可见性（about/links/series 由内容决定） */
  showAbout?: boolean
  showLinks?: boolean
  showSeries?: boolean
  hasMermaid?: boolean
  /** 传 JSON 字符串（已构建好的 BlogPosting JSON-LD） */
  jsonLd?: string
  /** og:image 绝对或相对地址 */
  ogImage?: string
  /** 页面到站点根的相对前缀（'' / '../' / '../../'） */
  rootPrefix?: string
}

function themedPage(body: string, opts: ShellOpts): string {
  const { themeStyle, isDark, lang, config } = opts
  const navLabels = THEME_NAV_LABELS[themeStyle] || THEME_NAV_LABELS['ink-wash']
  const nav = { home: navLabels.home[lang], archive: navLabels.archive[lang], tags: navLabels.tags[lang] }
  const links = makeLinks(opts.rootPrefix ?? '')
  const sealChar = escapeHtml(config.siteTitle.charAt(0) || 'B')
  const headerExtra = themeStyle === 'ink-wash' ? `<div class="hero-seal">${sealChar}</div>` : ''
  const footerContent = themeStyle === 'terminal'
    ? `<div class="footer-sys-info">Blog engine v1.0.0 | Uptime: ${new Date().toISOString().split('T')[0]}</div><div class="footer-sys-info">&copy; ${escapeHtml(config.author)} | All rights reserved</div>`
    : themeStyle === 'ink-wash'
      ? `<div class="footer-seal">${sealChar}</div><div class="footer-text">&copy; ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)}</div>`
      : themeStyle === 'narrative'
        ? `<div class="footer-ornament">❖</div><div class="footer-end-mark">The End</div><div class="footer-text">&copy; ${new Date().getFullYear()} ${escapeHtml(config.author)}</div>`
        : `&copy; ${new Date().getFullYear()} ${escapeHtml(config.author)}`

  const navLink = (view: string, href: string, label: string) =>
    `<a class="nav-link${opts.activeNav === view ? ' active' : ''}" href="${escapeAttr(href)}">${escapeHtml(label)}</a>`

  return `<!DOCTYPE html>
<html lang="${escapeAttr(config.language)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)} - ${escapeHtml(config.siteTitle)}</title>
${config.favicon ? `<link rel="icon" href="${escapeAttr(config.favicon)}">` : ''}
${opts.description ? `<meta name="description" content="${escapeAttr(opts.description)}">
<meta property="og:title" content="${escapeAttr(opts.title)}">
<meta property="og:type" content="article">
<meta property="og:description" content="${escapeAttr(opts.description)}">${opts.ogImage ? `
<meta property="og:image" content="${escapeAttr(opts.ogImage)}">` : ''}` : ''}
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Noto+Serif+SC:wght@400;600;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Lora:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Ma+Shan+Zheng&family=Fira+Code:wght@400;500&family=Press+Start+2P&family=Caveat:wght@400;500;600;700&family=Bangers&family=UnifrakturMaguntia&display=swap" rel="stylesheet">
<style>
${getThemeStyleCss(themeStyle, isDark)}
${generateCustomColorOverrideCss(config)}
${SHARED_THEME_UI_CSS}
</style>
${config.customCss ? `<style>${sanitizeCssFast(config.customCss)}</style>` : ''}
${config.customCssDark ? `<style>@media (prefers-color-scheme: dark) {\n${sanitizeCssFast(config.customCssDark)}\n}\n[data-theme="dark"] {\n${sanitizeCssFast(config.customCssDark)}\n}</style>` : ''}
${opts.hasMermaid ? `<style>${getMermaidCss()}</style>` : ''}
${opts.jsonLd || ''}
</head>
<body>
<div class="blog-container">
  <header class="blog-header">
    ${headerExtra}
    <nav class="blog-nav">
      ${navLink('home', links.home, nav.home)}
      ${navLink('archive', links.archive, nav.archive)}
      ${navLink('tags', links.tags, nav.tags)}
      ${opts.showAbout ? navLink('about', links.about, themeStyle === 'terminal' ? 'whoami' : themeStyle === 'narrative' ? 'Author' : (lang === 'en' ? 'About' : '关于')) : ''}
      ${opts.showLinks ? navLink('links', links.links, themeStyle === 'terminal' ? 'cat /etc/hosts' : themeStyle === 'narrative' ? 'Companions' : (lang === 'en' ? 'Links' : '友链')) : ''}
      ${opts.showSeries ? navLink('series', links.series, themeStyle === 'terminal' ? 'ls series/' : themeStyle === 'narrative' ? 'Chapters' : (lang === 'en' ? 'Series' : '系列')) : ''}
    </nav>
  </header>

  <div class="page-section active">
${body}
  </div>

  <footer class="blog-footer">
    ${footerContent}
  </footer>
</div>

<div class="scroll-nav">
  <button class="scroll-nav-btn scroll-to-top" aria-label="Back to top" title="Back to top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7-7"/></svg></button>
  <button class="scroll-nav-btn scroll-to-bottom" aria-label="Go to bottom" title="Go to bottom"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
</div>
<script>(function(){var topBtn=document.querySelector('.scroll-to-top');var btmBtn=document.querySelector('.scroll-to-bottom');function onScroll(){var st=window.pageYOffset||document.documentElement.scrollTop;var sh=document.documentElement.scrollHeight-window.innerHeight;if(topBtn)topBtn.classList.toggle('visible',st>300);if(btmBtn)btmBtn.classList.toggle('visible',st<sh-300);}window.addEventListener('scroll',onScroll,{passive:true});if(topBtn)topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});if(btmBtn)btmBtn.addEventListener('click',function(){window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})});onScroll();})();</script>
<script>(function(){var pres=document.querySelectorAll('.post-content pre');if(!pres.length)return;pres.forEach(function(pre){if(pre.querySelector('.code-copy-btn'))return;var code=pre.querySelector('code');if(!code)return;var btn=document.createElement('button');btn.className='code-copy-btn';btn.textContent='复制';btn.addEventListener('click',function(){var text=code.textContent||code.innerText;navigator.clipboard.writeText(text).then(function(){btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},2000);}).catch(function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');btn.textContent='已复制';btn.classList.remove('copied');},2000);}catch(e){}document.body.removeChild(ta);});});pre.appendChild(btn);});})();</script>
<script>(function(){var imgs=document.querySelectorAll('.post-content img[data-lightbox]');if(!imgs.length)return;var overlay=document.createElement('div');overlay.id='lightbox-overlay';var imgEl=document.createElement('img');overlay.appendChild(imgEl);document.body.appendChild(overlay);imgs.forEach(function(i){i.addEventListener('click',function(){imgEl.src=i.src;overlay.style.display='flex';document.body.style.overflow='hidden';});});overlay.addEventListener('click',function(){overlay.style.display='none';document.body.style.overflow='';});document.addEventListener('keydown',function(e){if(e.key==='Escape'){overlay.style.display='none';document.body.style.overflow='';}});})();</script>
${opts.hasMermaid ? getMermaidScript(isDark) : ''}
${config.enableApplause ? `<script>
function handleVote(btn){
  var slug=btn.getAttribute('data-slug');
  var type=btn.getAttribute('data-type');
  var key='vote_'+slug;
  var cur=localStorage.getItem(key)||'';
  var section=btn.parentElement;
  var upBtn=section.querySelector('.vote-up');
  var downBtn=section.querySelector('.vote-down');
  var upCountEl=upBtn.querySelector('.vote-count');
  var downCountEl=downBtn.querySelector('.vote-count');
  if(cur===type){localStorage.removeItem(key);upBtn.classList.remove('active');downBtn.classList.remove('active');upCountEl.textContent='0';downCountEl.textContent='0';}
  else{localStorage.setItem(key,type);upBtn.classList.toggle('active',type==='up');downBtn.classList.toggle('active',type==='down');upCountEl.textContent=type==='up'?'1':'0';downCountEl.textContent=type==='down'?'1':'0';}
}
</script>` : ''}
${config.enableBusuanzi ? `<script>
(function(){
  document.querySelectorAll('.view-count[data-slug]').forEach(function(el){
    var slug=el.getAttribute('data-slug');
    var key='views_'+slug;
    el.textContent=parseInt(localStorage.getItem(key)||'0');
  });
})();
</script>` : ''}
</body>
</html>`
}

/* ---- 视图片段（DOM 词汇表与 SPA 一致；链接为真实 URL）---- */

function heroSection(config: BlogConfig, themeStyle: string): string {
  return `<section class="blog-hero blog-view view-home">
      <h1 class="hero-title">${escapeHtml(config.siteTitle)}${themeHeroExtra(themeStyle)}</h1>
      <p class="hero-description">${escapeHtml(config.siteDescription)}</p>
    </section>`
}

function cardsSection(published: BlogPost[], links: ThemeLinks, _lang: BlogLang): string {
  const cardsHtml = published.map((post) => {
    const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
    const excerpt = post.description ? escapeHtml(post.description) : escapeHtml(post.content.replace(/<[^>]*>/g, '').trim().slice(0, 160))
    return `<a class="card" href="${escapeAttr(links.post(post.slug))}">
      <div class="card-title">${escapeHtml(post.title)}</div>
      <div class="card-date">${escapeHtml(formatDate(post.date))}${post.author ? ' · ' + escapeHtml(post.author) : ''}</div>
      <div class="card-excerpt">${excerpt}</div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    </a>`
  }).join('')
  return `<section class="blog-home blog-view view-home">
      <div class="card-grid">${cardsHtml}</div>
    </section>`
}

function archiveSection(published: BlogPost[], links: ThemeLinks, themeStyle: string, lang: BlogLang): string {
  const archiveByYear = new Map<string, BlogPost[]>()
  for (const post of published) {
    const year = post.date ? new Date(post.date).getFullYear().toString() : (lang === 'en' ? 'Unknown' : '未知')
    const list = archiveByYear.get(year) || []
    list.push(post)
    archiveByYear.set(year, list)
  }
  const archiveHtml = [...archiveByYear.keys()].sort((a, b) => b.localeCompare(a)).map(year => {
    const items = (archiveByYear.get(year) || []).map(p => `
      <div class="archive-item">
        <a href="${escapeAttr(links.post(p.slug))}">${escapeHtml(p.title)}</a>
        <span class="archive-item-date">${escapeHtml(formatDate(p.date))}</span>
      </div>
    `).join('')
    return `<div class="archive-year">
      <div class="archive-year-title">${escapeHtml(year)}</div>
      ${items}
    </div>`
  }).join('')
  return `<section class="blog-archive blog-view view-archive">
      <div class="archive-title">${themeStyle === 'terminal' ? '$ cat archive' : themeStyle === 'narrative' ? 'Chronicle' : (lang === 'en' ? 'Archive' : '归档')}</div>
      ${archiveHtml}
    </section>`
}

function tagsSection(published: BlogPost[], links: ThemeLinks, themeStyle: string, lang: BlogLang): string {
  const tagMap = new Map<string, BlogPost[]>()
  for (const post of published) {
    for (const tag of post.tags) {
      const list = tagMap.get(tag) || []
      list.push(post)
      tagMap.set(tag, list)
    }
  }
  const sortedTags = [...tagMap.keys()].sort()
  const tagCloudHtml = sortedTags.map(tag => {
    const count = tagMap.get(tag)!.length
    // 静态化：tag-cloud 为页内锚点（SPA 版是 JS 过滤 + void(0)），全部 section 常显
    return `<a class="tag-cloud-item" data-tag="${escapeAttr(tag)}" href="#tag-posts-${escapeAttr(tag)}">${escapeHtml(tag)}${themeStyle === 'terminal' ? '[' + count + ']' : ' (' + count + ')'}</a>`
  }).join('')
  const tagPostsHtml = sortedTags.map(tag => {
    const items = (tagMap.get(tag) || []).map(p => `
      <div class="tag-post-item">
        <a href="${escapeAttr(links.post(p.slug))}">${escapeHtml(p.title)}</a>
        <span class="tag-post-date">${escapeHtml(formatDate(p.date))}</span>
      </div>
    `).join('')
    return `<div class="tag-posts-section" id="tag-posts-${escapeAttr(tag)}">
      <div class="tag-posts-title">${themeStyle === 'terminal' ? '// ' : ''}${escapeHtml(tag)}</div>
      ${items}
    </div>`
  }).join('')
  return `<section class="blog-tags blog-view view-tags">
      <div class="tags-title">${themeStyle === 'terminal' ? '$ grep tags' : themeStyle === 'narrative' ? 'Themes' : (lang === 'en' ? 'Tags' : '标签')}</div>
      <div class="tag-cloud">${tagCloudHtml}</div>
      ${tagPostsHtml}
    </section>`
}

function aboutSection(config: BlogConfig): string {
  const about = config.aboutConfig
  if (!about) return ''
  return `<section class="blog-about">
      <div class="about-page">
        ${about.avatar ? `<img src="${escapeAttr(about.avatar)}" alt="${escapeHtml(config.author)}" class="about-avatar">` : ''}
        <h1 class="about-name">${escapeHtml(config.author)}</h1>
        ${about.bio ? `<div class="about-bio">${escapeHtml(about.bio)}</div>` : ''}
        ${about.skills && about.skills.length > 0 ? `<div class="about-skills">${about.skills.map(s => `<span class="about-skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        ${about.contact && about.contact.length > 0 ? `<div class="about-contact">${about.contact.map(c => `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.label)}</a>`).join('')}</div>` : ''}
      </div>
    </section>`
}

function linksSection(config: BlogConfig, lang: BlogLang): string {
  return `<section class="blog-links">
      <div class="links-title">${lang === 'en' ? 'Friend Links' : '友情链接'}</div>
      <div class="friend-links-grid">${(config.friendLinks || []).map(l => `
        <a href="${escapeAttr(l.url)}" target="_blank" rel="noopener" class="friend-link-card">
          ${l.avatar ? `<img src="${escapeAttr(l.avatar)}" alt="${escapeHtml(l.name)}" class="friend-avatar">` : ''}
          <div class="friend-info">
            <strong>${escapeHtml(l.name)}</strong>
            ${l.description ? `<p>${escapeHtml(l.description)}</p>` : ''}
          </div>
        </a>`).join('')}</div>
    </section>`
}

function seriesListSection(seriesNames: string[], posts: BlogPost[], lang: BlogLang): string {
  return `<section class="blog-series">
      <div class="series-title">📚 ${lang === 'en' ? 'Series' : '系列文章'}</div>
      <div class="series-grid">${seriesNames.map(name => {
        const count = posts.filter(p => p.series === name && !p.draft).length
        return `<div class="series-card">
          <div class="series-cover"><span class="series-icon">📚</span></div>
          <div class="series-info">
            <h3 class="series-title">${escapeHtml(name)}</h3>
            <div class="series-meta"><span class="series-count">${count} ${lang === 'en' ? 'posts' : '篇文章'}</span></div>
          </div>
        </div>`
      }).join('')}</div>
    </section>`
}

function notFoundSection(lang: BlogLang, links: ThemeLinks): string {
  return `<div class="not-found-page">
      <div class="not-found-code">404</div>
      <p class="not-found-text">${lang === 'en' ? 'Page Not Found' : '页面未找到'}</p>
      <a href="${escapeAttr(links.home)}" class="not-found-link">${lang === 'en' ? 'Back to Home' : '返回首页'}</a>
    </div>`
}

function postSection(
  post: BlogPost,
  allPosts: BlogPost[],
  links: ThemeLinks,
  config: BlogConfig,
  themeStyle: string,
  lang: BlogLang,
): string {
  const metaParts: string[] = []
  if (post.date) metaParts.push(escapeHtml(formatDate(post.date)))
  if (post.author) metaParts.push(escapeHtml(post.author))
  metaParts.push(estimateReadingTime(post.content, lang))
  if (config.enableBusuanzi) {
    metaParts.push(`<span class="view-count" data-slug="${escapeAttr(post.slug)}">0</span> ${lang === 'en' ? 'views' : '阅读'}`)
  }

  const { contentWithIds, tocHtml } = buildToc(post.content, lang)

  const tagsHtml = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
  const related = allPosts
    .filter(p => p.slug !== post.slug && !p.draft)
    .map(p => ({ post: p, score: p.tags.filter(t => post.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(item => item.score > 0)
  const relatedHtml = related.length > 0 ? `
<div class="related-posts">
  <h3 class="related-title">${lang === 'en' ? 'Related Posts' : '相关文章'}</h3>
  <div class="related-list">
    ${related.map(item => `
      <a href="${escapeAttr(links.post(item.post.slug))}" class="related-card">
        <div class="related-card-title">${escapeHtml(item.post.title)}</div>
        <div class="related-card-meta">
          <span>${escapeHtml(item.post.date)}</span>
          ${item.post.tags.slice(0, 2).map(t => `<span class="related-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </a>
    `).join('')}
  </div>
</div>
` : ''

  const reward = config.reward?.enable ? `
<div class="reward-section" style="text-align:center;margin:24px 0;padding:20px 0;border-top:1px solid rgba(128,128,128,0.2)"><p style="font-size:14px;margin-bottom:12px;opacity:0.7">${escapeHtml(config.reward.title || (lang === 'en' ? 'Buy me a coffee' : '请我喝杯咖啡'))}</p><div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap">${config.reward.wechatQrcode ? `<div style="text-align:center"><img src="${escapeAttr(config.reward.wechatQrcode)}" alt="WeChat" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${lang === 'en' ? 'WeChat' : '微信'}</p></div>` : ''}${config.reward.alipayQrcode ? `<div style="text-align:center"><img src="${escapeAttr(config.reward.alipayQrcode)}" alt="Alipay" style="width:120px;height:120px;border-radius:8px;object-fit:cover"><p style="font-size:11px;margin-top:4px;opacity:0.6">${lang === 'en' ? 'Alipay' : '支付宝'}</p></div>` : ''}</div></div>` : ''

  return `<div class="post-detail">
        <a href="${escapeAttr(links.home)}" class="back-link">&larr; ${themeBackLabel(themeStyle, lang)}</a>
        <nav class="breadcrumb" aria-label="${lang === 'en' ? 'Breadcrumb' : '面包屑导航'}">
          <ol itemscope itemtype="https://schema.org/BreadcrumbList">
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="${escapeAttr(links.home)}"><span itemprop="name">${lang === 'en' ? 'Home' : '首页'}</span></a><meta itemprop="position" content="1" /></li>
            ${post.category ? `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"><a itemprop="item" href="${escapeAttr(links.tags)}"><span itemprop="name">${escapeHtml(post.category)}</span></a><meta itemprop="position" content="2" /></li>` : ''}
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" class="breadcrumb-current"><span itemprop="name">${escapeHtml(post.title)}</span><meta itemprop="position" content="${post.category ? '3' : '2'}" /></li>
          </ol>
        </nav>
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <div class="post-meta">${metaParts.join(' · ')}</div>
        <div class="post-body-layout">
          <div class="post-content">${contentWithIds}</div>
          ${tocHtml}
        </div>
        ${tagsHtml ? `<div class="post-tags-section">${tagsHtml}</div>` : ''}
        ${relatedHtml}
        ${config.enableApplause ? `<div class="vote-section"><button class="vote-btn vote-up" data-slug="${escapeAttr(post.slug)}" data-type="up" onclick="handleVote(this)"><span class="vote-icon">👍</span><span class="vote-count">0</span></button><button class="vote-btn vote-down" data-slug="${escapeAttr(post.slug)}" data-type="down" onclick="handleVote(this)"><span class="vote-icon">👎</span><span class="vote-count">0</span></button></div>` : ''}
        ${reward}
      </div>`
}

/* ---- 站点装配 ---- */

export interface ThemedSiteInput {
  posts: BlogPost[]
  published: BlogPost[]
  config: BlogConfig
  themeStyle: string
  /** 生成站点的帖子是否含 mermaid（由调用方判断，避免重复扫描） */
  hasMermaid?: boolean
}

export function generateThemedSiteFiles(input: ThemedSiteInput): BlogFile[] {
  const { posts, published, config, themeStyle } = input
  const lang: BlogLang = config.language === 'en' ? 'en' : 'zh'
  const isDark = config.theme === 'dark'
  const hasMermaid = input.hasMermaid ?? posts.some(p => p.content.includes('mermaid-diagram'))
  const files: BlogFile[] = []

  const showAbout = !!config.aboutConfig?.enable
  const showLinks = !!config.friendLinks && config.friendLinks.length > 0
  const seriesNames = [...new Set(published.map(p => p.series).filter((s): s is string => !!s))]
  const showSeries = seriesNames.length > 0

  // 首页（根）
  files.push({
    path: 'index.html',
    content: themedPage(
      `${heroSection(config, themeStyle)}\n${cardsSection(published, makeLinks(''), lang)}`,
      { themeStyle, isDark, lang, config, title: config.siteTitle, description: config.siteDescription, activeNav: 'home', showAbout, showLinks, showSeries, hasMermaid },
    ),
  })

  // 归档（根）
  files.push({
    path: 'archive.html',
    content: themedPage(
      archiveSection(published, makeLinks(''), themeStyle, lang),
      { themeStyle, isDark, lang, config, title: lang === 'en' ? 'Archive' : '归档', activeNav: 'archive', showAbout, showLinks, showSeries, hasMermaid },
    ),
  })

  // 标签（根）
  files.push({
    path: 'tags.html',
    content: themedPage(
      tagsSection(published, makeLinks(''), themeStyle, lang),
      { themeStyle, isDark, lang, config, title: lang === 'en' ? 'Tags' : '标签', activeNav: 'tags', showAbout, showLinks, showSeries, hasMermaid },
    ),
  })

  // 关于（根）
  if (showAbout) {
    files.push({
      path: 'about.html',
      content: themedPage(aboutSection(config), { themeStyle, isDark, lang, config, title: lang === 'en' ? 'About' : '关于', activeNav: 'about', showAbout, showLinks, showSeries, hasMermaid }),
    })
  }

  // 友链（根）
  if (showLinks) {
    files.push({
      path: 'links.html',
      content: themedPage(linksSection(config, lang), { themeStyle, isDark, lang, config, title: lang === 'en' ? 'Links' : '友链', activeNav: 'links', showAbout, showLinks, showSeries, hasMermaid }),
    })
  }

  // 系列列表（series/ 一层深）
  if (showSeries) {
    const linksSeries = makeLinks('../')
    files.push({
      path: 'series/index.html',
      content: themedPage(seriesListSection(seriesNames, published, lang), { themeStyle, isDark, lang, config, title: lang === 'en' ? 'Series' : '系列文章', activeNav: 'series', showAbout, showLinks, showSeries: false, hasMermaid, rootPrefix: '../' }),
    })
    // 系列详情（series/<slug>/ 两层深）：该系列文章列表
    for (const name of seriesNames) {
      const slug = name.toLowerCase().replace(/\s+/g, '-')
      const seriesPosts = published.filter(p => p.series === name)
      const items = seriesPosts.map(p => `
      <div class="archive-item">
        <a href="${escapeAttr(linksSeries.post(p.slug))}">${escapeHtml(p.title)}</a>
        <span class="archive-item-date">${escapeHtml(formatDate(p.date))}</span>
      </div>
    `).join('')
      const body = `<section class="blog-archive">
      <a href="${escapeAttr(linksSeries.series)}" class="back-link">&larr; ${themeBackLabel(themeStyle, lang)}</a>
      <div class="archive-title">📚 ${escapeHtml(name)}</div>
      ${items}
    </section>`
      files.push({
        path: `series/${slug}/index.html`,
        content: themedPage(body, { themeStyle, isDark, lang, config, title: name, activeNav: 'series', showAbout, showLinks, showSeries: false, hasMermaid, rootPrefix: '../../' }),
      })
    }
  }

  // 文章页（posts/<slug>/ 两层深）+ page 布局（<slug>/ 一层深）
  for (const post of published) {
    const isPage = (post.layout || 'post') === 'page'
    const rootPrefix = isPage ? '../' : '../../'
    const links = makeLinks(rootPrefix)
    const section = postSection(post, posts, links, config, themeStyle, lang)
    // ⚠️ 必须走 safeJsonLd（2026-11-03 审查 P0-5）：裸 JSON.stringify 不转义 `<`/`>`，
    //    标题/描述含 `</script>` 会提前闭合脚本块，其后内容成为真实标签 → 访客浏览器执行。
    //    经典路径（seoUtils/htmlTemplate）早已用 safeJsonLd，此处是遗漏。
    const jsonLd = `<script type="application/ld+json">${safeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      author: { '@type': 'Person', name: post.author || config.author },
      publisher: { '@type': 'Organization', name: config.siteTitle },
      ...(post.date ? { datePublished: new Date(post.date).toISOString() } : {}),
      ...(post.description ? { description: post.description } : {}),
      ...(post.coverImage ? { image: post.coverImage } : {}),
    })}</script>`
    files.push({
      path: isPage ? `${post.slug}/index.html` : `posts/${post.slug}/index.html`,
      content: themedPage(section, {
        themeStyle, isDark, lang, config,
        title: post.title,
        description: post.description || config.siteDescription,
        showAbout, showLinks, showSeries, hasMermaid,
        rootPrefix,
        jsonLd,
        ogImage: post.coverImage || post.ogImage || undefined,
      }),
    })
  }

  // 404（根）
  files.push({
    path: '404.html',
    content: themedPage(notFoundSection(lang, makeLinks('')), { themeStyle, isDark, lang, config, title: '404', showAbout, showLinks, showSeries, hasMermaid }),
  })

  return files
}

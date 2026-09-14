import { BlogConfig } from './types'
import { escapeHtml, escapeAttr } from './templateHelpers'
import { generateSeoTags, generateJsonLd } from './seoUtils'
import type { SeoMeta } from './seoUtils'
import { getStyles } from './styleBuilder'
import { sanitizeCssFast } from '../utils/cssSanitizer'
import { getAdmonitionCss } from './extraRenderers'
import { getPwaHeadTags, getPwaRegistrationScript } from './pwaTemplate'

function getAdmonitionStyles(): string {
  return getAdmonitionCss()
}

export function wrapHtml(title: string, body: string, config: BlogConfig, extraClass?: string, seoMeta?: SeoMeta, hasMermaid?: boolean): string {
  const bl: 'zh' | 'en' = config.language === 'en' ? 'en' : 'zh'

  // 默认导航
  const defaultNav = [
    { label: bl === 'en' ? 'Home' : '首页', url: 'index.html' },
    { label: bl === 'en' ? 'Archive' : '归档', url: 'archive.html' },
    { label: bl === 'en' ? 'Tags' : '标签', url: 'tags.html' },
    { label: bl === 'en' ? 'Search' : '搜索', url: 'search.html' },
  ]
  let navLinks: { label: string; url: string }[]
  if (config.navLinks && config.navLinks.length > 0) {
    navLinks = config.navLinks
  } else {
    navLinks = [...defaultNav]
    if (config.aboutConfig?.enable) navLinks.push({ label: bl === 'en' ? 'About' : '关于', url: 'about.html' })
    if (config.friendLinks && config.friendLinks.length > 0) navLinks.push({ label: bl === 'en' ? 'Links' : '友链', url: 'links.html' })
  }
  const navHtml = navLinks.map(l => `<a href="${escapeAttr(l.url)}">${escapeHtml(l.label)}</a>`).join('\n        ')

  // 社交链接
  const socialIcons: Record<string, string> = {
    github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
    twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    email: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>',
    rss: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>',
    zhihu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5.721 0C2.251 0 0 2.25 0 5.719V18.28C0 21.751 2.252 24 5.721 24h12.56C21.751 24 24 21.75 24 18.281V5.72C24 2.249 21.75 0 18.281 0zm1.964 4.078h6.191c.14-.097.328-.281.672-.281.39 0 .609.281.609.281l.14.098s.375.328.375.797c0 .468-.328.797-.328.797l-2.062 2.11h3.14s.328.046.563.28c.234.235.234.563.234.563v.656s.047.328-.234.563c-.281.234-.563.234-.563.234h-3.14l2.062 2.11s.328.328.328.797c0 .468-.375.797-.375.797l-.14.098s-.234.28-.609.28c-.375 0-.672-.28-.672-.28L9.26 10.265l-2.578 2.625s-.297.281-.672.281c-.375 0-.609-.28-.609-.28l-.14-.098s-.375-.328-.375-.797c0-.468.328-.797.328-.797l2.062-2.11H4.11s-.281 0-.563-.234C3.266 8.609 3.22 8.28 3.22 8.28v-.656s0-.328.234-.563c.235-.234.563-.28.563-.28h3.14L5.095 4.671s-.328-.328-.328-.797c0-.468.375-.797.375-.797l.14-.098s.234-.28.609-.28c.375 0 .672.28.672.28z"/></svg>',
    weibo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.583.631.283.822.997.442 1.574zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.307-.363-.168-.596.141-.229.445-.35.681-.246.24.09.315.36.176.589zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.642 4.318-.341 5.132-2.145.8-1.752-.145-3.71-2.161-4.183z"/></svg>',
    bilibili: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 01-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 01.16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg>',
  }
  const socialHtml = config.socialLinks && config.socialLinks.length > 0
    ? `<div class="social-links">${config.socialLinks.map(s =>
        `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.platform)}">${socialIcons[s.platform] || ''}</a>`
      ).join('\n')}</div>`
    : ''

  // 分析统计脚本
  let analyticsScript = ''
  if (config.analytics?.googleAnalyticsId) {
    analyticsScript += `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(config.analytics.googleAnalyticsId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${escapeAttr(config.analytics.googleAnalyticsId)}')</script>`
  }
  if (config.analytics?.baiduTongjiId) {
    analyticsScript += `<script>var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?${escapeAttr(config.analytics.baiduTongjiId)}";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s)})();</script>`
  }
  if (config.enableBusuanzi) {
    analyticsScript += `<script>
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.view-count[data-slug]').forEach(function(el){
    var slug=el.getAttribute('data-slug');
    var key='views_'+slug;
    var count=parseInt(localStorage.getItem(key)||'0')+1;
    localStorage.setItem(key,count.toString());
    el.textContent=count;
  });
});
</script>`
  }
  if (config.enableApplause) {
    analyticsScript += `<script>
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
  if(cur===type){
    localStorage.removeItem(key);
    upBtn.classList.remove('active');
    downBtn.classList.remove('active');
    upCountEl.textContent='0';
    downCountEl.textContent='0';
  }else{
    localStorage.setItem(key,type);
    upBtn.classList.toggle('active',type==='up');
    downBtn.classList.toggle('active',type==='down');
    upCountEl.textContent=type==='up'?'1':'0';
    downCountEl.textContent=type==='down'?'1':'0';
  }
}
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.vote-section').forEach(function(s){
    var btn=s.querySelector('.vote-btn');
    if(!btn)return;
    var slug=btn.getAttribute('data-slug');
    var key='vote_'+slug;
    var cur=localStorage.getItem(key)||'';
    var upBtn=s.querySelector('.vote-up');
    var downBtn=s.querySelector('.vote-down');
    var upCountEl=upBtn.querySelector('.vote-count');
    var downCountEl=downBtn.querySelector('.vote-count');
    if(cur==='up'){upBtn.classList.add('active');upCountEl.textContent='1';downCountEl.textContent='0';}
    else if(cur==='down'){downBtn.classList.add('active');downCountEl.textContent='1';upCountEl.textContent='0';}
  });
});
</script>`
  }

  return `<!DOCTYPE html>
<html lang="${escapeAttr(config.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(config.siteTitle)}</title>
  ${config.favicon ? `<link rel="icon" href="${escapeAttr(config.favicon)}">` : ''}
  ${seoMeta ? generateSeoTags(seoMeta, config) : `<meta name="description" content="${escapeAttr(config.siteDescription)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:site_name" content="${escapeAttr(config.siteTitle)}">
  <meta property="og:type" content="website">
  <meta property="og:description" content="${escapeAttr(config.siteDescription)}">`}
  <link rel="alternate" type="application/rss+xml" title="${escapeAttr(config.siteTitle)}" href="${escapeAttr(config.siteUrl)}/rss.xml">
  <style>${getStyles(config)}</style>
  ${hasMermaid ? `<style>
    .mermaid-diagram { margin: 1.5em 0; text-align: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-card); padding: 20px; overflow-x: auto; }
    .mermaid-diagram .mermaid-spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: mermaid-spin 0.8s linear infinite; margin-bottom: 8px; }
    @keyframes mermaid-spin { to { transform: rotate(360deg); } }
    .mermaid-diagram .mermaid-loading-text { display: block; font-size: 0.85em; color: var(--text-muted); }
    .mermaid-diagram svg { max-width: 100%; height: auto; font-size: 14px !important; }
    .mermaid-diagram svg text { font-size: 14px !important; }
    .mermaid-diagram svg foreignObject { overflow: visible; }
    .mermaid-diagram svg foreignObject div { font-size: 14px !important; line-height: 1.4 !important; }
    .mermaid-diagram svg .mindmap-node text,
    .mermaid-diagram svg g[class*="mindmap"] text,
    .mermaid-diagram svg g[class*="mindmap"] foreignObject div,
    .mermaid-diagram svg g[class*="depth"] text,
    .mermaid-diagram svg g[class*="depth"] foreignObject div,
    .mermaid-diagram svg g.node foreignObject div { font-size: 14px !important; }
    .mermaid-diagram svg foreignObject * { font-size: 14px !important; }
    .mermaid-diagram::first-letter,
    .mermaid-diagram *::first-letter,
    .mermaid-diagram svg::first-letter,
    .mermaid-diagram svg *::first-letter { font-size: inherit !important; float: none !important; line-height: inherit !important; margin: 0 !important; font-weight: inherit !important; font-family: inherit !important; }
  </style>` : ''}
  ${config.customCss ? `<style>${sanitizeCssFast(config.customCss)}</style>` : ''}
  ${config.customCssDark ? `<style>@media (prefers-color-scheme: dark) {\n${sanitizeCssFast(config.customCssDark)}\n}\n[data-theme="dark"] {\n${sanitizeCssFast(config.customCssDark)}\n}</style>` : ''}
  ${config.customMeta ? config.customMeta : ''}
  ${seoMeta ? generateJsonLd(seoMeta, config) : ''}
  ${analyticsScript}
  <style>${getAdmonitionStyles()}</style>
  ${config.enablePwa ? getPwaHeadTags(config) : ''}
</head>
<body>
  <div id="reading-progress" class="reading-progress"></div>
  <header class="site-header">
    <div class="header-inner">
      <div class="site-title"><a href="index.html">${escapeHtml(config.siteTitle)}</a></div>
      <nav class="site-nav">
        ${navHtml}
      </nav>
    </div>
  </header>
  <div class="${extraClass || 'main-content'}">
${body}
  </div>
  <footer class="site-footer">
    ${socialHtml}
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(config.author)} &middot; Powered by MarkCraft</p>
  </footer>
  ${hasMermaid ? `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
(function(){
  mermaid.initialize({ startOnLoad: false, theme: '${config.theme === 'dark' ? 'dark' : 'default'}', securityLevel: 'loose', flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }, sequence: { useMaxWidth: true }, mindmap: { padding: 16, useMaxWidth: true } });
  function renderDiagrams(){var ds=document.querySelectorAll('.mermaid-diagram:not([data-rendered])');if(!ds.length)return;var i=0;function next(){if(i>=ds.length)return;var d=ds[i];i++;var c=d.dataset.code;if(!c){next();return;}var code;try{code=decodeURIComponent(escape(atob(c)));}catch(e){code=d.textContent||'';}code=code.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");var id='mermaid-svg-'+Date.now().toString(36)+Math.random().toString(36).substr(2,6);mermaid.render(id,code).then(function(r){d.innerHTML=r.svg;d.setAttribute('data-rendered','true');next();}).catch(function(){d.innerHTML='<div style="padding:1rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.5rem;font-size:0.875rem;"><strong>Diagram render error</strong></div>';d.setAttribute('data-rendered','true');try{var el=document.getElementById('d'+id);if(el)el.remove();}catch(e){}next();});}next();}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',renderDiagrams);}else{renderDiagrams();}
})();
</script>` : ''}
  <div class="scroll-nav">
    <button class="scroll-nav-btn scroll-to-top" aria-label="${bl === 'en' ? 'Back to top' : '回到顶部'}" title="${bl === 'en' ? 'Back to top' : '回到顶部'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    <button class="scroll-nav-btn scroll-to-bottom" aria-label="${bl === 'en' ? 'Go to bottom' : '前往底部'}" title="${bl === 'en' ? 'Go to bottom' : '前往底部'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
  </div>
  <script>(function(){var bar=document.getElementById('reading-progress');var topBtn=document.querySelector('.scroll-to-top');var btmBtn=document.querySelector('.scroll-to-bottom');function onScroll(){var st=window.pageYOffset||document.documentElement.scrollTop;var dh=document.documentElement.scrollHeight-document.documentElement.clientHeight;if(bar){bar.style.width=(dh>0?(st/dh)*100:0)+'%';}if(topBtn)topBtn.classList.toggle('visible',st>300);if(btmBtn)btmBtn.classList.toggle('visible',st<dh-300);}window.addEventListener('scroll',onScroll,{passive:true});if(topBtn)topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});if(btmBtn)btmBtn.addEventListener('click',function(){window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})});onScroll();})();</script>
  <script>(function(){var pres=document.querySelectorAll('.post-content pre');if(!pres.length)return;pres.forEach(function(pre){if(pre.querySelector('.code-copy-btn'))return;var code=pre.querySelector('code');if(!code)return;var btn=document.createElement('button');btn.className='code-copy-btn';btn.textContent='Copy';btn.addEventListener('click',function(){var text=code.textContent||code.innerText;navigator.clipboard.writeText(text).then(function(){btn.textContent='Copied';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copy';btn.classList.remove('copied');},2000);}).catch(function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');btn.textContent='Copied';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copy';btn.classList.remove('copied');},2000);}catch(e){}document.body.removeChild(ta);});});pre.appendChild(btn);});})();</script>
  <script>(function(){var imgs=document.querySelectorAll('.post-content img[data-lightbox]');if(!imgs.length)return;var overlay=document.createElement('div');overlay.id='lightbox-overlay';var imgEl=document.createElement('img');overlay.appendChild(imgEl);document.body.appendChild(overlay);imgs.forEach(function(i){i.addEventListener('click',function(){imgEl.src=i.src;overlay.style.display='flex';document.body.style.overflow='hidden';});});overlay.addEventListener('click',function(){overlay.style.display='none';document.body.style.overflow='';});document.addEventListener('keydown',function(e){if(e.key==='Escape'){overlay.style.display='none';document.body.style.overflow='';}});})();</script>
  <script>(function(){document.addEventListener('click',function(e){if(e.target.tagName==='IMG'&&e.target.closest('.post-content')&&!e.target.closest('.mermaid')){var o=document.createElement('div');o.className='lightbox-overlay';var img=document.createElement('img');img.src=e.target.src;img.alt=e.target.alt||'';o.appendChild(img);o.onclick=function(){document.body.removeChild(o)};document.body.appendChild(o);}});document.addEventListener('keydown',function(e){if(e.key==='Escape'){var o=document.querySelector('.lightbox-overlay');if(o)document.body.removeChild(o)}});})();</script>
  ${config.enablePwa ? getPwaRegistrationScript() : ''}
</body>
</html>`
}

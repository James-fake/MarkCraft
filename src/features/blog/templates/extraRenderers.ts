import { BlogPost } from './types'

/**
 * Pre-process admonition blocks (:::tip, :::warning, :::danger, :::details)
 * from raw markdown BEFORE marked.parse(). Replace them with HTML directly.
 * This follows the same pattern as mermaid block extraction.
 */
export function extractAdmonitionsFromMarkdown(markdown: string, lang: 'zh' | 'en' = 'zh'): {
  markdown: string
  hasAdmonition: boolean
} {
  let hasAdmonition = false

  const titleMap: Record<string, { zh: string; en: string; icon: string }> = {
    tip: { zh: '提示', en: 'Tip', icon: '💡' },
    warning: { zh: '注意', en: 'Warning', icon: '⚠️' },
    danger: { zh: '危险', en: 'Danger', icon: '🚫' },
    details: { zh: '详情', en: 'Details', icon: '📌' },
  }

  // Match :::type [optional title]\n...content...\n:::
  const admonitionRegex = /^:::(tip|warning|danger|details)(?:\s+(.*?))?\n([\s\S]*?)\n:::/gm

  const modifiedMarkdown = markdown.replace(admonitionRegex, (_match, type: string, customTitle: string | undefined, content: string) => {
    hasAdmonition = true
    const info = titleMap[type]
    if (!info) return _match

    const title = customTitle || info[lang] || info.en
    const iconStr = info.icon

    if (type === 'details') {
      return `\n\n<details class="admonition details"><summary class="admonition-title">${iconStr} ${escapeAdmonitionHtml(title)}</summary><div class="admonition-content">${content}</div></details>\n\n`
    }

    return `\n\n<div class="admonition ${type}"><div class="admonition-title">${iconStr} ${escapeAdmonitionHtml(title)}</div><div class="admonition-content">${content}</div></div>\n\n`
  })

  return { markdown: modifiedMarkdown, hasAdmonition }
}

function escapeAdmonitionHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Generate admonition CSS for blog HTML.
 */
export function getAdmonitionCss(): string {
  return `
    .admonition{margin:16px 0;padding:16px 20px;border-radius:8px;border-left:4px solid;font-size:0.95em}
    .admonition-title{font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .admonition-content{line-height:1.7}
    .admonition-content p:first-child{margin-top:0}
    .admonition-content p:last-child{margin-bottom:0}
    .admonition.tip{background:rgba(52,211,153,0.08);border-left-color:#34d399;color:var(--text-primary)}
    .admonition.tip .admonition-title{color:#34d399}
    .admonition.warning{background:rgba(251,191,36,0.08);border-left-color:#fbbf24;color:var(--text-primary)}
    .admonition.warning .admonition-title{color:#fbbf24}
    .admonition.danger{background:rgba(239,68,68,0.08);border-left-color:#ef4444;color:var(--text-primary)}
    .admonition.danger .admonition-title{color:#ef4444}
    .admonition.details{background:var(--bg-card,rgba(128,128,128,0.05));border-left-color:var(--accent,#e74c3c)}
    .admonition.details .admonition-title{cursor:pointer;color:var(--accent,#e74c3c)}
    .admonition.details .admonition-content{padding-top:8px}
  `
}

export function hasMermaid(post: BlogPost): boolean {
  return post.content.includes('mermaid-diagram') || /```mermaid/.test(post.rawContent) || /```mindmap/.test(post.rawContent)
}

export function hasMath(post: BlogPost): boolean {
  return /\$\$[\s\S]*?\$\$/.test(post.rawContent) || /\$[^$]+\$/.test(post.rawContent) || /\\\[/.test(post.rawContent) || /\\\(/.test(post.rawContent)
}

export function getMermaidScript(isDark?: boolean): string {
  return `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
(function(){
  mermaid.initialize({ startOnLoad: false, theme: '${isDark ? 'dark' : 'default'}', securityLevel: 'loose', themeVariables: { fontSize: '14px' }, flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }, sequence: { useMaxWidth: true }, mindmap: { padding: 16, useMaxWidth: true, maxNodeWidth: 200 } });
  function renderDiagrams(){var ds=document.querySelectorAll('.mermaid-diagram:not([data-rendered])');if(!ds.length)return;var i=0;function next(){if(i>=ds.length)return;var d=ds[i];i++;var c=d.dataset.code;if(!c){next();return;}var code;try{code=decodeURIComponent(escape(atob(c)));}catch(e){code=d.textContent||'';}code=code.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");var id='mermaid-svg-'+Date.now().toString(36)+Math.random().toString(36).substr(2,6);mermaid.render(id,code).then(function(r){var svg=r.svg.replace(/font-size\\s*:\\s*\\d+(\\.\\d+)?px/gi,'font-size:14px');d.innerHTML=svg;d.setAttribute('data-rendered','true');next();}).catch(function(){d.innerHTML='<div style="padding:1rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.5rem;font-size:0.875rem;"><strong>Diagram render error</strong></div>';d.setAttribute('data-rendered','true');try{var el=document.getElementById('d'+id);if(el)el.remove();}catch(e){}next();});}next();}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',renderDiagrams);}else{renderDiagrams();}
})();
</script>`
}

export function getKaTeXScript(): string {
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css"><script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"></script><script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"></script><script>renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});</script>`
}

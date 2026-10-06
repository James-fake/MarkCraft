/**
 * Mermaid diagram helpers — extract, inject, script, and CSS for mermaid diagrams
 */

/**
 * Extract mermaid/mindmap code blocks from raw markdown BEFORE marked.parse().
 * Replace them with text placeholders that will survive marked parsing.
 * This bypasses the marked renderer chain entirely, avoiding conflicts with
 * markedHighlight and other global renderer overrides.
 */
export function extractMermaidFromMarkdown(markdown: string): {
  markdown: string
  mermaidBlocks: Array<{ lang: string; code: string }>
} {
  const mermaidBlocks: Array<{ lang: string; code: string }> = []
  // Match ```mermaid or ```mindmap fenced code blocks
  const codeBlockRegex = /```(mermaid|mindmap)\s*\n([\s\S]*?)\n\s*```/g
  let idx = 0
  const modifiedMarkdown = markdown.replace(codeBlockRegex, (_match, lang, code) => {
    mermaidBlocks.push({ lang, code: code.trim() })
    // Use a unique text placeholder that marked will render as a <p> element
    const placeholder = `\n\nMERMAID_PLACEHOLDER_${idx}\n\n`
    idx++
    return placeholder
  })
  return { markdown: modifiedMarkdown, mermaidBlocks }
}

/**
 * Replace mermaid placeholders in the parsed HTML with mermaid diagram containers.
 * The placeholders were inserted by extractMermaidFromMarkdown before parsing.
 */
export function injectMermaidContainers(
  html: string,
  mermaidBlocks: Array<{ lang: string; code: string }>
): { html: string; hasMermaid: boolean } {
  let hasMermaid = false
  let result = html
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i]
    // marked renders the placeholder as <p>MERMAID_PLACEHOLDER_N</p>
    const placeholderRegex = new RegExp(
      `<p>\\s*MERMAID_PLACEHOLDER_${i}\\s*</p>`,
      'g'
    )
    if (placeholderRegex.test(result)) {
      hasMermaid = true
      const encodedCode = btoa(unescape(encodeURIComponent(block.code)))
      const replacement = `<div class="mermaid-diagram" id="mermaid-diagram-${i + 1}" data-code="${encodedCode}"><div class="mermaid-spinner"></div><span class="mermaid-loading-text">${block.lang === 'mindmap' ? '🧠' : '📊'} Rendering...</span></div>`
      result = result.replace(placeholderRegex, replacement)
    }
  }
  return { html: result, hasMermaid }
}

/**
 * Generate mermaid.js script tag and rendering code for blog HTML.
 */
export function getMermaidScript(isDark: boolean): string {
  return `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
<script>
(function(){
  mermaid.initialize({
    startOnLoad: false,
    theme: '${isDark ? 'dark' : 'default'}',
    securityLevel: 'strict',
    themeVariables: { fontSize: '14px' },
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true },
    mindmap: { padding: 16, useMaxWidth: true, maxNodeWidth: 200 }
  });
  function renderDiagrams() {
    var diagrams = document.querySelectorAll('.mermaid-diagram:not([data-rendered])');
    if (diagrams.length === 0) return;
    var idx = 0;
    function renderNext() {
      if (idx >= diagrams.length) return;
      var diagram = diagrams[idx];
      idx++;
      var encodedCode = diagram.dataset.code;
      if (!encodedCode) { renderNext(); return; }
      var code;
      try { code = decodeURIComponent(escape(atob(encodedCode))); } catch(e) { code = diagram.textContent || ''; }
      code = code.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
      var id = 'mermaid-svg-' + Date.now().toString(36) + Math.random().toString(36).substr(2,6);
      mermaid.render(id, code).then(function(result) {
        // Replace all font-size declarations in the SVG string before inserting
        // mermaid mindmap uses large inline font-size for root nodes
        // 将 mermaid 导出的内联 font-size 统一收敛为 14px（匹配 空白:空白+数字[.数字]px）
        var svg = result.svg.replace(/font-size[ \t\r\n\f]*:[ \t\r\n\f]*[0-9]+(?:[.][0-9]+)?px/gi, 'font-size:14px');
        // 安全兜底：strict 模式已禁用内嵌 HTML/事件处理器，再对 SVG 跑一次 DOMPurify
        var svgSafe = (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } }) : svg);
        diagram.innerHTML = svgSafe;
        diagram.setAttribute('data-rendered', 'true');
        renderNext();
      }).catch(function(err) {
        diagram.innerHTML = '<div style="padding:1rem;color:#e74c3c;background:rgba(231,76,60,0.1);border-radius:0.5rem;font-size:0.875rem;"><strong>Diagram render error</strong></div>';
        diagram.setAttribute('data-rendered', 'true');
        try { var el = document.getElementById('d' + id); if (el) el.remove(); } catch(e) {} // 导出博客运行时：best-effort，静默降级
        renderNext();
      });
    }
    renderNext();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderDiagrams);
  } else {
    renderDiagrams();
  }
  // Re-render when navigating to a post page
  var origShowPage = window.showPage;
  if (origShowPage) {
    window.showPage = function(pageId) {
      origShowPage(pageId);
      setTimeout(renderDiagrams, 150);
    };
  }
})();
</script>`
}

/**
 * Generate mermaid CSS for blog HTML.
 */
export function getMermaidCss(): string {
  return `
    .mermaid-diagram {
      margin: 1.5em 0;
      text-align: center;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      padding: 20px;
      overflow-x: auto;
    }
    .mermaid-diagram .mermaid-spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-warm);
      border-radius: 50%;
      animation: mermaid-spin 0.8s linear infinite;
      margin-bottom: 8px;
    }
    @keyframes mermaid-spin { to { transform: rotate(360deg); } }
    .mermaid-diagram .mermaid-loading-text {
      display: block;
      font-size: 0.85em;
      color: var(--text-muted);
    }
    .mermaid-diagram svg {
      max-width: 100%;
      height: auto;
      font-size: 14px !important;
    }
    .mermaid-diagram svg text {
      font-size: 14px !important;
    }
    .mermaid-diagram svg foreignObject {
      overflow: visible;
    }
    .mermaid-diagram svg foreignObject div {
      font-size: 14px !important;
      line-height: 1.4 !important;
    }
    /* Override mermaid mindmap node font sizes at all depths */
    .mermaid-diagram svg .mindmap-node > g > text,
    .mermaid-diagram svg .mindmap-node text,
    .mermaid-diagram svg g[class*="mindmap"] text,
    .mermaid-diagram svg g[class*="mindmap"] foreignObject div,
    .mermaid-diagram svg g[class*="depth"] text,
    .mermaid-diagram svg g[class*="depth"] foreignObject div,
    .mermaid-diagram svg g.node > g text,
    .mermaid-diagram svg g.node foreignObject div {
      font-size: 14px !important;
    }
    /* Force all foreignObject content in mermaid to same size */
    .mermaid-diagram svg foreignObject * {
      font-size: 14px !important;
    }
    /* Reset ::first-letter from .post-content p:first-of-type rule */
    .mermaid-diagram::first-letter,
    .mermaid-diagram *::first-letter,
    .mermaid-diagram svg::first-letter,
    .mermaid-diagram svg *::first-letter {
      font-size: inherit !important;
      float: none !important;
      line-height: inherit !important;
      margin: 0 !important;
      font-weight: inherit !important;
      font-family: inherit !important;
    }
  `
}

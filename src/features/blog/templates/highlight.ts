import hljs from 'highlight.js/lib/core'

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)

function hljsEscapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function highlightCode(code: string, language?: string): string {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language }).value
    } catch { /* fallback */ }
  }
  try {
    return hljs.highlightAuto(code).value
  } catch {
    return hljsEscapeHtml(code)
  }
}

export function getHighlightStyles(isDark: boolean): string {
  if (isDark) {
    return `
      .hljs { color: #e6edf3; background: transparent; }
      .hljs-keyword, .hljs-selector-tag { color: #ff7b72; }
      .hljs-string, .hljs-addition { color: #a5d6ff; }
      .hljs-number, .hljs-literal { color: #79c0ff; }
      .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
      .hljs-function .hljs-title { color: #d2a8ff; }
      .hljs-title { color: #d2a8ff; }
      .hljs-params { color: #e6edf3; }
      .hljs-built_in { color: #ffa657; }
      .hljs-type, .hljs-class .hljs-title { color: #ffa657; }
      .hljs-variable, .hljs-template-variable { color: #ffa657; }
      .hljs-attr { color: #79c0ff; }
      .hljs-selector-class { color: #7ee787; }
      .hljs-selector-id { color: #ffa657; }
      .hljs-meta { color: #8b949e; }
      .hljs-deletion { color: #ffa198; background: rgba(248,81,73,0.1); }
    `
  }
  return `
    .hljs { color: #24292e; background: transparent; }
    .hljs-keyword, .hljs-selector-tag { color: #d73a49; }
    .hljs-string, .hljs-addition { color: #032f62; }
    .hljs-number, .hljs-literal { color: #005cc5; }
    .hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
    .hljs-function .hljs-title { color: #6f42c1; }
    .hljs-title { color: #6f42c1; }
    .hljs-params { color: #24292e; }
    .hljs-built_in { color: #e36209; }
    .hljs-type, .hljs-class .hljs-title { color: #e36209; }
    .hljs-variable, .hljs-template-variable { color: #e36209; }
    .hljs-attr { color: #005cc5; }
    .hljs-selector-class { color: #22863a; }
    .hljs-selector-id { color: #e36209; }
    .hljs-meta { color: #6a737d; }
    .hljs-deletion { color: #b31d28; background: rgba(248,81,73,0.1); }
  `
}

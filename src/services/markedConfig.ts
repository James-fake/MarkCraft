/**
 * Marked global configuration
 *
 * Initializes marked with GFM, line breaks, footnote support,
 * and highlight.js syntax highlighting.
 *
 * This module must be imported once at app startup (App.tsx)
 * before any marked.parse() calls.
 */
import { marked, type Tokens } from 'marked'
import { markedHighlight } from 'marked-highlight'
import markedFootnote from 'marked-footnote'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

marked.use({ gfm: true, breaks: true })

marked.use(markedFootnote())

// 块级引用/嵌入 token：marked 的 Tokens.Generic 带 `[index: string]: any` 索引签名，
// 故自定义字段（isEmbed/inner）在此用 BlockRefToken 显式定型，消除 tokenizer 的 `as any` 与 renderer 的 `token: any`。
interface BlockRefToken {
  type: string
  raw: string
  isEmbed: boolean
  inner: string
}

// P1.1 块级引用渲染：((id)) / ((id|alias)) / !((id))
marked.use({
  extensions: [
    {
      name: 'blockReference',
      level: 'inline',
      start(src: string) { return src.indexOf('((') },
      tokenizer(src: string) {
        // !((id)) 块嵌入 或 ((id)) / ((id|alias)) 块引用
        const match = /^(!?)\(\(([^)]+)\)\)/.exec(src)
        if (match) {
          return {
            type: 'blockReference',
            raw: match[0],
            isEmbed: match[1] === '!',
            inner: match[2],
          }
        }
        return undefined
      },
      renderer(token: Tokens.Generic) {
        const t = token as unknown as BlockRefToken
        const inner = t.inner || ''
        const parts = inner.split('|')
        const blockId = parts[0].trim()
        const alias = parts.length > 1 ? parts.slice(1).join('|').trim() : ''
        if (t.isEmbed) {
          // 块嵌入：渲染为引用块占位，由前端 JS 解析替换
          return `<blockquote class="block-embed" data-block-id="${escapeHtml(blockId)}" data-embed="true"><span class="block-embed-loading">加载中: ${escapeHtml(blockId)}</span></blockquote>`
        }
        const displayText = alias || blockId
        return `<a class="block-reference" data-block-id="${escapeHtml(blockId)}" href="#block-${escapeHtml(blockId)}">${escapeHtml(displayText)}</a>`
      },
    },
  ],
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      // Skip mermaid/mindmap/plantuml code blocks — highlight.js would
      // escape > to &gt; and break diagram rendering
      if (lang === 'mermaid' || lang === 'mindmap' || lang === 'plantuml' || lang === 'puml') {
        return code
      }
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

export { marked }

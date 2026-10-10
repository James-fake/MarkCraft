import { useMemo } from 'react'
import { marked } from 'marked'
import type { Token } from 'marked'
import { getFlatHeadingList, generateHeadingId } from '@utils/headingIdUtils'
import { useLanguage } from '../stores/LanguageStore'
import { useMathRender } from './useMathRender'
import { logger } from '../utils/logger'
import { renderMarkdown } from '@services/sanitizeHtml'
import { preprocessCustomSyntax } from '@core/markdown/customSyntax'

export function useMarkdownRenderer(localContent: string, textToStorage: (markdown: string) => string) {
  const { t } = useLanguage()

  const baseHtml = useMemo(() => {
    try {
      const contentForPreview = textToStorage(localContent)
      const headings = getFlatHeadingList(contentForPreview)
      let headingIndex = 0

      const renderer = new marked.Renderer()

      renderer.heading = function({ text, depth, tokens }: { text: string; depth: number; tokens?: Token[] }) {
        headingIndex++
        const id = headingIndex <= headings.length ? headings[headingIndex - 1].id : generateHeadingId(text)
        const content = tokens ? this.parser.parseInline(tokens) : text
        return `<h${depth} id="${id}" class="heading-link">${content}</h${depth}>\n`
      }
      renderer.code = function({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
        const cls = lang ? `hljs language-${lang}` : 'hljs language-plaintext'
        return `<pre><code class="${cls}">${text}</code></pre>\n`
      }

      // ⚠️ 必须先走自定义语法预处理，再交给 marked：
      //    marked 不认识本项目的方言（==高亮|red== / ++下划线|red++ / ~下标~ / ^上标^ /
      //    %%注释%% / [[双链]] / ((块引用)) / callout 等），不做预处理就会**原样显示**
      //    （真实事故 2026-10-10：所见即所得里正常，切到预览却显示 ++文本|red++）。
      //    与 features/editor/mdToHtml.ts 共用同一份规则（@core/markdown/customSyntax）。
      // M-1：经统一闸门 renderMarkdown（marked 解析 + DOMPurify 净化）。
      let html = renderMarkdown(preprocessCustomSyntax(contentForPreview), { renderer })

      html = html.replace(
        /<pre><code[^>]*class="[^"]*language-(mermaid|mindmap)[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
        (_match, _lang, code) => {
          const diagramId = `mermaid-${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 12)}`}`
          const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
          const encodedCode = btoa(unescape(encodeURIComponent(decodedCode)))
          return `<div class="mermaid-diagram mermaid-loading" id="${diagramId}" data-code="${encodedCode}"><div class="mermaid-spinner"></div><span class="mermaid-loading-text">${_lang === 'mindmap' ? '🧠' : '📊'} Rendering...</span></div>`
        }
      )

      // E3：PlantUML 代码块 → 占位容器，由 PlantUmlRenderer 异步拉取 SVG。
      // 必须排在通用代码块替换之前，否则会被包成普通 <pre>。
      html = html.replace(
        /<pre><code[^>]*class="[^"]*language-(plantuml|puml)[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
        (_match, _lang, code) => {
          const diagramId = `plantuml-${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 12)}`}`
          const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
          const encodedCode = btoa(unescape(encodeURIComponent(decodedCode)))
          return `<div class="plantuml-diagram plantuml-loading" id="${diagramId}" data-code="${encodedCode}"><div class="mermaid-spinner"></div><span class="mermaid-loading-text">🌱 Rendering...</span></div>`
        }
      )

      html = html.replace(
        /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
        (_match, classes, code) => {
          const langMatch = classes?.match(/language-(\w+)/)
          const lang = langMatch ? langMatch[1] : ''
          const lineCount = (code.match(/\n/g) || []).length + 1
          const isLong = lineCount > 10
          const collapsedStyle = isLong ? ' style="max-height:150px"' : ''

          const lineNumbers = code
            .split('\n')
            .map((_line: string, i: number) => `<span class="code-line-no">${i + 1}</span>`)
            .join('')

          return `<div class="code-block-wrapper${isLong ? ' code-block-collapsed' : ''}">
  <div class="code-block-header" contenteditable="false">
    <span class="code-block-lang">${lang || 'CODE'}</span>
    <div class="code-block-actions">
      <button class="code-copy-btn" title="${t.preview.copyCode}">${t.preview.copyCode}</button>
      ${isLong ? `<button class="code-fold-btn" title="${t.preview.expandCode}">${t.preview.expandCode}</button>` : ''}
    </div>
  </div>
  <div class="code-block-body"${collapsedStyle}>
    <div class="code-block-lines" aria-hidden="true">${lineNumbers}</div>
    <pre><code${classes ? ` class="${classes}"` : ''}>${code}</code></pre>
  </div>
  ${isLong ? `<div class="code-block-footer" contenteditable="false"><span>${t.preview.expandAll} (${lineCount} ${t.preview.lines})</span></div>` : ''}
</div>`
        }
      )

      return html
    } catch (error) {
      logger.error('Markdown render error:', error)
      return '<p>Render error</p>'
    }
  }, [localContent, t, textToStorage])

  // KaTeX async rendering (only when math formulas are present)
  const mathHtml = useMathRender(baseHtml)
  const renderedHtml = mathHtml ?? baseHtml

  const hasMermaid = localContent.includes('mermaid') || localContent.includes('mindmap')
  // E3：仅在内容中出现 plantuml/puml 时才挂载渲染器，避免无谓的 DOM 观察
  const hasPlantUml = localContent.includes('plantuml') || localContent.includes('puml')

  return { renderedHtml, hasMermaid, hasPlantUml }
}
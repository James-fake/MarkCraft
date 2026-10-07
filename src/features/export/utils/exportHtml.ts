import DOMPurify from 'dompurify';
import { textToStorage } from '@core/storage/imageStore'
import { marked } from 'marked'
import type { Token } from 'marked'
import { getFlatHeadingList, generateHeadingId } from '@utils/headingIdUtils'
import { EXPORT_CSS } from './exportCss'

export { EXPORT_CSS } from './exportCss'

export interface ExportHtmlTemplate {
  title?: string
  author?: string
  date?: string
  header?: string
  footer?: string
  toc?: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function generateHtmlBlob(
  content: string,
  customCss?: string,
  template?: ExportHtmlTemplate,
): Promise<Blob> {
  const storageContent = textToStorage(content)
  const headings = getFlatHeadingList(storageContent)
  let headingIndex = 0

  const renderer = new marked.Renderer()
  renderer.heading = function ({ tokens, depth }: { text?: string; depth: number; tokens?: Token[] }) {
    headingIndex++
    const id = headingIndex <= headings.length ? headings[headingIndex - 1].id : generateHeadingId(this.parser.parseInline(tokens || []))
    const text = tokens ? this.parser.parseInline(tokens) : ''
    return `<h${depth} id="${id}">${text}</h${depth}>\n`
  }

  const bodyHtml = marked.parse(storageContent, { renderer, gfm: true, breaks: true, async: false }) as string

  const theme = document.documentElement.getAttribute('data-theme') || 'light'
  const css = customCss || EXPORT_CSS

  const title = template?.title?.trim() || 'Exported Document'

  const hasMeta = Boolean(template?.header?.trim() || template?.author?.trim() || template?.date?.trim())
  const docHeader = hasMeta
    ? `<header class="export-header">
  ${template?.header?.trim() ? `<div class="export-header-custom">${escapeHtml(template.header.trim())}</div>` : ''}
  ${(template?.author?.trim() || template?.date?.trim()) ? `<div class="export-meta">
    ${template?.author?.trim() ? `<span class="export-author">${escapeHtml(template.author.trim())}</span>` : ''}
    ${template?.date?.trim() ? `<span class="export-date">${escapeHtml(template.date.trim())}</span>` : ''}
  </div>` : ''}
</header>`
    : ''

  const tocHtml = template?.toc
    ? `<nav class="export-toc" aria-label="Table of Contents">
  <h2 class="export-toc-title">${escapeHtml('目录')}</h2>
  <ul class="export-toc-list">
    ${headings
      .map((h) => `<li class="export-toc-item export-toc-level-${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`)
      .join('\n    ')}
  </ul>
</nav>`
    : ''

  const docFooter = template?.footer?.trim()
    ? `<footer class="export-footer">${escapeHtml(template.footer.trim())}</footer>`
    : ''

  // 正文净化：显式禁止 <style>（原本是 ADD_TAGS 放行）。笔记内嵌 CSS 可造成
  // position:fixed 覆盖层点击劫持、url() 外链追踪等；导出所需主题样式由下方
  // <head> 内的 <style>${css}</style> 单独提供，不依赖正文里的 <style>。
  const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body class="markdown-preview">
${docHeader}
${tocHtml}
<main class="export-content">
${DOMPurify.sanitize(bodyHtml, { FORBID_TAGS: ['style'], ADD_ATTR: ['data-theme', 'data-code'] })}
</main>
${docFooter}
</body>
</html>`

  return new Blob([html], { type: 'text/html;charset=utf-8' })
}

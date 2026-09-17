import DOMPurify from 'dompurify';
import { textToStorage } from '@core/storage/imageStore'
import { marked } from 'marked'
import { EXPORT_CSS } from './exportCss'
import html2pdf from 'html2pdf.js'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface PdfExportOptions {
  includeToc?: boolean
  includePageNumbers?: boolean
  headerText?: string
  footerText?: string
  /** 标题前分页：开启后每个 h1/h2 前强制新起一页（长文分章导出） */
  pageBreakHeadings?: boolean
}

interface TocEntry {
  level: number
  text: string
  id: string
}

function generateToc(html: string): { tocHtml: string; updatedHtml: string } {
  const headings: TocEntry[] = []
  let counter = 0

  // Add IDs to headings and collect TOC entries
  const updatedHtml = html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_match, level, attrs, content) => {
    const lvl = parseInt(level, 10)
    if (lvl > 3) return _match // Only include h1-h3 in TOC
    counter++
    const id = `toc-heading-${counter}`
    // Strip HTML tags from content for TOC text
    const text = content.replace(/<[^>]+>/g, '').trim()
    headings.push({ level: lvl, text, id })
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`
  })

  if (headings.length === 0) return { tocHtml: '', updatedHtml }

  // Build nested TOC HTML
  const tocItems = headings.map(h => {
    const indent = (h.level - 1) * 1.2
    return `<li style="margin-left:${indent}em"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`
  }).join('\n')

  const tocHtml = `<nav class="pdf-toc">
<h2 class="pdf-toc-title">Table of Contents</h2>
<ul>${tocItems}</ul>
</nav>`

  return { tocHtml, updatedHtml }
}

/**
 * 构建 PDF 渲染所需完整 HTML 字符串（纯函数，便于单元测试与复用）。
 * 包含样式、可选目录(TOC)、页眉/页脚与分页提示。
 */
export function buildPdfHtml(
  content: string,
  customCss?: string,
  options?: PdfExportOptions,
  title: string = 'MarkCraft',
): string {
  const storageContent = textToStorage(content)
  const bodyHtml = marked.parse(storageContent, { gfm: true, breaks: true, async: false }) as string

  const css = customCss || EXPORT_CSS

  // Generate TOC if requested
  let finalHtml = bodyHtml
  let tocSection = ''
  if (options?.includeToc) {
    const { tocHtml, updatedHtml } = generateToc(bodyHtml)
    finalHtml = updatedHtml
    tocSection = tocHtml
  }

  // Build header/footer CSS
  const hasHeader = options?.headerText && options.headerText.trim()
  const hasFooter = options?.footerText && options.footerText.trim()
  const hasPageNumbers = options?.includePageNumbers

  // Add page margin to accommodate header/footer
  const pageMarginTop = hasHeader ? '25mm' : '15mm'
  const pageMarginBottom = (hasFooter || hasPageNumbers) ? '25mm' : '15mm'

  const headerFooterStyles: string[] = []
  const headerFooterElements: string[] = []

  if (hasHeader) {
    headerFooterStyles.push(`
      @page { margin-top: ${pageMarginTop}; }
      thead { display: table-header-group; }
      .pdf-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: ${pageMarginTop};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85em;
        color: #666;
        border-bottom: 1px solid #ddd;
        padding: 0 15mm;
      }
    `)
    headerFooterElements.push(`<div class="pdf-header">${escapeHtml(options!.headerText!)}</div>`)
  }

  if (hasFooter || hasPageNumbers) {
    headerFooterStyles.push(`
      @page { margin-bottom: ${pageMarginBottom}; }
      tfoot { display: table-footer-group; }
      .pdf-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${pageMarginBottom};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85em;
        color: #666;
        border-top: 1px solid #ddd;
        padding: 0 15mm;
        gap: 2em;
      }
    `)
    const footerParts: string[] = []
    if (hasFooter) {
      footerParts.push(`<span>${escapeHtml(options!.footerText!)}</span>`)
    }
    if (hasPageNumbers) {
      footerParts.push('<span class="pdf-page-number"></span>')
    }
    headerFooterElements.push(`<div class="pdf-footer">${footerParts.join('')}</div>`)
  }

  // Page numbering CSS using counter
  const pageCounterCss = hasPageNumbers ? `
    .pdf-page-number::after {
      content: counter(page);
    }
  ` : ''

  // TOC styles
  const tocCss = options?.includeToc ? `
    .pdf-toc {
      margin-bottom: 2rem;
      padding: 1rem 0;
    }
    .pdf-toc-title {
      font-size: 1.3em;
      font-weight: 600;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--preview-border);
      padding-bottom: 0.3rem;
    }
    .pdf-toc ul {
      list-style: none;
      padding-left: 0;
    }
    .pdf-toc li {
      margin-bottom: 0.35rem;
      line-height: 1.6;
    }
    .pdf-toc a {
      color: var(--link-color);
      text-decoration: none;
    }
    .pdf-toc a:hover {
      text-decoration: underline;
    }
  ` : ''

  // F3 分页精修：可选「标题前分页」（h1/h2 强制新页）
  const pageBreakCss = options?.pageBreakHeadings
    ? `
    body > h1, body > h2 {
      break-before: page;
      page-break-before: always;
    }
  `
    : `
    body > h1, body > h2 {
      break-before: auto;
      page-break-before: auto;
    }
  `

  // F3 防跨页断裂（默认开启）：表格/行/代码块/图片/引用块不被劈成两半；
  // 宽表格自动换行防裁切
  const avoidBreakCss = `
    table, tr, pre, img, blockquote {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      table-layout: fixed;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  `

  const headerFooterCss = headerFooterStyles.join('\n')
  const headerFooterHtml = headerFooterElements.join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
${css}
${tocCss}
${pageBreakCss}
${avoidBreakCss}
${headerFooterCss}
${pageCounterCss}
@media print {
  body { padding: 0; max-width: none; }
  @page { margin: ${pageMarginTop} 15mm ${pageMarginBottom} 15mm; }
  .pdf-toc { break-after: page; }
  .pdf-header, .pdf-footer { position: fixed; }
}
</style>
</head>
<body class="markdown-preview">
${headerFooterHtml}
${tocSection}
${DOMPurify.sanitize(finalHtml, { ADD_TAGS: ['style', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced'], ADD_ATTR: ['data-theme', 'data-code', 'title', 'xmlns', 'id'] })}
</body>
</html>`
}

/**
 * 等待 iframe 内部文档完成布局、字体与图片加载，确保 html2canvas 截图时内容已就绪。
 * - 监听 iframe 的 load 事件（真实浏览器）。
 * - 等待 document.fonts.ready 与所有 <img> 加载完成，避免截图到空白/未加载资源。
 * - 设置兜底超时，避免在无头/ jsdom 等不触发 load 的环境中永久挂起。
 */
function waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const doc = iframe.contentDocument
    if (!doc) return resolve()
    let settled = false
    const settle = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }

    const afterLoad = async () => {
      try {
        if (doc.fonts && doc.fonts.ready) await doc.fonts.ready
      } catch {
        /* 字体 API 不可用时忽略 */
      }
      await waitForImages(doc)
      settle()
    }

    iframe.addEventListener('load', () => void afterLoad())
    // 兜底：部分环境（如 jsdom、srcdoc 未触发 load）直接走加载等待
    setTimeout(() => void afterLoad(), 150)
  })
}

/** 等待文档内所有图片加载完成（带超时保护），避免 html2canvas 截到未加载图片。 */
function waitForImages(doc: Document): Promise<void> {
  return new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images || [])
    if (imgs.length === 0) return resolve()
    let settled = false
    let remaining = imgs.length
    const done = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const check = () => {
      remaining -= 1
      if (remaining <= 0) done()
    }
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        check()
      } else {
        img.addEventListener('load', check)
        img.addEventListener('error', check)
      }
    })
    // 图片加载超时保护（例如跨域图片被拦截）
    setTimeout(done, 2000)
  })
}

/**
 * 真正生成 PDF 文件（返回 Blob），使用 html2pdf.js 把渲染后的 HTML 截图分页为真实 PDF。
 *
 * 与早期实现的关键区别：
 * - 不再调用 window.print()（旧实现只弹打印对话框，不生成可落盘的文件，在 File System Access
 *   保存模式下会导致 0 字节占位文件残留并触发"打开错误"/打印页跳转）。
 * - 现在返回真实、非空的 PDF Blob，由调用方决定写入磁盘(FSA)或浏览器下载。
 *
 * 渲染容器使用离屏 iframe（srcdoc）而非离屏 div：html2canvas 会把 `position: fixed`
 * 元素按视口坐标定位，若直接把 `left:-10000px` 的 div 交给 html2canvas，内容会被排到画布
 * 可视区域之外 → 生成"白板"PDF。改用 iframe 后，html2canvas 截取的是 iframe 内部 body，
 * 其内部坐标恒为 (0,0)，与外框位置无关，从而稳定渲染出完整内容。
 */
export async function generatePdf(
  content: string,
  fileName: string,
  errorMessage?: string,
  customCss?: string,
  options?: PdfExportOptions,
): Promise<Blob> {
  const safeTitle = escapeHtml((fileName || 'document').replace(/\.pdf$/i, ''))
  const html = buildPdfHtml(content, customCss, options, safeTitle)

  // 离屏 iframe 作为渲染沙箱：内容在其内部文档中以 (0,0) 布局，且不会在主页面闪现。
  const iframe = document.createElement('iframe')
  iframe.className = 'pdf-export-render'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '794px' // A4 宽度 @96dpi
  iframe.style.height = '1000px'
  iframe.style.border = '0'
  iframe.style.background = '#ffffff'
  document.body.appendChild(iframe)

  try {
    const idoc = iframe.contentDocument
    if (!idoc) {
      throw new Error(errorMessage || 'PDF 渲染环境不可用')
    }
    idoc.open()
    idoc.write(html)
    idoc.close()

    await waitForIframeReady(iframe)

    const target = idoc.body
    if (!target || target.innerHTML.trim().length === 0) {
      throw new Error(errorMessage || 'PDF 内容为空，请检查文档内容')
    }

    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `${safeTitle}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      // pagebreak 是 html2pdf.js 支持的真实选项，但官方类型未声明，作为额外属性透传
      pagebreak: { mode: ['css', 'legacy'] },
    }
    const blob = (await html2pdf().set(opt).from(target).outputPdf('blob')) as Blob
    if (!blob || blob.size === 0) {
      throw new Error(errorMessage || 'PDF 生成为空，请重试')
    }
    return blob
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }
}

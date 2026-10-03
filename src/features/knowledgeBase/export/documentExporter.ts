/**
 * 文档导出
 * 支持 PDF（浏览器打印）、Markdown 合并、EPUB 电子书
 */
import JSZip from 'jszip'
import type { KnowledgeBase } from '@stores/kbTypes'
import type { FileNode } from '@src/types/fileManager'
import { KbExportMessages, DEFAULT_KB_EXPORT_MESSAGES } from './sharePackager'

/** 转义 HTML 特殊字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 转义 XML 特殊字符（用于 EPUB 的 opf/ncx） */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 处理行内 markdown */
function inlineMd(text: string): string {
  let result = escapeHtml(text)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  return result
}

/**
 * 简易 Markdown 转 HTML（PDF 与 EPUB 共用）
 * 支持：标题、段落、有序/无序列表、代码块、链接、粗体、斜体、行内代码、引用
 */
function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/)
  const html: string[] = []
  let i = 0
  let inCodeBlock = false
  let codeLang = ''
  let codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块围栏
    const codeFence = line.match(/^```\s*(\w*)\s*$/)
    if (codeFence) {
      if (!inCodeBlock) {
        closeList()
        inCodeBlock = true
        codeLang = codeFence[1] || ''
        codeLines = []
      } else {
        html.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        inCodeBlock = false
      }
      i++
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      i++
      continue
    }

    // 空行
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // 引用块
    if (/^>\s+/.test(line)) {
      closeList()
      html.push(`<blockquote>${inlineMd(line.replace(/^>\s+/, ''))}</blockquote>`)
      i++
      continue
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`)
      i++
      continue
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul>')
        listType = 'ul'
      }
      html.push(`<li>${inlineMd(line.replace(/^[-*+]\s+/, ''))}</li>`)
      i++
      continue
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol>')
        listType = 'ol'
      }
      html.push(`<li>${inlineMd(line.replace(/^\d+\.\s+/, ''))}</li>`)
      i++
      continue
    }

    // 段落
    closeList()
    html.push(`<p>${inlineMd(line)}</p>`)
    i++
  }

  closeList()
  if (inCodeBlock) {
    html.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  return html.join('\n')
}

/**
 * 导出 PDF（通过浏览器打印）
 * 1. 合并所有文件为单个 HTML（按文件名排序）
 * 2. 每个文件作为一个章节（h2 标题）
 * 3. 应用 PDF 友好的 CSS（A4 页面、分页符、目录）
 * 4. 打开新窗口调用 window.print()
 * @param kb 知识库
 * @param files 文件列表
 */
export async function exportPdf(
  kb: KnowledgeBase,
  files: FileNode[],
  messages: KbExportMessages = DEFAULT_KB_EXPORT_MESSAGES,
): Promise<void> {
  try {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))

    // 生成目录
    const tocItems = sorted
     .map((f, idx) => `<li><a href="#chapter-${idx}">${escapeHtml(f.name.replace(/\.md$/i, ''))}</a></li>`)
      .join('')

    // 生成各章节内容
    const chapters = sorted
      .map((f, idx) => {
        const title = f.name.replace(/\.md$/i, '')
        const body = markdownToHtml(f.content ?? '')
        return `<section class="chapter" id="chapter-${idx}"><h2>${escapeHtml(title)}</h2>${body}</section>`
      })
      .join('\n')

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(kb.name)}</title>
<style>
@page { size: A4; margin: 2cm; }
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; color: #1e293b; font-size: 12pt; }
h1 { font-size: 24pt; text-align: center; margin-top: 4cm; }
h2 { font-size: 18pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; break-before: page; }
h3, h4, h5, h6 { break-after: avoid; }
.toc { break-after: page; }
.toc h2 { break-before: avoid; }
.chapter { break-after: page; }
code { background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-family: ui-monospace, monospace; }
pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; color: #64748b; background: #f8fafc; }
a { color: #1e40af; }
ul, ol { padding-left: 1.5em; }
</style>
</head>
<body>
<h1>${escapeHtml(kb.name)}</h1>
<p style="text-align: center; color: #64748b;">${escapeHtml(kb.description)}</p>
<div class="toc">
<h2>目录</h2>
<ol>${tocItems}</ol>
</div>
${chapters}
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error(messages.kbPdfWindowBlocked)
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    // 延迟调用打印，确保样式渲染完成
    setTimeout(() => {
      printWindow.print()
    }, 300)
  } catch (err) {
    console.error('[KB] 导出 PDF 失败:', err)
    throw new Error(`${messages.kbPdfFailed}${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * 导出 Markdown（合并所有文件为一个 .md）
 * 文件之间用 --- 分隔
 * @param kb 知识库
 * @param files 文件列表
 * @returns Markdown 格式的 Blob
 */
export async function exportMarkdown(
  kb: KnowledgeBase,
  files: FileNode[],
  messages: KbExportMessages = DEFAULT_KB_EXPORT_MESSAGES,
): Promise<Blob> {
  try {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))
    const parts: string[] = []
    // 首部：知识库信息
    parts.push(`# ${kb.name}\n\n${kb.description}\n`)
    for (const f of sorted) {
      const title = f.name.replace(/\.md$/i, '')
      parts.push(`---\n\n## ${title}\n\n${f.content ?? ''}`)
    }
    const text = parts.join('\n\n')
    return new Blob([text], { type: 'text/markdown;charset=utf-8' })
  } catch (err) {
    console.error('[KB] 导出 Markdown 失败:', err)
    throw new Error(`${messages.kbMdFailed}${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * 导出 EPUB 电子书
 * EPUB 本质是 ZIP，包含：mimetype + META-INF/container.xml + OEBPS/content.opf + OEBPS/toc.ncx + OEBPS/chapterN.xhtml
 * @param kb 知识库
 * @param files 文件列表
 * @returns .epub 格式的 Blob
 */
export async function exportEpub(kb: KnowledgeBase, files: FileNode[]): Promise<Blob> {
  try {
    const zip = new JSZip()

    // 1. mimetype（必须不压缩，放在 ZIP 第一个）
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    zip.file('META-INF/container.xml', containerXml)

    // 3. 文件按名排序，每文件作为一章
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))
    const manifestItems: string[] = []
    const spineItems: string[] = []
    const navPoints: string[] = []

    sorted.forEach((file, idx) => {
      const id = `chapter${idx + 1}`
      const href = `${id}.xhtml`
      const title = file.name.replace(/\.md$/i, '')
      const bodyHtml = markdownToHtml(file.content ?? '')
      const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(title)}</title></head>
<body>
<h1>${escapeXml(title)}</h1>
${bodyHtml}
</body>
</html>`
      zip.file(`OEBPS/${href}`, xhtml)
      manifestItems.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`)
      spineItems.push(`<itemref idref="${id}"/>`)
      navPoints.push(
        `<navPoint id="${id}" playOrder="${idx + 1}"><navLabel><text>${escapeXml(title)}</text></navLabel><content src="${href}"/></navPoint>`,
      )
    })

    // 4. OEBPS/content.opf（包描述文件）
    const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(kb.name)}</dc:title>
    <dc:creator>${escapeXml(kb.description || 'MarkCraft')}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="bookid">${escapeXml(kb.id)}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems.map(s => '    ' + s).join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.map(s => '    ' + s).join('\n')}
  </spine>
</package>`
    zip.file('OEBPS/content.opf', opf)

    // 5. OEBPS/toc.ncx（目录）
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(kb.id)}"/>
  </head>
  <docTitle><text>${escapeXml(kb.name)}</text></docTitle>
  <navMap>
${navPoints.map(s => '    ' + s).join('\n')}
  </navMap>
</ncx>`
    zip.file('OEBPS/toc.ncx', ncx)

    // 6. 打包为 .epub（整体使用 DEFLATE 压缩，mimetype 已单独 STORE）
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    return blob
  } catch (err) {
    console.error('[KB] 导出 EPUB 失败:', err)
    throw new Error(`导出 EPUB 失败：${err instanceof Error ? err.message : String(err)}`)
  }
}

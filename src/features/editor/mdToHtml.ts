import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import { renderMarkdown } from '@services/sanitizeHtml'

/**
 * Markdown → HTML（P5-1 自 markdownConvert.ts 按方向拆出，实现逐字未动）。
 * 管线：图片占位符 → [TOC]/媒体/PDF/嵌入/callout/wikiLink/数学公式预处理 →
 * renderMarkdown（marked + DOMPurify 统一闸门）→ 占位符回填 → taskList/脚注 Tiptap 适配。
 */

function convertTaskListsForTiptap(html: string): string {
  return html.replace(
    /<ul>\s*((?:<li>\s*<input\s+type="checkbox"[^>]*>[\s\S]*?<\/li>\s*)+)<\/ul>/gi,
    (_match, items: string) => {
      let converted = items

      converted = converted.replace(
        /<li>\s*<input\s+type="checkbox"\s+checked[^>]*>\s*([\s\S]*?)<\/li>/gi,
        (_m: string, content: string) =>
          `<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked></label><div>${content.trim()}</div></li>`
      )

      converted = converted.replace(
        /<li>\s*<input\s+type="checkbox"[^>]*>\s*([\s\S]*?)<\/li>/gi,
        (_m: string, content: string) =>
          `<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>${content.trim()}</div></li>`
      )

      return `<ul data-type="taskList">${converted}</ul>`
    }
  )
}

function resolveImagePlaceholders(md: string, imageStore: ImageStoreAPI): string {
  return md.replace(
    /!\[([^\]]*)\]\(image:([^)]+)\)/g,
    (_match, alt, imageId) => {
      const base64 = imageStore.getBase64Image(imageId)
      if (base64) {
        return `![${alt}](${base64})`
      }
      return _match
    }
  )
}

// Pre-process markdown to convert image attribute syntax to HTML before marked parsing
function preprocessImageAttrs(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g,
    (_match, alt, src, attrsStr) => {
      const widthMatch = attrsStr.match(/width="(\d+)"/)
      const alignMatch = attrsStr.match(/align="(left|center|right)"/)
      const width = widthMatch ? widthMatch[1] : ''
      const align = alignMatch ? alignMatch[1] : 'center'
      const widthAttr = width ? ` width="${width}"` : ''
      return `<div data-align="${align}" style="text-align: ${align}; margin: 8px 0;"><img src="${src}" alt="${alt}"${widthAttr} style="max-width: 100%;${width ? ` width: ${width}px;` : ''}" /></div>`
    }
  )
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
}

function convertFootnotesForTiptap(html: string): string {
  const footnoteDefs = new Map<string, string>()

  const defSectionRegex = /<section\s+class="footnotes"[^>]*>([\s\S]*?)<\/section>/gi
  let defMatch: RegExpExecArray | null
  while ((defMatch = defSectionRegex.exec(html)) !== null) {
    const sectionContent = defMatch[1]
    const liRegex = /<li\s+id="footnote-([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi
    let liMatch: RegExpExecArray | null
    while ((liMatch = liRegex.exec(sectionContent)) !== null) {
      const id = liMatch[1]
      let content = liMatch[2]
      content = content.replace(/<a[^>]*data-footnote-backref[^>]*>[^<]*<\/a>/gi, '')
      content = content.replace(/<\/?p>/gi, '').trim()
      footnoteDefs.set(id, content)
    }
  }

  html = html.replace(defSectionRegex, '')

  html = html.replace(
    /<sup><a\s+id="footnote-ref-([^"]+)"[^>]*data-footnote-ref[^>]*>[^<]*<\/a><\/sup>/gi,
    (_match, id: string) => {
      const content = footnoteDefs.get(id) || ''
      return `<sup data-type="footnoteReference" data-footnote-id="${id}" data-footnote-content="${escapeHtmlAttr(content)}"></sup>`
    }
  )

  return html
}

export function markdownToHtml(md: string, imageStore: ImageStoreAPI): string {
  try {
    const resolved = resolveImagePlaceholders(md, imageStore)
    const withImageAttrs = preprocessImageAttrs(resolved)

    // 在 marked 解析之前，提取数学公式和 mermaid 代码块替换为占位符
    // 防止 marked 破坏 $$...$$、$...$ 语法和 mermaid 代码块中的特殊字符
    const placeholders: string[] = []
    let processed = withImageAttrs

    // [TOC] / [toc] 转换为占位符
    processed = processed.replace(/^\[(TOC|toc)\]$/gm, (_match) => {
      const idx = placeholders.length
      placeholders.push(`<div data-toc="true" class="toc-container"></div>`)
      return `TOCPLACEHOLDER${idx}END`
    })

    // ![video](url) 转换为 <video> 标签
    processed = processed.replace(/!\[video\]\(([^)]+)\)/gi, (_match, src) => {
      return `<div data-media-embed="true" data-media-type="video"><video src="${src}" controls></video></div>`
    })

    // ![audio](url) 转换为 <audio> 标签
    processed = processed.replace(/!\[audio\]\(([^)]+)\)/gi, (_match, src) => {
      return `<div data-media-embed="true" data-media-type="audio"><audio src="${src}" controls></audio></div>`
    })

    // @[iframe](url) 转换为 <iframe> 标签
    processed = processed.replace(/@\[iframe\]\(([^)]+)\)/gi, (_match, src) => {
      return `<iframe src="${src}" sandbox="allow-scripts allow-same-origin"></iframe>`
    })

    // C3：@[pdf](url) 或 @[pdf](pdfId) 转换为 <div data-type="pdfEmbed">
    processed = processed.replace(/@\[pdf\]\(([^)]+)\)/gi, (_match, value) => {
      const v = value.trim()
      if (/^https?:\/\//i.test(v) || v.startsWith('/') || v.startsWith('blob:')) {
        return `<div data-type="pdfEmbed" data-src="${v}"></div>`
      }
      return `<div data-type="pdfEmbed" data-pdf-id="${v}"></div>`
    })

    // 包装不支持的 HTML 块为 data-raw-html div（供 Tiptap RawHtmlBlock 解析）
    // 匹配独立行上的 HTML 块标签如 <details>, <summary>, <marquee> 等
    processed = processed.replace(/^<(details|summary|marquee|abbr|kbd|var|samp|dialog|meter|progress|output|picture|template|slot|portal)(\s[^>]*)?>[\s\S]*?<\/\1>/gim, (match) => {
      const escaped = escapeHtmlAttr(match)
      return `<div data-raw-html="true" data-html="${escaped}"></div>`
    })

    // ==text|color== 高亮转换为 <mark data-highlight-color="color">（在 marked 解析之前）
    // 色名允许连字符（deep-orange / light-blue / deep-purple / light-green），故用 [-\w]+ 而非 \w+。
    processed = processed.replace(/==([^=|]+)\|([-\w]+)==/g, '<mark data-highlight-color="$2">$1</mark>')
    // ==text== 高亮转换为 <mark>（默认黄色）
    processed = processed.replace(/==([^=]+)==/g, '<mark>$1</mark>')

    // ++text|color++ 下划线转换为 <u data-underline-color="color">（在 marked 解析之前）
    // 与高亮 ==text|color== 对称；色名同样允许连字符（deep-orange 等）。
    // 'auto'（跟随正文）归一化为无属性 <u> —— 与 htmlToMarkdown 侧归一化互逆。
    processed = processed.replace(/\+\+([^+|]+)\|([-\w]+)\+\+/g, (_match, text: string, color: string) =>
      color === 'auto' ? `<u>${text}</u>` : `<u data-underline-color="${color}">${text}</u>`)
    // ++text++ 下划线（跟随正文颜色）。内容排除 | 与 + —— 避免把 ++a|b++ 这类
    // 非色名竖线内容误吞进下划线（宁可原样显示，也不静默改内容）。
    processed = processed.replace(/\+\+([^+|]+)\+\+/g, '<u>$1</u>')

    // ~text~ 下标（排除 ~~strikethrough~~）
    processed = processed.replace(/(?<!~)~([^~]+)~(?!~)/g, '<sub>$1</sub>')

    // ^text^ 上标
    processed = processed.replace(/\^([^^]+)\^/g, '<sup>$1</sup>')

    // ![[target]] EmbedContent 转换为嵌入内容（必须在 [[wikilink]] 之前处理）
    processed = processed.replace(/!\[\[([^\]]+)\]\]/g, (_match, target: string) => {
      const ext = target.split('.').pop()?.toLowerCase() || ''
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)
      const embedType = isImage ? 'image' : 'note'
      if (embedType === 'image') {
        return `<div data-embed="true" data-embed-target="${target}" data-embed-type="image"><img src="${target}" alt="${target}" /></div>`
      }
      // Support ![[file#heading]] — extract heading from target
      const hashIdx = target.indexOf('#')
      const headingAttr = hashIdx !== -1 ? ` data-embed-heading="${target.slice(hashIdx + 1)}"` : ''
      return `<div data-embed="true" data-embed-target="${target}" data-embed-type="note"${headingAttr}></div>`
    })

    // Callout 语法: > [!type] title 或 > [!type]+/- title
    processed = processed.replace(/^>\s+\[!(\w+)\]([-+]?)\s*(.*)$/gm, (_match, type: string, collapse: string, title: string) => {
      const calloutType = type.toLowerCase()
      const collapsible = collapse === '+' || collapse === '-'
      const titleAttr = title ? ` data-title="${escapeHtmlAttr(title)}"` : ''
      const collapseAttr = collapsible ? ` data-collapsible="true"` : ''
      return `<div data-callout="true" data-callout-type="${calloutType}"${titleAttr}${collapseAttr}>`
    })

    // Callout 内容行：> content → 普通内容（闭合 div）
    // 将连续的 > 引用块转换为 callout 内容
    processed = processed.replace(/(^>\s.*(?:\n>.*)*)/gm, (block: string) => {
      // 如果块中包含 data-callout（已被上面的规则替换），处理内容行
      if (!block.includes('data-callout')) return block
      // 移除 > 前缀，保留内容
      return block.replace(/^>\s?/gm, '')
    })
    // 在 callout div 后添加闭合标签（每个 data-callout 后的第一个空行处闭合）
    processed = processed.replace(/(<div data-callout="true"[^>]*>)([\s\S]*?)(\n\n|\n(?=<)|$)/g, '$1$2</div>\n')

    // 注释语法 %%text%% 转换为 <span data-comment>
    processed = processed.replace(/%%([^%]+?)%%/g, (_match, text: string) => {
      return `<span data-comment>${text}</span>`
    })

    // [[target|label]] 和 [[target]] WikiLink 转换为 <a data-wiki-link>
    processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
      const displayText = label || target
      const labelAttr = label ? ` data-wiki-label="${label}"` : ''
      return `<a data-wiki-link data-wiki-target="${target}"${labelAttr}>${displayText}</a>`
    })

    // ((block-id)) 和 ((block-id|alias)) 块引用转换为 <span data-block-ref>
    // 注意：不匹配 !((block-id)) 嵌入语法（前面有 !）
    processed = processed.replace(/(^|[^!])\(\(([^)|]+)(?:\|([^)]+))?\)\)/g, (_match, prefix: string, blockId: string, alias?: string) => {
      const displayText = alias || `^${blockId}`
      const aliasAttr = alias ? ` data-block-alias="${alias}"` : ''
      return `${prefix}<span data-block-ref data-block-id="${blockId}"${aliasAttr}>${displayText}</span>`
    })

    // !((block-id)) 块嵌入保持为文本形式（由 Preview 层处理嵌入）
    // 这里不做转换，保留原语法

    // 定义列表：Term\n: Definition → <dl><dt>Term</dt><dd>Definition</dd></dl>
    processed = processed.replace(/^([^:\s][^\n]*)\n:\s+(.+)$/gm, '<dl><dt>$1</dt><dd>$2</dd></dl>')

    // 先提取 mermaid/mindmap 代码块（```mermaid ... ``` 或 ```mindmap ... ```）
    processed = processed.replace(/```(mermaid|mindmap)\n([\s\S]*?)```/gi, (_match, _lang, code) => {
      const idx = placeholders.length
      placeholders.push(`<div data-type="mermaidBlock" data-code="${escapeHtmlAttr(code.trim())}"></div>`)
      return `MERMAIDPLACEHOLDER${idx}END`
    })

    // E3：提取 plantuml/puml 代码块（```plantuml ... ``` 或 ```puml ... ```）
    // 复用 MERMAIDPLACEHOLDER 的占位符回填逻辑，仅节点 data-type 不同
    processed = processed.replace(/```(plantuml|puml)\n([\s\S]*?)```/gi, (_match, _lang, code) => {
      const idx = placeholders.length
      placeholders.push(`<div data-type="plantUmlBlock" data-code="${escapeHtmlAttr(code.trim())}"></div>`)
      return `MERMAIDPLACEHOLDER${idx}END`
    })

    // 提取块级公式 $$...$$（多行或单行）
    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
      const idx = placeholders.length
      placeholders.push(`<div data-type="mathBlock" data-latex="${escapeHtmlAttr(latex.trim())}"></div>`)
      return `MATHBLOCKPLACEHOLDER${idx}END`
    })

    // 提取行内公式 $...$
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_match, latex) => {
      const idx = placeholders.length
      placeholders.push(`<span data-type="mathInlineNode" data-latex="${escapeHtmlAttr(latex)}"></span>`)
      return `MATHBLOCKPLACEHOLDER${idx}END`
    })

    // M-1：经统一闸门 renderMarkdown（marked 解析 + DOMPurify 净化），杜绝漏消毒。
    const raw = renderMarkdown(processed, { gfm: true, breaks: true })

    // 将占位符替换回 HTML
    let result = raw
    for (let i = 0; i < placeholders.length; i++) {
      // marked 可能将占位符包裹在 <p> 标签中，需要处理
      const tocPRe = new RegExp(`<p>\\s*TOCPLACEHOLDER${i}END\\s*</p>`, 'g')
      result = result.replace(tocPRe, placeholders[i])
      const tocRe = new RegExp(`TOCPLACEHOLDER${i}END`, 'g')
      result = result.replace(tocRe, placeholders[i])

      const mermaidPRe = new RegExp(`<p>\\s*MERMAIDPLACEHOLDER${i}END\\s*</p>`, 'g')
      result = result.replace(mermaidPRe, placeholders[i])
      const mermaidRe = new RegExp(`MERMAIDPLACEHOLDER${i}END`, 'g')
      result = result.replace(mermaidRe, placeholders[i])

      const mathPRe = new RegExp(`<p>\\s*MATHBLOCKPLACEHOLDER${i}END\\s*</p>`, 'g')
      result = result.replace(mathPRe, placeholders[i])
      const mathRe = new RegExp(`MATHBLOCKPLACEHOLDER${i}END`, 'g')
      result = result.replace(mathRe, placeholders[i])
    }

    const withTaskLists = convertTaskListsForTiptap(result)
    return convertFootnotesForTiptap(withTaskLists)
  } catch {
    return `<p>${md.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  }
}

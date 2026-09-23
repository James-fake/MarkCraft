import { marked } from 'marked'
import TurndownService from 'turndown'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'

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

    const raw = marked.parse(processed, { gfm: true, breaks: true }) as string

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

function decodeHtmlAttr(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/\u200B/g, '')
}

export function htmlToMarkdown(html: string): string {
  // Preprocess: extract footnote references from HTML before Turndown
  const footnoteDefs: { id: string; content: string }[] = []

  html = html.replace(
    /<sup\s+[^>]*data-type="footnoteReference"[^>]*\/?>((?:<\/sup>)?)/gi,
    (match) => {
      const idMatch = match.match(/data-footnote-id="([^"]*)"/)
      const contentMatch = match.match(/data-footnote-content="([^"]*)"/)
      const id = idMatch ? idMatch[1] : ''
      const rawContent = contentMatch ? contentMatch[1] : ''
      const content = decodeHtmlAttr(rawContent)
      footnoteDefs.push({ id, content })
      return `%%FOOTNOTE-${id}%%`
    }
  )

  // Preprocess: extract math/mermaid blocks before Turndown (Turndown may skip empty divs)
  const mathPlaceholders: string[] = []

  // 辅助函数：从 HTML 中提取带有 data-type 属性的 div 块（处理嵌套 div）
  // 返回替换后的 HTML
  function extractDivBlock(
    html: string,
    dataType: string,
    attrName: string,
    formatFn: (value: string) => string
  ): string {
    let result = html
    const openTagRe = new RegExp(`<div[^>]*data-type="${dataType}"[^>]*>`, 'gi')
    let match: RegExpExecArray | null

    while ((match = openTagRe.exec(result)) !== null) {
      const openTag = match[0]
      const startPos = match.index

      // 从属性中提取值
      const attrRe = new RegExp(`${attrName}="([^"]*)"`)
      const attrMatch = openTag.match(attrRe)
      const value = attrMatch ? decodeHtmlAttr(attrMatch[1]) : ''

      // 找到匹配的闭合 </div>（需要计数嵌套层级）
      let depth = 1
      let pos = startPos + openTag.length
      while (depth > 0 && pos < result.length) {
        const nextOpen = result.indexOf('<div', pos)
        const nextClose = result.indexOf('</div>', pos)

        if (nextClose === -1) break

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++
          pos = nextOpen + 4
        } else {
          depth--
          if (depth === 0) {
            // 找到匹配的闭合标签
            const endPos = nextClose + '</div>'.length
            const idx = mathPlaceholders.length
            mathPlaceholders.push(formatFn(value))
            const placeholder = `%%MATHPLACEHOLDER${idx}%%`
            result = result.substring(0, startPos) + placeholder + result.substring(endPos)
            // 重置正则位置，因为字符串已改变
            openTagRe.lastIndex = 0
            break
          }
          pos = nextClose + 6
        }
      }
    }

    return result
  }

  // 块级公式
  html = extractDivBlock(html, 'mathBlock', 'data-latex', (latex) => `\n$$\n${latex}\n$$\n`)

  // 行内公式
  html = html.replace(
    /<span[^>]*data-type="mathInlineNode"[^>]*>([\s\S]*?)<\/span>/gi,
    (match) => {
      const latexMatch = match.match(/data-latex="([^"]*)"/)
      const latex = latexMatch ? decodeHtmlAttr(latexMatch[1]) : ''
      const idx = mathPlaceholders.length
      mathPlaceholders.push(`$${latex}$`)
      return `%%MATHPLACEHOLDER${idx}%%`
    }
  )

  // Mermaid 图表
  html = extractDivBlock(html, 'mermaidBlock', 'data-code', (code) => `\n\`\`\`mermaid\n${code}\n\`\`\`\n`)

  // E3：PlantUML 图表
  html = extractDivBlock(html, 'plantUmlBlock', 'data-code', (code) => `\n\`\`\`plantuml\n${code}\n\`\`\`\n`)

  // C3：PDF 内嵌：先于 turndown 提取为占位符。
  // 说明：turndown 会直接丢弃空 <div>，且无子内容的 div 规则不会触发，
  // 故采用与 mermaid/plantuml 相同的 preprocess + 占位符方案，而非 turndown 规则。
  html = html.replace(/<div[^>]*data-type="pdfEmbed"[^>]*>\s*<\/div>/gi, (tag) => {
    const srcMatch = tag.match(/data-src="([^"]*)"/)
    const idMatch = tag.match(/data-pdf-id="([^"]*)"/)
    const ref = srcMatch ? decodeHtmlAttr(srcMatch[1]) : idMatch ? decodeHtmlAttr(idMatch[1]) : ''
    const idx = mathPlaceholders.length
    mathPlaceholders.push(`\n@[pdf](${ref})\n`)
    return `%%MATHPLACEHOLDER${idx}%%`
  })

  const td = new TurndownService({
    headingStyle: 'atx' as const,
    codeBlockStyle: 'fenced' as const,
    bulletListMarker: '-' as const,
  })

  // ── Turndown custom rules ──────────────────────────────────────
  // Rules are evaluated in the order they are added. Turndown walks
  // the DOM bottom-up and applies the FIRST matching rule, so:
  //   1. Specific data-type rules must come BEFORE generic tag rules.
  //   2. taskListItems (LI+data-type) before default <li> handling.
  //   3. mathBlock/mathInlineNode (DIV/SPAN+data-type) before
  //      generic div/span handling.
  //   4. mermaidBlock (DIV+data-type) before generic div handling.
  //   5. Table rules: tableSection → tableRow → tableCell → table
  //      (inner elements first, outer wrapper last).
  // ────────────────────────────────────────────────────────────────

  td.addRule('taskListItems', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem'
    },
    replacement: (_content: string, node: HTMLElement) => {
      const checked = node.getAttribute('data-checked') === 'true'
      const divEl = node.querySelector('div')
      const text = divEl ? divEl.textContent || '' : node.textContent || ''
      return `- [${checked ? 'x' : ' '}] ${text}\n`
    },
  })

  td.addRule('toc', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'DIV' && node.getAttribute('data-toc') === 'true'
    },
    replacement: () => '[TOC]\n',
  })

  td.addRule('highlight', {
    filter: 'mark',
    replacement: (content: string, node: HTMLElement) => {
      const color = node.getAttribute('data-highlight-color')
      if (color && color !== 'yellow') {
        return `==${content}|${color}==`
      }
      return `==${content}==`
    },
  })

  td.addRule('underline', {
    // ⚠️ 此规则同时修掉一个既有 bug：Turndown 默认不识 <u>，
    // 会「保留子内容、丢弃标签」⇒ 下划线此前一保存就丢。
    filter: (node: HTMLElement) => {
      return node.nodeName === 'U' && !node.getAttribute('data-type')
    },
    replacement: (content: string, node: HTMLElement) => {
      const color = node.getAttribute('data-underline-color')
      // 'auto'（跟随正文）归一化为无后缀 ++text++，与高亮 yellow 归一化同构
      if (color && color !== 'auto') {
        return `++${content}|${color}++`
      }
      return `++${content}++`
    },
  })

  td.addRule('subscript', {
    filter: 'sub',
    replacement: (content: string) => `~${content}~`,
  })

  td.addRule('superscript', {
    filter: 'sup',
    replacement: (content: string) => `^${content}^`,
  })

  td.addRule('definitionList', {
    filter: 'dl',
    replacement: (content: string) => content,
  })

  td.addRule('definitionTerm', {
    filter: 'dt',
    replacement: (content: string) => content + '\n',
  })

  td.addRule('definitionDescription', {
    filter: 'dd',
    replacement: (content: string) => `: ${content}\n`,
  })

  // WikiLink: convert <a data-wiki-link> back to [[target]] or [[target|label]]
  td.addRule('wikiLink', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'A' && node.hasAttribute('data-wiki-link')
    },
    replacement: (_content: string, node: HTMLElement) => {
      const target = node.getAttribute('data-wiki-target') || node.textContent || ''
      const label = node.getAttribute('data-wiki-label')
      if (label) {
        return `[[${target}|${label}]]`
      }
      return `[[${target}]]`
    },
  })

  // BlockReference: convert <span data-block-ref> back to ((block-id)) or ((block-id|alias))
  td.addRule('blockReference', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'SPAN' && node.hasAttribute('data-block-ref')
    },
    replacement: (_content: string, node: HTMLElement) => {
      const blockId = node.getAttribute('data-block-id') || ''
      const alias = node.getAttribute('data-block-alias')
      if (alias) {
        return `((${blockId}|${alias}))`
      }
      return `((${blockId}))`
    },
  })

  // Callout: convert <div data-callout> back to > [!type] title
  td.addRule('callout', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'DIV' && node.hasAttribute('data-callout')
    },
    replacement: (content: string, node: HTMLElement) => {
      const type = node.getAttribute('data-callout-type') || 'info'
      const title = node.getAttribute('data-title') || ''
      const collapsible = node.getAttribute('data-collapsible') === 'true'
      const collapseMark = collapsible ? '+' : ''
      const titlePart = title ? ` ${title}` : ''
      const header = `> [!${type}]${collapseMark}${titlePart}\n`
      // 将内容按行分割，每行加 > 前缀
      const lines = content.trim().split('\n')
      const body = lines.map((line: string) => `> ${line}`).join('\n')
      return `${header}${body}\n`
    },
  })

  // Comment: convert <span data-comment> back to %%text%%
  td.addRule('comment', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'SPAN' && node.hasAttribute('data-comment')
    },
    replacement: (content: string) => `%%${content}%%`,
  })

  // EmbedContent: convert <div data-embed> back to ![[target]]
  td.addRule('embedContent', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'DIV' && node.hasAttribute('data-embed')
    },
    replacement: (_content: string, node: HTMLElement) => {
      const target = node.getAttribute('data-embed-target') || ''
      return `![[${target}]]\n`
    },
  })

  // Video/Audio embed: convert <video>/<audio> or wrapper div back to markdown
  td.addRule('mediaEmbed', {
    filter: (node: HTMLElement) => {
      if (node.nodeName === 'VIDEO') return true
      if (node.nodeName === 'AUDIO') return true
      if (node.nodeName === 'DIV' && node.getAttribute('data-media-embed') === 'true') return true
      return false
    },
    replacement: (_content: string, node: HTMLElement) => {
      if (node.nodeName === 'VIDEO') {
        return `![video](${(node as HTMLVideoElement).src})\n`
      }
      if (node.nodeName === 'AUDIO') {
        return `![audio](${(node as HTMLAudioElement).src})\n`
      }
      // Wrapper div with data-media-embed
      const mediaType = node.getAttribute('data-media-type') || 'video'
      const mediaEl = node.querySelector('video, audio') as HTMLVideoElement | HTMLAudioElement | null
      const src = mediaEl?.src || ''
      return `![${mediaType}](${src})\n`
    },
  })

  // Iframe embed: convert <iframe> back to markdown
  td.addRule('iframe', {
    filter: 'iframe',
    replacement: (_content: string, node: HTMLElement) => {
      return `@[iframe](${(node as HTMLIFrameElement).src})\n`
    },
  })

  // Raw HTML block: convert data-raw-html div back to original HTML
  td.addRule('rawHtml', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'DIV' && node.getAttribute('data-raw-html') === 'true'
    },
    replacement: (_content: string, node: HTMLElement) => {
      const htmlAttr = node.getAttribute('data-html')
      if (htmlAttr) {
        return decodeHtmlAttr(htmlAttr) + '\n'
      }
      // Fallback: use innerHTML
      return node.innerHTML + '\n'
    },
  })

  td.addRule('strikethrough', {
    filter: (node: HTMLElement) => {
      return (node.nodeName === 'DEL' || node.nodeName === 'S') && !node.getAttribute('data-type')
    },
    replacement: (content: string) => `~~${content}~~`,
  })

  // Image inside a data-align wrapper: skip default img handling so the
  // parent `imageWithAttrs` rule can produce a single markdown image token.
  td.addRule('imageInAlignWrapper', {
    filter: (node: HTMLElement) => {
      if (node.nodeName !== 'IMG') return false
      // Check any ancestor div with data-align (handles nested wrappers like
      // div[data-align] > div > img)
      const ancestor = node.closest('div[data-align]')
      return !!ancestor
    },
    replacement: () => '',
  })

  // Image with width/align attributes (from custom ImageNode)
  td.addRule('imageWithAttrs', {
    filter: (node: HTMLElement) => {
      return !!(node.nodeName === 'DIV' && node.getAttribute('data-align') && node.querySelector('img'))
    },
    replacement: (_content: string, node: HTMLElement) => {
      const img = node.querySelector('img')
      if (!img) return ''
      const alt = img.getAttribute('alt') || ''
      const src = img.getAttribute('src') || ''
      const width = img.getAttribute('width')
      const align = node.getAttribute('data-align')
      // Store width/align as HTML attributes in markdown for round-trip
      let attrs = ''
      if (width) attrs += ` width="${width}"`
      if (align && align !== 'center') attrs += ` align="${align}"`
      if (attrs) {
        return `![${alt}](${src}){${attrs.trim()}}\n`
      }
      return `![${alt}](${src})\n`
    },
  })

  // Table rules: inner elements first, outer wrapper last.
  // Turndown processes bottom-up, so child nodes are replaced before
  // their parents — the order below keeps that explicit.
  td.addRule('tableSection', {
    filter: (node: HTMLElement) => {
      return (node.nodeName === 'THEAD' || node.nodeName === 'TBODY' || node.nodeName === 'TFOOT') && !node.getAttribute('data-type')
    },
    replacement: (content: string) => content,
  })

  td.addRule('tableRow', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'TR' && !node.getAttribute('data-type')
    },
    replacement: (_content: string, node: HTMLElement) => {
      const cells: string[] = []
      const parentTable = node.closest('table')
      const isHeaderRow = node.parentElement?.nodeName === 'THEAD' ||
        (node.parentElement?.nodeName === 'TBODY' && node.querySelector('th') !== null)

      for (const child of Array.from(node.children)) {
        const cellText = child.textContent?.trim() || ''
        cells.push(`| ${cellText} `)
      }

      let result = cells.join('') + '|\n'

      if (isHeaderRow && parentTable) {
        const firstRow = parentTable.querySelector('tr')
        if (firstRow === node) {
          const colCount = node.children.length
          const separator = Array(colCount).fill('| --- ').join('') + '|\n'
          result += separator
        }
      }

      return result
    },
  })

  td.addRule('tableCell', {
    filter: (node: HTMLElement) => {
      return (node.nodeName === 'TD' || node.nodeName === 'TH') && !node.getAttribute('data-type')
    },
    replacement: (content: string) => content,
  })

  td.addRule('table', {
    filter: (node: HTMLElement) => {
      return node.nodeName === 'TABLE' && !node.getAttribute('data-type')
    },
    replacement: (content: string) => {
      return '\n' + content
    },
  })

  let result = td.turndown(html)

  // Replace math/mermaid placeholders back to markdown syntax
  // 注意：必须用函数形式替换，因为 $$ 在 String.replace 中是特殊字符
  for (let i = 0; i < mathPlaceholders.length; i++) {
    const placeholder = `%%MATHPLACEHOLDER${i}%%`
    const replacement = mathPlaceholders[i]
    result = result.split(placeholder).join(replacement)
  }

  // Replace footnote placeholders back to [^id] syntax
  result = result.replace(/%%FOOTNOTE-([^%]+)%%/g, '[^$1]')

  if (footnoteDefs.length > 0) {
    const defLines = footnoteDefs
      .map((def) => `[^${def.id}]: ${def.content}`)
      .join('\n')
    return result + '\n\n' + defLines + '\n'
  }

  return result
}

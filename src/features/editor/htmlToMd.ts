import TurndownService from 'turndown'

/**
 * HTML → Markdown（P5-1 自 markdownConvert.ts 按方向拆出，实现逐字未动）。
 * 管线：脚注/公式/mermaid/plantuml/PDF 预提取占位符 → Turndown（规则注册见下方 addRule 序列，
 * 顺序敏感：data-type 专用规则先于通用标签规则）→ 占位符回填。
 */

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

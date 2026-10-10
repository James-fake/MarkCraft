import { HIGHLIGHT_COLORS, DEFAULT_HIGHLIGHT_COLOR } from './highlightColors'
import { underlineStyle } from './underlineColors'

/**
 * 自定义 Markdown 语法（本项目的方言）→ HTML 的预处理。
 *
 * ⚠️ **必须早于 marked 解析**，且是**单一来源**：
 *   - 所见即所得：`features/editor/mdToHtml.ts`
 *   - 预览：`hooks/useMarkdownRenderer.ts`
 * 此前预览直接喂 marked，导致 `==高亮|red==`、`++下划线|red++` 等在预览里**原样显示**
 * （真实事故 2026-10-10）。放在 core 是为了让 features 与 hooks 两侧都能引（不反向依赖）。
 */

export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
}

/**
 * 自定义行内/块级语法 → HTML 的预处理（**必须早于 marked 解析**）。
 *
 * ⚠️ 单一来源：所见即所得（`markdownToHtml`）与**预览**（`useMarkdownRenderer`）都调它。
 *    此前预览直接喂 marked，导致 `==高亮|red==`、`++下划线|red++` 等在预览里原样显示
 *    （真实事故 2026-10-10：用户报「切到预览还显示 ++…|red++」）。
 *
 * 只放**不依赖占位符**的规则；mermaid/plantuml/数学公式那几条用 `placeholders` 的规则
 * 留在 `markdownToHtml` 内部，不能搬出来。
 */
export function preprocessCustomSyntax(md: string): string {
  let processed = md
// ==text|color== 高亮转换为 <mark data-highlight-color="color">（在 marked 解析之前）
// 色名允许连字符（deep-orange / light-blue / deep-purple / light-green），故用 [-\w]+ 而非 \w+。
processed = processed.replace(/==([^=|]+)\|([-\w]+)==/g, (_m, text: string, color: string) =>
  `<mark data-highlight-color="${color}" style="background-color: ${HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS[DEFAULT_HIGHLIGHT_COLOR]}">${text}</mark>`)
// ==text== 高亮转换为 <mark>（默认黄色）
processed = processed.replace(/==([^=]+)==/g,
  (_m, text: string) => `<mark style="background-color: ${HIGHLIGHT_COLORS[DEFAULT_HIGHLIGHT_COLOR]}">${text}</mark>`)

// ++text|color++ 下划线转换为 <u data-underline-color="color">（在 marked 解析之前）
// 与高亮 ==text|color== 对称；色名同样允许连字符（deep-orange 等）。
// 'auto'（跟随正文）归一化为无属性 <u> —— 与 htmlToMarkdown 侧归一化互逆。
processed = processed.replace(/\+\+([^+|]+)\|([-\w]+)\+\+/g, (_match, text: string, color: string) =>
  color === 'auto'
    ? `<u style="${underlineStyle('auto')}">${text}</u>`
    : `<u data-underline-color="${color}" style="${underlineStyle(color)}">${text}</u>`)
// ++text++ 下划线（跟随正文颜色）。内容排除 | 与 + —— 避免把 ++a|b++ 这类
// 非色名竖线内容误吞进下划线（宁可原样显示，也不静默改内容）。
processed = processed.replace(/\+\+([^+|]+)\+\+/g,
  (_m, text: string) => `<u style="${underlineStyle('auto')}">${text}</u>`)

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
  return processed
}

/**
 * 把块级/行内公式提取成**占位符**，避免被 marked 破坏。
 *
 * ⚠️ 为什么必须占位而不是直接换成 HTML（真实事故 2026-10-11）：
 *    预览管线用 `renderMarkdown(..., { breaks: true })`，会把公式里的换行变成 `<br>` ——
 *    实测 `$$\n\sqrt{2}\n$$` 到 KaTeX 手里变成 `\sqrt{2}` 夹着 `&lt;br&gt;`，公式渲染成垃圾。
 *    先换成不含 `$`/换行的占位符、等 marked 跑完再回填，公式内容才能原样到达 KaTeX。
 *
 * ⚠️ 调用位置有讲究：必须在 **mermaid/plantuml 代码块提取之后**调用，
 *    否则代码块里的 `$` 会被误当成公式抽走。
 */
export function extractMathPlaceholders(md: string, placeholders: string[]): string {
  // 块级公式 $$...$$（多行或单行）
  let out = md.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex: string) => {
    const idx = placeholders.length
    placeholders.push(`<div data-type="mathBlock" data-latex="${escapeHtmlAttr(latex.trim())}"></div>`)
    return `MATHBLOCKPLACEHOLDER${idx}END`
  })
  // 行内公式 $...$
  out = out.replace(/\$([^$\n]+?)\$/g, (_match, latex: string) => {
    const idx = placeholders.length
    placeholders.push(`<span data-type="mathInlineNode" data-latex="${escapeHtmlAttr(latex)}"></span>`)
    return `MATHBLOCKPLACEHOLDER${idx}END`
  })
  return out
}

/**
 * marked 跑完后把占位符替换回真实 HTML（三种占位符共用一套前缀）。
 *
 * marked 可能把独占一行的占位符包进 `<p>`，故先匹配带 `<p>` 的形态再匹配裸形态。
 * 与 `extractMathPlaceholders` 一样，**编辑器与预览共用这一份**，避免两条管线各写一套而漂移。
 */
export function restorePlaceholders(html: string, placeholders: string[]): string {
  let result = html
  for (let i = 0; i < placeholders.length; i++) {
    for (const prefix of ['TOCPLACEHOLDER', 'MERMAIDPLACEHOLDER', 'MATHBLOCKPLACEHOLDER']) {
      result = result.replace(new RegExp(`<p>\\s*${prefix}${i}END\\s*</p>`, 'g'), placeholders[i])
      result = result.replace(new RegExp(`${prefix}${i}END`, 'g'), placeholders[i])
    }
  }
  return result
}

/** `escapeHtmlAttr` 的逆操作（含换行实体的还原） */
export function unescapeHtmlAttr(str: string): string {
  return str
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * 把「公式占位 HTML」还原成**原始 `$$...$$` / `$...$` 文本**，交给 KaTeX 渲染器处理。
 *
 * ⚠️ 为什么需要（真实事故 2026-10-11）：
 *    `data-type="mathBlock" data-latex="..."` 这个形态**只有 Tiptap 内核认识**（MathBlock 节点视图）。
 *    预览没有 Tiptap —— 它拿到的是一个**空 div**，公式直接消失（比原来显示 `$$` 更糟）。
 *    KaTeX 渲染器（utils/mathRenderer）扫的是 `$`，所以这里先解包回 `$$` 再交给它。
 */
export function unwrapLatexPlaceholders(html: string): string {
  return html
    .replace(
      /<div[^>]*data-type="mathBlock"[^>]*data-latex="([^"]*)"[^>]*>\s*<\/div>/g,
      (_m, latex: string) => `$$${unescapeHtmlAttr(latex)}$$`,
    )
    .replace(
      /<span[^>]*data-type="mathInlineNode"[^>]*data-latex="([^"]*)"[^>]*>\s*<\/span>/g,
      (_m, latex: string) => `$${unescapeHtmlAttr(latex)}$`,
    )
}

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

/** 转义**文本节点**内容（属性值请用 `escapeHtmlAttr`，两者上下文不同） */
function escapeHtmlText(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 图片属性语法 `![alt](src){width="200" align="left"}` → HTML（**必须早于 marked 解析**）。
 *
 * ⚠️ **单一来源**：所见即所得（`features/editor/mdToHtml`）与**预览**（`hooks/useMarkdownRenderer`）
 *    都必须调用本函数。此前只有所见即所得调用，预览漏了 —— 于是预览里图片对齐/缩放**毫无效果**，
 *    且把 `{align="left"}` 当普通文本**原样显示**在图片下方（真实事故 2026-10-11）。
 *
 * 产物用**内联样式**承载对齐/宽度，故不依赖任何 CSS，预览与所见即所得表现一致。
 */
export function preprocessImageAttrs(md: string): string {
  return md.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g,
    (_match, alt: string, src: string, attrsStr: string) => {
      const widthMatch = attrsStr.match(/width="(\d+)"/)
      const alignMatch = attrsStr.match(/align="(left|center|right)"/)
      const width = widthMatch ? widthMatch[1] : ''
      const align = alignMatch ? alignMatch[1] : 'center'
      const widthAttr = width ? ` width="${width}"` : ''
      return `<div data-align="${align}" style="text-align: ${align}; margin: 8px 0;"><img src="${escapeHtmlAttr(src)}" alt="${escapeHtmlAttr(alt)}"${widthAttr} style="max-width: 100%;${width ? ` width: ${width}px;` : ''}" /></div>`
    }
  )
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
  // —— 代码保护（S0 红线，2026-11-03 审查 P0-3）——
  // 方言行内规则会误伤代码内容：mermaid 的 `%%` 注释行、`A((圆节点))`、代码里的
  // `==`/`++`/`~`/`^`/`[[` 会被改写成 HTML 标签 —— 而 WYSIWYG 的保存路径会把
  // 改写后的文本原样写回 markdown，**打开→保存即永久损坏用户代码**（数据丢失）。
  //
  // 做法：把围栏代码块与行内代码整体抽成占位符，跑完全部规则后在函数末尾
  // （marked 之前）原样还原 —— 因此围栏语法对 marked、以及 mdToHtml 后续的
  // mermaid/plantuml 提取完全透明，预览与编辑器两条管线行为一致。
  const codeSegments: string[] = []
  const protectCode = (segment: string): string => {
    const idx = codeSegments.length
    codeSegments.push(segment)
    return `\uE000C${idx}\uE001`
  }
  /**
   * 只对「非占位符区段」应用规则。
   *
   * 已抽出的代码 / URL / 公式都以私有区占位符（`\uE000…\uE001`）存在，规则（尤其行内代码的
   * 反引号配对、URL 目标匹配）绝不能跨过它们二次匹配 —— 否则会产出**嵌套占位符**，
   * 单次还原后仍残留私有区字符，而这条管线的产物会被 WYSIWYG 原样写回用户 markdown
   * （数据损坏级，2026-11-08 审查 C 组）。
   */
  const applyOutsidePlaceholders = (input: string, fn: (segment: string) => string): string =>
    input
      .split(/(\uE000[UC]\d+\uE001)/g)
      .map((part, i) => (i % 2 === 1 ? part : fn(part)))
      .join('')

  let processed = md
    // ① 成对围栏（```lang … ``` / ~~~ … ~~~）
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, (m: string) => protectCode(m))
    // ② 未闭合围栏（编辑中的半成品）：从围栏行保护到文末。宁可少转换方言，
    //    也不把代码内容改坏 —— 保守方向与「数据零丢失」一致。
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*$/m, (m: string) => protectCode(m))
  // ③ 行内代码（`code` / ``code``）；未闭合的反引号不匹配 → 保持原样。
  //    跳过已占位的围栏区段，避免反引号跨占位符配对、把占位符包进新的代码段。
  processed = applyOutsidePlaceholders(processed, (segment) =>
    segment.replace(/(`+)([\s\S]*?)\1(?!`)/g, (m: string) => protectCode(m)),
  )

  // ⚠️ 先保护 URL 目标，再跑语法规则（真实事故 2026-10-11）：
  //    base64 data URL 的字母表含 `+`（尾部还有 `=`），会被下方 `++text++` 下划线、
  //    `==text==` 高亮等规则**误匹配**并改写成 `<u>…</u>` / `<mark>…</mark>`，
  //    把图片/链接的 URL 撕碎 → 预览、以及切回所见即所得后，整段显示成乱码。
  //    这里把「markdown 图片/链接目的地」与「HTML src/href 属性值」先抽成占位，
  //    跑完全部规则后原样还原；规则只作用于正文，绝不触碰 URL。
  const urls: string[] = []
  const protectUrl = (dest: string): string => {
    const idx = urls.length
    urls.push(dest)
    return `\uE000U${idx}\uE001`
  }
  processed = applyOutsidePlaceholders(processed, (segment) =>
    segment
      .replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (_m, pre: string, dest: string, post: string) => `${pre}${protectUrl(dest)}${post}`)
      .replace(/((?:src|href)\s*=\s*")([^"]*)(")/gi, (_m, pre: string, dest: string, post: string) => `${pre}${protectUrl(dest)}${post}`),
  )
// 数学段同样先抽占位（复用 urls 机制）：latex 里的 `^` `_` `~` 会被下面的行内规则误伤 ——
// `$E = mc^2$` 会被上标规则改写成 `mc<sup>2`，块级公式更会漏出 `</sup>` 碎片（真实事故 2026-11-03，
// 首启种子文档的公式渲染成乱码才发现）。还原发生在函数末尾，故 extractMathPlaceholders
// 在其后仍能看到完整的 `$...$` / `$$...$$`，公式节点不受影响。
// 同样跳过已占位区段：公式里若含链接/代码，它们已是占位符，不再二次包裹。
processed = applyOutsidePlaceholders(processed, (segment) =>
  segment.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, (m: string) => protectUrl(m)),
)
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
  // target 来自用户输入，属性值统一转义：`"` 会提前闭合属性、`<` 可注入标签。
  const safeTarget = escapeHtmlAttr(target)
  if (embedType === 'image') {
    return `<div data-embed="true" data-embed-target="${safeTarget}" data-embed-type="image"><img src="${safeTarget}" alt="${safeTarget}" /></div>`
  }
  // Support ![[file#heading]] — extract heading from target
  const hashIdx = target.indexOf('#')
  const headingAttr = hashIdx !== -1 ? ` data-embed-heading="${escapeHtmlAttr(target.slice(hashIdx + 1))}"` : ''
  return `<div data-embed="true" data-embed-target="${safeTarget}" data-embed-type="note"${headingAttr}></div>`
})

// Callout 语法: > [!type] title 或 > [!type]+/- title
// ⚠️ 必须**整块**转换（首行 + 后续连续的 `>` 内容行），不能先替换首行再回头处理内容行：
//    首行一旦变成 `<div>` 就不再以 `>` 开头，后续内容行会单独成块、失去归属，
//    结果是 `>` 前缀原样留在正文里（真实事故 2026-11-03，首启种子文档的 callout 露原文）。
processed = processed.replace(
  /^>[ \t]*\[!(\w+)\]([-+]?)[ \t]*(.*)((?:\n>.*)*)/gm,
  (_match, type: string, collapse: string, title: string, body: string) => {
    const calloutType = type.toLowerCase()
    const collapsible = collapse === '+' || collapse === '-'
    const titleAttr = title ? ` data-title="${escapeHtmlAttr(title)}"` : ''
    const collapseAttr = collapsible ? ' data-collapsible="true"' : ''
    const content = body ? body.replace(/^>[ \t]?/gm, '') : ''
    return `<div data-callout="true" data-callout-type="${calloutType}"${titleAttr}${collapseAttr}>${content}</div>`
  },
)

// 注释语法 %%text%% 转换为 <span data-comment>
processed = processed.replace(/%%([^%]+?)%%/g, (_match, text: string) => {
  return `<span data-comment>${text}</span>`
})

// [[target|label]] / [[target|关系:x]] / [[target|备注:x]] / [[target]] → <a data-wiki-link>
// ⚠️ 关系/备注前缀必须在这里解析（与 WikiLink.ts 的 Tiptap 输入规则对齐，2026-11-03 审查 P0-4）：
//    只在输入规则里解析时，**从 markdown 打开文件**会把 `设计稿|关系:依赖` 整串当 label，
//    关系语义丢失且编辑器显示错误。
// ⚠️ 属性值统一 escapeHtmlAttr：target/label 允许 `"`，不转义会让属性提前闭合、值被截断。
processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, pipe?: string) => {
  let label: string | undefined = pipe
  let relation = ''
  let note = ''
  if (pipe?.startsWith('关系:')) {
    relation = pipe.slice(3).trim()
    label = undefined
  } else if (pipe?.startsWith('备注:')) {
    note = pipe.slice(3).trim()
    label = undefined
  }
  const displayText = label || target
  const labelAttr = label ? ` data-wiki-label="${escapeHtmlAttr(label)}"` : ''
  const relationAttr = relation ? ` data-wiki-relation="${escapeHtmlAttr(relation)}"` : ''
  const noteAttr = note ? ` data-wiki-note="${escapeHtmlAttr(note)}"` : ''
  return `<a data-wiki-link data-wiki-target="${escapeHtmlAttr(target)}"${labelAttr}${relationAttr}${noteAttr}>${escapeHtmlText(displayText)}</a>`
})

// ((block-id)) 和 ((block-id|alias)) 块引用转换为 <span data-block-ref>
// 注意：不匹配 !((block-id)) 嵌入语法（前面有 !）
processed = processed.replace(/(^|[^!])\(\(([^)|]+)(?:\|([^)]+))?\)\)/g, (_match, prefix: string, blockId: string, alias?: string) => {
  const displayText = alias || `^${blockId}`
  const aliasAttr = alias ? ` data-block-alias="${escapeHtmlAttr(alias)}"` : ''
  return `${prefix}<span data-block-ref data-block-id="${escapeHtmlAttr(blockId)}"${aliasAttr}>${escapeHtmlText(displayText)}</span>`
})

// !((block-id)) 块嵌入保持为文本形式（由 Preview 层处理嵌入）
// 这里不做转换，保留原语法

// 定义列表：Term\n: Definition → <dl><dt>Term</dt><dd>Definition</dd></dl>
processed = processed.replace(/^([^:\s][^\n]*)\n:\s+(.+)$/gm, '<dl><dt>$1</dt><dd>$2</dd></dl>')

  // 还原被保护的 URL 目标与代码段（规则已跑完，正文改动完毕，此处原样放回）。
  // ⚠️ 必须**递归**还原：单次 `replace` 不会重扫替换结果，嵌套占位符（如公式里含链接、
  //    代码段里含 URL 占位符）会残留 `\uE000…\uE001` 私有区字符。这条管线的产物会被
  //    WYSIWYG 原样写回用户 markdown —— 私有区字符落进用户文件属于数据损坏（2026-11-08 审查 C 组）。
  //    用递归而非整串循环：递归只在「被还原出来的值」内部继续解析，不会重扫用户原文，
  //    深度上限则挡住畸形自引用，避免输出无限膨胀。
  const resolvePlaceholderTokens = (input: string, depth = 0): string => {
    if (depth > 20) return input
    return input.replace(/\uE000([UC])(\d+)\uE001/g, (_m, kind: string, idx: string) => {
      const value = kind === 'U' ? urls[Number(idx)] : codeSegments[Number(idx)]
      if (value === undefined) return ''
      return resolvePlaceholderTokens(value, depth + 1)
    })
  }
  processed = resolvePlaceholderTokens(processed)
  // 兜底：索引失效 / 循环引用等畸形输入若仍有残留，剥掉标记而不是把私有区字符交给用户。
  processed = processed.replace(/\uE000[UC]\d+\uE001/g, '')
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
  // ⚠️ 单次扫描替换所有占位符（O(L)），而不是「每个占位符各扫一遍全文」（O(P×L)）：
  //    20000 个公式占位符 × 200KB 正文会让后者退化成分钟级卡死（真实压测
  //    `stressAndPerf` 的「6 万 $」病态输入即卡在这里）。一次正则匹配全部占位符，
  //    按捕获到的下标直接取内容，复杂度只与正文长度线性相关。
  //    递归只在「被还原出来的占位内容」内部继续解析（占位内容里可能又含占位符，畸形/嵌套提取），
  //    深度上限挡住自引用膨胀；函数式 replacer 避免占位内容里的 `$&`/`$1` 被当成替换模式。
  const resolve = (input: string, depth: number): string => {
    if (depth > 20) return input
    return input.replace(
      /<p>\s*(?:TOC|MERMAID|MATHBLOCK)PLACEHOLDER(\d+)END\s*<\/p>|(?:TOC|MERMAID|MATHBLOCK)PLACEHOLDER(\d+)END/g,
      (_m, idxInP: string | undefined, idxBare: string | undefined) => {
        const idx = Number(idxInP ?? idxBare)
        const value = placeholders[idx]
        return value === undefined ? '' : resolve(value, depth + 1)
      },
    )
  }
  // 兜底：循环引用等畸形输入仍有残留时剥掉标记，避免内部占位符进入用户可见内容。
  return resolve(html, 0).replace(/(?:TOC|MERMAID|MATHBLOCK)PLACEHOLDER\d+END/g, '')
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

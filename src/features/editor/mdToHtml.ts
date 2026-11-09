import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import { renderMarkdown } from '@services/sanitizeHtml'
import { logger } from '@utils/logger'
import { preprocessCustomSyntax, preprocessImageAttrs, extractMathPlaceholders, restorePlaceholders, escapeHtmlAttr } from '@core/markdown/customSyntax'

/**
 * Markdown → HTML（P5-1 自 markdownConvert.ts 按方向拆出，实现逐字未动）。
 * 管线：图片占位符 → [TOC]/媒体/PDF/嵌入/callout/wikiLink/数学公式预处理 →
 * renderMarkdown（marked + DOMPurify 统一闸门）→ 占位符回填 → taskList/脚注 Tiptap 适配。
 */

/**
 * GFM 任务列表 → Tiptap TaskList/TaskItem 结构（打开文件时**唯一**的转换点）。
 *
 * 为什么用 DOM 而不是正则（旧实现的三连坑，真实事故 2026-11-03）：
 * 1. marked 输出 `<input checked="" disabled="" type="checkbox">` —— **checked 在 type 前**，
 *    旧正则写死 `type="checkbox"\s+checked` 顺序，全部失配 → 转换从未生效过；
 * 2. 旧正则 `[\s\S]*?<\/li>` 非贪婪，嵌套列表会在内层 `</li>` 处截断，直接撕碎结构；
 * 3. TaskItem 内容是 block+，marked 产出的裸文本必须包进 `<p>`，否则 Tiptap 解析时丢弃。
 *
 * DOM 遍历对嵌套天然正确：外层 li 包 <p> 时只收编开头的行内节点，内层 ul 原样保留，
 * 由后续（深度优先已捕获的内层 ul）继续转换。
 */
const TASK_BLOCK_TAGS = new Set([
  'P', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'DIV', 'TABLE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
])

/** 把 li 开头的连续行内节点包进 <p>（TaskItem 内容为 block+，裸文本会被丢弃） */
function wrapLeadingInlineNodes(li: Element): void {
  const doc = li.ownerDocument
  if (!doc) return
  const inlineNodes: Node[] = []
  for (const node of Array.from(li.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      inlineNodes.push(node)
      continue
    }
    if (node.nodeType === Node.ELEMENT_NODE && !TASK_BLOCK_TAGS.has((node as Element).tagName)) {
      inlineNodes.push(node)
      continue
    }
    break // 第一个块级元素（如嵌套 ul）—— 保留原位，不再收编
  }
  if (!inlineNodes.length) return
  const p = doc.createElement('p')
  li.insertBefore(p, inlineNodes[0])
  inlineNodes.forEach((n) => p.appendChild(n))
  const first = p.firstChild
  if (first && first.nodeType === Node.TEXT_NODE) {
    first.textContent = (first.textContent || '').replace(/^\s+/, '')
  }
}

/**
 * li 是否任务项。两种形态都要认（真实事故 2026-11-03）：
 * - 紧凑列表：`<li><input type=checkbox>文本</li>` —— input 是 li 的第一个元素；
 * - 松散列表（项之间有空行时 marked 的输出）：`<li><p><input …>文本</p></li>` ——
 *   input 被 <p> 包着，只查 firstElementChild 会漏判 → 勾选态在第二轮解析时丢失。
 */
function isTaskLi(li: Element): boolean {
  const first = li.firstElementChild
  if (!first) return false
  if (first.tagName === 'INPUT' && first.getAttribute('type') === 'checkbox') return true
  if (first.tagName === 'P') {
    const inner = first.firstElementChild
    return inner !== null && inner.tagName === 'INPUT' && inner.getAttribute('type') === 'checkbox'
  }
  return false
}

/** 单个 li → taskItem：读勾选态、移除 input、清理残留、包 <p> */
function convertToTaskItem(li: Element): void {
  const input = li.querySelector('input[type="checkbox"]') as Element | null
  if (!input) return // 防御：普通段的 li 不会被传进来
  const checked = input.hasAttribute('checked')
  // input 可能裸在 li 里，也可能被 loose list 的 <p> 包着 —— 两种位置都能摘
  const host = input.parentElement ?? li
  input.remove()
  li.setAttribute('data-type', 'taskItem')
  li.setAttribute('data-checked', checked ? 'true' : 'false')
  // input 原地会留下「换行 + 前导空白」的孤儿文本，清掉首节点的空白
  const firstText = host.firstChild
  if (firstText && firstText.nodeType === Node.TEXT_NODE) {
    firstText.textContent = (firstText.textContent || '').replace(/^\s+/, '')
  }
  // 紧凑形态：input 摘掉后剩裸文本（可能后跟嵌套 ul）——wrap 会把开头的行内内容
  // 包进 <p>、保留块级兄弟；松散形态 li 首子已是 <p>，wrap 内部判断后自然跳过。
  wrapLeadingInlineNodes(li)
}

/**
 * 混合列表（任务项与普通项混写）→ 按连续段拆分：
 * 任务段拆成 `ul[data-type=taskList]`，普通段保留原标签。
 *
 * 为什么必须拆而不是整表跳过：Tiptap 的 taskList 只接受 taskItem 子节点，
 * 整表跳过 = 勾选态在「打开文件」这一步就静默丢失 —— 用户写
 * `- [x] a` + `- 普通项` 是极常见的混排，信息零丢失优先于结构保守。
 */
function splitMixedList(list: Element): DocumentFragment | null {
  const doc = list.ownerDocument
  if (!doc) return null
  const frag = doc.createDocumentFragment()
  let segment: Element[] = []
  let segmentIsTask = false
  let splitAny = false

  const flush = () => {
    if (!segment.length) return
    if (segmentIsTask) {
      const ul = doc.createElement('ul')
      ul.setAttribute('data-type', 'taskList')
      segment.forEach((li) => {
        convertToTaskItem(li)
        ul.appendChild(li)
      })
      frag.appendChild(ul)
    } else {
      const wrapper = doc.createElement(list.tagName)
      segment.forEach((li) => wrapper.appendChild(li))
      frag.appendChild(wrapper)
    }
    segment = []
    splitAny = true
  }

  for (const li of Array.from(list.children)) {
    if (li.tagName !== 'LI') continue
    const task = isTaskLi(li)
    if (segment.length && task !== segmentIsTask) flush()
    if (!segment.length) segmentIsTask = task
    segment.push(li)
  }
  flush()

  return splitAny ? frag : null
}

export function convertTaskListsForTiptap(html: string): string {
  if (!html.includes('<input')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let changed = false

  doc.body.querySelectorAll('ul, ol').forEach((list) => {
    const items = Array.from(list.children).filter((c) => c.tagName === 'LI')
    if (!items.length) return
    const hasTask = items.some(isTaskLi)
    if (!hasTask) return

    if (items.every(isTaskLi)) {
      // 纯任务列表：整表转换
      list.setAttribute('data-type', 'taskList')
      items.forEach(convertToTaskItem)
      changed = true
      return
    }
    // 混合列表：按连续段拆分（信息零丢失）
    const frag = splitMixedList(list)
    if (frag) {
      list.replaceWith(frag)
      changed = true
    }
  })

  return changed ? doc.body.innerHTML : html
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

// 图片属性语法 `![alt](src){width align}` → HTML 的预处理已下沉到
// `@core/markdown/customSyntax#preprocessImageAttrs`（与预览共用，避免双管线漂移）。

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
      return `<div data-media-embed="true" data-media-type="video"><video src="${escapeHtmlAttr(src)}" controls></video></div>`
    })

    // ![audio](url) 转换为 <audio> 标签
    processed = processed.replace(/!\[audio\]\(([^)]+)\)/gi, (_match, src) => {
      return `<div data-media-embed="true" data-media-type="audio"><audio src="${escapeHtmlAttr(src)}" controls></audio></div>`
    })

    // @[iframe](url) 转换为 <iframe> 标签
    processed = processed.replace(/@\[iframe\]\(([^)]+)\)/gi, (_match, src) => {
      // 仅允许 http/https 嵌入，杜绝 javascript:/data: 等向量；去掉 allow-same-origin 防止沙箱逃逸
      const safeSrc = /^(https?:\/\/)/i.test(src.trim()) ? src.replace(/"/g, '%22') : ''
      return safeSrc ? `<iframe src="${safeSrc}" sandbox="allow-scripts"></iframe>` : ''
    })

    // C3：@[pdf](url) 或 @[pdf](pdfId) 转换为 <div data-type="pdfEmbed">
    processed = processed.replace(/@\[pdf\]\(([^)]+)\)/gi, (_match, value) => {
      const v = value.trim()
      if (/^https?:\/\//i.test(v) || v.startsWith('/') || v.startsWith('blob:')) {
        return `<div data-type="pdfEmbed" data-src="${escapeHtmlAttr(v)}"></div>`
      }
      return `<div data-type="pdfEmbed" data-pdf-id="${escapeHtmlAttr(v)}"></div>`
    })

    // 包装不支持的 HTML 块为 data-raw-html div（供 Tiptap RawHtmlBlock 解析）
    // 匹配独立行上的 HTML 块标签如 <details>, <summary>, <marquee> 等
    processed = processed.replace(/^<(details|summary|marquee|abbr|kbd|var|samp|dialog|meter|progress|output|picture|template|slot|portal)(\s[^>]*)?>[\s\S]*?<\/\1>/gim, (match) => {
      const escaped = escapeHtmlAttr(match)
      return `<div data-raw-html="true" data-html="${escaped}"></div>`
    })

    // 自定义语法 → HTML（与预览共用同一份规则，见 preprocessCustomSyntax）
    processed = preprocessCustomSyntax(processed)

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

    // 提取公式（块级 + 行内）→ 占位符；与预览共用同一份实现（@core/markdown/customSyntax）
    processed = extractMathPlaceholders(processed, placeholders)

    // M-1：经统一闸门 renderMarkdown（marked 解析 + DOMPurify 净化），杜绝漏消毒。
    const raw = renderMarkdown(processed, { gfm: true, breaks: true })

    // 将占位符替换回 HTML（与预览共用同一份实现）
    const result = restorePlaceholders(raw, placeholders)

    const withTaskLists = convertTaskListsForTiptap(result)
    return convertFootnotesForTiptap(withTaskLists)
  } catch (err) {
    // 优雅降级不变（转义后的原始 md），但必须留下可排查的线索：
    // 此前静默 catch 让线上渲染异常完全无迹可寻（2026-11-08 审查 C 组）。
    logger.error('markdownToHtml 渲染失败，已降级为纯文本：', err)
    return `<p>${md.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  }
}

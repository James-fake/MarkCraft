/**
 * 单一 HTML 消毒闸门。
 *
 * 所有 `marked.parse` 产出或用户原始 HTML 在注入 DOM / 打包为 EPUB 之前，必须经由本模块，
 * 禁止在业务代码中各自 `DOMPurify.sanitize(...)` 或（更危险地）直接 `innerHTML`/`dangerouslySetInnerHTML`。
 *
 * 背景：代码审查发现 RawHtmlBlock 零净化直注 DOM、EmbedContentView 跨笔记 XSS，以及 marked 管线
 * 从未净化 body、消毒散落各消费端（见 code-review-report.md C-1 / C-2 / M-1）。本模块把消毒职责
 * 收敛到一处，新增消费点不可能再「忘记消毒」。
 *
 * 配置对齐 Preview 的阅读渲染需求（数学 / KaTeX / mermaid / 代码块 / 块引用等保留），并集中维护。
 */
import DOMPurify from 'dompurify'
import { marked } from './markedConfig'
import type { MarkedOptions } from 'marked'

export const MARKDOWN_SANITIZE_CONFIG = {
  ADD_TAGS: [
    'style', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
    'mfrac', 'msqrt', 'mroot', 'munder', 'mover', 'munderover', 'mtable', 'mtr',
    'mtd', 'mtext', 'mspace', 'mpadded', 'mphantom', 'mfenced',
  ],
  ADD_ATTR: [
    'data-theme', 'data-code', 'data-image-index', 'data-line', 'data-source-line',
    'data-block-id', 'data-embed', 'data-mermaid', 'data-latex', 'data-type',
    // C3 PDF 嵌入（@[pdf](url|pdfId)）必需：缺失会被闸门剥除导致嵌入退化为空 div
    'data-src', 'data-pdf-id',
    // 高亮/下划线 16 色与媒体嵌入（video/audio）往返必需，同属 markdown 管线产出
    'data-highlight-color', 'data-underline-color', 'data-media-embed', 'data-media-type',
    // 图片对齐 `![alt](src){align="left"}` 往返必需：ImageNode 靠 data-align 解析对齐，
    // 缺失会被闸门剥除 → 对齐在「保存→markdown→重载」后丢失（真实事故 2026-10-11）。
    'data-align',
    // Callout `> [!tip] 标题` 往返必需（真实事故 2026-11-03）：这组属性被剥后只剩空 <div>，
    // 标题文本随 data-title 一起消失，htmlToMd 也认不出 callout → 内容静默丢失。
    'data-callout', 'data-callout-type', 'data-collapsible', 'data-title',
    // 双链 [[target|label]] 往返必需（真实事故 2026-11-03 全面测试轮）：属性被剥后 <a> 退化
    // 为普通链接，「打开文件 → 保存」会让 [[双链]] 永久变成纯文本 —— 数据丢失级。
    'data-wiki-link', 'data-wiki-target', 'data-wiki-label',
    // 双链的关系/备注/断链/模糊/反链计数（WikiLink.ts 的全部 mark 属性）：被剥后
    // 「关系:」「备注:」语义在往返中丢失，htmlToMd 只能回退成 [[x|x]] 垃圾语法。
    'data-wiki-relation', 'data-wiki-note', 'data-wiki-broken', 'data-wiki-fuzzy',
    'data-wiki-backlink-count',
    // [TOC] 往返必需（2026-11-03 审查 P0-4）：data-toc 被剥 → TocNode 匹配失败 →
    // 目录退化为普通段落，「打开→保存」后 [TOC] 永久丢失。
    'data-toc',
    // 嵌入 ![[target]] 往返必需：data-embed-target/type/heading 被剥 → 嵌入退化为空 div。
    'data-embed-target', 'data-embed-type', 'data-embed-heading',
    // 注释 %%text%% 与块引用别名/引用：同为纯数据属性，剥离即功能失效。
    'data-comment', 'data-block-alias', 'data-block-ref',
    // RawHtmlBlock（<details> 等用户 HTML 块）：data-html 值是转义后的原始 HTML 文本，
    // DOMPurify 不解析属性值、无执行面；渲染层（RawHtmlBlock.ts:47）有 sanitizeRawHtml 闸门。
    'data-raw-html', 'data-html',
    'title', 'xmlns', 'contenteditable',
  ],
  ALLOW_DATA_ATTR: false,
}

/** 净化 markdown 渲染产物 / 一般 HTML。剥离 <script> 与所有 on* 事件处理器。 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, MARKDOWN_SANITIZE_CONFIG)
}

/**
 * 原始 HTML 块特性：允许受限 iframe（演示 / 嵌入），但剥离所有 on* 事件与 <script>。
 * 用于 RawHtmlBlock —— 保留「嵌入富 HTML」的语义，同时消除脚本执行面。
 *
 * H-5：不再放行 `srcdoc`。其值是内联 HTML 文档，DOMPurify 不解析属性值，
 * `<iframe srcdoc="<img src=x onerror=...>">` 会原样保留并在加载时执行脚本（实测 3.4.8）；
 * `sandbox` 也不再放行用户值，净化后统一覆写为不含 `allow-same-origin` 的安全值，
 * 与 IframeNode.ts:43 的决策一致 —— `allow-scripts` + `allow-same-origin` 组合下同源
 * iframe 可移除自身沙箱、触达应用 DOM/存储（Electron 标准逃逸向量）。
 * `data-html`（MARKDOWN_SANITIZE_CONFIG.ADD_ATTR）承载的原始 HTML 文本同样经本闸门二次净化，
 * 因此不会引入 iframe srcdoc / 可执行内联文档。
 */
export function sanitizeRawHtml(html: string): string {
  const body = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'style'],
    RETURN_DOM: true,
  }) as HTMLElement
  body.querySelectorAll('iframe').forEach((iframe) => {
    iframe.setAttribute('sandbox', 'allow-scripts')
  })
  return body.innerHTML
}

/**
 * 统一渲染闸门：marked 解析后必过净化。业务侧应优先调用此函数而非裸 `marked.parse`，
 * 从根本上杜绝「新增消费点忘记消毒」。
 */
export function renderMarkdown(md: string, opts?: MarkedOptions): string {
  return sanitizeHtml(marked.parse(md, opts) as string)
}

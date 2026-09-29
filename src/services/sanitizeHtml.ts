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
 */
export function sanitizeRawHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', 'srcdoc', 'sandbox', 'style'],
  })
}

/**
 * 统一渲染闸门：marked 解析后必过净化。业务侧应优先调用此函数而非裸 `marked.parse`，
 * 从根本上杜绝「新增消费点忘记消毒」。
 */
export function renderMarkdown(md: string, opts?: MarkedOptions): string {
  return sanitizeHtml(marked.parse(md, opts) as string)
}

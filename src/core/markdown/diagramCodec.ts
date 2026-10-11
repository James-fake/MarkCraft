/**
 * 图表代码（mermaid / mindmap / plantuml）在 DOM 占位上的 **base64(UTF-8) 编解码**。
 *
 * ⚠️ 为什么单独成模块：这三条管线**各自**在代码里写过一份等价实现 ——
 *   - 产出端：`hooks/useMarkdownRenderer.ts`（mermaid 与 plantuml 各内联一份）
 *   - 消费端：`features/editor/extensions/mermaidCache.ts`（decodeDiagramCode）
 *   同一条协议写三遍，任何一处改动都会让「占位能产出但解不出来」（或反之）——
 *   这正是本项目反复出问题的一类 bug（两条管线漂移）。
 *
 * 协议：`btoa(unescape(encodeURIComponent(code)))` —— 先用 encodeURIComponent + unescape
 * 把 UTF-8 摊成 latin1 每字符一字节，再 base64。中文/换行/`%%` 标记都能安全往返。
 *
 * 放在 `@core` 是为了让 features 与 hooks 两侧都能引（不产生反向依赖）。
 */

/** 把图表代码编码为可安全写进 HTML 属性的 base64(UTF-8) 字符串 */
export function encodeDiagramCode(code: string): string {
  return btoa(unescape(encodeURIComponent(code)))
}

/** `encodeDiagramCode` 的逆运算；数据损坏时返回空串（调用方据此降级，不抛错） */
export function decodeDiagramCode(b64: string): string {
  try {
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

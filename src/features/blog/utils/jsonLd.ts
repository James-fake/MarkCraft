/**
 * JSON-LD 内联序列化（安全）。
 *
 * `JSON.stringify` 不转义 `<`/`>`/`&`；当 JSON-LD 内联进
 * `<script type="application/ld+json">…</script>` 时，用户可控字段（标题/描述/作者等）
 * 若含 `</script>` 会提前闭合脚本块，其后内容成为真实标签 → XSS。
 *
 * 转义为 `\u003c` 等：在 JSON 字符串内合法、`JSON.parse` 后与原值等价，但 HTML 解析器
 * 不再将其识别为标签/脚本边界。
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

/**
 * 防御性 JSON 解析工具。
 *
 * 持久化数据（localStorage / IndexedDB / 导入文件）可能因写入中断、版本迁移残留
 * 或外部文件损坏而变成非法 JSON。`JSON.parse` 直接解析会在 SyntaxError 时沿调用链
 * 冒泡，导致白屏或功能失效。统一经由本工具，损坏时回退默认值而非崩溃。
 *
 * 用法：
 *   const state = safeJsonParse(raw, defaultState)
 *   const maybe = safeJsonParseOrNull<Foo>(raw)
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 解析失败时回退 null（适用于「有则解析、无则 null」的读取点）。 */
export function safeJsonParseOrNull<T>(raw: string | null | undefined): T | null {
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

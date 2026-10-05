/**
 * 计算字符串的 UTF-8 字节数。
 *
 * 用于替代 `new Blob([str]).size`：后者为了拿一个长度就分配整个 Blob（复制字符串），
 * 在「列表逐项」「每次渲染都算」的场景下开销显著（审查 M5）。
 * TextEncoder.encode 仍需一次拷贝，但比构造 Blob 便宜一个数量级。
 */
let sharedEncoder: TextEncoder | null = null

export function byteLength(text: string): number {
  if (!sharedEncoder) sharedEncoder = new TextEncoder()
  return sharedEncoder.encode(text).length
}

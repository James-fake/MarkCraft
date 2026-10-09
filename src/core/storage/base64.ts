/** base64 ↔ 字节（blob 落盘用；浏览器与 Electron 渲染进程都可用） */

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000 // 分块，避免 String.fromCharCode 参数过多导致栈溢出
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * Blob → 字节。
 * ⚠️ jsdom 的 `Blob` **未实现** `arrayBuffer()`（真实浏览器 / Electron 有）→ 用 FileReader 兜底，
 * 否则任何「保存 PDF」的用例在 jsdom 里都会直接抛 `arrayBuffer is not a function`。
 */
export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

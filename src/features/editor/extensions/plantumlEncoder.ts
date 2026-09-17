// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：PlantUML 编码器，唯一消费者是同目录的 PlantUmlBlockView。
// ⚠️ 它依赖 @core/constants/plantuml（L1），因此**不可**下沉 src/utils（L0）——
// 层级纪律要求 L0「只允许 utils → types」，落下去即新增 utils → core 越权边。
import { deflateRaw } from 'pako'
import { DEFAULT_PLANTUML_ENDPOINT } from '@core/constants/plantuml'

export { DEFAULT_PLANTUML_ENDPOINT }

/**
 * PlantUML 文本编码工具。
 *
 * PlantUML 服务端协议：把源码用 raw deflate 压缩后，按其专用的 64 进制字母表
 * （0-9 A-Z a-z - _）编码，拼到端点后即可请求图片：
 *   https://www.plantuml.com/plantuml/svg/<encoded>
 *
 * 与标准 base64 的差别只在字母表与补位规则，因此必须自己实现，不能用 btoa。
 */

/** PlantUML 专用 6bit → 字符映射 */
export function encode6bit(b: number): string {
  let v = b
  if (v < 10) return String.fromCharCode(48 + v) // 0-9
  v -= 10
  if (v < 26) return String.fromCharCode(65 + v) // A-Z
  v -= 26
  if (v < 26) return String.fromCharCode(97 + v) // a-z
  v -= 26
  if (v === 0) return '-'
  if (v === 1) return '_'
  return '?'
}

/** 将 3 字节打包为 4 个 6bit 字符 */
function append3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6)
  const c4 = b3 & 0x3f
  return encode6bit(c1 & 0x3f) + encode6bit(c2 & 0x3f) + encode6bit(c3 & 0x3f) + encode6bit(c4 & 0x3f)
}

/** 对已压缩的字节流做 PlantUML 64 进制编码 */
export function encodePlantUmlBytes(bytes: Uint8Array | number[]): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    if (i + 2 === bytes.length) {
      out += append3bytes(bytes[i], bytes[i + 1], 0)
    } else if (i + 1 === bytes.length) {
      out += append3bytes(bytes[i], 0, 0)
    } else {
      out += append3bytes(bytes[i], bytes[i + 1], bytes[i + 2])
    }
  }
  return out
}

/** UTF-8 编码为字节数组（兼容无 TextEncoder 的环境） */
function toUtf8Bytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text)
  const binary = unescape(encodeURIComponent(text))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** 把 PlantUML 源码编码为可直接拼进 URL 的字符串 */
export function encodePlantUml(code: string): string {
  const compressed = deflateRaw(toUtf8Bytes(code), { level: 9 })
  return encodePlantUmlBytes(compressed)
}

/** 规范化端点：去掉尾部斜杠；空值返回空串（表示禁用远程渲染） */
export function normalizePlantUmlEndpoint(endpoint?: string | null): string {
  const raw = (endpoint ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\/+$/, '')
}

/**
 * 构造 PlantUML 渲染 URL。
 * 端点为空时返回 null —— 调用方据此降级为纯代码块展示。
 */
export function buildPlantUmlUrl(code: string, endpoint?: string | null): string | null {
  const base = normalizePlantUmlEndpoint(endpoint ?? DEFAULT_PLANTUML_ENDPOINT)
  if (!base) return null
  if (!code.trim()) return null
  return `${base}/${encodePlantUml(code)}`
}

/**
 * 补全 @startuml / @enduml 包裹。
 * PlantUML 服务端对缺少包裹的源码会报语法错误，这里做一次容错。
 */
export function ensurePlantUmlWrapper(code: string): string {
  const trimmed = code.trim()
  if (/^@start\w+/i.test(trimmed)) return trimmed
  return `@startuml\n${trimmed}\n@enduml`
}

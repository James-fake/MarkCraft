// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：PlantUML 编码器 + **预览侧的 DOM 渲染器**（2026-10-11 追加，见文件末尾）。
// 消费者有两个：同目录的 PlantUmlBlockView（所见即所得节点视图）与 features/preview/Preview。
// ⚠️ 它依赖 @core/constants/plantuml（L1），因此**不可**下沉 src/utils（L0）——
// 层级纪律要求 L0「只允许 utils → types」，落下去即新增 utils → core 越权边。
import { deflateRaw } from 'pako'
import { DEFAULT_PLANTUML_ENDPOINT, PLANTUML_DIAGRAM_CLASS } from '@core/constants/plantuml'
import { decodeDiagramCode } from '@core/markdown/diagramCodec'

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

// ── 预览侧的 DOM 渲染器（与所见即所得节点视图共用同一套 URL 构造，避免两条管线漂移） ──

/**
 * 把容器里**尚未渲染**的 `.plantuml-diagram[data-code]` 渲染成 SVG。
 *
 * ⚠️ 真实事故（2026-10-11 用户报障）：PlantUML 在所见即所得/源码模式正常，**预览窗格一直转圈**。
 *    根因与 mermaid/mindmap 那次**完全同类**：预览管线（`hooks/useMarkdownRenderer.ts`）
 *    只把代码块换成占位 `<div class="plantuml-diagram plantuml-loading" data-code="...">`，
 *    而全仓唯一的渲染器是 Tiptap 的 PlantUmlBlockView（**节点视图**）—— 预览没有 Tiptap 实例，
 *    没有任何组件认领这个占位 → loading 永远不消失。
 *
 * 渲染策略与节点视图一致（见 PlantUmlBlockView）：
 *  1. 端点可用 → 用 `<img>` 请求远程 SVG（img 不受 CORS 限制，公共端点最稳）。
 *  2. 加载失败 / 端点为空 → **降级为可读源码**，绝不吞掉用户内容。
 *
 * 渲染成功置 `data-rendered="true"`：预览的 morphdom 更新据此保留已渲染的图（不再退回 loading）。
 */
export function renderPlantUmlInDom(
  container: HTMLElement,
  endpoint: string | undefined,
  labels: { noEndpoint: string; renderFailed: string },
): void {
  const nodes = container.querySelectorAll<HTMLElement>(`.${PLANTUML_DIAGRAM_CLASS}[data-code]`)
  if (!nodes.length) return

  for (const el of Array.from(nodes)) {
    if (el.dataset.rendered === 'true') continue
    const code = decodeDiagramCode(el.dataset.code || '')
    const src = code.trim() ? buildPlantUmlUrl(ensurePlantUmlWrapper(code), endpoint) : null

    if (!src) {
      degradePlantUml(el, labels.noEndpoint, code)
      continue
    }

    const img = document.createElement('img')
    // ⚠️ 必须真的设 src —— 曾漏掉这一行，结果生成了一个永远不加载的 <img>，
    //    图不出来、load/error 都不触发 → 占位永远停在 loading（由回归锁抓出）。
    img.src = src
    img.alt = 'PlantUML diagram'
    img.style.maxWidth = '100%'
    img.style.display = 'block'
    img.style.margin = '0 auto'
    // 元素可能在图片加载完成前就被 morphdom 换掉（内容又变了）→ 加 isConnected 守卫
    img.addEventListener('load', () => {
      if (!el.isConnected) return
      el.classList.remove('plantuml-loading')
      el.classList.add('plantuml-rendered')
      el.dataset.rendered = 'true'
    })
    img.addEventListener('error', () => {
      if (!el.isConnected) return
      degradePlantUml(el, labels.renderFailed, code)
    })
    el.replaceChildren(img)
  }
}

/**
 * 降级为可读源码。
 *
 * 复用 `styles/mermaid.css` 里**早已定义好**的 `.plantuml-failed` / `.plantuml-fallback`
 * 结构 —— 那套样式此前一直没有渲染器去用（和 mermaid 缺渲染器同因），本次正好填上。
 * 用 DOM API 构造（而非拼 innerHTML）以免源码里的 `<` 造成 XSS。
 */
function degradePlantUml(el: HTMLElement, message: string, code: string): void {
  const wrap = document.createElement('div')
  wrap.className = 'plantuml-fallback'
  const hint = document.createElement('div')
  hint.className = 'plantuml-fallback-hint'
  hint.textContent = message
  const pre = document.createElement('pre')
  const codeEl = document.createElement('code')
  codeEl.textContent = code
  pre.appendChild(codeEl)
  wrap.appendChild(hint)
  wrap.appendChild(pre)

  el.classList.remove('plantuml-loading')
  el.classList.add('plantuml-failed')
  el.replaceChildren(wrap)
  el.dataset.rendered = 'true'
}

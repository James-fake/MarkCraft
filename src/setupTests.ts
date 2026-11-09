import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { resetStorageBackendForTests } from '@core/storage/backend'

// 测试环境锁定系统语言为 zh-CN：
// 旧版 LanguageStore 默认硬编码 'zh'；改为「首次运行跟随系统语言」后，jsdom 默认
// navigator.language 为 'en-US'，会让大量断言中文文案的用例在测试环境里渲染成英文而失败。
// 这里把测试环境的「系统语言」固定为 zh-CN，等价于「中文系统」，既还原旧默认行为、
// 又覆盖「跟随系统→中文」这条路径；显式 setItem('markcraft-language','en') 的用例不受影响。
try {
  Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true })
} catch (err) {
  // 某些 jsdom 版本 language 不可覆写：不阻断测试，但必须留痕——否则将来 i18n 断言回归时无线索。
  console.warn('[setupTests] 无法覆写 navigator.language，部分中文文案断言可能受影响', err)
}



/**
 * 存储层隔离（每个用例一份干净内存后端）。
 *
 * 背景：存储层在 jsdom 下退化为**模块级单例内存后端**。若不重置，同一测试文件内的用例会
 * 互相看到对方写入的数据（例：BlogPanel.smoke 的多段重挂会读到上一段持久化的树，
 * 节点 id 变化导致「单篇发布」来源条闪断）。
 * 以前这里没有这个问题 —— 那时 IndexedDB 在 jsdom 直接抛错，等于**没有持久化**。
 */
beforeEach(() => {
  resetStorageBackendForTests()
})


// jsdom 缺失的浏览器 API 兜底（真实浏览器存在，仅测试环境需要）
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
  } as unknown as typeof ResizeObserver
}

// jsdom 未实现 matchMedia：BlogPanel 的 CssPanel 在挂载时读 prefers-color-scheme
// （`window.matchMedia('(prefers-color-scheme: dark)').matches`），缺它会挂载即崩 ——
// 于是「博客 → 高级组 → CSS 子面板」这条路径在 jsdom 里永远测不到。
// 真实浏览器存在，仅测试环境给最小桩：matches 恒 false（等价「非系统深色」）。
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom 缺失的浏览器 API 兜底（Excalidraw 在模块顶层执行 canvas-roundrect-polyfill，
// 裸引用 Path2D.prototype 会抛 ReferenceError，导致 import 链上所有 aurora 测试收集阶段崩溃）。
// 仅补 Path2D 最小桩即可：polyfill 其余全局（CanvasRenderingContext2D / OffscreenCanvasRenderingContext2D）
// 均经 if (globalThis.X) 守卫，不会裸访问。
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {
    addPath = () => {}
  } as unknown as typeof Path2D
}

// ProseMirror/Tiptap 视口插件在挂载时调用 elementFromPoint，jsdom 未实现会导致编辑器挂载即崩。
// 真实浏览器存在，仅测试环境补最小桩（返回 null 即可，不影响逻辑）。
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}
if (typeof Element !== 'undefined' && !(Element.prototype as unknown as { elementFromPoint?: unknown }).elementFromPoint) {
  (Element.prototype as unknown as { elementFromPoint?: () => null }).elementFromPoint = () => null
}

// jsdom 的 document.defaultView 为 null 时，部分三方库（如 Excalidraw 的 ImageExportDialog）
// 会执行 `'filter' in document.defaultView.CSS.supports(...)` 之类的探测，裸访问即抛
// TypeError: Cannot use 'in' operator to search for 'filter' in null。
// 真实浏览器 defaultView 恒为 window；测试环境补齐最小 CSS.supports 桩。
if (typeof document !== 'undefined') {
  const dv = document.defaultView as unknown as { CSS?: unknown } | null
  if (!dv || !dv.CSS) {
    try {
      Object.defineProperty(document, 'defaultView', {
        configurable: true,
        get: () => ({
          CSS: { supports: () => false, escape: (s: string) => s },
          getComputedStyle: () => ({ getPropertyValue: () => '' }),
          matchMedia: window.matchMedia,
          requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0),
          cancelAnimationFrame: (id: number) => clearTimeout(id),
        }),
      })
    } catch { /* 已存在不可覆写 */ }
  }
}

// jsdom 未实现 canvas：getContext 抛 "Not implemented"（或返回 null）。
// Excalidraw 在模块顶层执行 `'filter' in canvas.getContext('2d')` —— 抛错/返回 null
// 都会让整条 import 链崩溃。补一个返回带 filter 的最小 2d 上下文桩。
if (typeof HTMLCanvasElement !== 'undefined') {
  // 用 Proxy 兜底：任何未显式声明的 2d 上下文方法都返回 no-op，
  // 避免「桩漏了某个方法」导致被测组件（如 MinimapTab 的 fillText）在 jsdom 下抛错。
  const makeCtx = () => {
    const target: Record<string, unknown> = {
      filter: 'none',
      canvas: null,
      measureText: () => ({ width: 0 }),
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => null,
      isPointInPath: () => false,
      isPointInStroke: () => false,
    }
    return new Proxy(target, {
      get(t, prop) {
        if (prop in t) return t[prop as string]
        // 未知属性：函数名一律返回 no-op，其余返回 undefined 之外的安全值
        return typeof prop === 'string' && prop !== 'then' ? () => {} : undefined
      },
      set(t, prop, value) {
        t[prop as string] = value
        return true
      },
    })
  }
  try {
    HTMLCanvasElement.prototype.getContext = function () {
      return makeCtx()
    } as unknown as typeof HTMLCanvasElement.prototype.getContext
  } catch { /* ignore */ }
  if (!HTMLCanvasElement.prototype.toDataURL) {
    try {
      HTMLCanvasElement.prototype.toDataURL = (() => 'data:image/png;base64,') as unknown as typeof HTMLCanvasElement.prototype.toDataURL
    } catch { /* ignore */ }
  }
}



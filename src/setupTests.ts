import '@testing-library/jest-dom/vitest'

// jsdom 缺失的浏览器 API 兜底（真实浏览器存在，仅测试环境需要）
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
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
    addPath() {}
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

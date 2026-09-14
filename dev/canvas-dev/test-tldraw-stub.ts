// 仅用于 Node 端无头测试：桩实现 tldraw 的运行时导入，避免浏览器全局（window/document）污染。
export function getSnapshot() {
  return { document: { store: {}, schema: {} }, session: {} }
}
export function loadSnapshot() {
  /* noop */
}

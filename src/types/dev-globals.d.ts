/**
 * 开发期全局（仅 dev 构建经 ExcalidrawCanvas 暴露，供自动化探针 / 调试使用）。
 * 生产构建不会写入这些字段。
 * 注意：本文件为全局脚本（无顶层 import/export），`interface Window` 会与 lib.dom 合并。
 */
interface Window {
  __canvasEngine?: unknown
  __exapi?: unknown
  __plan03_filled?: unknown
}

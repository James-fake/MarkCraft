/**
 * Canvas v2 导出工具（Excalidraw 混合架构版）
 *
 * 提供当前生产引擎可用的两种导出：
 * - exportCanvasJSON：完整数据（混合文档 v2，可经「导入」恢复）—— 白板数据的完整出口
 * - exportCanvasPNG：Excalidraw 场景图片（几何/箭头/卡片占位框；卡片富文本为 HTML 浮层不在图内）
 */
import type { CanvasEngine } from '../engine/CanvasEngine'
import { serializeCanvas } from '../canvasPersistence'

/**
 * 通用下载函数：通过临时 <a> 触发浏览器下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放，避免某些浏览器下载中断
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 导出当前画布为完整数据 JSON（混合文档 v2：{version, viewport, elements, shapes}）。
 * 与自动保存同源（serializeCanvas），可用「导入」恢复 —— 白板数据的完整出口。
 */
export function exportCanvasJSON(engine: CanvasEngine, filename: string): void {
  const data = serializeCanvas(engine)
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const name = filename.endsWith('.json') ? filename : `${filename}.json`
  downloadBlob(blob, name)
}

/**
 * 导出当前画布为 PNG 图片（经 Excalidraw 场景导出）。
 *
 * ⚠️ 混合架构限制：卡片是 HTML 浮层，不在 Excalidraw 场景内——
 * PNG 仅含几何元素 / 箭头 / 卡片占位框，不含卡片富文本内容。
 * 完整数据请用 exportCanvasJSON。
 *
 * @returns 是否成功（引擎未就绪 / 导出异常时返回 false，由调用方提示降级）
 */
export async function exportCanvasPNG(engine: CanvasEngine, filename: string): Promise<boolean> {
  const api = engine.excalidrawAPI
  if (!api) return false
  try {
    // 动态 import：避免顶层加载 @excalidraw（其开发版在 jsdom 缺 Path2D 会崩；
    // 且 CanvasPanel → canvasExport 的引用链不应强制引入 excalidraw 运行时）
    const { exportToBlob } = await import('@excalidraw/excalidraw')
    const elements = api.getSceneElements()
    const appState = api.getAppState()
    const blob = await exportToBlob({
      elements,
      appState,
      files: {},
      mimeType: 'image/png',
      scale: 2,
    })
    const name = filename.endsWith('.png') ? filename : `${filename}.png`
    downloadBlob(blob, name)
    return true
  } catch {
    return false
  }
}

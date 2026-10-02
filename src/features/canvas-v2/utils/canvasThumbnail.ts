import type { CanvasEngine } from '../engine/CanvasEngine'
import { upsertCanvasThumbnail } from '../canvasStore'

/**
 * 白板缩略图（P2-2 / P4-5 自 CanvasPanel.tsx 抽离）：5s 节流生成场景小图 → 列表封面。
 * 降采样 0.4 导出 PNG dataURL 并 upsert；失败静默（toImage null 判空先例）。
 */
export async function generateCanvasThumbnail(engine: CanvasEngine, docId: string): Promise<void> {
  const api = engine.excalidrawAPI
  if (!api) return
  try {
    const { exportToBlob } = await import('@excalidraw/excalidraw')
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: {},
      mimeType: 'image/png',
      scale: 0.4, // 降采样小图
    })
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(r.error)
      r.readAsDataURL(blob)
    })
    await upsertCanvasThumbnail(docId, dataUrl)
  } catch {
    /* 缩略图失败静默（toImage null 判空先例） */
  }
}

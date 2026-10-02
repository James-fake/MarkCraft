import { asZoom } from './engineUtils'
import { getViewportSize, getCurrentPageBounds, getSelectionPageBounds } from './engineQueries'
import type { Box, CameraState } from './engineTypes'
import type { CanvasEngine } from './CanvasEngine'

/**
 * CanvasEngine 相机/缩放/画笔方法组（P5-3 自类体拆出，实现逐字未动）。
 * 画笔（freedraw）颜色/粗细：混合引擎下画笔由 Excalidraw 绘制，其颜色/粗细由
 * appState.currentItemStrokeColor / currentItemStrokeWidth 决定（tldraw 的
 * DefaultColorStyle/DefaultSizeStyle 在本引擎不生效）。
 */

export function setCamera(e: CanvasEngine, partial: Partial<CameraState>, _opts?: unknown): void {
  if (!e.api) return
  const cur = e.cameraAtom.get()
  const next: CameraState = {
    x: partial.x ?? cur.x,
    y: partial.y ?? cur.y,
    z: partial.z ?? cur.z,
  }
  e.api.updateScene({
    appState: { scrollX: next.x, scrollY: next.y, zoom: asZoom(next.z) },
  })
  // 立即同步响应式相机状态（不依赖后续 onChange）
  e.cameraAtom.set(next)
  e.zoomAtom.set(next.z)
}

export function zoomToBounds(e: CanvasEngine, bounds: Box, opts?: { inset?: number }): void {
  if (!e.api) return
  const inset = opts?.inset ?? 0.2
  const { width, height } = getViewportSize(e)
  const bw = Math.max(bounds.width, 1)
  const bh = Math.max(bounds.height, 1)
  const zoom = Math.min((width * (1 - inset)) / bw, (height * (1 - inset)) / bh, 1.5)
  const z = Math.max(zoom, 0.1)
  const scrollX = -(bounds.x + bw / 2) * z + width / 2
  const scrollY = -(bounds.y + bh / 2) * z + height / 2
  e.api.updateScene({ appState: { zoom: asZoom(z), scrollX, scrollY } })
}

export function zoomToFit(e: CanvasEngine): void {
  if (!e.api) return
  const b = getCurrentPageBounds(e)
  if (b.width === 0 && b.height === 0) {
    e.api.updateScene({ appState: { zoom: asZoom(1), scrollX: 0, scrollY: 0 } })
    return
  }
  zoomToBounds(e, b, { inset: 0.1 })
}

export function zoomToSelection(e: CanvasEngine): void {
  const b = getSelectionPageBounds(e)
  if (b) zoomToBounds(e, b, { inset: 0.2 })
}

export function zoomIn(e: CanvasEngine): void {
  const cam = e.cameraAtom.get()
  setCamera(e, { z: Math.min(cam.z * 1.2, 8) })
}

export function zoomOut(e: CanvasEngine): void {
  const cam = e.cameraAtom.get()
  setCamera(e, { z: Math.max(cam.z / 1.2, 0.1) })
}

// —— 画笔（freedraw）颜色 / 粗细 ——
export function setPenColor(e: CanvasEngine, color: string): void {
  e.penColor = color
  if (e.api) {
    try { e.api.updateScene({ appState: { currentItemStrokeColor: color } }) } catch { /* noop */ }
  }
}

export function getPenColor(e: CanvasEngine): string {
  if (e.api) {
    const c = e.api.getAppState().currentItemStrokeColor
    if (typeof c === 'string' && c) e.penColor = c
  }
  return e.penColor
}

export function setPenWidth(e: CanvasEngine, width: number): void {
  e.penWidth = width
  if (e.api) {
    try { e.api.updateScene({ appState: { currentItemStrokeWidth: width } }) } catch { /* noop */ }
  }
}

export function getPenWidth(e: CanvasEngine): number {
  if (e.api) {
    const w = e.api.getAppState().currentItemStrokeWidth
    if (typeof w === 'number') e.penWidth = w
  }
  return e.penWidth
}

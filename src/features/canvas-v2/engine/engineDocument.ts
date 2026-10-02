import { asZoom, zoomValue, baseElement } from './engineUtils'
import { getElements } from './engineQueries'
import { serializeState, sceneSignature, emit } from './engineHistory'
import type { ShapeLike, ExElementLike, EngineDocument, EngineDocumentLike } from './engineTypes'
import type { CanvasEngine } from './CanvasEngine'

/**
 * CanvasEngine 文档序列化/加载与卡片代理元素同步（P5-3 自类体拆出，实现逐字未动）。
 * loadDocument 末尾的历史栈重置与 syncFromScene/attach 的基线播种共用同一套约定。
 */

// — 序列化 / 加载（替代 getSnapshot/loadSnapshot） —
export function serialize(e: CanvasEngine): EngineDocument {
  const app = e.api?.getAppState() ?? {}
  return {
    version: 2,
    viewport: { scrollX: app.scrollX ?? 0, scrollY: app.scrollY ?? 0, zoom: zoomValue(app.zoom) },
    elements: getElements(e).filter((el) => !el.isDeleted).map((el) => ({ ...el })),
    shapes: Array.from(e.shapesAtom.get().values()),
  }
}

export function loadDocument(e: CanvasEngine, data: EngineDocumentLike): void {
  if (!data) return
  // 兼容旧 tldraw 快照：若含 elements 则视为 Excalidraw 格式
  e.applyingRemote = true
  const map = new Map<string, ShapeLike>()
  if (Array.isArray(data.shapes)) {
    for (const s of data.shapes) map.set(s.id, s)
  }
  e.shapesAtom.set(map)
  if (e.api) {
    const elements = Array.isArray(data.elements) ? data.elements : []
    // 统一白板底色：viewBackgroundColor 来自 CanvasPanel 注入的 initialDocument
    // （Aurora 暗色 #0D0F15）；未被持久化场景覆盖时回退到同一暗色，保证
    // 画布视图与思维导图/看板/时间轴子视图逐像素同色（§18 桌面原生暗色基线）。
    const viewBg = data?.appState?.viewBackgroundColor ?? '#0D0F15'
    const appState = data.viewport
      ? { scrollX: data.viewport.scrollX, scrollY: data.viewport.scrollY, zoom: asZoom(data.viewport.zoom), viewBackgroundColor: viewBg }
      : { viewBackgroundColor: viewBg }
    // 确保卡片代理元素存在（若缺失则补齐）
    const existingIds = new Set(elements.map((el) => el.id))
    const extra: ExElementLike[] = []
    for (const s of map.values()) {
      if (!existingIds.has(s.id)) extra.push(cardElementFromShape(s))
    }
    e.api.updateScene({ elements: [...elements, ...extra], appState })
  }
  e.applyingRemote = false
  e.editingShapeIdAtom.set(null)
  e.selectedIdsAtom.set([])
  // 加载新文档后重置历史栈（不可撤销到上一个文档），
  // 并以「加载后的初始状态」作为基线快照，使首个编辑也可撤销。
  e.undoStack = [serializeState(e)]
  e.redoStack = []
  e.gestureActive = false
  e.pointerGesture = false
  if (e.pendingCommit) { clearTimeout(e.pendingCommit); e.pendingCommit = null }
  if (e.historyTimer) { clearTimeout(e.historyTimer); e.historyTimer = null }
  e.lastSceneSig = sceneSignature(e)
  e.canUndoAtom.set(false)
  e.canRedoAtom.set(false)
  emit(e, 'document')
  emit(e, 'session')
}

export function updateInstanceState(e: CanvasEngine, partial: { isReadonly?: boolean; [key: string]: unknown }): void {
  if (e.api && partial.isReadonly !== undefined) {
    e.api.updateScene({ appState: { viewModeEnabled: partial.isReadonly } })
  }
}

// — 代理元素同步 —
export function pushCardElement(e: CanvasEngine, shape: ShapeLike): void {
  if (!e.api) return
  const el = cardElementFromShape(shape)
  const existing = getElements(e)
  const idx = existing.findIndex((x) => x.id === shape.id)
  let elements: ExElementLike[]
  if (idx >= 0) {
    elements = existing.map((x) => (x.id === shape.id ? el : x))
  } else {
    elements = [...existing, el]
  }
  e.applyingRemote = true
  e.api.updateScene({ elements })
  e.applyingRemote = false
}

export function cardElementFromShape(shape: ShapeLike): ExElementLike {
  const el = baseElement('rectangle', shape.id)
  el.x = shape.x
  el.y = shape.y
  el.width = shape.props.w ?? 200
  el.height = shape.props.h ?? 160
  el.customData = {
    cardType: shape.type,
    ...shape.props,
  }
  return el
}

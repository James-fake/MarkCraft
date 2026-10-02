import { Box } from './engineTypes'
import { CARD_TYPES, zoomValue } from './engineUtils'
import type { ShapeLike, BindingLike, ExElementLike } from './engineTypes'
import type { CanvasEngine } from './CanvasEngine'

/**
 * CanvasEngine 查询/几何方法组（P5-3 自类体拆出，实现逐字未动）。
 * 约定：每个函数首参为引擎实例 `e`，类上的同名方法退化为单行委托 ——
 * 对外 API（tldraw Editor 兼容面）与类内 CRUD/sync 的 this.xxx() 调用全部不变。
 */

// ─── 内部：读取场景元素 ───
export function getElements(e: CanvasEngine): ExElementLike[] {
  return (e.api ? e.api.getSceneElements() : []) as ExElementLike[]
}

export function cardElements(e: CanvasEngine): ExElementLike[] {
  return getElements(e).filter(
    (el) => el && !el.isDeleted && el.customData?.cardType && CARD_TYPES.has(el.customData.cardType),
  )
}

export function arrowElements(e: CanvasEngine): ExElementLike[] {
  return getElements(e).filter((el) => el && !el.isDeleted && el.type === 'arrow')
}

export function getViewportSize(e: CanvasEngine): { width: number; height: number } {
  if (e.container) return { width: e.container.clientWidth, height: e.container.clientHeight }
  const app = e.api?.getAppState()
  return { width: app?.width ?? 800, height: app?.height ?? 600 }
}

export function boundsOfShape(s: ShapeLike): Box {
  return new Box(s.x, s.y, s.props.w ?? s.props.width ?? 0, s.props.h ?? s.props.height ?? 0)
}

// 箭头合成
export function synthesizeArrowShape(e: CanvasEngine, id: string): ShapeLike | undefined {
  const el = arrowElements(e).find((x) => x.id === id)
  if (!el) return undefined
  const startId = el.startBinding?.elementId
  const endId = el.endBinding?.elementId
  const relationType = el.customData?.relationType ?? 'reference'
  return {
    id,
    type: 'arrow',
    x: 0, y: 0, rotation: 0, isLocked: false,
    props: {
      relationType,
      start: startId,
      end: endId,
      color: el.strokeColor ?? '#94a3b8',
    },
    meta: { excalidraw: true },
  }
}

// — 查询 —
export function getShape(e: CanvasEngine, id: string): ShapeLike | undefined {
  const s = e.shapesAtom.get().get(id)
  if (s) return s
  // 合成箭头形状
  return synthesizeArrowShape(e, id)
}

export function getShapesAtPoint(e: CanvasEngine, point: { x: number; y: number }): ShapeLike[] {
  const hits: ShapeLike[] = []
  for (const s of e.shapesAtom.get().values()) {
    if (point.x >= s.x && point.x <= s.x + (s.props.w ?? 0) &&
        point.y >= s.y && point.y <= s.y + (s.props.h ?? 0)) {
      hits.push(s)
    }
  }
  return hits
}

export function getShapePageBounds(e: CanvasEngine, id: string): Box | undefined {
  const s = e.shapesAtom.get().get(id)
  if (!s) {
    const a = synthesizeArrowShape(e, id)
    if (!a) return undefined
    return boundsOfShape(a)
  }
  return boundsOfShape(s)
}

export function getSelectionPageBounds(e: CanvasEngine): Box | undefined {
  const ids = e.selectedIdsAtom.get()
  if (ids.length === 0) return undefined
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of ids) {
    const b = getShapePageBounds(e, id)
    if (!b) continue
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY)
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY)
  }
  if (minX === Infinity) return undefined
  return new Box(minX, minY, maxX - minX, maxY - minY)
}

export function getSelectedShapes(e: CanvasEngine): ShapeLike[] {
  return e.selectedIdsAtom.get().map((id) => getShape(e, id)).filter(Boolean) as ShapeLike[]
}

export function getCurrentPageShapes(e: CanvasEngine): ShapeLike[] {
  const list = Array.from(e.shapesAtom.get().values())
  // 追加箭头形状（供关系/图谱面板使用）
  for (const a of arrowElements(e)) {
    const syn = synthesizeArrowShape(e, a.id)
    if (syn) list.push(syn)
  }
  return list
}

export function getCurrentPageShapeIds(e: CanvasEngine): Set<string> {
  const set = new Set(e.shapesAtom.get().keys())
  for (const a of arrowElements(e)) set.add(a.id)
  return set
}

export function getCurrentPageBounds(e: CanvasEngine): Box {
  const shapes = Array.from(e.shapesAtom.get().values())
  if (shapes.length === 0) return new Box(0, 0, 0, 0)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of shapes) {
    minX = Math.min(minX, s.x); minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + (s.props.w ?? 0)); maxY = Math.max(maxY, s.y + (s.props.h ?? 0))
  }
  return new Box(minX, minY, maxX - minX, maxY - minY)
}

export function getViewportPageBounds(e: CanvasEngine): Box {
  const cam = e.cameraAtom.get()
  const { width, height } = getViewportSize(e)
  return new Box(-cam.x, -cam.y, width / cam.z, height / cam.z)
}

export function getViewportScreenBounds(e: CanvasEngine): Box {
  const { width, height } = getViewportSize(e)
  return new Box(0, 0, width, height)
}

/**
 * 计算一个不与现有卡片重叠的落点：从 anchor 起向右下逐级偏移，
 * 直到候选框与所有 note-card / label-card 都不相交（留 pad 间隙）。
 * 用于「新建便签 / 推荐卡片」避免后建的卡片遮挡先建的卡片。
 */
export function findFreeSlot(
  e: CanvasEngine,
  anchor: { x: number; y: number },
  w = 260,
  h = 200,
  step = 32,
  pad = 12,
): { x: number; y: number } {
  const boxes = getCurrentPageShapes(e)
    .filter((s) => s.type === 'note-card' || s.type === 'label-card')
    .map((s) => ({ x: s.x, y: s.y, w: Number(s.props?.w ?? 200), h: Number(s.props?.h ?? 160) }))
  let x = anchor.x
  let y = anchor.y
  for (let i = 0; i < 64; i++) {
    const hit = boxes.some((b) =>
      !(x + w + pad < b.x || x > b.x + b.w + pad || y + h + pad < b.y || y > b.y + b.h + pad),
    )
    if (!hit) return { x, y }
    x += step
    y += step
  }
  return { x, y }
}

export function getBindingsFromShape(e: CanvasEngine, shapeId: string, _kind: 'arrow'): BindingLike[] {
  const out: BindingLike[] = []
  for (const el of arrowElements(e)) {
    const fromId = el.startBinding?.elementId
    const toId = el.endBinding?.elementId
    if (fromId === shapeId) {
      out.push({
        id: `bind-${el.id}-start`, type: 'arrow', fromId: shapeId, toId: toId ?? '',
        props: { terminal: 'start', normalizedAnchor: el.startBinding?.normalizedAnchor ?? { x: 0.5, y: 0.5 } },
      })
    }
    if (toId === shapeId) {
      out.push({
        id: `bind-${el.id}-end`, type: 'arrow', fromId: fromId ?? '', toId: shapeId,
        props: { terminal: 'end', normalizedAnchor: el.endBinding?.normalizedAnchor ?? { x: 0.5, y: 0.5 } },
      })
    }
  }
  return out
}

// — 坐标换算 —
export function screenToPage(e: CanvasEngine, point: { x: number; y: number }): { x: number; y: number } {
  const app = e.api?.getAppState() ?? {}
  const rect = e.container?.getBoundingClientRect()
  const offsetLeft = rect?.left ?? 0
  const offsetTop = rect?.top ?? 0
  const zoom = zoomValue(app.zoom)
  return {
    x: (point.x - offsetLeft) / zoom - (app.scrollX ?? 0),
    y: (point.y - offsetTop) / zoom - (app.scrollY ?? 0),
  }
}

export function pageToScreen(e: CanvasEngine, point: { x: number; y: number }): { x: number; y: number } {
  const cam = e.cameraAtom.get()
  const rect = e.container?.getBoundingClientRect()
  const offsetLeft = rect?.left ?? 0
  const offsetTop = rect?.top ?? 0
  return {
    x: (point.x + cam.x) * cam.z + offsetLeft,
    y: (point.y + cam.y) * cam.z + offsetTop,
  }
}

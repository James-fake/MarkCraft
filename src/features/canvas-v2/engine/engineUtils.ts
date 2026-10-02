/**
 * CanvasEngine 模块级工具（P4-5 自 CanvasEngine.ts 头部抽离）
 *
 * 常量（卡片类型集 / 历史上限）、缩放归一化、tldraw↔Excalidraw 工具名映射、
 * id 生成、局部橡皮擦几何辅助（线段相交 / 矩形相交）、卡片连线边界吸附点
 * （edgePoint）与 Excalidraw 默认元素骨架（baseElement）。
 * 均为纯函数 / 常量，无引擎状态；类体经 import 消费，行为与抽离前逐字一致。
 */
import type { ExElementLike } from './engineTypes'

// ─── 常量 ───
export const CARD_TYPES = new Set([
  'note-card', 'image-card', 'file-card', 'embed-card', 'group-card', 'canvas-ref', 'nested-canvas',
  // 轻量标签元素：与卡片同管线（代理矩形 + HTML 浮层），天然支持拖拽/选中/删除/复制/缩放平移/持久化/撤销
  'label-card',
])
export const HISTORY_LIMIT = 60

/**
 * 归一化缩放值：Excalidraw 的 appState.zoom 必须是 { value: number } 对象，
 * 若误传裸数字（number）会导致 appState.zoom = 1（number），进而
 * viewportCoordsToSceneCoords 用 zoom.value（undefined）做除法得到 NaN，
 * 使新建文本元素的 x/y 变为 NaN → mutateElement 的 didChange 守卫对 NaN 永远为
 * false → 无限 informMutation → “Maximum call stack size exceeded”。
 * 故所有写入 appState.zoom 的地方都必须走此归一化。
 */
export function asZoom(z: number | { value: number } | null | undefined): { value: number } {
  if (z && typeof z === 'object' && typeof z.value === 'number') return z
  const n = typeof z === 'number' && isFinite(z) && z > 0 ? z : 1
  return { value: n }
}

/** 从 Excalidraw appState.zoom（可能为 {value} 或裸数字）安全读取数值 */
export function zoomValue(z: number | { value?: number } | null | undefined): number {
  if (z && typeof z === 'object' && typeof z.value === 'number') return z.value
  if (typeof z === 'number' && isFinite(z)) return z
  return 1
}

// ─── 工具名映射（tldraw 名 ↔ Excalidraw 名） ───
// 自定义底栏/浮层统一使用 tldraw 工具名；Excalidraw 原生工具用另一套命名。
// 引擎内部 currentToolAtom 始终存 tldraw 名（供 BottomBar 高亮 & OverlayCards 交互判断），
// 与 Excalidraw 交互时再转换为原生名。
export const TL_TO_EXCALIDRAW: Record<string, string> = {
  select: 'selection',
  hand: 'hand',
  draw: 'freedraw',
  eraser: 'eraser',
  arrow: 'arrow',
  line: 'line',
  text: 'text',
  frame: 'frame',
  asset: 'image',
  // geo 由 pendingGeo 决定 rectangle / ellipse（见 toExcalidrawTool）
  geo: 'rectangle',
  // Excalidraw 无「便签」工具：便签由 overlay 卡片系统承载，原生退回选择态
  note: 'selection',
}
export const EXCALIDRAW_TO_TL: Record<string, string> = {
  selection: 'select',
  hand: 'hand',
  freedraw: 'draw',
  eraser: 'eraser',
  arrow: 'arrow',
  line: 'line',
  text: 'text',
  frame: 'frame',
  image: 'asset',
  rectangle: 'geo',
  ellipse: 'geo',
  diamond: 'geo',
}

export let _seq = 0
export function genId(prefix: string): string {
  _seq += 1
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}`
}

// ─── 几何辅助（局部橡皮擦用） ───
export function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  return Math.hypot(p.x - cx, p.y - cy)
}

export function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - ax) - (bx - ax) * (cy - ay)
}

// 线段 p1→p2 与线段 p3→p4 是否相交
export function segmentsIntersect(
  p1: { x: number; y: number }, p2: { x: number; y: number },
  p3: { x: number; y: number }, p4: { x: number; y: number },
): boolean {
  const d1 = ccw(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y)
  const d2 = ccw(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y)
  const d3 = ccw(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
  const d4 = ccw(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  return false
}

// 线段 a→b 是否与（已按半径外扩的）轴对齐矩形相交
export function segmentIntersectsRect(
  a: { x: number; y: number }, b: { x: number; y: number },
  minX: number, minY: number, maxX: number, maxY: number,
): boolean {
  const inside = (p: { x: number; y: number }) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
  if (inside(a) || inside(b)) return true
  const corners = [
    { x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY },
  ]
  for (let i = 0; i < 4; i++) {
    const c1 = corners[i]
    const c2 = corners[(i + 1) % 4]
    if (segmentsIntersect(a, b, c1, c2)) return true
  }
  return false
}

// 计算矩形 box 朝 target 方向的「边界点」（卡片连线端点吸附用）。
// box 为 {x,y,w,h}（场景坐标）；target 为另一卡片中心。
// 返回矩形边界（沿中心→target 方向）向外再推开 gap 的点，使连线落在卡片边缘外而非插入卡片内部。
export function edgePoint(
  box: { x: number; y: number; w: number; h: number },
  target: { x: number; y: number },
  gap: number,
): { x: number; y: number } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = target.x - cx
  const dy = target.y - cy
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { x: cx, y: cy }
  const halfW = box.w / 2
  const halfH = box.h / 2
  const sx = dx !== 0 ? halfW / Math.abs(dx) : Infinity
  const sy = dy !== 0 ? halfH / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  const bx = cx + dx * s
  const by = cy + dy * s
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  return { x: bx + ux * gap, y: by + uy * gap }
}

// ─── 默认元素骨架（Excalidraw 需要的字段） ───
export function baseElement(type: string, id: string): ExElementLike {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 0,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3, value: 12 },
    seed: Math.floor(Math.random() * 2 ** 31),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData: {},
    index: undefined,
  }
}

/**
 * 白板统一底色（随主题）：单源 = desktop-chrome.css 的 --canvas-unified-bg
 * （暗色档 #0D0F15 = §18 桌面原生暗色基线；浅色档 #FFFFFF = Excalidraw 标准白）。
 * CanvasPanel 注入 viewBackgroundColor / 强制子视图根背景与 loadDocument 的兜底
 * 三处共用本函数，主题切换时随 CSS 变量自动取到新值。
 * SSR/测试环境无 document 时回退暗色基线。
 */
export function unifiedCanvasBg(): string {
  try {
    if (typeof document === 'undefined') return '#0D0F15'
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--canvas-unified-bg')
      .trim()
    return v || '#0D0F15'
  } catch {
    return '#0D0F15'
  }
}

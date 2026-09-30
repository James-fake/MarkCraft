/**
 * CanvasEngine — tldraw Editor 兼容适配器（混合架构核心）
 *
 * 关键约定：
 * - 卡片（note/image/file/embed/group/canvas-ref）以「透明矩形代理」存在于 Excalidraw，
 *   业务字段（props）由引擎内部 Map 持有（并镜像到元素 customData 以便持久化）。
 * - 几何/平移/缩放/选中/箭头/手绘交互由 Excalidraw 原生处理；引擎通过 onChange 同步。
 * - 响应式状态基于 @tldraw/state atom，使现有面板里的 useValue 自动重渲染。
 */
import { atom, type Atom } from '../utils/atom'
import {
  Box,
  type ShapeLike,
  type BindingLike,
  type CameraState,
  type ExcalidrawAPILike,
  type ExElementLike,
  type PropsBag,
  type ShapePartial,
  type BindingPartial,
  type EngineDocument,
  type EngineDocumentLike,
  type EngineStoreRecord,
  type TLEventInfo,
} from './engineTypes'

// ─── 常量 ───
const CARD_TYPES = new Set([
  'note-card', 'image-card', 'file-card', 'embed-card', 'group-card', 'canvas-ref', 'nested-canvas',
  // 轻量标签元素：与卡片同管线（代理矩形 + HTML 浮层），天然支持拖拽/选中/删除/复制/缩放平移/持久化/撤销
  'label-card',
])
const HISTORY_LIMIT = 60

/**
 * 归一化缩放值：Excalidraw 的 appState.zoom 必须是 { value: number } 对象，
 * 若误传裸数字（number）会导致 appState.zoom = 1（number），进而
 * viewportCoordsToSceneCoords 用 zoom.value（undefined）做除法得到 NaN，
 * 使新建文本元素的 x/y 变为 NaN → mutateElement 的 didChange 守卫对 NaN 永远为
 * false → 无限 informMutation → “Maximum call stack size exceeded”。
 * 故所有写入 appState.zoom 的地方都必须走此归一化。
 */
function asZoom(z: number | { value: number } | null | undefined): { value: number } {
  if (z && typeof z === 'object' && typeof z.value === 'number') return z
  const n = typeof z === 'number' && isFinite(z) && z > 0 ? z : 1
  return { value: n }
}

/** 从 Excalidraw appState.zoom（可能为 {value} 或裸数字）安全读取数值 */
function zoomValue(z: number | { value?: number } | null | undefined): number {
  if (z && typeof z === 'object' && typeof z.value === 'number') return z.value
  if (typeof z === 'number' && isFinite(z)) return z
  return 1
}

// ─── 工具名映射（tldraw 名 ↔ Excalidraw 名） ───
// 自定义底栏/浮层统一使用 tldraw 工具名；Excalidraw 原生工具用另一套命名。
// 引擎内部 currentToolAtom 始终存 tldraw 名（供 BottomBar 高亮 & OverlayCards 交互判断），
// 与 Excalidraw 交互时再转换为原生名。
const TL_TO_EXCALIDRAW: Record<string, string> = {
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
const EXCALIDRAW_TO_TL: Record<string, string> = {
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

let _seq = 0
function genId(prefix: string): string {
  _seq += 1
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}`
}

// ─── 几何辅助（局部橡皮擦用） ───
function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
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

function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - ax) - (bx - ax) * (cy - ay)
}

// 线段 p1→p2 与线段 p3→p4 是否相交
function segmentsIntersect(
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
function segmentIntersectsRect(
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
function edgePoint(
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
function baseElement(type: string, id: string): ExElementLike {
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

export class CanvasEngine {
  // ─── 响应式状态（@tldraw/state） ───
  private shapesAtom: Atom<Map<string, ShapeLike>>
  private selectedIdsAtom: Atom<string[]>
  private currentToolAtom: Atom<string>
  /**
   * 工具刚由工具栏显式切换的时间戳（ms）。在随后的极短窗口内，syncFromScene 的工具回写
   * 以 currentToolAtom 为权威、忽略 Excalidraw 可能尚未生效/延迟回写的旧原生工具。
   * 否则橡皮→其它工具时，Excalidraw 的 setActiveTool 经 this.setState 异步生效，
   * onChange→syncFromScene 在生效前读到仍是旧工具（如 eraser），会把 currentToolAtom
   * 又回写回旧工具，表现为「点了别的工具切不回去」。窗口过后恢复正常回写（键盘快捷键仍同步）。
   */
  private toolSetAt = 0
  private cameraAtom: Atom<CameraState>
  private editingShapeIdAtom: Atom<string | null>
  private canUndoAtom: Atom<boolean>
  private canRedoAtom: Atom<boolean>
  private zoomAtom: Atom<number>

  // ─── 引用 ───
  private api: ExcalidrawAPILike | null = null
  private container: HTMLDivElement | null = null
  private listeners: Array<{ cb: () => void; scope: 'document' | 'session' }> = []
  private eventListeners: Array<{ cb: (info: TLEventInfo) => void }> = []
  private fileHandlers: Array<(content: { point?: { x: number; y: number }; files: File[] }) => void | Promise<void>> = []
  private remoteContentHandlers: ((content: unknown) => void)[] = []

  // ─── 历史栈（自管 undo/redo） ───
  private undoStack: string[] = []
  private redoStack: string[] = []
  private historyTimer: ReturnType<typeof setTimeout> | null = null
  // 场景内容指纹：用于检测「真正的图元增删改」（不依赖 dirty 标志）
  private lastSceneSig = ''
  // 手势进行中标记：拖拽/绘制/文本编辑/缩放旋转期间为 true，用于把一次手势
  // 收敛为「一个」历史条目（否则一次自由绘制会随 pointermove 产生几十次 onChange）。
  private gestureActive = false
  // DOM 指针手势标记：由 ExcalidrawCanvas 的容器级 pointer 事件（capture 阶段）驱动，
  // 作为历史提交的「权威手势边界」。不依赖 Excalidraw 内部 appState 字段（不同版本
  // freedraw 可能挂在 draggingElement / newElement / multiElement，靠猜字段极不可靠），
  // 从根本上保证「画笔首笔」等任意指针手势收笔后都能可靠地提交为一条历史。
  private pointerGesture = false
  // endPointerGesture 的延迟提交句柄（等 Excalidraw 自身 pointerup 收尾 + onChange 完成后再提交）
  private pendingCommit: ReturnType<typeof setTimeout> | null = null

  // 防止 onChange 回写造成死循环
  private applyingRemote = false

  // geo 工具的目标子形状（rectangle / ellipse），由 setStyleForNextShapes 记录
  private pendingGeo: 'rectangle' | 'ellipse' | 'diamond' = 'rectangle'

  constructor() {
    this.shapesAtom = atom('shapes', new Map())
    this.selectedIdsAtom = atom<string[]>('selectedIds', [])
    // 默认工具用 tldraw 命名（与 BottomBar / OverlayCards 一致）
    this.currentToolAtom = atom('currentTool', 'select')
    this.cameraAtom = atom('camera', { x: 0, y: 0, z: 1 })
    this.editingShapeIdAtom = atom<string | null>('editingShapeId', null)
    this.canUndoAtom = atom('canUndo', false)
    this.canRedoAtom = atom('canRedo', false)
    this.zoomAtom = atom('zoom', 1)
  }

  // ─── 生命周期 ───
  attach(api: ExcalidrawAPILike, container: HTMLDivElement) {
    this.api = api
    this.container = container
    // 防御：若历史栈尚未播种基线（例如首次进入白板未走 loadDocument 路径、
    // 或 initialDocument 为空），此处以当前场景作为基线快照。
    // 否则首笔提交后 undoStack 只有 1 条（基线缺失）→ canUndo 恒为 false，
    // 表现为「画笔画一笔后撤销按钮不可用，要再画/加一张卡片才可用」。
    if (this.undoStack.length === 0) {
      this.undoStack = [this.serializeState()]
      this.redoStack = []
      this.gestureActive = false
      this.pointerGesture = false
      if (this.pendingCommit) { clearTimeout(this.pendingCommit); this.pendingCommit = null }
      if (this.historyTimer) { clearTimeout(this.historyTimer); this.historyTimer = null }
      this.lastSceneSig = this.sceneSignature()
      this.canUndoAtom.set(false)
      this.canRedoAtom.set(false)
    }
  }

  // ─── DOM 指针手势边界（历史提交的权威信号） ───
  // 由 ExcalidrawCanvas 在容器 capture 阶段的 pointerdown/pointerup/pointercancel 调用。
  // 这是修复「首次进入白板、画笔首笔无法撤销」的核心：不再依赖 Excalidraw 内部
  // appState 字段判断手势是否结束，而是以真实的指针按下/抬起作为一次操作的边界。
  beginPointerGesture(): void {
    this.pointerGesture = true
    // 手势开始：取消一切待提交（本次手势结束时统一收敛为一条历史）
    if (this.historyTimer) { clearTimeout(this.historyTimer); this.historyTimer = null }
    if (this.pendingCommit) { clearTimeout(this.pendingCommit); this.pendingCommit = null }
  }

  endPointerGesture(): void {
    this.pointerGesture = false
    // 延迟到当前事件派发完全结束（含 Excalidraw 自身 pointerup 收尾与随后的 onChange/
    // syncFromScene 微任务）之后再提交，确保此刻场景已包含刚绘制/编辑完成的最终图元。
    // setTimeout(0)（宏任务）晚于同一轮事件内的所有微任务，时机稳妥。
    if (this.pendingCommit) clearTimeout(this.pendingCommit)
    this.pendingCommit = setTimeout(() => {
      this.pendingCommit = null
      this.gestureActive = false
      // 若手势期间确有场景内容变化，则收敛为「一条」历史；无变化时 commitAfterState 内部
      // 的 last===snap 去重会自动跳过（例如仅平移画布 / 空点击）。
      this.commitAfterState()
    }, 0)
  }

  get excalidrawAPI(): ExcalidrawAPILike | null {
    return this.api
  }

  // ─── 内部：读取场景元素 ───
  private getElements(): ExElementLike[] {
    return (this.api ? this.api.getSceneElements() : []) as ExElementLike[]
  }

  private cardElements(): ExElementLike[] {
    return this.getElements().filter(
      (el) => el && !el.isDeleted && el.customData?.cardType && CARD_TYPES.has(el.customData.cardType),
    )
  }

  private arrowElements(): ExElementLike[] {
    return this.getElements().filter((el) => el && !el.isDeleted && el.type === 'arrow')
  }

  // ─── onChange：从 Excalidraw 同步到引擎 ───
  syncFromScene() {
    if (this.applyingRemote || !this.api) return
    const app = this.api.getAppState()
    let dirty = false

    const camera: CameraState = {
      x: app.scrollX ?? 0,
      y: app.scrollY ?? 0,
      z: zoomValue(app.zoom),
    }
    const prevCam = this.cameraAtom.get()
    if (prevCam.x !== camera.x || prevCam.y !== camera.y || prevCam.z !== camera.z) {
      this.cameraAtom.set(camera)
      this.zoomAtom.set(camera.z)
      dirty = true
    }

    // 几何同步：卡片代理矩形
    const map = new Map(this.shapesAtom.get())
    let geometryChanged = false
    for (const el of this.cardElements()) {
      const cur = map.get(el.id)
      if (!cur) continue
      if (cur.x !== el.x || cur.y !== el.y || cur.props.w !== el.width || cur.props.h !== el.height) {
        cur.x = el.x
        cur.y = el.y
        cur.props = { ...cur.props, w: el.width, h: el.height }
        geometryChanged = true
      }
    }
    if (geometryChanged) { this.shapesAtom.set(map); dirty = true }

    // 选中同步
    const selected = (app.selectedElementIds ? Object.keys(app.selectedElementIds) : [])
      .filter((id) => map.has(id))
    const prevSel = this.selectedIdsAtom.get()
    if (prevSel.length !== selected.length || selected.some((s, i) => prevSel[i] !== s)) {
      this.selectedIdsAtom.set(selected)
      dirty = true
    }

    // 当前工具：Excalidraw 原生名 → tldraw 名（引擎内统一存 tldraw 名）
    const nativeTool = app.activeTool?.type ?? 'selection'
    const tlTool = EXCALIDRAW_TO_TL[nativeTool] ?? 'select'
    // 工具刚由工具栏显式切换的极短窗口内：以 currentToolAtom 为权威，忽略 Excalidraw
    // 尚未生效/延迟回写的旧原生工具（如 eraser→其它工具时 setActiveTool 经 setState 异步，
    // onChange 可能先回写旧工具导致工具被弹回「切不回去」）。窗口过后恢复正常回写。
    const toolJustSwitched = Date.now() - this.toolSetAt < 600
    if (!toolJustSwitched && this.currentToolAtom.get() !== tlTool) {
      this.currentToolAtom.set(tlTool)
      dirty = true
    }

    // ─── 历史记录：基于「真实场景内容变化」+「手势边界」逐操作收敛 ───
    // 关键修复：原来的快照只在 dirty（相机/卡片几何/选中/工具变化）时触发，
    // 而原生绘制/文本/移动等只改 Excalidraw 图元、不触发上述 dirty，导致多个
    // 操作被合并成一个历史条目 → 一次撤销清空全部。这里改为直接监听图元指纹
    // 变化，并用 draggingElement 等手势字段把一次连续手势收敛为单条历史。
    const sceneSig = this.sceneSignature()
    const sceneChanged = sceneSig !== this.lastSceneSig
    this.lastSceneSig = sceneSig
    // 手势边界判定。权威信号是 DOM 指针手势（pointerGesture，由容器 capture 阶段的
    // pointerdown/up 驱动），它不依赖 Excalidraw 版本内部字段，能可靠覆盖「画笔首笔」
    // 等一切指针操作。appState 字段仅作为辅助（例如键盘触发的编辑），叠加判断更稳。
    // 说明：Excalidraw 0.17.x 的进行中 freedraw 挂在 appState.draggingElement 上
    // （非 multiElement），但即便如此，onChange→微任务的时序仍可能错过 draggingElement
    // 清零的瞬间导致首笔漏提交——故改以 DOM pointerup 作为提交时机（见 endPointerGesture）。
    const gestureNow = this.pointerGesture || !!(
      app.draggingElement ||
      app.multiElement ||
      app.editingElement ||
      app.editingTextElement ||
      app.resizingElement ||
      app.rotatingElement
    )
    if (gestureNow) {
      // 手势进行中：标记激活，并取消任何待提交的防抖（由手势结束统一收敛）
      this.gestureActive = true
      if (this.historyTimer) { clearTimeout(this.historyTimer); this.historyTimer = null }
    } else if (this.gestureActive) {
      // 手势刚结束：把这次手势收敛为「一条」历史条目（还原点为手势前状态）
      this.gestureActive = false
      this.commitAfterState()
    } else if (sceneChanged) {
      // 非手势的场景变化（如引擎自身增删改）：走防抖提交
      this.scheduleHistory()
    }

    // 仅在确有变化时才通知监听（document + session），避免空转 onChange 触发
    // emit → setState → 重渲染 → 再触发 onChange 的无限渲染循环。
    if (dirty) {
      this.emit('document')
      this.emit('session')
    }
  }

  // 计算当前场景内容指纹（图元 id + type + version + 删除标记 + 几何 + 点数），
  // 用于检测真实增删改。除 id/version/isDeleted 外，额外纳入 type 与几何 / 笔画点数，
  // 避免「画笔收笔时 version 未变、仅 points 变长」导致指纹不变、漏判场景变化而不提交历史。
  private sceneSignature(): string {
    const els = (this.api ? this.api.getSceneElements() : []) as ExElementLike[]
    let sig = ''
    for (const e of els) {
      const pts = Array.isArray(e.points) ? (e.points as number[][]).length : 0
      sig += (e.id as string) + ':' + (e.type ?? '') + ':' + (e.version ?? 0) + ':' +
        (e.isDeleted ? 1 : 0) + ':' +
        Math.round(e.x ?? 0) + ',' + Math.round(e.y ?? 0) + ',' +
        Math.round(e.width ?? 0) + ',' + Math.round(e.height ?? 0) + ',' + pts + '|'
    }
    return sig
  }

  private emit(scope: 'document' | 'session') {
    for (const l of this.listeners) {
      if (l.scope === scope) {
        try { l.cb() } catch { /* noop */ }
      }
    }
  }

  // ─── 历史 ───
  private serializeState(): string {
    const elements = this.getElements().filter((e) => !e.isDeleted).map((e) => ({ ...e }))
    const app = this.api?.getAppState() ?? {}
    const viewport = { scrollX: app.scrollX ?? 0, scrollY: app.scrollY ?? 0, zoom: zoomValue(app.zoom) }
    return JSON.stringify({ elements, viewport, shapes: Array.from(this.shapesAtom.get().values()) })
  }

  // 防抖提交（用于引擎自身程序化增删改）：手势进行中不提交（由手势结束统一收敛）
  private scheduleHistory() {
    if (this.pointerGesture || this.gestureActive) return
    if (this.historyTimer) clearTimeout(this.historyTimer)
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null
      this.commitAfterState()
    }, 400)
  }

  // 把「当前场景」作为一条历史条目提交（after-state 模型：栈顶始终是最近一次
  // 操作后的状态，撤销即回退到上一条）。与上次条目相同则跳过（避免空转）。
  private commitAfterState() {
    const snap = this.serializeState()
    const last = this.undoStack[this.undoStack.length - 1]
    if (last === snap) return
    this.undoStack.push(snap)
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
    this.redoStack = []
    this.canUndoAtom.set(this.undoStack.length > 1)
    this.canRedoAtom.set(false)
    // 关键：快照状态变化时主动 emit，使工具栏的 canUndo/canRedo React 状态及时刷新。
    // ⚠ 必须同时 emit('document')：CanvasView 里 setCanUndo/setCanRedo 只挂在
    // document scope 监听器（updateState）上，session 监听器只同步 zoom/选中/工具、
    // 并不更新 canUndo/canRedo。若这里只 emit('session')，则纯画笔绘制收笔后
    // （画笔期间 syncFromScene 的 dirty 恒为 false，全程无 document emit）engine 内部
    // canUndoAtom 虽已置 true，但 React 的 canUndo 仍是旧的 false → 撤销按钮保持
    // disabled（红色 not-allowed 光标）、点击无效；只有再加卡片/画别的图形（那些操作
    // 会 emit('document')）才顺带把按钮刷亮——这正是「画笔首笔撤销按钮点不动」的根因。
    this.emit('document')
    this.emit('session')
  }

  private restoreState(snap: string) {
    let data: EngineDocumentLike
    try {
      data = JSON.parse(snap) as EngineDocumentLike
    } catch {
      return
    }
    try {
      this.applyingRemote = true
      // 还原卡片形状
      const map = new Map<string, ShapeLike>()
      for (const s of data.shapes ?? []) map.set(s.id, s)
      this.shapesAtom.set(map)
      // 还原 Excalidraw 场景
      if (this.api && data.elements) {
        const vp = data.viewport ?? {}
        this.api.updateScene({
          elements: data.elements,
          appState: { scrollX: vp.scrollX ?? 0, scrollY: vp.scrollY ?? 0, zoom: asZoom(vp.zoom) },
        })
      }
    } catch {
      // 场景写回失败也不应卡死交互：applyingRemote 必须在 finally 中复位，
      // 否则会一直拦截 syncFromScene，导致后续所有同步/历史记录失效。
    } finally {
      this.applyingRemote = false
      // 还原后重置手势/历史中间态，避免残留的 gestureActive 抑制后续提交；
      // 并刷新场景指纹，使紧接着的编辑能正确识别为「新变化」。
      this.gestureActive = false
      this.pointerGesture = false
      if (this.pendingCommit) { clearTimeout(this.pendingCommit); this.pendingCommit = null }
      if (this.historyTimer) { clearTimeout(this.historyTimer); this.historyTimer = null }
      this.lastSceneSig = this.sceneSignature()
      this.emit('document')
      this.emit('session')
    }
  }

  // ════════════════════════════════════════════════════════════
  //  tldraw Editor 兼容 API
  // ════════════════════════════════════════════════════════════

  // — 查询 —
  getCanUndo() { return this.canUndoAtom.get() }
  getCanRedo() { return this.canRedoAtom.get() }
  getZoomLevel() { return this.zoomAtom.get() }

  getSelectedShapeIds(): string[] { return [...this.selectedIdsAtom.get()] }

  getCurrentToolId(): string { return this.currentToolAtom.get() }

  getCamera(): CameraState { return { ...this.cameraAtom.get() } }

  getEditingShapeId(): string | null { return this.editingShapeIdAtom.get() }

  getShape(id: string): ShapeLike | undefined {
    const s = this.shapesAtom.get().get(id)
    if (s) return s
    // 合成箭头形状
    return this.synthesizeArrowShape(id)
  }

  getShapesAtPoint(point: { x: number; y: number }): ShapeLike[] {
    const hits: ShapeLike[] = []
    for (const s of this.shapesAtom.get().values()) {
      if (point.x >= s.x && point.x <= s.x + (s.props.w ?? 0) &&
          point.y >= s.y && point.y <= s.y + (s.props.h ?? 0)) {
        hits.push(s)
      }
    }
    return hits
  }

  getShapePageBounds(id: string): Box | undefined {
    const s = this.shapesAtom.get().get(id)
    if (!s) {
      const a = this.synthesizeArrowShape(id)
      if (!a) return undefined
      return this.boundsOfShape(a)
    }
    return this.boundsOfShape(s)
  }

  private boundsOfShape(s: ShapeLike): Box {
    return new Box(s.x, s.y, s.props.w ?? s.props.width ?? 0, s.props.h ?? s.props.height ?? 0)
  }

  getSelectionPageBounds(): Box | undefined {
    const ids = this.selectedIdsAtom.get()
    if (ids.length === 0) return undefined
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of ids) {
      const b = this.getShapePageBounds(id)
      if (!b) continue
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY)
    }
    if (minX === Infinity) return undefined
    return new Box(minX, minY, maxX - minX, maxY - minY)
  }

  getSelectedShapes(): ShapeLike[] {
    return this.selectedIdsAtom.get().map((id) => this.getShape(id)).filter(Boolean) as ShapeLike[]
  }

  getCurrentPageShapes(): ShapeLike[] {
    const list = Array.from(this.shapesAtom.get().values())
    // 追加箭头形状（供关系/图谱面板使用）
    for (const a of this.arrowElements()) {
      const syn = this.synthesizeArrowShape(a.id)
      if (syn) list.push(syn)
    }
    return list
  }

  getCurrentPageShapeIds(): Set<string> {
    const set = new Set(this.shapesAtom.get().keys())
    for (const a of this.arrowElements()) set.add(a.id)
    return set
  }

  getCurrentPageBounds(): Box {
    const shapes = Array.from(this.shapesAtom.get().values())
    if (shapes.length === 0) return new Box(0, 0, 0, 0)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const s of shapes) {
      minX = Math.min(minX, s.x); minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + (s.props.w ?? 0)); maxY = Math.max(maxY, s.y + (s.props.h ?? 0))
    }
    return new Box(minX, minY, maxX - minX, maxY - minY)
  }

  getViewportPageBounds(): Box {
    const cam = this.cameraAtom.get()
    const { width, height } = this.getViewportSize()
    return new Box(-cam.x, -cam.y, width / cam.z, height / cam.z)
  }

  getViewportScreenBounds(): Box {
    const { width, height } = this.getViewportSize()
    return new Box(0, 0, width, height)
  }

  /**
   * 计算一个不与现有卡片重叠的落点：从 anchor 起向右下逐级偏移，
   * 直到候选框与所有 note-card / label-card 都不相交（留 pad 间隙）。
   * 用于「新建便签 / 推荐卡片」避免后建的卡片遮挡先建的卡片。
   */
  findFreeSlot(
    anchor: { x: number; y: number },
    w = 260,
    h = 200,
    step = 32,
    pad = 12,
  ): { x: number; y: number } {
    const boxes = this.getCurrentPageShapes()
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

  /**
   * 在「不与现有卡片重叠」的位置新建一张卡片（便签 / 标签）。
   * 落点默认对齐视口左上；可传 anchor 覆盖（如标签取视口中心）。
   * 这是所有「用户点击新建便签 / 新建标签」入口的单一落点来源，
   * 避免任何一个入口写死坐标导致后建的卡片遮挡先建的。
   */
  createCardFree(
    type: 'note-card' | 'label-card',
    props: PropsBag,
    anchor?: { x: number; y: number },
    w?: number,
    h?: number,
  ): string {
    const v = this.getViewportPageBounds()
    const a = anchor ?? { x: v.x + 80, y: v.y + 80 }
    const cw = w ?? (type === 'note-card' ? 260 : 120)
    const ch = h ?? (type === 'label-card' ? 36 : 200)
    const pos = this.findFreeSlot(a, cw, ch)
    return this.createShape({ type, x: pos.x, y: pos.y, props })
  }

  private getViewportSize(): { width: number; height: number } {
    if (this.container) return { width: this.container.clientWidth, height: this.container.clientHeight }
    const app = this.api?.getAppState()
    return { width: app?.width ?? 800, height: app?.height ?? 600 }
  }

  getContainer(): HTMLDivElement {
    return this.container as HTMLDivElement
  }

  // 箭头合成
  private synthesizeArrowShape(id: string): ShapeLike | undefined {
    const el = this.arrowElements().find((e) => e.id === id)
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

  getBindingsFromShape(shapeId: string, _kind: 'arrow'): BindingLike[] {
    const out: BindingLike[] = []
    for (const el of this.arrowElements()) {
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
  screenToPage(point: { x: number; y: number }): { x: number; y: number } {
    const app = this.api?.getAppState() ?? {}
    const rect = this.container?.getBoundingClientRect()
    const offsetLeft = rect?.left ?? 0
    const offsetTop = rect?.top ?? 0
    const zoom = zoomValue(app.zoom)
    return {
      x: (point.x - offsetLeft) / zoom - (app.scrollX ?? 0),
      y: (point.y - offsetTop) / zoom - (app.scrollY ?? 0),
    }
  }

  pageToScreen(point: { x: number; y: number }): { x: number; y: number } {
    const cam = this.cameraAtom.get()
    const rect = this.container?.getBoundingClientRect()
    const offsetLeft = rect?.left ?? 0
    const offsetTop = rect?.top ?? 0
    return {
      x: (point.x + cam.x) * cam.z + offsetLeft,
      y: (point.y + cam.y) * cam.z + offsetTop,
    }
  }

  // — 变更 —
  createShape(partial: ShapePartial): string {
    const id = partial.id ?? genId('shape')
    const type = partial.type
    const x = partial.x ?? 0
    const y = partial.y ?? 0
    const props = { ...(partial.props ?? {}) }
    const w = props.w ?? (type === 'note-card' ? 260 : type === 'label-card' ? 120 : 200)
    const h = props.h ?? (type === 'note-card' ? 200 : type === 'label-card' ? 36 : 160)
    const shape: ShapeLike = {
      id, type, x, y, rotation: 0, isLocked: false, props: { ...props, w, h },
    }
    const map = new Map(this.shapesAtom.get())
    map.set(id, shape)
    this.shapesAtom.set(map)

    // 同步代理矩形到 Excalidraw
    this.pushCardElement(shape)
    this.scheduleHistory()
    this.emit('document')
    return id
  }

  createShapes(partials: ShapePartial[]): string[] {
    return partials.map((p) => this.createShape(p))
  }

  updateShape(partial: Partial<ShapeLike> & { id: string }): void {
    const map = new Map(this.shapesAtom.get())
    const cur = map.get(partial.id)
    if (!cur) return
    const next: ShapeLike = {
      ...cur,
      x: partial.x ?? cur.x,
      y: partial.y ?? cur.y,
      rotation: partial.rotation ?? cur.rotation,
      isLocked: partial.isLocked ?? cur.isLocked,
      props: partial.props ? { ...cur.props, ...partial.props } : cur.props,
    }
    map.set(partial.id, next)
    this.shapesAtom.set(map)
    this.pushCardElement(next)
    // 卡片移动后，让所有绑定到该卡片的连线端点跟随其新位置（保持持续绑定关系）
    this.refreshArrowsForCard(partial.id)
    this.scheduleHistory()
    this.emit('document')
  }

  /**
   * 创建一条绑定到两张卡片的箭头连线。
   * - 起点 / 终点卡片用 Excalidraw 的 startBinding/endBinding 记录（指向卡片代理矩形 id）。
   * - 同时在两张卡片代理矩形上登记 boundElements，使 Excalidraw 在拖拽卡片时也能维护绑定。
   * - 连线几何由 edgePoint 计算（吸附到卡片边缘外，而非插入卡片内部）。
   * 返回新建箭头 id；若任一端点不是卡片或两者相同则返回 null。
   */
  createBoundArrow(fromId: string, toId: string): string | null {
    if (!this.api || fromId === toId) return null
    const els = this.api.getSceneElements() as ExElementLike[]
    const isCard = (e: ExElementLike) => e && !e.isDeleted && e.customData?.cardType && CARD_TYPES.has(e.customData.cardType)
    const fromEl = els.find((e) => e.id === fromId && isCard(e))
    const toEl = els.find((e) => e.id === toId && isCard(e))
    if (!fromEl || !toEl) return null
    // 防止同一方向重复连线（避免重复叠加）
    const dup = els.some(
      (e) => e.type === 'arrow' && !e.isDeleted &&
        e.startBinding?.elementId === fromId && e.endBinding?.elementId === toId,
    )
    if (dup) return null

    const fromBox = { x: fromEl.x, y: fromEl.y, w: fromEl.width, h: fromEl.height }
    const toBox = { x: toEl.x, y: toEl.y, w: toEl.width, h: toEl.height }
    const gap = 8
    const startC = { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }
    const endC = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 }
    const startPt = edgePoint(fromBox, endC, gap)
    const endPt = edgePoint(toBox, startC, gap)
    const arrowId = genId('arrow')
    const minX = Math.min(startPt.x, endPt.x)
    const minY = Math.min(startPt.y, endPt.y)
    const arrowEl = baseElement('arrow', arrowId)
    arrowEl.type = 'arrow'
    arrowEl.x = minX
    arrowEl.y = minY
    arrowEl.width = Math.max(0.001, Math.abs(endPt.x - startPt.x))
    arrowEl.height = Math.max(0.001, Math.abs(endPt.y - startPt.y))
    arrowEl.points = [
      [startPt.x - minX, startPt.y - minY],
      [endPt.x - minX, endPt.y - minY],
    ]
    arrowEl.strokeColor = '#6366f1'
    arrowEl.strokeWidth = 2
    arrowEl.roughness = 0
    arrowEl.roundness = null
    arrowEl.backgroundColor = 'transparent'
    arrowEl.startBinding = { elementId: fromId, focus: 0, gap }
    arrowEl.endBinding = { elementId: toId, focus: 0, gap }
    arrowEl.startArrowhead = null
    arrowEl.endArrowhead = 'arrow'
    arrowEl.lastCommittedPoint = null
    arrowEl.customData = { relationType: 'reference', boundArrow: true }

    const next = els.map((e) => {
      if (e.id === fromId || e.id === toId) {
        const bound = Array.isArray(e.boundElements) ? e.boundElements.filter((b) => b.id !== arrowId) : []
        bound.push({ type: 'arrow', id: arrowId })
        return { ...e, boundElements: bound }
      }
      return e
    })
    next.push(arrowEl)
    this.applyingRemote = true
    try {
      this.api.updateScene({ elements: next })
      this.scheduleHistory()
    } finally {
      this.applyingRemote = false
    }
    this.emit('document')
    return arrowId
  }

  /**
   * 重新计算所有绑定到 cardId 的箭头连线几何，使端点跟随卡片边缘。
   * 无论移动的是起点还是终点卡片，均基于两张卡片当前位置重算两端边界点，
   * 从而保证连线与卡片的持续绑定关系。
   */
  private refreshArrowsForCard(cardId: string): void {
    if (!this.api) return
    const els = this.api.getSceneElements() as ExElementLike[]
    const bound = els.filter(
      (e) => e.type === 'arrow' && !e.isDeleted &&
        (e.startBinding?.elementId === cardId || e.endBinding?.elementId === cardId),
    )
    if (!bound.length) return
    const gap = 8
    let changed = false
    const next = els.map((e) => {
      if (e.type !== 'arrow' || e.isDeleted) return e
      if (e.startBinding?.elementId !== cardId && e.endBinding?.elementId !== cardId) return e
      const fromEl = els.find((x) => x.id === e.startBinding?.elementId && !x.isDeleted)
      const toEl = els.find((x) => x.id === e.endBinding?.elementId && !x.isDeleted)
      if (!fromEl || !toEl) return e
      const fromBox = { x: fromEl.x, y: fromEl.y, w: fromEl.width, h: fromEl.height }
      const toBox = { x: toEl.x, y: toEl.y, w: toEl.width, h: toEl.height }
      const startC = { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 }
      const endC = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 }
      const startPt = edgePoint(fromBox, endC, gap)
      const endPt = edgePoint(toBox, startC, gap)
      const minX = Math.min(startPt.x, endPt.x)
      const minY = Math.min(startPt.y, endPt.y)
      changed = true
      return {
        ...e,
        x: minX,
        y: minY,
        width: Math.max(0.001, Math.abs(endPt.x - startPt.x)),
        height: Math.max(0.001, Math.abs(endPt.y - startPt.y)),
        points: [
          [startPt.x - minX, startPt.y - minY],
          [endPt.x - minX, endPt.y - minY],
        ],
        version: (e.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        updated: Date.now(),
      }
    })
    if (!changed) return
    this.applyingRemote = true
    try {
      this.api.updateScene({ elements: next })
    } finally {
      this.applyingRemote = false
    }
  }

  updateShapes(partials: Array<Partial<ShapeLike> & { id: string }>): void {
    for (const p of partials) this.updateShape(p)
  }

  updateBinding(partial: { id: string; type: 'arrow'; props: PropsBag }): void {
    // 找到对应箭头元素并写回 customData.relationType（Excalidraw 无 updateElement，用 updateScene）
    const el = this.arrowElements().find((e) => `bind-${e.id}-start` === partial.id || `bind-${e.id}-end` === partial.id)
    if (el && this.api) {
      this.patchElement(el.id, { customData: { ...(el.customData ?? {}), relationType: partial.props.relationType } })
    }
    this.emit('document')
  }

  createBinding(partial: BindingPartial): string {
    // 引擎中关系由 Excalidraw 箭头绑定承载；此处记录 customData
    const id = partial.id ?? genId('bind')
    const el = this.arrowElements().find((e) => e.id === partial.fromId || e.id === partial.toId)
    if (el && this.api) {
      this.patchElement(el.id, { customData: { ...(el.customData ?? {}), relationType: partial.props?.relationType ?? 'reference' } })
    }
    this.emit('document')
    return id
  }

  // 单元素补丁：Excalidraw 命令式 API 无 updateElement，统一走 updateScene 全量回写
  private patchElement(elementId: string, patch: Partial<ExElementLike>): void {
    if (!this.api) return
    const elements = this.getElements().map((e) =>
      e.id === elementId ? { ...e, ...patch, version: (e.version ?? 1) + 1, updated: Date.now() } : e,
    )
    this.applyingRemote = true
    this.api.updateScene({ elements })
    this.applyingRemote = false
  }

  createBindings(partials: BindingPartial[]): string[] {
    return partials.map((p) => this.createBinding(p))
  }

  deleteShapes(ids: string[]): void {
    const idSet = new Set(ids)
    const map = new Map(this.shapesAtom.get())
    for (const id of ids) map.delete(id)
    this.shapesAtom.set(map)
    if (this.api) {
      const elements = this.getElements().map((el) => {
        if (idSet.has(el.id)) return { ...el, isDeleted: true }
        // 删除绑定到被删卡片的箭头
        if ((el.type === 'arrow') &&
            (idSet.has(el.startBinding?.elementId ?? '') || idSet.has(el.endBinding?.elementId ?? ''))) {
          return { ...el, isDeleted: true }
        }
        return el
      })
      this.applyingRemote = true
      this.api.updateScene({ elements })
      this.applyingRemote = false
    }
    this.scheduleHistory()
    this.emit('document')
  }

  duplicateShapes(ids: string[]): string[] {
    const newIds: string[] = []
    const map = new Map(this.shapesAtom.get())
    for (const id of ids) {
      const cur = map.get(id)
      if (!cur) continue
      const nid = genId('shape')
      const copy: ShapeLike = {
        ...cur,
        id: nid,
        x: cur.x + 24,
        y: cur.y + 24,
        props: { ...cur.props },
      }
      map.set(nid, copy)
      newIds.push(nid)
      this.pushCardElement(copy)
    }
    this.shapesAtom.set(map)
    this.scheduleHistory()
    this.emit('document')
    return newIds
  }

  setSelectedShapes(ids: string[]): void {
    this.selectedIdsAtom.set([...ids])
    if (this.api) {
      const selectedElementIds: Record<string, true> = {}
      for (const id of ids) {
        if (this.shapesAtom.get().has(id) || this.arrowElements().some((e) => e.id === id)) {
          selectedElementIds[id] = true
        }
      }
      this.api.updateScene({ appState: { selectedElementIds } })
    }
    this.emit('session')
  }

  selectAll(): void {
    this.setSelectedShapes(Array.from(this.shapesAtom.get().keys()))
  }

  selectNone(): void {
    this.setSelectedShapes([])
  }

  setEditingShape(id: string | null): void {
    this.editingShapeIdAtom.set(id)
    this.emit('session')
  }

  /** 当前缩放（场景坐标单位下的数值，已归一化为 number）。 */
  getZoom(): number {
    return zoomValue(this.api?.getAppState().zoom)
  }

  /**
   * 局部橡皮擦：擦除 from→to 线段「半径 capsule」范围内的内容。
   * - free-draw（画笔）笔画：仅剔除被擦到的点，存活点重新分段成多条子路径（局部擦除）。
   * - 其它图元（矩形/椭圆/箭头/文本等，非卡片代理）：与 capsule 相交则整元素删除。
   * - 卡片代理矩形不参与擦除（由卡片系统管理）。
   */
  eraseSegment(from: { x: number; y: number }, to: { x: number; y: number }, radius: number): void {
    if (!this.api) return
    const els = this.api.getSceneElements() as ExElementLike[]
    if (!els.length) return
    const next: ExElementLike[] = []
    let changed = false

    for (const el of els) {
      if (!el || el.isDeleted) { next.push(el); continue }
      // 卡片代理矩形不擦
      if (el.customData?.cardType && CARD_TYPES.has(el.customData.cardType)) { next.push(el); continue }

      // 画笔笔画：局部剔除 + 重新分段
      if (el.type === 'freedraw') {
        const pts = (el.points as number[][]) || []
        if (pts.length < 2) { next.push(el); continue }
        const abs = pts.map((p: number[]) => ({ x: el.x + p[0], y: el.y + p[1] }))
        const erased = abs.map((pt: { x: number; y: number }) => distToSegment(pt, from, to) <= radius)
        const runs: number[][] = []
        let cur: number[] = []
        for (let j = 0; j < abs.length; j++) {
          if (erased[j]) { if (cur.length) { runs.push(cur); cur = [] } }
          else cur.push(j)
        }
        if (cur.length) runs.push(cur)
        // 完全未触碰：保持原样
        if (runs.length === 1 && runs[0].length === abs.length) { next.push(el); continue }
        changed = true
        for (let k = 0; k < runs.length; k++) {
          const run = runs[k]
          if (run.length < 2) continue // 残留 <2 点无法成笔，丢弃
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          for (const j of run) {
            const pt = abs[j]
            if (pt.x < minX) minX = pt.x
            if (pt.y < minY) minY = pt.y
            if (pt.x > maxX) maxX = pt.x
            if (pt.y > maxY) maxY = pt.y
          }
          const newPoints = run.map((j: number) => {
            const op = pts[j]
            const np: number[] = [abs[j].x - minX, abs[j].y - minY]
            if (op.length > 2) np.push(op[2] as number)
            return np
          })
          next.push({
            ...el,
            id: k === 0 ? el.id : genId('fd'),
            x: minX,
            y: minY,
            width: Math.max(0, maxX - minX),
            height: Math.max(0, maxY - minY),
            points: newPoints,
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 2 ** 31),
            updated: Date.now(),
          })
        }
        continue
      }

      // 其它图元：胶囊与（按半径外扩的）包围盒相交则整删
      const minX = el.x ?? 0
      const minY = el.y ?? 0
      const maxX = minX + (el.width ?? 0)
      const maxY = minY + (el.height ?? 0)
      if (segmentIntersectsRect(from, to, minX - radius, minY - radius, maxX + radius, maxY + radius)) {
        changed = true
        continue // 不放入 next → 删除
      }
      next.push(el)
    }

    if (!changed) return
    // 经 updateScene 写回场景；标记 applyingRemote 跳过本次 onChange 的同步回写，避免重入
    this.applyingRemote = true
    try {
      this.api.updateScene({ elements: next })
      this.scheduleHistory()
    } finally {
      this.applyingRemote = false
    }
  }

  /**
   * 一键清除白板上所有「画笔笔迹」（free-draw 元素）。
   * 卡片代理矩形与其它矢量图元（矩形/椭圆/箭头/文本…）保留。
   */
  clearBrushStrokes(): void {
    if (!this.api) return
    const els = this.api.getSceneElements() as ExElementLike[]
    if (!els.length) return
    const next = els.filter((el) => {
      if (el.isDeleted) return true
      // 仅移除画笔笔迹，其余（含卡片代理矩形）全部保留
      return el.type !== 'freedraw'
    })
    if (next.length === els.length) return // 没有任何画笔笔迹，无需变更
    this.applyingRemote = true
    try {
      this.api.updateScene({ elements: next })
      this.scheduleHistory()
    } finally {
      this.applyingRemote = false
    }
  }

  setCurrentTool(id: string): void {
    // id 为 tldraw 工具名；转换为 Excalidraw 原生名后再激活。
    // geo 依据 pendingGeo 决定 rectangle / ellipse；note 无原生工具，退回选择态。
    let nativeType = TL_TO_EXCALIDRAW[id] ?? 'selection'
    if (id === 'geo') nativeType = this.pendingGeo
    // ⚠ 关键修复：必须延迟到微任务再调用 Excalidraw 的 setActiveTool。
    // 若在本函数被 React 合成事件（自定义工具栏 onClick）同步调用，会使其在本次
    // React flush 内挂载文本编辑器并触发 updateWysiwygStyle 同步递归
    // （Maximum call stack size exceeded），白板所有工具失效。延后到 React commit
    // 完成后再切换工具，即可正常收敛。原生键盘快捷键因在 React flush 之外执行故无此问题。
    const api = this.api
    if (api) {
      queueMicrotask(() => {
        try { api.setActiveTool({ type: nativeType }) } catch { /* noop */ }
      })
    }
    // currentToolAtom 存 tldraw 名，保证底栏高亮 / 卡片交互判断一致（同步更新，工具栏响应即时）
    this.currentToolAtom.set(id === 'note' ? 'select' : id)
    this.toolSetAt = Date.now()
    this.emit('session')
  }

  setCamera(partial: Partial<CameraState>, _opts?: unknown): void {
    if (!this.api) return
    const cur = this.cameraAtom.get()
    const next: CameraState = {
      x: partial.x ?? cur.x,
      y: partial.y ?? cur.y,
      z: partial.z ?? cur.z,
    }
    this.api.updateScene({
      appState: { scrollX: next.x, scrollY: next.y, zoom: asZoom(next.z) },
    })
    // 立即同步响应式相机状态（不依赖后续 onChange）
    this.cameraAtom.set(next)
    this.zoomAtom.set(next.z)
  }

  zoomToBounds(bounds: Box, opts?: { inset?: number }): void {
    if (!this.api) return
    const inset = opts?.inset ?? 0.2
    const { width, height } = this.getViewportSize()
    const bw = Math.max(bounds.width, 1)
    const bh = Math.max(bounds.height, 1)
    const zoom = Math.min((width * (1 - inset)) / bw, (height * (1 - inset)) / bh, 1.5)
    const z = Math.max(zoom, 0.1)
    const scrollX = -(bounds.x + bw / 2) * z + width / 2
    const scrollY = -(bounds.y + bh / 2) * z + height / 2
    this.api.updateScene({ appState: { zoom: asZoom(z), scrollX, scrollY } })
  }

  zoomToFit(): void {
    if (!this.api) return
    const b = this.getCurrentPageBounds()
    if (b.width === 0 && b.height === 0) {
      this.api.updateScene({ appState: { zoom: asZoom(1), scrollX: 0, scrollY: 0 } })
      return
    }
    this.zoomToBounds(b, { inset: 0.1 })
  }

  zoomToSelection(): void {
    const b = this.getSelectionPageBounds()
    if (b) this.zoomToBounds(b, { inset: 0.2 })
  }

  zoomIn(): void {
    const cam = this.cameraAtom.get()
    this.setCamera({ z: Math.min(cam.z * 1.2, 8) })
  }

  zoomOut(): void {
    const cam = this.cameraAtom.get()
    this.setCamera({ z: Math.max(cam.z / 1.2, 0.1) })
  }

  setStyleForNextShapes(_style: unknown, value: unknown): void {
    // BottomBar 用它传递 geo 子形状（rectangle / ellipse）。记录到 pendingGeo，
    // 供随后的 setCurrentTool('geo') 决定实际激活的 Excalidraw 工具。
    if (value === 'rectangle' || value === 'ellipse' || value === 'diamond') {
      this.pendingGeo = value
    }
  }
  setStyleForSelectedShapes(_style: unknown, _value: unknown): void { /* no-op for hybrid */ }

  // —— 画笔（freedraw）颜色 / 粗细 ——
  // 混合引擎下画笔由 Excalidraw 绘制，其颜色/粗细由 appState.currentItemStrokeColor
  // / currentItemStrokeWidth 决定（tldraw 的 DefaultColorStyle/DefaultSizeStyle 在本引擎不生效）。
  private penColor = '#1e1e1e'
  private penWidth = 2

  setPenColor(color: string): void {
    this.penColor = color
    if (this.api) {
      try { this.api.updateScene({ appState: { currentItemStrokeColor: color } }) } catch { /* noop */ }
    }
  }
  getPenColor(): string {
    if (this.api) {
      const c = this.api.getAppState().currentItemStrokeColor
      if (typeof c === 'string' && c) this.penColor = c
    }
    return this.penColor
  }
  setPenWidth(width: number): void {
    this.penWidth = width
    if (this.api) {
      try { this.api.updateScene({ appState: { currentItemStrokeWidth: width } }) } catch { /* noop */ }
    }
  }
  getPenWidth(): number {
    if (this.api) {
      const w = this.api.getAppState().currentItemStrokeWidth
      if (typeof w === 'number') this.penWidth = w
    }
    return this.penWidth
  }

  undo(): void {
    if (this.undoStack.length <= 1) return
    const current = this.undoStack.pop()!
    this.redoStack.push(current)
    const prev = this.undoStack[this.undoStack.length - 1]
    this.restoreState(prev)
    this.canUndoAtom.set(this.undoStack.length > 1)
    this.canRedoAtom.set(this.redoStack.length > 0)
    this.emit('session')
  }

  redo(): void {
    if (this.redoStack.length === 0) return
    const next = this.redoStack.pop()!
    this.undoStack.push(next)
    this.restoreState(next)
    this.canUndoAtom.set(this.undoStack.length > 1)
    this.canRedoAtom.set(this.redoStack.length > 0)
    this.emit('session')
  }

  updateInstanceState(partial: { isReadonly?: boolean; [key: string]: unknown }): void {
    if (this.api && partial.isReadonly !== undefined) {
      this.api.updateScene({ appState: { viewModeEnabled: partial.isReadonly } })
    }
  }

  // — 序列化 / 加载（替代 getSnapshot/loadSnapshot） —
  serialize(): EngineDocument {
    const app = this.api?.getAppState() ?? {}
    return {
      version: 2,
      viewport: { scrollX: app.scrollX ?? 0, scrollY: app.scrollY ?? 0, zoom: zoomValue(app.zoom) },
      elements: this.getElements().filter((e) => !e.isDeleted).map((e) => ({ ...e })),
      shapes: Array.from(this.shapesAtom.get().values()),
    }
  }

  loadDocument(data: EngineDocumentLike): void {
    if (!data) return
    // 兼容旧 tldraw 快照：若含 elements 则视为 Excalidraw 格式
    this.applyingRemote = true
    const map = new Map<string, ShapeLike>()
    if (Array.isArray(data.shapes)) {
      for (const s of data.shapes) map.set(s.id, s)
    }
    this.shapesAtom.set(map)
    if (this.api) {
      const elements = Array.isArray(data.elements) ? data.elements : []
      // 统一白板底色：viewBackgroundColor 来自 CanvasPanel 注入的 initialDocument
      // （Aurora 暗色 #0D0F15）；未被持久化场景覆盖时回退到同一暗色，保证
      // 画布视图与思维导图/看板/时间轴子视图逐像素同色（§18 桌面原生暗色基线）。
      const viewBg = data?.appState?.viewBackgroundColor ?? '#0D0F15'
      const appState = data.viewport
        ? { scrollX: data.viewport.scrollX, scrollY: data.viewport.scrollY, zoom: asZoom(data.viewport.zoom), viewBackgroundColor: viewBg }
        : { viewBackgroundColor: viewBg }
      // 确保卡片代理元素存在（若缺失则补齐）
      const existingIds = new Set(elements.map((e) => e.id))
      const extra: ExElementLike[] = []
      for (const s of map.values()) {
        if (!existingIds.has(s.id)) extra.push(this.cardElementFromShape(s))
      }
      this.api.updateScene({ elements: [...elements, ...extra], appState })
    }
    this.applyingRemote = false
    this.editingShapeIdAtom.set(null)
    this.selectedIdsAtom.set([])
    // 加载新文档后重置历史栈（不可撤销到上一个文档），
    // 并以「加载后的初始状态」作为基线快照，使首个编辑也可撤销。
    this.undoStack = [this.serializeState()]
    this.redoStack = []
    this.gestureActive = false
    this.pointerGesture = false
    if (this.pendingCommit) { clearTimeout(this.pendingCommit); this.pendingCommit = null }
    if (this.historyTimer) { clearTimeout(this.historyTimer); this.historyTimer = null }
    this.lastSceneSig = this.sceneSignature()
    this.canUndoAtom.set(false)
    this.canRedoAtom.set(false)
    this.emit('document')
    this.emit('session')
  }

  // — 代理元素同步 —
  private pushCardElement(shape: ShapeLike): void {
    if (!this.api) return
    const el = this.cardElementFromShape(shape)
    const existing = this.getElements()
    const idx = existing.findIndex((e) => e.id === shape.id)
    let elements: ExElementLike[]
    if (idx >= 0) {
      elements = existing.map((e) => (e.id === shape.id ? el : e))
    } else {
      elements = [...existing, el]
    }
    this.applyingRemote = true
    this.api.updateScene({ elements })
    this.applyingRemote = false
  }

  private cardElementFromShape(shape: ShapeLike): ExElementLike {
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

  // — 订阅 / 事件 —
  store = {
    listen: (cb: () => void, opts?: { source?: 'user' | 'all'; scope?: 'document' | 'session' }) => {
      const scope = (opts?.scope as 'document' | 'session') ?? 'document'
      const entry = { cb, scope }
      this.listeners.push(entry)
      return () => {
        const i = this.listeners.indexOf(entry)
        if (i >= 0) this.listeners.splice(i, 1)
      }
    },
    allRecords: () => {
      const recs: EngineStoreRecord[] = []
      for (const s of this.shapesAtom.get().values()) recs.push({ typeName: 'shape', ...s })
      for (const a of this.arrowElements()) recs.push({ typeName: 'binding', type: 'arrow', id: a.id })
      return recs
    },
  }

  on(_eventName: string, cb: (info: TLEventInfo) => void): () => void {
    const entry = { cb }
    this.eventListeners.push(entry)
    return () => {
      const i = this.eventListeners.indexOf(entry)
      if (i >= 0) this.eventListeners.splice(i, 1)
    }
  }

  // 由 ExcalidrawCanvas 在指针抬起（命中空白）时调用
  fireBlankPointer() {
    for (const l of this.eventListeners) {
      try {
        l.cb({ type: 'pointer', name: 'pointer_up', target: 'canvas' })
      } catch { /* noop */ }
    }
  }

  registerExternalContentHandler(_kind: string, cb: (content: { point?: { x: number; y: number }; files: File[] }) => void | Promise<void>): void {
    this.fileHandlers.push(cb)
  }

  async handleFiles(files: File[], point?: { x: number; y: number }) {
    for (const h of this.fileHandlers) {
      try { await h({ files: [files[0]], point }) } catch { /* noop */ }
    }
  }

  registerRemoteContent(_cb: (content: unknown) => void) {
    this.remoteContentHandlers.push(_cb)
  }

  user = {
    updateUserPreferences: (_pref: unknown) => { /* 主题由 ExcalidrawCanvas 自行处理 */ },
  }

  // — 屏幕截图（缩略图）：Excalidraw 无原生 toImage，降级返回 null —
  async toImage(_ids: string[], _opts?: unknown): Promise<{ blob: Blob } | null> {
    return null
  }

  getShapeIds(): string[] {
    return Array.from(this.shapesAtom.get().keys())
  }
}

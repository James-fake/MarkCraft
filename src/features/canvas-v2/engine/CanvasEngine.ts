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

import { CARD_TYPES, zoomValue, TL_TO_EXCALIDRAW, EXCALIDRAW_TO_TL, genId, edgePoint, baseElement } from './engineUtils'
// —— P5-3 拆分：查询几何 / 历史栈 / 文档序列化 / 相机缩放+笔 / 橡皮擦 五个领域模块 ——
// 每个函数首参为引擎实例；类上保留单行委托，对外 API 与类内 this.xxx() 调用全部不变。
import * as engineQueries from './engineQueries'
import * as engineHistory from './engineHistory'
import * as engineDocument from './engineDocument'
import * as engineCameraOps from './engineCameraOps'
import * as engineErase from './engineErase'

export class CanvasEngine {
  // ─── 响应式状态（@tldraw/state） ───
  shapesAtom: Atom<Map<string, ShapeLike>>
  selectedIdsAtom: Atom<string[]>
  private currentToolAtom: Atom<string>
  /**
   * 工具刚由工具栏显式切换的时间戳（ms）。在随后的极短窗口内，syncFromScene 的工具回写
   * 以 currentToolAtom 为权威、忽略 Excalidraw 可能尚未生效/延迟回写的旧原生工具。
   * 否则橡皮→其它工具时，Excalidraw 的 setActiveTool 经 this.setState 异步生效，
   * onChange→syncFromScene 在生效前读到仍是旧工具（如 eraser），会把 currentToolAtom
   * 又回写回旧工具，表现为「点了别的工具切不回去」。窗口过后恢复正常回写（键盘快捷键仍同步）。
   */
  private toolSetAt = 0
  cameraAtom: Atom<CameraState>
  editingShapeIdAtom: Atom<string | null>
  canUndoAtom: Atom<boolean>
  canRedoAtom: Atom<boolean>
  zoomAtom: Atom<number>

  // ─── 引用 ───
  api: ExcalidrawAPILike | null = null
  container: HTMLDivElement | null = null
  listeners: Array<{ cb: () => void; scope: 'document' | 'session' }> = []
  private eventListeners: Array<{ cb: (info: TLEventInfo) => void }> = []
  private fileHandlers: Array<(content: { point?: { x: number; y: number }; files: File[] }) => void | Promise<void>> = []
  private remoteContentHandlers: ((content: unknown) => void)[] = []

  // ─── 历史栈（自管 undo/redo） ───
  undoStack: string[] = []
  redoStack: string[] = []
  historyTimer: ReturnType<typeof setTimeout> | null = null
  // 场景内容指纹：用于检测「真正的图元增删改」（不依赖 dirty 标志）
  lastSceneSig = ''
  // 手势进行中标记：拖拽/绘制/文本编辑/缩放旋转期间为 true，用于把一次手势
  // 收敛为「一个」历史条目（否则一次自由绘制会随 pointermove 产生几十次 onChange）。
  gestureActive = false
  // DOM 指针手势标记：由 ExcalidrawCanvas 的容器级 pointer 事件（capture 阶段）驱动，
  // 作为历史提交的「权威手势边界」。不依赖 Excalidraw 内部 appState 字段（不同版本
  // freedraw 可能挂在 draggingElement / newElement / multiElement，靠猜字段极不可靠），
  // 从根本上保证「画笔首笔」等任意指针手势收笔后都能可靠地提交为一条历史。
  pointerGesture = false
  // endPointerGesture 的延迟提交句柄（等 Excalidraw 自身 pointerup 收尾 + onChange 完成后再提交）
  pendingCommit: ReturnType<typeof setTimeout> | null = null

  // 防止 onChange 回写造成死循环
  applyingRemote = false

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
  getElements(): ExElementLike[] {
    return engineQueries.getElements(this)
  }

  cardElements(): ExElementLike[] {
    return engineQueries.cardElements(this)
  }

  arrowElements(): ExElementLike[] {
    return engineQueries.arrowElements(this)
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

  private sceneSignature(): string {
    return engineHistory.sceneSignature(this)
  }

  private emit(scope: 'document' | 'session') {
    engineHistory.emit(this, scope)
  }

  // ─── 历史 ───
  private serializeState(): string {
    return engineHistory.serializeState(this)
  }

  private scheduleHistory() {
    engineHistory.scheduleHistory(this)
  }

  private commitAfterState() {
    engineHistory.commitAfterState(this)
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
    return engineQueries.getShape(this, id)
  }

  getShapesAtPoint(point: { x: number; y: number }): ShapeLike[] {
    return engineQueries.getShapesAtPoint(this, point)
  }

  getShapePageBounds(id: string): Box | undefined {
    return engineQueries.getShapePageBounds(this, id)
  }


  getSelectionPageBounds(): Box | undefined {
    return engineQueries.getSelectionPageBounds(this)
  }

  getSelectedShapes(): ShapeLike[] {
    return engineQueries.getSelectedShapes(this)
  }

  getCurrentPageShapes(): ShapeLike[] {
    return engineQueries.getCurrentPageShapes(this)
  }

  getCurrentPageShapeIds(): Set<string> {
    return engineQueries.getCurrentPageShapeIds(this)
  }

  getCurrentPageBounds(): Box {
    return engineQueries.getCurrentPageBounds(this)
  }

  getViewportPageBounds(): Box {
    return engineQueries.getViewportPageBounds(this)
  }

  getViewportScreenBounds(): Box {
    return engineQueries.getViewportScreenBounds(this)
  }

  findFreeSlot(
    anchor: { x: number; y: number },
    w = 260,
    h = 200,
    step = 32,
    pad = 12,
  ): { x: number; y: number } {
    return engineQueries.findFreeSlot(this, anchor, w, h, step, pad)
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


  getContainer(): HTMLDivElement {
    return this.container as HTMLDivElement
  }


  getBindingsFromShape(shapeId: string, _kind: 'arrow'): BindingLike[] {
    return engineQueries.getBindingsFromShape(this, shapeId, _kind)
  }

  // — 坐标换算 —
  screenToPage(point: { x: number; y: number }): { x: number; y: number } {
    return engineQueries.screenToPage(this, point)
  }

  pageToScreen(point: { x: number; y: number }): { x: number; y: number } {
    return engineQueries.pageToScreen(this, point)
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
    engineErase.eraseSegment(this, from, to, radius)
  }

  /**
   * 一键清除白板上所有「画笔笔迹」（free-draw 元素）。
   * 卡片代理矩形与其它矢量图元（矩形/椭圆/箭头/文本…）保留。
   */
  clearBrushStrokes(): void {
    engineErase.clearBrushStrokes(this)
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
    engineCameraOps.setCamera(this, partial, _opts)
  }

  zoomToBounds(bounds: Box, opts?: { inset?: number }): void {
    engineCameraOps.zoomToBounds(this, bounds, opts)
  }

  zoomToFit(): void {
    engineCameraOps.zoomToFit(this)
  }

  zoomToSelection(): void {
    engineCameraOps.zoomToSelection(this)
  }

  zoomIn(): void {
    engineCameraOps.zoomIn(this)
  }

  zoomOut(): void {
    engineCameraOps.zoomOut(this)
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
  penColor = '#1e1e1e'
  penWidth = 2

  setPenColor(color: string): void {
    engineCameraOps.setPenColor(this, color)
  }
  getPenColor(): string {
    return engineCameraOps.getPenColor(this)
  }
  setPenWidth(width: number): void {
    engineCameraOps.setPenWidth(this, width)
  }
  getPenWidth(): number {
    return engineCameraOps.getPenWidth(this)
  }

  undo(): void {
    engineHistory.undo(this)
  }

  redo(): void {
    engineHistory.redo(this)
  }

  updateInstanceState(partial: { isReadonly?: boolean; [key: string]: unknown }): void {
    engineDocument.updateInstanceState(this, partial)
  }

  // — 序列化 / 加载（替代 getSnapshot/loadSnapshot） —
  serialize(): EngineDocument {
    return engineDocument.serialize(this)
  }

  loadDocument(data: EngineDocumentLike): void {
    engineDocument.loadDocument(this, data)
  }

  // — 代理元素同步 —
  private pushCardElement(shape: ShapeLike): void {
    engineDocument.pushCardElement(this, shape)
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
      // tldraw 语义：每个 binding 描述箭头的一端 —— fromId=箭头 id（消费方据此分组）、
      // toId=对端卡片 id、props.terminal 区分 start/end。消费方（AutoLayoutPanel）
      // 按 fromId 分组后取 start.toId/end.toId 作为流程图边的两端；若缺 fromId/props，
      // 读取即 TypeError（props 为 undefined），有箭头时打开布局面板直接渲染崩溃。
      for (const a of this.arrowElements()) {
        const start = a.startBinding?.elementId
        const end = a.endBinding?.elementId
        const anchor = { x: 0.5, y: 0.5 }
        if (start) {
          recs.push({
            typeName: 'binding', type: 'arrow', id: `bind-${a.id}-start`,
            fromId: a.id, toId: start,
            props: { terminal: 'start', normalizedAnchor: a.startBinding?.normalizedAnchor ?? anchor },
          })
        }
        if (end) {
          recs.push({
            typeName: 'binding', type: 'arrow', id: `bind-${a.id}-end`,
            fromId: a.id, toId: end,
            props: { terminal: 'end', normalizedAnchor: a.endBinding?.normalizedAnchor ?? anchor },
          })
        }
      }
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

/**
 * CanvasEngine — tldraw Editor 兼容适配器（Excalidraw 混合架构）
 *
 * 设计要点：
 * - 内部以 tldraw 风格 shape 记录（Map<id, ShapeLike>）为卡片/连线的「数据真相」，
 *   几何同步到 Excalidraw 的透明矩形代理元素 + 原生箭头。
 * - 使用 @tldraw/state 的 atom 实现响应式，使现有组件里的 `useValue(...)` 自动生效。
 * - Excalidraw 负责平移/缩放/拖拽/选中/箭头/手绘交互；overlay 负责富卡片视觉与编辑。
 */

// ─── 轻量 Box（tldraw Box 兼容） ───
export class Box {
  x: number
  y: number
  width: number
  height: number
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
  get minX() { return this.x }
  get minY() { return this.y }
  get maxX() { return this.x + this.width }
  get maxY() { return this.y + this.height }
  get midX() { return this.x + this.width / 2 }
  get midY() { return this.y + this.height / 2 }
  get center() { return { x: this.midX, y: this.midY } }
}

// ─── 形状记录（tldraw 风格） ───
export interface ShapeLike {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  isLocked: boolean
  opacity?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 形状 props 为无 schema 的上游元素属性袋（鸭子类型桥接 tldraw/Excalidraw 元素模型）
  props: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 同 props，元信息袋
  meta?: Record<string, any>
}

export interface BindingLike {
  id: string
  type: 'arrow'
  fromId: string
  toId: string
  props: { terminal: 'start' | 'end'; normalizedAnchor: { x: number; y: number } }
}

export interface CameraState {
  x: number
  y: number
  z: number
}

// ─── Excalidraw 命令式 API 子集（避免硬依赖包类型） ───
/* eslint-disable @typescript-eslint/no-explicit-any -- interop: 对上游命令式 API 的有意鸭子类型桥接；包类型声明被 .DELETE 破坏不可用（见 src/excalidraw.d.ts），元素/场景数据形状按 any 放行 */
export interface ExcalidrawAPILike {
  updateScene: (scene: { elements?: any[]; appState?: any; files?: any }) => void
  // 注意：真实 Excalidraw 命令式 API 并无 updateElement，单元素修改请走 updateScene 全量回写。
  updateElement?: (el: any) => void
  getSceneElements: () => any[]
  getSceneElementsIncludingDeleted?: () => any[]
  getAppState: () => any
  setActiveTool: (tool: { type: string; [k: string]: any }) => void
  scrollToContent: (target?: any, opts?: any) => void
  setToast?: (toast: any) => void
  refresh?: () => void
  getFiles?: () => any
  addFiles?: (files: any) => void
  onSceneUpdated?: (cb: () => void) => void
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Excalidraw 场景元素模型（Phase C：引擎元素面定型） ───
// @excalidraw/excalidraw 包类型声明损坏（.DELETE 后缀，见 src/excalidraw.d.ts），
// 原生 ExcalidrawElement 不可 import。引擎按「实际消费/写入的字段」自建最小显式
// 模型，其余上游字段经索引签名透传（updateScene 全量回写时不丢失）。

/** 绑定登记条目（Excalidraw boundElements 数组成员） */
export interface BoundElementRef {
  id: string
  type: string
}

/** Excalidraw 箭头端点绑定（startBinding / endBinding） */
export interface ExArrowEndpointBinding {
  elementId: string
  focus: number
  gap: number
  /** tldraw 鸭子兼容面：getBindingsFromShape 读取；Excalidraw 原生绑定无此字段（缺省回退 {0.5,0.5}） */
  normalizedAnchor?: { x: number; y: number }
}

/** 卡片代理元素注入的 customData（cardType + 卡片属性袋） */
export interface CardCustomData {
  cardType?: string
  [key: string]: unknown
}

/** Excalidraw 场景元素——引擎消费/写入的字段子集 + 未知字段透传 */
export interface ExElementLike {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
  /** freedraw / arrow 点集（元素局部坐标；Excalidraw 原生为 number[][]，迁移产物可能是 {x,y}[]） */
  points?: number[][] | Array<{ x: number; y: number }>
  boundElements?: BoundElementRef[] | null
  customData?: CardCustomData | null
  version?: number
  startBinding?: ExArrowEndpointBinding | null
  endBinding?: ExArrowEndpointBinding | null
  /** 其余上游字段（strokeColor / roundness / seed …）原样透传 */
  [key: string]: unknown
}

/** 无 schema 的形状属性袋（与 ShapeLike.props 同形态：上游卡片属性为动态键） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 无 schema 属性袋，同 ShapeLike.props 既有形态（鸭子类型桥接）
export type PropsBag = Record<string, any>

/** createShape 的入参形状 */
export type ShapePartial = Partial<ShapeLike> & { type: string; x?: number; y?: number; props?: PropsBag }

/** createBinding / createBindings 的入参形状 */
export type BindingPartial = { id?: string; fromId?: string; toId?: string; props?: PropsBag }

/** serialize() 的视口快照 */
export interface ViewportSnapshot {
  scrollX: number
  scrollY: number
  zoom: number
}

/** serialize() / migrateTldrawToEngine() 的文档形状（type alias：保持隐式索引签名兼容 EngineDocumentLike） */
export type EngineDocument = {
  version: number
  viewport: ViewportSnapshot
  elements: ExElementLike[]
  shapes: ShapeLike[]
}

/** loadDocument / 历史快照的文档形状（全可选：兼容旧 tldraw 快照与 Excalidraw 文档；type alias 形式以兼容外部数据赋值） */
export type EngineDocumentLike = {
  shapes?: ShapeLike[]
  elements?: ExElementLike[]
  viewport?: Partial<ViewportSnapshot>
  appState?: { viewBackgroundColor?: string; [key: string]: unknown }
  [key: string]: unknown
}

/** store.allRecords() 的 record（tldraw 鸭子：消费方用 predicate 自行收窄） */
export type EngineStoreRecord =
  | (ShapeLike & { typeName?: 'shape' })
  | {
      typeName?: 'binding'
      type: 'arrow'
      id: string
      fromId?: string
      toId?: string
      props?: { terminal?: 'start' | 'end'; normalizedAnchor?: { x: number; y: number } }
    }

// 引擎对外暴露的「编辑器」接口（鸭子类型兼容 tldraw Editor 用于传给现有面板）
// 实际类型在 CanvasEngine.ts 中定义；此处由消费方直接 import { CanvasEngine }。

// ─── tldraw 兼容类型别名（P2 C2：替代 `from 'tldraw'` 的 type-only import） ───
// 注意：Editor 别名指向 CanvasEngine（type-only 循环 import 合法，编译期擦除，无运行时环）；
// 附加索引签名放行「鸭子类型」调用的引擎外方法（如 off/markHistoryStoppingPoint），
// 与既有架构一致——CanvasEngine 本就是 tldraw Editor 的鸭子类型伪装。
import type { CanvasEngine } from './CanvasEngine'
/** Editor 兼容类型：CanvasEngine + 鸭子类型放行 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: tldraw Editor 鸭子类型伪装，索引签名放行引擎外方法（off/markHistoryStoppingPoint 等）
export type Editor = CanvasEngine & { [key: string]: any }
/** shape id（tldraw 为 branded string + 可选泛型，此处 string + brand 兼容） */
export type TLShapeId<T = unknown> = string & { __shapeBrand?: T }
/** 形状记录（tldraw TLShape 兼容） */
export type TLShape = ShapeLike
/** 形状基类（tldraw TLBaseShape<T, P> 兼容） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: tldraw TLBaseShape 泛型默认值按属性袋放行
export type TLBaseShape<T = string, P = Record<string, any>> = ShapeLike & { type: T; props: P }
/** 箭头形状（tldraw TLArrowShape 兼容） */
export type TLArrowShape = ShapeLike
/** 箭头绑定（tldraw TLBinding/TLArrowBinding 兼容） */
export type TLBinding = BindingLike
export type TLArrowBinding = BindingLike
/** 相机状态 */
export type TLCamera = CameraState
/** 事件信息（鸭子类型放行，面板仅透传/读取 type 等） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 上游事件负载形状不定，索引签名放行
export type TLEventInfo = { type: string; [key: string]: any }

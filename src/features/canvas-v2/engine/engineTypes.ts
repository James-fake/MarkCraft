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
  props: Record<string, any>
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

// 引擎对外暴露的「编辑器」接口（鸭子类型兼容 tldraw Editor 用于传给现有面板）
// 实际类型在 CanvasEngine.ts 中定义；此处由消费方直接 import { CanvasEngine }。

// ─── tldraw 兼容类型别名（P2 C2：替代 `from 'tldraw'` 的 type-only import） ───
// 注意：Editor 别名指向 CanvasEngine（type-only 循环 import 合法，编译期擦除，无运行时环）；
// 附加索引签名放行「鸭子类型」调用的引擎外方法（如 off/markHistoryStoppingPoint），
// 与既有架构一致——CanvasEngine 本就是 tldraw Editor 的鸭子类型伪装。
import type { CanvasEngine } from './CanvasEngine'
/** Editor 兼容类型：CanvasEngine + 鸭子类型放行 */
export type Editor = CanvasEngine & { [key: string]: any }
/** shape id（tldraw 为 branded string + 可选泛型，此处 string + brand 兼容） */
export type TLShapeId<T = unknown> = string & { __shapeBrand?: T }
/** 形状记录（tldraw TLShape 兼容） */
export type TLShape = ShapeLike
/** 形状基类（tldraw TLBaseShape<T, P> 兼容） */
export type TLBaseShape<T = string, P = Record<string, any>> = ShapeLike & { type: T; props: P }
/** 箭头形状（tldraw TLArrowShape 兼容） */
export type TLArrowShape = ShapeLike
/** 箭头绑定（tldraw TLBinding/TLArrowBinding 兼容） */
export type TLBinding = BindingLike
export type TLArrowBinding = BindingLike
/** 相机状态 */
export type TLCamera = CameraState
/** 事件信息（鸭子类型放行，面板仅透传/读取 type 等） */
export type TLEventInfo = { type: string; [key: string]: any }

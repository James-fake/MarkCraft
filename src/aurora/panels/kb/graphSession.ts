/**
 * 双链图谱「现场」记忆（模块级单例）
 *
 * 为什么需要：图谱 → 编辑器 → 「← 返回 双链图谱」的往返中 GraphPanel 会整体卸载
 * （AuroraShell 按 view 切换渲染，无 keep-alive），节点坐标 / 视口缩放 / 当前模式
 * 全在组件内部的 useRef/useState 里，随之丢失；返回后图谱按初始环形布局 + Math.random
 * 抖动重新布点，用户看到的是"另一张图"，观感上等同"图被刷新了"。
 *
 * 语义范围严格限定为「空间现场」——节点坐标 + 视口变换 + 布局/模式/中心节点 + 选中节点 + 范围（kbId）。
 * 搜索词、标签筛选、显示开关等属"查询态"，不入此列：返回时按用户当前条件重算更符合直觉。
 *
 * 采用模块级单例（与 navigation/navReturn.ts、BlogPanel.setBlogEntryFileId 同源模式），
 * 避免为传递返回上下文而改动 nav() 签名；刷新页面即清空（与 #view= 不带参数的既有约定一致）。
 */
import type { GraphMode, Layout } from './GraphPanel'

export interface GraphNodePos {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
}

export interface GraphViewport {
  scale: number
  tx: number
  ty: number
}

export interface GraphSession {
  /** 节点坐标：按 id 记忆，新增节点仍走环形布局 */
  positions: Record<string, GraphNodePos>
  view: GraphViewport
  layout: Layout
  mode: GraphMode
  centerId: string
  selectedId: string | null
  /**
   * 该现场属于哪个「范围」：知识库 id，'' = 全局图谱。
   * 2026-09-23 起双链图谱支持「只在某知识库内」呈现（知识库 → 查看完整图谱），
   * 全局图与各库图的节点集合不同，现场必须按范围隔离，否则会串台：
   * 从某库离开后进全局，会沿用范围图的坐标与中心（图少了一半、位置却还是那半张）。
   */
  kbId: string
}

let session: GraphSession | null = null

export function readGraphSession(): GraphSession | null {
  return session
}

export function saveGraphSession(next: GraphSession): void {
  session = next
}

/**
 * Canvas v2 类型定义（tldraw 集成版）
 *
 * tldraw snapshot 格式的画布类型定义。
 * 复用 v1 的画布列表/回收站接口结构。
 */

/** 画布列表条目（轻量，不含完整 data） */
export interface CanvasListItem {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  cardCount: number
  thumbnail?: string
  tags?: string[]
}

/** 画布文档（IndexedDB 持久化结构） */
export interface CanvasDocument {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  tags?: string[]
  /** tldraw snapshot（序列化的 store 快照） */
  data: unknown
  /** P5-A1：演示顺序（shape id 数组） */
  presentationOrder?: string[]
}

/** 回收站条目（软删除的画布） */
export interface CanvasTrashItem {
  id: string
  name: string
  createdAt: number
  deletedAt: number
  cardCount: number
  thumbnail?: string
  tags?: string[]
}

/** 卡片颜色色板（与 v1 一致） */
export const CARD_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#64748b',
]

/** 卡片模板（v1 兼容字段，新代码用 CardTemplateV2） */
export interface CardTemplate {
  id: string
  name: string
  category: 'basic' | 'structured' | 'media' | 'business' | 'custom'
  icon: string
  width: number
  height: number
  color?: string
  tags?: string
  content: string
  isCustom?: boolean
}

// ─── P4 模板系统扩展 ───

/** P4：模板中的单个卡片定义（形状规格） */
export interface TemplateShapeSpec {
  /** 模板内唯一标识，用于连线引用 */
  id: string
  type: 'note-card' | 'image-card' | 'file-card' | 'embed-card'
  /** 相对画布原点的坐标 */
  x: number
  y: number
  w: number
  h: number
  /** hex 颜色 */
  color?: string
  /** markdown 内容（note-card） */
  text?: string
  /** 标签 */
  tags?: string
  /** 引导式占位提示（如「在此填写会议主题」） */
  placeholder?: string
  collapsed?: boolean
}

/** P4：模板中的预设连线定义（连线规格） */
export interface TemplateArrowSpec {
  /** 起点形状 id（引用 TemplateShapeSpec.id） */
  from: string
  /** 终点形状 id */
  to: string
  /** 连线标签 */
  label?: string
  /** 连线颜色（hex，默认 #94a3b8） */
  color?: string
  /** 关系类型（reference/support/refute/derive/example/related/cause） */
  relationType?: RelationType
}

/** P4：卡片模板 v2（向下兼容 v1） */
export interface CardTemplateV2 extends CardTemplate {
  /** 是否为多卡片模板 */
  isMultiShape?: boolean
  /** 多卡片定义（isMultiShape=true 时使用） */
  shapes?: TemplateShapeSpec[]
  /** 预设连线定义 */
  arrows?: TemplateArrowSpec[]
  /** 填写模式：空白 / 引导式 */
  fillMode?: 'blank' | 'guided'
  /** 模板描述（管理面板显示） */
  description?: string
  /** 模板预览缩略图（dataURL，自动生成） */
  thumbnail?: string
}

/** 忽略的自动链接 */
export interface IgnoredLink {
  fromFileId: string
  toFileId: string
  ignoredAt: number
}

/** P2-6：画布版本快照 */
export interface CanvasVersion {
  id: string
  canvasId: string
  createdAt: number
  label?: string
  data: unknown
  thumbnail?: string
}

/** P2-7：分享链接 */
export interface ShareLink {
  id: string
  canvasId: string
  canvasName: string
  data: string
  createdAt: number
  expiresAt?: number
}

/** P2-8：布局对齐类型 */
export type AlignType = 'left' | 'right' | 'center-h' | 'top' | 'bottom' | 'center-v'
export type DistributeType = 'horizontal' | 'vertical'

// ─── P3 类型扩展 ───

/** P3-3：关系类型 */
export type RelationType =
  | 'reference'    // 引用（默认，灰色实线）
  | 'support'      // 支持/佐证（绿色实线）
  | 'refute'       // 反对/反驳（红色虚线）
  | 'derive'       // 衍生/推论（蓝色点线）
  | 'related'      // 相关（紫色细线）
  | 'cause'        // 因果（橙色粗线）

/** P3 关系类型样式映射 */
export const RELATION_TYPE_STYLES: Record<RelationType, { color: string; dash: string; label: string }> = {
  reference: { color: '#9ca3af', dash: 'none', label: '引用' },
  support: { color: '#22c55e', dash: 'none', label: '支持' },
  refute: { color: '#ef4444', dash: '6,4', label: '反对' },
  derive: { color: '#3b82f6', dash: '2,3', label: '衍生' },
  related: { color: '#8b5cf6', dash: 'none', label: '相关' },
  cause: { color: '#f59e0b', dash: 'none', label: '因果' },
}

/** P3-16：收藏项 */
export interface FavoriteItem {
  id: string
  cardId?: string
  canvasId: string
  type: 'card' | 'canvas'
  folder?: string
  order: number
  addedAt: number
}

/** P3-9：搜索索引条目 */
export interface SearchIndexEntry {
  cardId: string
  canvasId: string
  tokens: string[]
  textHash: string
}

/** P3-9：搜索结果 */
export interface SearchResult {
  cardId: string
  canvasId: string
  canvasName: string
  title: string
  snippet: string
  tags: string[]
  score: number
}

/** P3-4：MOC 卡片元数据 */
export interface MocMeta {
  canvasId: string
  cardId: string
  mode: 'tag' | 'canvas' | 'time'
  generatedAt: number
  cardIds: string[]
}

/** P3-10：筛选器预设 */
export interface FilterPreset {
  id: string
  name: string
  tags?: string[]
  colors?: string[]
  cardTypes?: string[]
  dateRange?: { start: number; end: number }
  tagLogic: 'and' | 'or'
}

/** P3-1：图节点 */
export interface GraphNode {
  id: string
  cardId: string
  canvasId: string
  canvasName: string
  title: string
  tags: string[]
  color: string
  cardType: string
  degree: number
}

/** P3-1：图边 */
export interface GraphEdge {
  id: string
  source: string
  target: string
  relationType: RelationType
  canvasId: string
}

/** P3-1：图数据 */
export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** P3-7：时间轴条目 */
export interface TimelineEntry {
  cardId: string
  canvasId: string
  canvasName: string
  title: string
  timestamp: number
  color: string
  tags: string[]
}

/** ID 生成器 */
let _idCounter = 0
export const genId = (prefix: string = 'id') =>
  `${prefix}-${Date.now()}-${_idCounter++}`

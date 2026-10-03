// CanvasInspectorPanel 拆分共享层（P4-2）：Tab 模型 / 形状视图模型 / 纯格式化助手。
// 各 Tab 子组件（PropsTab / LayersTab / FilterTab / FavTab / RecTab / SearchTab）与
// InspectorSelect 单向依赖本文件；禁止反向 import CanvasInspectorPanel.tsx（防环）。
import { CARD_COLORS_LEGACY } from '@features/canvas-v2/theme/canvasTheme'

export const TABS = [
  { id: 'props', labelKey: 'tabProps', icon: 'settings' },
  { id: 'layers', labelKey: 'tabLayers', icon: 'layers' },
  { id: 'filter', labelKey: 'tabFilter', icon: 'filter' },
  { id: 'fav', labelKey: 'tabFav', icon: 'star' },
  { id: 'rec', labelKey: 'tabRec', icon: 'sparkle' },
  { id: 'search', labelKey: 'tabSearch', icon: 'search' },
] as const

export type TabId = (typeof TABS)[number]['id']

// 颜色色板必须对齐渲染侧的 CARD_COLORS_V2（getColorDef 只在其中匹配 from 字段），
// 否则写入的 hex 全部 fallback 成第一个色，表现为「颜色切不动」。单一数据源，避免两套色板漂移。
export const COLORS = CARD_COLORS_LEGACY

export const TAG_SUGGESTIONS = ['重要', '待办', '想法', '参考资料', '设计', '紧急']
export const TAG_SUGGESTIONS_EN = ['Important', 'Todo', 'Ideas', 'Reference', 'Design', 'Urgent']

// 形状类型 → 图标名（与 Icon 注册表对齐）
export const TYPE_ICON: Record<string, string> = {
  'note-card': 'fileText',
  'label-card': 'tag',
  rectangle: 'square',
  ellipse: 'ellipse',
  arrow: 'arrowR',
  text: 'type',
  line: 'line',
  draw: 'draw',
  frame: 'frame',
}

export interface ParsedShape {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  isLocked: boolean
  w: number
  h: number
  text: string
  color: string
  fontSize: number
  fileId: string
  parentId: string
  pinned: boolean
  tags: string[]
  // 标签（label-card）专属：背景色 / 文字色 / 边框开关
  bg: string
  textColor: string
  borderOn: boolean
}

export const rad2deg = (r: number) => Math.round((r * 180) / Math.PI)
export const deg2rad = (d: number) => (d * Math.PI) / 180
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const numOr = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

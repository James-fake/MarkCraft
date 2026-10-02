// CanvasSidebarPanel 拆分共享层（P4-2）：Tab 模型 / 形状视图模型 / 拖拽 MIME 约定。
// 各 Tab 子组件（OutlineTab / BacklinksTab / TagsTab / HistoryTab / MinimapTab / FilesTab）
// 单向依赖本文件；禁止反向 import CanvasSidebarPanel.tsx（防环）。

export const TABS = [
  { id: 'outline', label: '大纲', icon: 'list' },
  { id: 'backlinks', label: '反链', icon: 'backlinks' },
  { id: 'tags', label: '标签', icon: 'tag' },
  { id: 'history', label: '历史', icon: 'history' },
  { id: 'files', label: '文件', icon: 'fileText' },
  { id: 'minimap', label: '小地图', icon: 'frame' },
] as const

export type TabId = (typeof TABS)[number]['id']

// 标签 Tab 推荐标签（与真实 TagIndex 合并展示，确保即便无任何标签也有可用项）
export const TAG_SUGGESTIONS = ['重要', '待办', '想法', '参考资料', '设计', '紧急']

export interface ParsedShape {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  text: string
  fileId: string
}

// 拖拽写入的自定义 MIME（与 CanvasPanel 的放置目标约定一致）
export const CANVAS_FILE_DRAG_MIME = 'application/x-mc-canvas-file-id'
export const CANVAS_FILE_DRAG_NAME_MIME = 'application/x-mc-canvas-file-name'

// CanvasSidebarPanel 拆分共享层（P4-2）：Tab 模型 / 形状视图模型 / 拖拽 MIME 约定。
// 各 Tab 子组件（OutlineTab / BacklinksTab / TagsTab / HistoryTab / MinimapTab / FilesTab）
// 单向依赖本文件；禁止反向 import CanvasSidebarPanel.tsx（防环）。

export const TABS = [
  { id: 'outline', labelKey: 'tabOutline', icon: 'list' },
  { id: 'backlinks', labelKey: 'tabBacklinks', icon: 'backlinks' },
  { id: 'tags', labelKey: 'tabTags', icon: 'tag' },
  { id: 'history', labelKey: 'tabHistory', icon: 'history' },
  { id: 'files', labelKey: 'tabFiles', icon: 'fileText' },
  { id: 'minimap', labelKey: 'tabMinimap', icon: 'frame' },
] as const

export type TabId = (typeof TABS)[number]['id']

// 标签 Tab 推荐标签（与真实 TagIndex 合并展示，确保即便无任何标签也有可用项）
// 新标签默认名（新建标签时的初始文本，属用户内容 → 随语言走）
export const TAG_SUGGESTIONS = ['重要', '待办', '想法', '参考资料', '设计', '紧急']
export const TAG_SUGGESTIONS_EN = ['Important', 'Todo', 'Ideas', 'Reference', 'Design', 'Urgent']

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

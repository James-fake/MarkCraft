import type { MutableRefObject } from 'react'

/** Aurora 弹层开关（由 AuroraShell 以单一数据源持有，命令与编辑器 UI 共用；方案 B 就近归属渲染） */
export interface AuroraModalControls {
  open: (id: AuroraModalId) => void
  close: (id: AuroraModalId) => void
  isOpen: (id: AuroraModalId) => boolean
}
export type AuroraModalId =
  | 'import' | 'linkRedirect' | 'blockBacklinks'
  | 'templateInsert' | 'templateDiscovery' | 'quickCapture'
  | 'librarySync' | 'migrate' | 'quickSwitcher'
  | 'quickOpen' | 'globalSearch' | 'crossKbSearch'
  | 'quit'

/**
 * 编辑器命令桥：供 AuroraShell（命令面板 / 全局快捷键）触发编辑器内部动作。
 * EditorPanel 挂载时注册实现，卸载时清空；未注册（非编辑器视图）时调用静默无操作。
 */
export interface EditorCommandBridge {
  /** Ctrl/Cmd+S 等价：保存当前文档并创建 manual 版本 */
  save?: () => void
  /** 切换预览窗格（叠加式，与源码可并存为双屏） */
  togglePreview?: () => void
  /** 切换编辑内核：源码 / 所见即所得 */
  toggleEditorMode?: () => void
  /** 切换编辑器内部文件树 */
  toggleSidebar?: () => void
  /** 打开版本历史模态 */
  openVersionHistory?: () => void
  /** 打开编辑器内置「跳转到行号」对话框（命令面板 navigation.goToLine 经此触达） */
  goToLine?: () => void
  /** 崩溃恢复：把备份内容写入当前草稿（配合 updateFileContent 双写） */
  restoreCrash?: (content: string) => void
  /** B3 发布闭环：标记当前笔记 → 跳转博客面板（命令面板 `editor.publish` 触达） */
  publish?: () => void
  /** 知识库串联：打开「加入知识库」菜单（命令面板 `editor.addToKb` 触达） */
  openKbMenu?: () => void
  /** 撤销（编辑菜单 · 命令桥） */
  undo?: () => void
  /** 重做（编辑菜单 · 命令桥） */
  redo?: () => void
  /** 编辑器内查找（编辑菜单 · 命令桥） */
  find?: () => void
  /** 删除选区（编辑菜单 · 命令桥） */
  deleteSelection?: () => void
}

export interface EditorPanelProps {
  nav?: (id: string, param?: string) => void
  auroraModal?: AuroraModalControls
  /** 命令桥引用（AuroraShell 持有并注入） */
  cmdBridge?: MutableRefObject<EditorCommandBridge>
  /** 打开全局命令面板（AuroraShell 透传 setCommandOpen，替换原 toast 假入口） */
  onOpenCommandPalette?: () => void
}

// 字数统计统一走真实 features/editor/stats.ts 的 countWords（D4 单一数据源）

// 同名去重已下沉到 services/fileService（供导入/拖拽等非 aurora 场景复用）；此处转出，保持既有引用不变。
export { uniqueFileName } from '@services/fileService'

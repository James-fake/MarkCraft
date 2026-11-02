// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：快捷键绑定表 + 用户自定义绑定的 localStorage 持久化；5 个消费者全在
// features/editor/toolbar/（MarkdownToolbar / WysiwygToolbar / groups/{Format,Insert,UndoRedo}Group）。
// 单 feature 消费 → 已随 Phase 5 并入 features/editor/toolbar/。
export interface ShortcutBinding {
  id: string
  label: string
  /** 英文标签（界面语言为 en 时展示；label 保留中文本体与搜索别名） */
  labelEn: string
  defaultKey: string
  category: 'format' | 'file' | 'view' | 'edit' | 'insert'
  // editable: false 表示该快捷键由编辑器扩展内部处理，
  // 在 Shortcuts Tab 中仅作展示，用户无法自定义
  editable?: boolean
}

const CUSTOM_BINDINGS_KEY = 'markcraft_keybindings'

const DEFAULT_BINDINGS: ShortcutBinding[] = [
  // Format — 由 CodeMirror / Tiptap 扩展内部处理，不可自定义
  { id: 'format.bold', label: '加粗', labelEn: 'Bold', defaultKey: 'Mod+b', category: 'format', editable: false },
  { id: 'format.italic', label: '斜体', labelEn: 'Italic', defaultKey: 'Mod+i', category: 'format', editable: false },
  { id: 'format.underline', label: '下划线', labelEn: 'Underline', defaultKey: 'Mod+u', category: 'format', editable: false },
  // 删除线 = Mod+Shift+x（2026-11-02 让位：Mod+Shift+s 与全局「另存为」Ctrl+Shift+S 冲突，
  // 两边同时触发——工具栏加删除线还弹出另存为。内置文档/命令面板/右键菜单均按 Ctrl+Shift+S 声明另存为，故改删除线）
  { id: 'format.strike', label: '删除线', labelEn: 'Strikethrough', defaultKey: 'Mod+Shift+x', category: 'format', editable: false },
  { id: 'format.highlight', label: '高亮', labelEn: 'Highlight', defaultKey: 'Mod+Shift+h', category: 'format', editable: false },
  { id: 'format.code', label: '行内代码', labelEn: 'Inline Code', defaultKey: 'Mod+e', category: 'format', editable: false },
  // 下标 = Mod+Shift+,（2026-11-02 让位：Mod+, 与全局「设置」Ctrl+, 冲突，编辑器内同时触发）
  { id: 'format.subscript', label: '下标', labelEn: 'Subscript', defaultKey: 'Mod+Shift+,', category: 'format', editable: false },
  { id: 'format.superscript', label: '上标', labelEn: 'Superscript', defaultKey: 'Mod+.', category: 'format', editable: false },
  { id: 'format.heading1', label: '标题1', labelEn: 'Heading 1', defaultKey: 'Mod+1', category: 'format', editable: false },
  { id: 'format.heading2', label: '标题2', labelEn: 'Heading 2', defaultKey: 'Mod+2', category: 'format', editable: false },
  { id: 'format.heading3', label: '标题3', labelEn: 'Heading 3', defaultKey: 'Mod+3', category: 'format', editable: false },
  { id: 'format.blockquote', label: '引用块', labelEn: 'Blockquote', defaultKey: 'Mod+Shift+b', category: 'format', editable: false },
  { id: 'format.codeBlock', label: '代码块', labelEn: 'Code Block', defaultKey: 'Mod+Alt+c', category: 'format', editable: false },
  // File
  { id: 'file.save', label: '保存', labelEn: 'Save', defaultKey: 'Mod+s', category: 'file' },
  { id: 'file.saveAs', label: '另存为', labelEn: 'Save As', defaultKey: 'Mod+Shift+s', category: 'file' },
  { id: 'file.open', label: '打开文件', labelEn: 'Open File', defaultKey: 'Mod+o', category: 'file' },
  // View
  { id: 'view.focusMode', label: '专注模式', labelEn: 'Focus Mode', defaultKey: 'F8', category: 'view' },
  { id: 'view.typewriterMode', label: '打字机模式', labelEn: 'Typewriter Mode', defaultKey: 'F9', category: 'view' },
  { id: 'view.fullscreen', label: '全屏', labelEn: 'Fullscreen', defaultKey: 'F11', category: 'view' },
  { id: 'view.settings', label: '设置', labelEn: 'Settings', defaultKey: 'Mod+,', category: 'view' },
  { id: 'view.sidebar', label: '切换侧栏', labelEn: 'Toggle Sidebar', defaultKey: 'Mod+\\', category: 'view' },
  { id: 'view.outline', label: '切换大纲', labelEn: 'Toggle Outline', defaultKey: 'Mod+Shift+o', category: 'view' },
  // Edit
  { id: 'edit.find', label: '查找', labelEn: 'Find', defaultKey: 'Mod+f', category: 'edit' },
  { id: 'edit.replace', label: '替换', labelEn: 'Replace', defaultKey: 'Mod+h', category: 'edit' },
  { id: 'edit.undo', label: '撤销', labelEn: 'Undo', defaultKey: 'Mod+z', category: 'edit', editable: false },
  { id: 'edit.redo', label: '重做', labelEn: 'Redo', defaultKey: 'Mod+Shift+z', category: 'edit', editable: false },
  { id: 'edit.goToLine', label: '跳转到行', labelEn: 'Go to Line', defaultKey: 'Mod+g', category: 'edit' },
  // Insert（链接按钮无快捷键：Ctrl+K 实际为命令面板，此前 tooltip 虚假声明已删除）
  { id: 'insert.image', label: '插入图片', labelEn: 'Insert Image', defaultKey: 'Mod+Shift+i', category: 'insert' },
  { id: 'insert.table', label: '插入表格', labelEn: 'Insert Table', defaultKey: 'Mod+Shift+t', category: 'insert' },
  { id: 'insert.horizontalRule', label: '插入水平线', labelEn: 'Insert Horizontal Line', defaultKey: 'Mod+Shift+-', category: 'insert' },
]

export function getShortcutBindings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_BINDINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function getShortcut(id: string): string {
  const custom = getShortcutBindings()
  return custom[id] || DEFAULT_BINDINGS.find(b => b.id === id)?.defaultKey || ''
}

export function setShortcut(id: string, key: string): void {
  const bindings = getShortcutBindings()
  if (key === DEFAULT_BINDINGS.find(b => b.id === id)?.defaultKey) {
    delete bindings[id]
  } else {
    bindings[id] = key
  }
  try { localStorage.setItem(CUSTOM_BINDINGS_KEY, JSON.stringify(bindings)) } catch {}
}

export function resetShortcut(id: string): void {
  const bindings = getShortcutBindings()
  delete bindings[id]
  try { localStorage.setItem(CUSTOM_BINDINGS_KEY, JSON.stringify(bindings)) } catch {}
}

export function resetAllShortcuts(): void {
  try { localStorage.removeItem(CUSTOM_BINDINGS_KEY) } catch {}
}

export function getAllBindings(): (ShortcutBinding & { currentKey: string })[] {
  const custom = getShortcutBindings()
  return DEFAULT_BINDINGS.map(b => ({
    ...b,
    currentKey: custom[b.id] || b.defaultKey,
  }))
}

export function getShortcutLabel(id: string): string {
  const key = getShortcut(id)
  if (!key) return ''
  return key
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
}

export function checkConflict(key: string, excludeId?: string): string | null {
  const all = getAllBindings()
  const conflict = all.find(b => b.currentKey === key && b.id !== excludeId)
  return conflict ? conflict.id : null
}

export { DEFAULT_BINDINGS }

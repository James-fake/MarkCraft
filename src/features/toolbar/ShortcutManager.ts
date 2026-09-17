// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：快捷键绑定表 + 用户自定义绑定的 localStorage 持久化；5 个消费者全在
// features/toolbar/（MarkdownToolbar / WysiwygToolbar / groups/{Format,Insert,UndoRedo}Group）。
// 单 feature 消费 → 就近安置（Phase 5 合并 toolbar 入 editor 时随迁）。
export interface ShortcutBinding {
  id: string
  label: string
  defaultKey: string
  category: 'format' | 'file' | 'view' | 'edit' | 'insert'
  // editable: false 表示该快捷键由编辑器扩展内部处理，
  // 在 Shortcuts Tab 中仅作展示，用户无法自定义
  editable?: boolean
}

const CUSTOM_BINDINGS_KEY = 'markcraft_keybindings'

const DEFAULT_BINDINGS: ShortcutBinding[] = [
  // Format — 由 CodeMirror / Tiptap 扩展内部处理，不可自定义
  { id: 'format.bold', label: '加粗', defaultKey: 'Mod+b', category: 'format', editable: false },
  { id: 'format.italic', label: '斜体', defaultKey: 'Mod+i', category: 'format', editable: false },
  { id: 'format.underline', label: '下划线', defaultKey: 'Mod+u', category: 'format', editable: false },
  { id: 'format.strike', label: '删除线', defaultKey: 'Mod+Shift+s', category: 'format', editable: false },
  { id: 'format.highlight', label: '高亮', defaultKey: 'Mod+Shift+h', category: 'format', editable: false },
  { id: 'format.code', label: '行内代码', defaultKey: 'Mod+e', category: 'format', editable: false },
  { id: 'format.subscript', label: '下标', defaultKey: 'Mod+,', category: 'format', editable: false },
  { id: 'format.superscript', label: '上标', defaultKey: 'Mod+.', category: 'format', editable: false },
  { id: 'format.link', label: '链接', defaultKey: 'Mod+k', category: 'format', editable: false },
  { id: 'format.heading1', label: '标题1', defaultKey: 'Mod+1', category: 'format', editable: false },
  { id: 'format.heading2', label: '标题2', defaultKey: 'Mod+2', category: 'format', editable: false },
  { id: 'format.heading3', label: '标题3', defaultKey: 'Mod+3', category: 'format', editable: false },
  { id: 'format.blockquote', label: '引用块', defaultKey: 'Mod+Shift+b', category: 'format', editable: false },
  { id: 'format.codeBlock', label: '代码块', defaultKey: 'Mod+Alt+c', category: 'format', editable: false },
  // File
  { id: 'file.save', label: '保存', defaultKey: 'Mod+s', category: 'file' },
  { id: 'file.saveAs', label: '另存为', defaultKey: 'Mod+Shift+s', category: 'file' },
  { id: 'file.open', label: '打开文件', defaultKey: 'Mod+o', category: 'file' },
  // View
  { id: 'view.focusMode', label: '专注模式', defaultKey: 'F8', category: 'view' },
  { id: 'view.typewriterMode', label: '打字机模式', defaultKey: 'F9', category: 'view' },
  { id: 'view.fullscreen', label: '全屏', defaultKey: 'F11', category: 'view' },
  { id: 'view.settings', label: '设置', defaultKey: 'Mod+,', category: 'view' },
  { id: 'view.sidebar', label: '切换侧栏', defaultKey: 'Mod+\\', category: 'view' },
  { id: 'view.outline', label: '切换大纲', defaultKey: 'Mod+Shift+o', category: 'view' },
  // Edit
  { id: 'edit.find', label: '查找', defaultKey: 'Mod+f', category: 'edit' },
  { id: 'edit.replace', label: '替换', defaultKey: 'Mod+h', category: 'edit' },
  { id: 'edit.undo', label: '撤销', defaultKey: 'Mod+z', category: 'edit', editable: false },
  { id: 'edit.redo', label: '重做', defaultKey: 'Mod+Shift+z', category: 'edit', editable: false },
  { id: 'edit.goToLine', label: '跳转到行', defaultKey: 'Mod+g', category: 'edit' },
  // Insert
  { id: 'insert.link', label: '插入链接', defaultKey: 'Mod+k', category: 'insert', editable: false },
  { id: 'insert.image', label: '插入图片', defaultKey: 'Mod+Shift+i', category: 'insert' },
  { id: 'insert.table', label: '插入表格', defaultKey: 'Mod+Shift+t', category: 'insert' },
  { id: 'insert.horizontalRule', label: '插入水平线', defaultKey: 'Mod+Shift+-', category: 'insert' },
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

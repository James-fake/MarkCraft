import Subscript from '@tiptap/extension-subscript'

// 下标 = Mod+Shift+,（2026-11-02 让位：@tiptap/extension-subscript 默认 Mod+, 与
// 全局「设置」Ctrl+, 冲突 —— 编辑器内按键既切下标又开设置面板。本扩展在
// StarterKit 之后注册，Tiptap 快捷键表后者覆盖前者，故此处可接管。）
const SubscriptMark = Subscript.configure({
  HTMLAttributes: { class: 'subscript' },
}).extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-,': () => this.editor.commands.toggleSubscript(),
      // 吞掉默认 Mod-,：返回 false → 不 preventDefault，事件冒泡到 document，
      // 由全局 useKeyboardShortcuts 打开「设置」——同一按键不再被两处同时处理。
      'Mod-,': () => false,
    }
  },
})

export default SubscriptMark

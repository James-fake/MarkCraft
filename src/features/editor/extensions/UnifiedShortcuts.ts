import { Extension } from '@tiptap/core'

export function createUndoRedoExtension(undoFn: () => void, redoFn: () => void) {
  return Extension.create({
    name: 'undoRedoShortcuts',

    addKeyboardShortcuts() {
      return {
        'Mod-z': () => {
          undoFn()
          return true
        },
        'Mod-y': () => {
          redoFn()
          return true
        },
        'Mod-Shift-z': () => {
          redoFn()
          return true
        },
      }
    },
  })
}

const UnifiedShortcuts = Extension.create({
  name: 'unifiedShortcuts',

  addKeyboardShortcuts() {
    return {
      // Ctrl+Shift+K: toggle code block
      'Mod-Shift-k': ({ editor }) => {
        editor.chain().focus().toggleCodeBlock().run()
        return true
      },

      // Ctrl+Shift+X: toggle strikethrough
      // （2026-11-02 让位调整：删除线原为 StarterKit Strike 默认的 Mod-Shift-s，
      //   与全局「另存为」Ctrl+Shift+S 冲突 —— 编辑器内按键两边同时触发。
      //   本扩展在 StarterKit 之后注册，Tiptap 快捷键表后者覆盖前者，故此处可接管。）
      'Mod-Shift-x': ({ editor }) => {
        editor.chain().focus().toggleStrike().run()
        return true
      },

      // 吞掉 StarterKit Strike 的默认 Mod-Shift-s：返回 false → keymap 未消费、
      // 不 preventDefault，事件继续冒泡到 document，由全局 useKeyboardShortcuts
      // 打开「另存为」——同一按键不再被两处同时处理。
      'Mod-Shift-s': () => false,

      // Ctrl+Shift+N: insert footnote
      'Mod-Shift-n': ({ editor }) => {
        editor.chain().focus().insertFootnote().run()
        return true
      },

      // Ctrl+M: insert inline math
      'Mod-m': ({ editor }) => {
        const { from, to } = editor.state.selection
        const selectedText = editor.state.doc.textBetween(from, to)
        const latex = selectedText || ''
        editor.chain().focus().insertMathInlineNode(latex).run()
        return true
      },

      // Ctrl+Shift+M: insert block math
      'Mod-Shift-m': ({ editor }) => {
        editor.chain().focus().insertMathBlock().run()
        return true
      },
    }
  },
})

export default UnifiedShortcuts

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

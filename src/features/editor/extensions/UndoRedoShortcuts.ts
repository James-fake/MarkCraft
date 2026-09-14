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

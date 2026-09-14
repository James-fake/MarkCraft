import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const clearMarksKey = new PluginKey('clearMarksOnDelete')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clearMarksOnEnter: {
      splitBlockAndClearMarks: () => ReturnType
    }
  }
}

const ClearMarksOnEnter = Extension.create({
  name: 'clearMarksOnEnter',

  addCommands() {
    return {
      splitBlockAndClearMarks:
        () =>
        ({ editor, tr, state, dispatch }) => {
          const { $head } = state.selection
          const parent = $head.parent

          if (parent.type.name === 'codeBlock') return false

          const isAtEnd = $head.pos === $head.end()
          if (!isAtEnd) return false

          const hasMarks = $head.marks().length > 0
          if (!hasMarks) return false

          if (dispatch) {
            const newTr = tr.split($head.pos)
            const afterSplitPos = newTr.mapping.map($head.pos)
            const resolvedPos = newTr.doc.resolve(afterSplitPos + 1)
            const marksToRemove = resolvedPos.marks()
            for (const mark of marksToRemove) {
              newTr.removeMark(afterSplitPos + 1, afterSplitPos + 1 + resolvedPos.parent.content.size, mark.type)
            }
            dispatch(newTr)
            editor.view.focus()
          }

          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        return editor.commands.splitBlockAndClearMarks()
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: clearMarksKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { selection, storedMarks } = newState

          if (!storedMarks || storedMarks.length === 0) return null

          if (!selection.empty) return null

          const $pos = selection.$head
          const parent = $pos.parent

          if (parent.type.name === 'codeBlock') return null

          if (parent.content.size === 0) {
            const tr = newState.tr
            for (const mark of storedMarks) {
              tr.removeStoredMark(mark)
            }
            return tr
          }

          return null
        },
      }),
    ]
  },
})

export default ClearMarksOnEnter

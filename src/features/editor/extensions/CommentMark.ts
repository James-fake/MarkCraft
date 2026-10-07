import { Mark, mergeAttributes, InputRule } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: () => ReturnType
      toggleComment: () => ReturnType
      unsetComment: () => ReturnType
    }
  }
}

const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span[data-comment]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-comment': '',
      style: 'border-bottom: 1px dashed #888; color: #888; font-style: italic;',
    }), 0]
  },

  addCommands() {
    return {
      setComment: () => ({ commands }) => {
        return commands.setMark(this.name)
      },
      toggleComment: () => ({ commands }) => {
        return commands.toggleMark(this.name)
      },
      unsetComment: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addInputRules() {
    return [
      // Support %%text%% syntax
      new InputRule({
        find: /%%([^%]+?)%%$/,
        handler: ({ range, match, chain }) => {
          const text = match[1]
          chain().command(({ tr, state }) => {
            const markType = state.schema.marks.comment
            tr.delete(range.from, range.to)
            tr.insertText(text, range.from)
            if (markType) {
              tr.addMark(range.from, range.from + text.length, markType.create())
            }
            return true
          }).run()
        },
      }),
    ]
  },
})

export default CommentMark

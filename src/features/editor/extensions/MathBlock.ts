import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MathBlockView from './MathBlockView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType
    }
  }
}

const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-latex') || '',
        renderHTML: (attrs) => ({
          'data-latex': attrs.latex,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mathBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'mathBlock' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView)
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        if (!editor.isActive('mathBlock')) return false
        const { empty } = editor.state.selection
        if (!empty) return false
        const node = editor.state.selection.$head.parent
        if (node.content.size === 0) {
          return editor.commands.deleteSelection()
        }
        return false
      },
    }
  },
})

export default MathBlock

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MathInlineNodeView from './MathInlineNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInlineNode: {
      insertMathInlineNode: (latex?: string) => ReturnType
    }
  }
}

const MathInlineNode = Node.create({
  name: 'mathInlineNode',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-latex') || '',
        renderHTML: (attrs) => {
          if (!attrs.latex) return {}
          return { 'data-latex': attrs.latex }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mathInlineNode"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'mathInlineNode' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineNodeView)
  },

  addCommands() {
    return {
      insertMathInlineNode:
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
        if (!editor.isActive('mathInlineNode')) return false
        const { empty } = editor.state.selection
        if (!empty) return false
        return editor.commands.deleteSelection()
      },
    }
  },
})

export default MathInlineNode

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FootnoteReferenceView from './FootnoteReferenceView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnoteReference: {
      insertFootnote: (id?: string, content?: string) => ReturnType
    }
  }
}

const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote-id') || '',
        renderHTML: (attrs) => ({ 'data-footnote-id': attrs.id }),
      },
      content: {
        default: '',
        parseHTML: (el) => {
          const val = el.getAttribute('data-footnote-content') || ''
          return val === '\u200B' ? '' : val
        },
        renderHTML: (attrs) => {
          const val = attrs.content as string
          return { 'data-footnote-content': val === '' ? '\u200B' : val }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'sup[data-type="footnoteReference"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, { 'data-type': 'footnoteReference' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteReferenceView)
  },

  addCommands() {
    return {
      insertFootnote:
        (id = '', content = '') =>
        ({ commands, editor }) => {
          if (!id) {
            const doc = editor.state.doc
            const usedIds = new Set<string>()
            doc.descendants((node) => {
              if (node.type.name === this.name && node.attrs.id) {
                usedIds.add(node.attrs.id as string)
              }
            })
            // Find the next available sequential number for readability
            let nextNum = 1
            while (usedIds.has(String(nextNum))) {
              nextNum++
            }
            // Use timestamp suffix to guarantee uniqueness even under
            // concurrent edits or undo/redo scenarios
            const suffix = Date.now().toString(36)
            id = `${nextNum}-${suffix}`
          }
          return commands.insertContent({
            type: this.name,
            attrs: { id, content },
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        if (!editor.isActive('footnoteReference')) return false
        const { empty } = editor.state.selection
        if (!empty) return false
        return editor.commands.deleteSelection()
      },
    }
  },
})

export default FootnoteReference

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MermaidBlockView from './MermaidBlockView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaidBlock: (code?: string) => ReturnType
    }
  }
}

const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-code') || '',
        renderHTML: (attrs) => ({ 'data-code': attrs.code }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaidBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaidBlock' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView, {
      stopEvent({ event }) {
        const target = event.target as HTMLElement
        // Block ProseMirror inside the overlay (so <input> works)
        if (target.closest('[data-mindmap-overlay]')) return true
        // Block ProseMirror on input/textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true
        // Let ProseMirror handle everything else (node selection, etc.)
        return false
      },
    })
  },

  addCommands() {
    return {
      insertMermaidBlock:
        (code = 'graph TD\n    A[Start] --> B[End]') =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { code } })
        },
    }
  },
})

export default MermaidBlock

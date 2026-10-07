import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import EmbedContentView from './EmbedContentView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedContent: {
      setEmbedContent: (target: string, embedType?: string, heading?: string) => ReturnType
    }
  }
}

const EmbedContent = Node.create({
  name: 'embedContent',
  group: 'block',
  content: '',
  marks: '',
  defining: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: el => el.getAttribute('data-embed-target') || '',
        renderHTML: attrs => {
          if (!attrs.target) return {}
          return { 'data-embed-target': attrs.target }
        },
      },
      embedType: {
        default: 'note',
        parseHTML: el => el.getAttribute('data-embed-type') || 'note',
        renderHTML: attrs => ({ 'data-embed-type': attrs.embedType || 'note' }),
      },
      heading: {
        default: null,
        parseHTML: el => el.getAttribute('data-embed-heading') || null,
        renderHTML: attrs => {
          if (!attrs.heading) return {}
          return { 'data-embed-heading': attrs.heading }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedContentView)
  },

  addCommands() {
    return {
      setEmbedContent: (target: string, embedType: string = 'note', heading?: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { target, embedType, heading: heading || null },
        })
      },
    }
  },
})

export default EmbedContent

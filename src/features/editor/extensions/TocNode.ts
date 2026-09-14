import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TocView from './TocView'

const TocNode = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-toc]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-toc': 'true', class: 'toc-container' })]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[(TOC|toc)\]$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).insertContent({ type: 'toc' }).run()
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView)
  },
})

export default TocNode

import { Mark, mergeAttributes } from '@tiptap/core'

const AbbreviationMark = Mark.create({
  name: 'abbreviation',

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('title'),
        renderHTML: (attrs: Record<string, any>) => {
          if (!attrs.title) return {}
          return { title: attrs.title }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'abbr' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['abbr', mergeAttributes(HTMLAttributes), 0]
  },
})

export default AbbreviationMark

import { Mark, mergeAttributes } from '@tiptap/core'

const AbbreviationMark = Mark.create({
  name: 'abbreviation',

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('title'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 上游 renderHTML 签名即 Record<string, any>（@tiptap/core MarkConfig:1533），忠实镜像不收窄
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

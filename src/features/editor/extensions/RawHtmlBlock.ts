import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rawHtml: {
      insertRawHtml: (html: string) => ReturnType
    }
  }
}

const RawHtmlBlock = Node.create({
  name: 'rawHtml',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      html: { default: '' },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-raw-html]' },
    ]
  },

  renderHTML() {
    return ['div', { 'data-raw-html': 'true' }, 0]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-raw-html', 'true')
      dom.innerHTML = node.attrs.html || ''
      dom.style.cssText = 'margin: 8px 0;'
      dom.contentEditable = 'false'
      return { dom }
    }
  },

  addCommands() {
    return {
      insertRawHtml:
        (html: string) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { html } })
        },
    }
  },
})

export default RawHtmlBlock

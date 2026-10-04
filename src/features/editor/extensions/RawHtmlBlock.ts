import { Node } from '@tiptap/core'
import { sanitizeRawHtml } from '@services/sanitizeHtml'

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
      // 显式读写：序列化端用 data-html 承载原始 HTML（mdToHtml.ts:147 / htmlToMd.ts:322），
      // 若走默认解析（读 getAttribute('html')）则加载即丢内容，且 renderHTML 不写回 data-html
      // 会让保存也丢内容。
      html: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-html') || '',
        renderHTML: (attrs) => (attrs.html ? { 'data-html': attrs.html } : {}),
      },
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
      // C-1：用户原始 HTML 必须经消毒后再注入 DOM，剥离 <script> 与所有 on* 事件，
      // 否则在桌面端运行时可升级为脚本执行 / 本地文件读取。
      dom.innerHTML = sanitizeRawHtml(node.attrs.html || '')
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

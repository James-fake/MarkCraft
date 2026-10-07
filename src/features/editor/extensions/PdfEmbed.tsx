import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import PdfEmbedView from './PdfEmbedView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pdfEmbed: {
      insertPdf: (options: { src?: string; pdfId?: string }) => ReturnType
    }
  }
}

const pdfAutoConvertKey = new PluginKey('pdfAutoConvert')
const appendTransactionKey = 'appendTransactionSource'

const PDF_PATTERN = /@\[pdf\]\(([^)]+)\)/g

function isPdfUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/') || value.startsWith('blob:')
}

const PdfEmbed = Node.create({
  name: 'pdfEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      // markdownConvert 产出 data-src / data-pdf-id，这里对应解析并在序列化时写回，保证往返一致
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-src'),
        renderHTML: (attrs) => (attrs.src ? { 'data-src': attrs.src } : {}),
      },
      pdfId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-pdf-id'),
        renderHTML: (attrs) => (attrs.pdfId ? { 'data-pdf-id': attrs.pdfId } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="pdfEmbed"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // 序列化回 HTML（再经 markdownConvert 反向规则转回 @[pdf](...)）
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'pdfEmbed' })]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pdfAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(pdfAutoConvertKey))
            if (hasOwnChange) return null

            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(pdfAutoConvertKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const { schema, tr } = newState
            const nodeType = schema.nodes.pdfEmbed
            if (!nodeType) return null

            const replacements: { from: number; to: number; node: ProseMirrorNode }[] = []

            newState.doc.descendants((node, pos) => {
              if (!node.isText) return

              const text = node.text
              if (!text) return

              PDF_PATTERN.lastIndex = 0
              let m
              while ((m = PDF_PATTERN.exec(text)) !== null) {
                const value = m[1].trim()
                if (!value) continue

                const attrs = isPdfUrl(value) ? { src: value } : { pdfId: value }
                const pdfNode = nodeType.create(attrs)
                replacements.push({
                  from: pos + m.index,
                  to: pos + m.index + m[0].length,
                  node: pdfNode,
                })
              }
            })

            if (replacements.length === 0) return null

            replacements.sort((a, b) => b.from - a.from)

            for (const { from, to, node } of replacements) {
              tr.replaceWith(from, to, node)
            }

            tr.setMeta(pdfAutoConvertKey, true)
            tr.setMeta(appendTransactionKey, true)
            return tr
          } catch {
            return null
          }
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfEmbedView)
  },

  addCommands() {
    return {
      insertPdf:
        (options: { src?: string; pdfId?: string }) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

export default PdfEmbed

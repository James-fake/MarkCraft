import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import IframeView from './IframeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      insertIframe: (options: { src: string; width?: string; height?: number }) => ReturnType
    }
  }
}

const iframeAutoConvertKey = new PluginKey('iframeAutoConvert')
const appendTransactionKey = 'appendTransactionSource'

const IFRAME_PATTERN = /@\[iframe\]\(([^)]+)\)/g

const IframeNode = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: 400 },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes, { sandbox: 'allow-scripts allow-same-origin' })]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: iframeAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(iframeAutoConvertKey))
            if (hasOwnChange) return null

            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(iframeAutoConvertKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const { schema, tr } = newState
            const iframeNodeType = schema.nodes.iframe
            if (!iframeNodeType) return null

            const replacements: {
              from: number
              to: number
              node: ProseMirrorNode
            }[] = []

            newState.doc.descendants((node, pos) => {
              if (!node.isText) return

              const text = node.text
              if (!text) return

              IFRAME_PATTERN.lastIndex = 0
              let m
              while ((m = IFRAME_PATTERN.exec(text)) !== null) {
                const src = m[1]
                if (!src.trim()) continue

                const iframeNode = iframeNodeType.create({ src })
                replacements.push({
                  from: pos + m.index,
                  to: pos + m.index + m[0].length,
                  node: iframeNode,
                })
              }
            })

            if (replacements.length === 0) return null

            replacements.sort((a, b) => b.from - a.from)

            for (const { from, to, node } of replacements) {
              tr.replaceWith(from, to, node)
            }

            tr.setMeta(iframeAutoConvertKey, true)
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
    return ReactNodeViewRenderer(IframeView)
  },

  addCommands() {
    return {
      insertIframe:
        (options: { src: string; width?: string; height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

export default IframeNode

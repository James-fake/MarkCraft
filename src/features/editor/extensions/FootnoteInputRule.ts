import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'

const footnoteAutoConvertKey = new PluginKey('footnoteAutoConvert')

// Shared meta key — prevents recursive appendTransaction across plugins
const appendTransactionKey = 'appendTransactionSource'

const FOOTNOTE_REF_PATTERN = /\[\^([^\]]+)\]/g

const FootnoteInputRule = Extension.create({
  name: 'footnoteInputRule',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: footnoteAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          const hasOwnChange = transactions.some(tr => tr.getMeta(footnoteAutoConvertKey))
          if (hasOwnChange) return null

          // Skip if another appendTransaction plugin produced changes
          const isFromOtherAppend = transactions.some(
            tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(footnoteAutoConvertKey)
          )
          if (isFromOtherAppend) return null

          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const { schema } = newState
          const footnoteNodeType = schema.nodes.footnoteReference
          if (!footnoteNodeType) return null

          const tr = newState.tr
          let modified = false
          const replacements: {
            from: number
            to: number
            nodes: ProsemirrorNode[]
          }[] = []

          newState.doc.descendants((node, pos) => {
            if (!node.isText) return

            const text = node.text
            if (!text) return

            FOOTNOTE_REF_PATTERN.lastIndex = 0
            const matches: { index: number; id: string; fullLength: number }[] = []
            let m

            while ((m = FOOTNOTE_REF_PATTERN.exec(text)) !== null) {
              matches.push({
                index: m.index,
                id: m[1],
                fullLength: m[0].length,
              })
            }

            if (matches.length === 0) return

            const fragments: ProsemirrorNode[] = []
            let lastIndex = 0

            for (const match of matches) {
              if (match.index > lastIndex) {
                fragments.push(schema.text(text.slice(lastIndex, match.index), node.marks))
              }

              const footnoteNode = footnoteNodeType.create({
                id: match.id,
                content: '',
              })
              fragments.push(footnoteNode)

              lastIndex = match.index + match.fullLength
            }

            if (lastIndex < text.length) {
              fragments.push(schema.text(text.slice(lastIndex), node.marks))
            }

            if (fragments.length > 0) {
              replacements.push({
                from: pos,
                to: pos + node.nodeSize,
                nodes: fragments,
              })
            }
          })

          for (let i = replacements.length - 1; i >= 0; i--) {
            const { from, to, nodes } = replacements[i]
            tr.replaceWith(from, to, nodes)
            modified = true
          }

          if (modified) {
            tr.setMeta(footnoteAutoConvertKey, true)
            tr.setMeta(appendTransactionKey, true)
            return tr
          }

          return null
        },
      }),
    ]
  },
})

export default FootnoteInputRule

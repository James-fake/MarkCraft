import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProsemirrorNode, Mark } from '@tiptap/pm/model'

const linkAutoConvertKey = new PluginKey('linkAutoConvert')

// Shared meta key — prevents recursive appendTransaction across plugins
const appendTransactionKey = 'appendTransactionSource'

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

const LinkInputRule = Extension.create({
  name: 'linkInputRule',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          const hasOwnChange = transactions.some(tr => tr.getMeta(linkAutoConvertKey))
          if (hasOwnChange) return null

          // Skip if another appendTransaction plugin produced changes
          const isFromOtherAppend = transactions.some(
            tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(linkAutoConvertKey)
          )
          if (isFromOtherAppend) return null

          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const { schema } = newState
          const linkMarkType = schema.marks.link
          if (!linkMarkType) return null

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

            LINK_PATTERN.lastIndex = 0
            const matches: { index: number; text: string; url: string; fullLength: number }[] = []
            let m

            while ((m = LINK_PATTERN.exec(text)) !== null) {
              matches.push({
                index: m.index,
                text: m[1],
                url: m[2],
                fullLength: m[0].length,
              })
            }

            if (matches.length === 0) return

            // Skip if any matches overlap
            for (let i = 1; i < matches.length; i++) {
              const prev = matches[i - 1]
              const curr = matches[i]
              if (curr.index < prev.index + prev.fullLength) {
                return
              }
            }

            const existingLinkMark = node.marks.find(mark => mark.type.name === 'link')
            if (existingLinkMark) return

            const fragments: ProsemirrorNode[] = []
            let lastIndex = 0

            for (const match of matches) {
              if (match.index > lastIndex) {
                // Non-link text: ensure no link mark is carried over
                const plainMarks = node.marks.filter(mk => mk.type.name !== 'link')
                fragments.push(schema.text(text.slice(lastIndex, match.index), plainMarks))
              }

              const linkMark = linkMarkType.create({ href: match.url }) as Mark
              // Deduplicate: remove any existing link marks, then add the new one
              const linkMarks = [...node.marks.filter(mk => mk.type.name !== 'link'), linkMark]
              fragments.push(schema.text(match.text, linkMarks))

              lastIndex = match.index + match.fullLength
            }

            if (lastIndex < text.length) {
              // Trailing non-link text: ensure no link mark is carried over
              const plainMarks = node.marks.filter(mk => mk.type.name !== 'link')
              fragments.push(schema.text(text.slice(lastIndex), plainMarks))
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
            tr.setMeta(linkAutoConvertKey, true)
            tr.setMeta(appendTransactionKey, true)
            return tr
          }

          return null
        },
      }),
    ]
  },
})

export default LinkInputRule

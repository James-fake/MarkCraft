import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { generateHeadingId } from '@utils/headingIdUtils'

const headingIdKey = new PluginKey('headingIdAssign')

// Shared meta key — same as in MathInline.ts, prevents recursive appendTransaction
const appendTransactionKey = 'appendTransactionSource'

const HeadingIdAssign = Extension.create({
  name: 'headingIdAssign',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingIdKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(headingIdKey))
            if (hasOwnChange) return null

            // Skip if another appendTransaction plugin produced changes
            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(headingIdKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const tr = newState.tr
            let modified = false
            const usedIds = new Map<string, number>()

            newState.doc.descendants((node, pos) => {
              if (node.type.name !== 'heading') return

              const text = node.textContent || ''
              const base = generateHeadingId(text)
              const count = usedIds.get(base) || 0
              usedIds.set(base, count + 1)
              const expectedId = count === 0 ? base : `${base}-${count + 1}`

              if (node.attrs.id !== expectedId) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: expectedId })
                modified = true
              }
            })

            if (modified) {
              tr.setMeta(headingIdKey, true)
              tr.setMeta(appendTransactionKey, true)
              return tr
            }

            return null
          } catch {
            return null
          }
        },
      }),
    ]
  },
})

export default HeadingIdAssign

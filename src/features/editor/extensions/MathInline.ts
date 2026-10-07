import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const mathInlineAutoConvertKey = new PluginKey('mathInlineAutoConvert')

// Shared meta key to signal that an appendTransaction was produced by
// another plugin in the same cycle. Prevents recursive re-scanning.
const appendTransactionKey = 'appendTransactionSource'

/**
 * MathInlineAutoConvert — a pure Plugin extension (no Mark).
 *
 * Scans the document for `$...$` text patterns and automatically
 * replaces them with `mathInlineNode` inline atom nodes.
 * The old `mathInline` Mark has been removed; this extension
 * now only handles the auto-conversion logic.
 */
const MathInlineAutoConvert = Extension.create({
  name: 'mathInlineAutoConvert',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mathInlineAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          // Skip if this plugin already produced a transaction
          const hasOwnChange = transactions.some(tr => tr.getMeta(mathInlineAutoConvertKey))
          if (hasOwnChange) return null

          // Skip if another appendTransaction plugin produced changes
          const isFromOtherAppend = transactions.some(
            tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(mathInlineAutoConvertKey)
          )
          if (isFromOtherAppend) return null

          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const { schema, tr } = newState
          const mathInlineNodeType = schema.nodes.mathInlineNode
          if (!mathInlineNodeType) return null

          // Find $...$ text and replace with mathInlineNode
          const replacements: {
            from: number
            to: number
            latex: string
          }[] = []

          newState.doc.descendants((node, pos) => {
            if (!node.isText) return

            const text = node.text
            if (!text) return

            const regex = /\$([^$\n]+)\$/g
            let m
            while ((m = regex.exec(text)) !== null) {
              const latex = m[1]
              if (!latex.trim()) continue

              replacements.push({
                from: pos + m.index,
                to: pos + m.index + m[0].length,
                latex,
              })
            }
          })

          if (replacements.length === 0) return null

          // Sort in reverse order to avoid position shifts
          replacements.sort((a, b) => b.from - a.from)

          for (const { from, to, latex } of replacements) {
            const mathNode = mathInlineNodeType.create({ latex })
            tr.replaceWith(from, to, mathNode)
          }

          tr.setMeta(mathInlineAutoConvertKey, true)
          tr.setMeta(appendTransactionKey, true)
          return tr
        },
      }),
    ]
  },
})

export default MathInlineAutoConvert

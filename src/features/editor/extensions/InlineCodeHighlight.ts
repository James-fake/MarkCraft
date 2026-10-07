import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import type { ElementContent, Root } from 'hast'
import type { createLowlight } from 'lowlight'
import { getLowlightInstance } from './CodeHighlightConfig'

const inlineCodeHighlightKey = new PluginKey('inlineCodeHighlight')

function parseHighlightNodes(
  nodes: ElementContent[],
  className: string[] = []
): { text: string; classes: string[] }[] {
  return nodes.flatMap((node) => {
    const classes = [
      ...className,
      ...(node.type === 'element' && node.properties ? node.properties.className as string[] : []),
    ]
    if (node.type === 'element' && node.children) {
      return parseHighlightNodes(node.children, classes)
    }
    return { text: node.type === 'text' ? node.value : '', classes }
  })
}

type LowlightInstance = ReturnType<typeof createLowlight>

function getInlineCodeDecorations(
  doc: ProsemirrorNode,
  lowlight: LowlightInstance
): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText) return

    const codeMark = node.marks.find((mark) => mark.type.name === 'code')
    if (!codeMark) return

    const text = node.text
    if (!text) return

    try {
      const result: Root = lowlight.highlightAuto(text)
      const highlightNodes = (result.children || []) as ElementContent[]
      const tokens = parseHighlightNodes(highlightNodes)

      // Verify that token text concatenation matches the original text.
      // If lowlight produces mismatched output (e.g. escaped entities),
      // skip decoration to avoid out-of-range ProseMirror decorations.
      const reconstructed = tokens.map(t => t.text).join('')
      if (reconstructed !== text) {
        return
      }

      let from = pos

      tokens.forEach((token) => {
        const to = from + token.text.length
        // Boundary check: ensure decoration stays within the text node
        if (to > pos + text.length || from >= to) {
          return
        }
        if (token.classes.length) {
          decorations.push(
            Decoration.inline(from, to, {
              class: token.classes.join(' '),
            })
          )
        }
        from = to
      })
    } catch {
      // skip if highlighting fails
    }
  })

  return DecorationSet.create(doc, decorations)
}

const InlineCodeHighlight = Extension.create({
  name: 'inlineCodeHighlight',

  addProseMirrorPlugins() {
    const lowlight = getLowlightInstance()

    return [
      new Plugin({
        key: inlineCodeHighlightKey,
        state: {
          init: (_, { doc }) => getInlineCodeDecorations(doc, lowlight),
          apply: (transaction, decorationSet) => {
            if (transaction.docChanged) {
              return getInlineCodeDecorations(transaction.doc, lowlight)
            }
            return decorationSet.map(transaction.mapping, transaction.doc)
          },
        },
        props: {
          decorations(state) {
            return inlineCodeHighlightKey.getState(state)
          },
        },
      }),
    ]
  },
})

export default InlineCodeHighlight

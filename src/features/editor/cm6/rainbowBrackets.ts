import { ViewPlugin, Decoration, ViewUpdate, DecorationSet, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

const RAINBOW_COLORS = [
  '#e06c75',
  '#61afef',
  '#98c379',
  '#d19a66',
  '#c678dd',
  '#56b6c2',
]

const bracketDecorations = RAINBOW_COLORS.map(color =>
  Decoration.mark({ class: `cm-rainbow-bracket`, attributes: { style: `color: ${color}` } })
)

const matchingBracket: Record<string, string> = {
  '(': ')', '[': ']', '{': '}',
  ')': '(', ']': '[', '}': '{',
}

const openBrackets = new Set(['(', '[', '{'])

function bracketDepth(text: string, pos: number): number {
  let depth = 0
  for (let i = 0; i < pos; i++) {
    const ch = text[i]
    if (openBrackets.has(ch)) {
      depth++
    } else if (matchingBracket[ch]) {
      depth = Math.max(0, depth - 1)
    }
  }
  return depth
}

const rainbowBracketsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const doc = view.state.doc.toString()

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter(node) {
            if (node.name === 'Parentheses' || node.name === 'Brackets' || node.name === 'Braces') {
              const closeChar = view.state.doc.sliceString(node.to - 1, node.to)

              // Determine nesting depth at the opening bracket
              const depth = bracketDepth(doc, node.from)
              const colorIdx = depth % RAINBOW_COLORS.length

              builder.add(node.from, node.from + 1, bracketDecorations[colorIdx])

              // Close bracket: same color as matching open bracket
              if (matchingBracket[closeChar]) {
                builder.add(node.to - 1, node.to, bracketDecorations[colorIdx])
              }
            }
          },
        })
      }

      return builder.finish()
    }
  },
  { decorations: v => v.decorations }
)

export const rainbowBrackets = () => [rainbowBracketsPlugin]

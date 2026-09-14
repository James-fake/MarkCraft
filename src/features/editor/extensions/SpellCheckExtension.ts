import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { Extension, RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { spellChecker } from '../spell/SpellChecker'

// Initialize the spell checker on module load
let initPromise: Promise<void> | null = null
function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = spellChecker.init()
  }
  return initPromise
}

// Legacy compatibility: keep PERSONAL_DICT_KEY for migration
const PERSONAL_DICT_KEY = 'markcraft_personal_dict'

// Migrate old personal dict to new spellChecker
function migratePersonalDict(): void {
  try {
    const raw = localStorage.getItem(PERSONAL_DICT_KEY)
    if (raw) {
      const words: string[] = JSON.parse(raw)
      words.forEach(w => spellChecker.addWord(w))
      localStorage.removeItem(PERSONAL_DICT_KEY)
    }
  } catch {
    // Ignore migration errors
  }
}

// Run migration on load
setTimeout(() => {
  ensureInit().then(() => migratePersonalDict())
}, 0)

// Spell check decoration
const spellErrorDecoration = Decoration.mark({
  class: 'cm-spell-error',
})

// Check if position is inside a code block or other non-text area
function isInCodeBlock(view: EditorView, from: number, to: number): boolean {
  const tree = syntaxTree(view.state)
  let inCode = false
  tree.iterate({
    from,
    to,
    enter(node) {
      // Skip code blocks, inline code, URLs, etc.
      if (node.name === 'CodeBlock' || node.name === 'FencedCode' ||
          node.name === 'InlineCode' || node.name === 'CodeMark' ||
          node.name === 'URL' || node.name === 'LinkMark' ||
          node.name === 'CodeInfo' || node.name === 'CodeText') {
        inCode = true
        return false
      }
    },
  })
  return inCode
}

// Store misspelled word positions for suggestion lookup
const misspelledWords = new Map<string, string>()

const spellCheckPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  enabled: boolean

  constructor(view: EditorView) {
    this.enabled = localStorage.getItem('markcraft_spell_check') !== 'false'
    this.decorations = this.enabled ? this.checkSpelling(view) : Decoration.none
    // Ensure spell checker is initialized
    ensureInit()
  }

  update(update: ViewUpdate) {
    const newEnabled = localStorage.getItem('markcraft_spell_check') !== 'false'
    if (newEnabled !== this.enabled) {
      this.enabled = newEnabled
    }
    if (update.docChanged || update.viewportChanged || newEnabled !== this.enabled) {
      this.decorations = this.enabled ? this.checkSpelling(update.view) : Decoration.none
    } else {
      this.decorations = this.decorations.map(update.changes)
    }
  }

  checkSpelling(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const doc = view.state.doc

    // Only check if spell checker is ready
    if (!spellChecker.isReady()) return Decoration.none

    for (const { from, to } of view.visibleRanges) {
      const text = doc.sliceString(from, to)
      // Find English words
      const wordRegex = /[a-zA-Z]+/g
      let match

      while ((match = wordRegex.exec(text)) !== null) {
        const wordFrom = from + match.index
        const wordTo = wordFrom + match[0].length

        // Skip if in code block
        if (isInCodeBlock(view, wordFrom, wordTo)) continue

        if (!spellChecker.isCorrect(match[0])) {
          builder.add(wordFrom, wordTo, spellErrorDecoration)
          // Store misspelled word for suggestion lookup
          misspelledWords.set(`${wordFrom}-${wordTo}`, match[0])
        }
      }
    }

    return builder.finish()
  }
}, {
  decorations: v => v.decorations,
})

/**
 * Get spell check suggestions for the word at the given position.
 * Can be called from a context menu.
 */
export function getSuggestionsAt(view: EditorView, pos: number): { word: string; suggestions: string[]; from: number; to: number } | null {
  const doc = view.state.doc
  const line = doc.lineAt(pos)
  const lineText = line.text

  // Find the word at the position
  const wordRegex = /[a-zA-Z]+/g
  let match
  while ((match = wordRegex.exec(lineText)) !== null) {
    const wordFrom = line.from + match.index
    const wordTo = wordFrom + match[0].length

    if (pos >= wordFrom && pos <= wordTo) {
      const word = match[0]
      if (!spellChecker.isCorrect(word)) {
        const suggestions = spellChecker.getSuggestions(word)
        return { word, suggestions, from: wordFrom, to: wordTo }
      }
      return null
    }
  }
  return null
}

export function spellCheckExtension(): Extension {
  return spellCheckPlugin
}

export { spellChecker, ensureInit }

// Backward-compatible exports
export function addToPersonalDict(word: string): void {
  spellChecker.addWord(word)
}

export function isWordCorrect(word: string): boolean {
  return spellChecker.isCorrect(word)
}

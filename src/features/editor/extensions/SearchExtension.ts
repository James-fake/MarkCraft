import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

const searchHighlightKey = new PluginKey('searchHighlight')

interface SearchState {
  searchTerm: string
  caseSensitive: boolean
  decorations: DecorationSet
  matches: { from: number; to: number }[]
  currentMatchIndex: number
  selectionRange: { from: number; to: number } | null
}

function findMatches(doc: ProseMirrorNode, searchTerm: string, caseSensitive: boolean, selectionRange?: { from: number; to: number } | null): { from: number; to: number }[] {
  if (!searchTerm.trim()) return []

  const matches: { from: number; to: number }[] = []
  const searchLower = caseSensitive ? searchTerm : searchTerm.toLowerCase()
  const rangeFrom = selectionRange?.from ?? 0
  const rangeTo = selectionRange?.to ?? doc.content.size

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText || !node.text) return

    // Skip nodes outside the selection range
    const nodeEnd = pos + node.nodeSize
    if (nodeEnd <= rangeFrom || pos >= rangeTo) return

    const text = caseSensitive ? node.text : node.text.toLowerCase()
    let index = 0

    while ((index = text.indexOf(searchLower, index)) !== -1) {
      const matchFrom = pos + index
      const matchTo = pos + index + searchTerm.length
      // Only include matches within the selection range
      if (matchFrom >= rangeFrom && matchTo <= rangeTo) {
        matches.push({ from: matchFrom, to: matchTo })
      }
      index += searchTerm.length
    }
  })

  return matches
}

function buildDecorations(doc: ProseMirrorNode, matches: { from: number; to: number }[], currentMatchIndex: number): DecorationSet {
  const decorations: Decoration[] = []

  matches.forEach((match, index) => {
    const isCurrent = index === currentMatchIndex
    decorations.push(
      Decoration.inline(match.from, match.to, {
        class: isCurrent ? 'search-highlight-current' : 'search-highlight',
        style: isCurrent
          ? 'background-color: rgba(255, 200, 0, 0.6); border-radius: 2px;'
          : 'background-color: rgba(255, 200, 0, 0.25); border-radius: 2px;',
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchExtension: {
      setSearchTerm: (term: string, caseSensitive?: boolean, selectionRange?: { from: number; to: number } | null) => ReturnType
      nextSearchMatch: () => ReturnType
      prevSearchMatch: () => ReturnType
      replaceCurrentMatch: (replacement: string) => ReturnType
      replaceAllMatches: (replacement: string) => ReturnType
      getSearchState: () => ReturnType
    }
  }
}

const SearchExtension = Extension.create({
  name: 'searchExtension',

  addOptions() {
    return {
      searchTerm: '',
      caseSensitive: false,
    }
  },

  addCommands() {
    return {
      setSearchTerm: (term: string, caseSensitive?: boolean, selectionRange?: { from: number; to: number } | null) => ({ editor }) => {
        const pluginState = searchHighlightKey.getState(editor.state) as SearchState | undefined
        if (pluginState) {
          const cs = caseSensitive ?? pluginState.caseSensitive
          const sr = selectionRange !== undefined ? selectionRange : pluginState.selectionRange
          const newIndex = term !== pluginState.searchTerm ? 0 : pluginState.currentMatchIndex
          const matches = findMatches(editor.state.doc, term, cs, sr)
          const newState: SearchState = {
            ...pluginState,
            searchTerm: term,
            caseSensitive: cs,
            selectionRange: sr,
            currentMatchIndex: newIndex,
            matches,
            decorations: buildDecorations(editor.state.doc, matches, newIndex),
          }
          editor.view.dispatch(editor.state.tr.setMeta(searchHighlightKey, newState))
        }
        return true
      },
      nextSearchMatch: () => ({ editor }) => {
        const pluginState = searchHighlightKey.getState(editor.state) as SearchState | undefined
        if (pluginState && pluginState.matches.length > 0) {
          const nextIndex = (pluginState.currentMatchIndex + 1) % pluginState.matches.length
          const newState: SearchState = {
            ...pluginState,
            currentMatchIndex: nextIndex,
            decorations: buildDecorations(editor.state.doc, pluginState.matches, nextIndex),
          }
          editor.view.dispatch(editor.state.tr.setMeta(searchHighlightKey, newState))

          const match = pluginState.matches[nextIndex]
          editor.chain().setTextSelection({ from: match.from, to: match.to }).run()
          editor.commands.scrollIntoView()
        }
        return true
      },
      prevSearchMatch: () => ({ editor }) => {
        const pluginState = searchHighlightKey.getState(editor.state) as SearchState | undefined
        if (pluginState && pluginState.matches.length > 0) {
          const prevIndex = pluginState.currentMatchIndex > 0 ? pluginState.currentMatchIndex - 1 : pluginState.matches.length - 1
          const newState: SearchState = {
            ...pluginState,
            currentMatchIndex: prevIndex,
            decorations: buildDecorations(editor.state.doc, pluginState.matches, prevIndex),
          }
          editor.view.dispatch(editor.state.tr.setMeta(searchHighlightKey, newState))

          const match = pluginState.matches[prevIndex]
          editor.chain().setTextSelection({ from: match.from, to: match.to }).run()
          editor.commands.scrollIntoView()
        }
        return true
      },
      replaceCurrentMatch: (replacement: string) => ({ editor }) => {
        const pluginState = searchHighlightKey.getState(editor.state) as SearchState | undefined
        if (pluginState && pluginState.currentMatchIndex >= 0 && pluginState.currentMatchIndex < pluginState.matches.length) {
          const match = pluginState.matches[pluginState.currentMatchIndex]
          const tr = editor.state.tr.insertText(replacement, match.from, match.to)

          const newMatches = findMatches(tr.doc, pluginState.searchTerm, pluginState.caseSensitive, pluginState.selectionRange)
          const newPluginState: SearchState = {
            ...pluginState,
            matches: newMatches,
            currentMatchIndex: newMatches.length > 0 ? Math.min(pluginState.currentMatchIndex, newMatches.length - 1) : -1,
            decorations: buildDecorations(tr.doc, newMatches, newMatches.length > 0 ? Math.min(pluginState.currentMatchIndex, newMatches.length - 1) : -1),
          }
          tr.setMeta(searchHighlightKey, newPluginState)
          editor.view.dispatch(tr)
        }
        return true
      },
      replaceAllMatches: (replacement: string) => ({ editor }) => {
        const pluginState = searchHighlightKey.getState(editor.state) as SearchState | undefined
        if (pluginState && pluginState.matches.length > 0) {
          const tr = editor.state.tr
          for (let i = pluginState.matches.length - 1; i >= 0; i--) {
            const match = pluginState.matches[i]
            tr.insertText(replacement, match.from, match.to)
          }

          const newPluginState: SearchState = {
            ...pluginState,
            matches: [],
            currentMatchIndex: -1,
            decorations: DecorationSet.create(editor.state.doc, []),
          }
          tr.setMeta(searchHighlightKey, newPluginState)
          editor.view.dispatch(tr)
        }
        return true
      },
      getSearchState: () => ({ editor }) => {
        return searchHighlightKey.getState(editor.state)
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init: (_config, state): SearchState => ({
            searchTerm: '',
            caseSensitive: false,
            decorations: DecorationSet.create(state.doc, []),
            matches: [],
            currentMatchIndex: -1,
            selectionRange: null,
          }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchHighlightKey)
            if (meta) return meta

            if (tr.docChanged && prev.searchTerm) {
              const matches = findMatches(tr.doc, prev.searchTerm, prev.caseSensitive, prev.selectionRange)
              const currentMatchIndex = matches.length > 0 ? Math.min(prev.currentMatchIndex, matches.length - 1) : -1
              return {
                ...prev,
                matches,
                currentMatchIndex,
                decorations: buildDecorations(tr.doc, matches, currentMatchIndex),
              }
            }

            return prev
          },
        },
        props: {
          decorations(state) {
            return (searchHighlightKey.getState(state) as SearchState | undefined)?.decorations || DecorationSet.create(state.doc, [])
          },
        },
      }),
    ]
  },
})

export default SearchExtension
export type { SearchState }

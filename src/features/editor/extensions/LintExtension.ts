import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { LintIssue } from '@utils/lintTypes'

const lintKey = new PluginKey('lintHighlight')

interface LintState {
  issues: LintIssue[]
  decorations: DecorationSet
}

function buildLintDecorations(doc: ProseMirrorNode, issues: LintIssue[]): DecorationSet {
  if (issues.length === 0) return DecorationSet.create(doc, [])

  const decorations: Decoration[] = []

  // Map markdown line numbers to ProseMirror positions
  // We iterate through the doc and track line breaks to build a line→pos map
  const linePositions: number[] = [0] // line 1 starts at pos 0 (actually pos 1 in ProseMirror)
  doc.descendants((node: ProseMirrorNode, nodePos: number) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        if (node.text[i] === '\n') {
          linePositions.push(nodePos + i + 1)
        }
      }
    }
  })

  for (const issue of issues) {
    // LintIssue.line 为 0-based（与 linePositions 的下标一致，linePositions[0] 即首行起点），
    // 原 `issue.line - 1` 会把首行（line=0）判定为 <0 而丢弃，并整体错位一行。
    const lineIndex = issue.line
    if (lineIndex < 0) continue

    // Find the ProseMirror position range for this line
    const from = lineIndex < linePositions.length ? linePositions[lineIndex] : -1
    const to = lineIndex + 1 < linePositions.length
      ? linePositions[lineIndex + 1] - 1
      : doc.content.size

    if (from < 0 || to <= from) continue

    const isError = issue.severity === 'error'
    decorations.push(
      Decoration.inline(from, to, {
        class: isError ? 'lint-error-line' : 'lint-warning-line',
        style: isError
          ? 'background-color: rgba(239, 68, 68, 0.08); border-bottom: 2px wavy rgba(239, 68, 68, 0.5);'
          : 'background-color: rgba(245, 158, 11, 0.08); border-bottom: 2px wavy rgba(245, 158, 11, 0.5);',
      }, {
        // Store issue info for tooltip
        inclusive: true,
      })
    )
  }

  return DecorationSet.create(doc, decorations)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lintExtension: {
      setLintIssues: (issues: LintIssue[]) => ReturnType
      clearLintIssues: () => ReturnType
    }
  }
}

const LintExtension = Extension.create({
  name: 'lintExtension',

  addCommands() {
    return {
      setLintIssues: (issues: LintIssue[]) => ({ editor }) => {
        const pluginState = lintKey.getState(editor.state) as LintState | undefined
        if (pluginState) {
          const newState: LintState = {
            issues,
            decorations: buildLintDecorations(editor.state.doc, issues),
          }
          editor.view.dispatch(editor.state.tr.setMeta(lintKey, newState))
        }
        return true
      },
      clearLintIssues: () => ({ editor }) => {
        const pluginState = lintKey.getState(editor.state) as LintState | undefined
        if (pluginState) {
          const newState: LintState = {
            issues: [],
            decorations: DecorationSet.create(editor.state.doc, []),
          }
          editor.view.dispatch(editor.state.tr.setMeta(lintKey, newState))
        }
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: lintKey,
        state: {
          init: (_config, state): LintState => ({
            issues: [],
            decorations: DecorationSet.create(state.doc, []),
          }),
          apply(tr, prev) {
            const meta = tr.getMeta(lintKey)
            if (meta) return meta

            if (tr.docChanged && prev.issues.length > 0) {
              return {
                ...prev,
                decorations: buildLintDecorations(tr.doc, prev.issues),
              }
            }

            return prev
          },
        },
        props: {
          decorations(state) {
            return (lintKey.getState(state) as LintState | undefined)?.decorations || DecorationSet.create(state.doc, [])
          },
        },
      }),
    ]
  },
})

export default LintExtension

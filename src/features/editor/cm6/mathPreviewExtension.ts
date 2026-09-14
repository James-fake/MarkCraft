import { StateField, StateEffect } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'
import { EditorView, showTooltip, Tooltip } from '@codemirror/view'
import katex from 'katex'

// 用于触发数学公式预览的 effect
const setMathPreview = StateEffect.define<{ pos: number; latex: string } | null>()

// 存储当前数学公式预览状态
const mathPreviewState = StateField.define<{ pos: number; latex: string } | null>({
  create: () => null,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setMathPreview)) return effect.value
    }
    return value
  },
})

// 计算数学公式预览 tooltip
function getMathTooltip(state: EditorState): Tooltip | null {
  const preview = state.field(mathPreviewState)
  if (!preview) return null

  return {
    pos: preview.pos,
    create: () => {
      const dom = document.createElement('div')
      dom.className = 'cm-math-preview-tooltip'
      try {
        katex.render(preview.latex, dom, {
          throwOnError: false,
          displayMode: false,
        })
      } catch {
        dom.textContent = preview.latex
      }
      dom.style.cssText = `
        padding: 6px 10px;
        border-radius: 6px;
        background: var(--editor-bg, #fff);
        border: 1px solid var(--editor-border, #e0e0e0);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        color: var(--editor-text, #333);
        font-size: 14px;
        max-width: 400px;
        overflow-x: auto;
      `
      return { dom, offset: { x: 0, y: 8 } }
    },
  }
}

// 检测光标是否在数学公式内
function detectMathAtCursor(view: EditorView): { pos: number; latex: string } | null {
  const pos = view.state.selection.main.head
  const doc = view.state.doc.toString()

  // 查找行内公式 $...$
  const beforeCursor = doc.substring(0, pos)
  const afterCursor = doc.substring(pos)

  // 向前查找 $ 符号
  const lastDollarBefore = beforeCursor.lastIndexOf('$')
  if (lastDollarBefore >= 0) {
    // 确保不是 $$ 的一部分
    const beforeDollar = beforeCursor.substring(0, lastDollarBefore)
    if (!beforeDollar.endsWith('$')) {
      // 向后查找匹配的 $
      const nextDollarAfter = afterCursor.indexOf('$')
      if (nextDollarAfter >= 0) {
        const latex = doc.substring(lastDollarBefore + 1, pos + nextDollarAfter)
        if (latex.trim().length > 0 && latex.length < 200) {
          return { pos: lastDollarBefore, latex }
        }
      }
    }
  }

  return null
}

// 更新数学公式预览
function updateMathPreview(view: EditorView) {
  const mathInfo = detectMathAtCursor(view)
  view.dispatch({
    effects: setMathPreview.of(mathInfo),
  })
}

// 数学公式预览扩展
export function createMathPreviewExtension() {
  return [
    mathPreviewState,
    showTooltip.compute([mathPreviewState], (state) => getMathTooltip(state)),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged) {
        updateMathPreview(update.view)
      }
    }),
  ]
}

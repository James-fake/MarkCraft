import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { StateField, StateEffect } from '@codemirror/state'
import { MC_FOCUS_DIM_CLASS, centerRectInContainer } from '../focus/focusContract'

// 专注模式状态
export const toggleFocusMode = StateEffect.define<boolean>()
export const toggleTypewriterMode = StateEffect.define<boolean>()

export const focusModeState = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(toggleFocusMode)) return effect.value
    }
    return value
  },
})

export const typewriterModeState = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(toggleTypewriterMode)) return effect.value
    }
    return value
  },
})

/**
 * 专注模式扩展
 * 当前行高亮，其他行淡化
 */
export function createFocusModeExtension() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.selectionSet || update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const focusEnabled = view.state.field(focusModeState)
      if (!focusEnabled) return Decoration.none

      const builder = new RangeSetBuilder<Decoration>()
      const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number

      for (const { from, to } of view.visibleRanges) {
        let pos = from
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos)
          if (line.number !== cursorLine) {
            const deco = Decoration.line({ class: MC_FOCUS_DIM_CLASS })
            builder.add(line.from, line.from, deco)
          }
          pos = line.to + 1
          if (pos > view.state.doc.length) break
        }
      }

      return builder.finish()
    }
  }, {
    decorations: v => v.decorations,
  })
}

/**
 * 打字机模式扩展
 * 光标始终居中显示
 */
export function createTypewriterModeExtension() {
  return EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged) return

    const typewriterEnabled = update.state.field(typewriterModeState)
    if (!typewriterEnabled) return

    // 延迟执行，避免在事务中触发滚动
    requestAnimationFrame(() => {
      const view = update.view
      const pos = view.state.selection.main.head
      const coords = view.coordsAtPos(pos)
      if (!coords) return

      // 居中算法与所见即所得模式共用（focusContract），保证两模式手感一致
      centerRectInContainer(view.scrollDOM, {
        top: coords.top,
        height: coords.bottom - coords.top,
      })
    })
  })
}

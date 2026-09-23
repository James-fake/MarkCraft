// 定位：TipTap Mark 扩展（Highlight.extend(...)），与同目录的 AbbreviationMark /
// CommentMark / SubscriptMark / SuperscriptMark 同类。
// 2026-09-23 起：调色板由 5 色扩至 16 色；颜色常量抽到 ./highlightColors（避免与偏好模块成环）。
import Highlight from '@tiptap/extension-highlight'
import { DEFAULT_HIGHLIGHT_COLOR, HIGHLIGHT_COLORS } from './highlightColors'
import { getLastHighlightColor } from './highlightColorPref'

// 颜色常量对外仍从本模块导出（既有 import 路径不变）
export {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_UI_COLORS,
  HIGHLIGHT_COLOR_OPTIONS,
  DEFAULT_HIGHLIGHT_COLOR,
  isHighlightColor,
} from './highlightColors'
export type { HighlightColor } from './highlightColors'

const HighlightMark = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: DEFAULT_HIGHLIGHT_COLOR,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-highlight-color') || DEFAULT_HIGHLIGHT_COLOR,
        renderHTML: (attributes: Record<string, string>) => {
          const color = attributes.color || DEFAULT_HIGHLIGHT_COLOR
          return {
            'data-highlight-color': color,
            style: `background-color: ${HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS[DEFAULT_HIGHLIGHT_COLOR]}`,
          }
        },
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd+Shift+H：应用/切换「上次颜色」（与工具栏主按钮同一语义）
      'Mod-Shift-h': () => {
        const color = getLastHighlightColor()
        const current = this.editor.getAttributes('highlight').color
        if (current === color) {
          return this.editor.chain().focus().unsetHighlight().run()
        }
        return this.editor.chain().focus().unsetHighlight().setHighlight({ color }).run()
      },
    }
  },
}).configure({
  multicolor: true,
  HTMLAttributes: {
    class: 'mark-highlight',
  },
})

export default HighlightMark

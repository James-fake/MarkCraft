// Phase 4（2026-09-18）自 features/shared/utils/ **原样迁入**（内容一字未改）。
// 定位：TipTap Mark 扩展（Highlight.extend(...)），与同目录的 AbbreviationMark /
// CommentMark / SubscriptMark / SuperscriptMark 同类 —— 原先仅因「utils」这个字面
// 归类被放错位置，并非通用工具。
import Highlight from '@tiptap/extension-highlight'

export const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'rgba(255, 235, 59, 0.4)',
  green: 'rgba(76, 175, 80, 0.3)',
  blue: 'rgba(33, 150, 243, 0.3)',
  purple: 'rgba(156, 39, 176, 0.3)',
  red: 'rgba(244, 67, 54, 0.3)',
}

export const HIGHLIGHT_COLOR_OPTIONS = ['yellow', 'green', 'blue', 'purple', 'red'] as const

export type HighlightColor = typeof HIGHLIGHT_COLOR_OPTIONS[number]

const HighlightMark = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: 'yellow',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-highlight-color') || 'yellow',
        renderHTML: (attributes: Record<string, string>) => {
          const color = attributes.color || 'yellow'
          return {
            'data-highlight-color': color,
            style: `background-color: ${HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.yellow}`,
          }
        },
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

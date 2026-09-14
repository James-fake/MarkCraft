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

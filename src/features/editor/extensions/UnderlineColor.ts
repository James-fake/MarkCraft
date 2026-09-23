// 定位：TipTap Mark 扩展（Underline.extend(...)），与同目录 HighlightMark 同构。
// 相对原生 @tiptap/extension-underline 的增量：
//   1. 新增 color 属性（16 色 + 'auto' 跟随正文），渲染为 text-decoration-color；
//   2. Ctrl/Cmd+U 语义改为「应用/切换上次颜色」——与工具栏主按钮、右键菜单三入口同语义。
//
// ⚠️ 前置于本扩展的一个既有 bug 已在本批一并修掉：Turndown 默认会吃掉 <u> 标签，
// 导致下划线「一存就丢」（markdownConvert.htmlToMarkdown 已补 u 规则 → ++text++）。
import Underline from '@tiptap/extension-underline'
import { DEFAULT_UNDERLINE_COLOR, UNDERLINE_COLORS } from './underlineColors'
import { getLastUnderlineColor } from './underlineColorPref'

// 颜色常量对外仍从本模块导出（与 HighlightMark 的既有 import 习惯一致）
export {
  UNDERLINE_COLORS,
  UNDERLINE_COLOR_OPTIONS,
  DEFAULT_UNDERLINE_COLOR,
  isUnderlineColor,
} from './underlineColors'
export type { UnderlineColor } from './underlineColors'

/**
 * 生成下划线内联样式。
 * auto（跟随正文）时**不写** text-decoration-color —— 让文字色随正文/主题自然变化，
 * 这正是「跟随正文」的语义；其余色写死 text-decoration-color。
 */
export function underlineStyle(color: string): string {
  const base = 'text-decoration: underline'
  if (!color || color === DEFAULT_UNDERLINE_COLOR) return base
  return `${base}; text-decoration-color: ${UNDERLINE_COLORS[color] || 'currentColor'}`
}

const UnderlineColor = Underline.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: DEFAULT_UNDERLINE_COLOR,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-underline-color') || DEFAULT_UNDERLINE_COLOR,
        renderHTML: (attributes: Record<string, string>) => {
          const color = attributes.color || DEFAULT_UNDERLINE_COLOR
          return {
            'data-underline-color': color,
            style: underlineStyle(color),
          }
        },
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // 覆写父级的 Mod-u（原为纯 toggleUnderline，会丢失颜色语义）
      // Ctrl/Cmd+U：应用/切换「上次颜色」（与工具栏主按钮同一语义）
      'Mod-u': () => {
        const color = getLastUnderlineColor()
        const current = this.editor.getAttributes('underline').color
        if (current === color) {
          return this.editor.chain().focus().unsetUnderline().run()
        }
        // ⚠️ 用通用 setMark 而非 setUnderline({...})：后者在本仓的类型声明里
        // 不接受参数（Expected 0 arguments），setMark 才带 attributes 形参。
        return this.editor.chain().focus().unsetUnderline().setMark('underline', { color }).run()
      },
    }
  },
}).configure({
  HTMLAttributes: {
    class: 'mark-underline',
  },
})

export default UnderlineColor

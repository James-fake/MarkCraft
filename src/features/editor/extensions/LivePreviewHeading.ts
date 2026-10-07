import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import LivePreviewHeadingView from './LivePreviewHeadingViewComponent'

/**
 * LivePreviewHeading — 替代 StarterKit 默认 heading
 *
 * 在 Live Preview 模式下：
 *   - 光标所在标题：显示 # 前缀（源码模式）
 *   - 非光标标题：隐藏 # 前缀（渲染模式）
 */
const LivePreviewHeading = Node.create({
  name: 'heading',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: (el) => {
          const match = el.tagName.match(/^H(\d)$/)
          return match ? parseInt(match[1]) : 1
        },
        renderHTML: (attrs) => ({
          level: attrs.level,
        }),
      },
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('id'),
        renderHTML: (attrs) => {
          if (!attrs.id) return {}
          return { id: attrs.id }
        },
      },
    }
  },

  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }))
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = (node.attrs.level as number) || 1
    return [`h${level}`, mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LivePreviewHeadingView)
  },

  addCommands() {
    return {
      setHeading:
        (attrs: { level: number }) =>
        ({ commands }) => {
          return commands.setNode(this.name, attrs)
        },
      toggleHeading:
        (attrs: { level: number }) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attrs)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        if (!editor.isActive('heading')) return false
        const { empty, $head } = editor.state.selection
        if (!empty) return false
        if ($head.parentOffset !== 0) return false
        return editor.commands.setParagraph()
      },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    heading: {
      setHeading: (attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => ReturnType
      toggleHeading: (attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => ReturnType
    }
  }
}

export default LivePreviewHeading

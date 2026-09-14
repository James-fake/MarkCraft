import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import LivePreviewBlockquoteViewComponent from './LivePreviewBlockquoteViewComponent'

/**
 * LivePreviewBlockquote — 替代 StarterKit 默认 blockquote
 *
 * 在 Live Preview 模式下：
 *   - 光标所在引用：显示 > 前缀（源码模式）
 *   - 非光标引用：隐藏 > 前缀（渲染模式）
 */
const LivePreviewBlockquote = Node.create({
  name: 'blockquote',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {}
  },

  parseHTML() {
    return [{ tag: 'blockquote' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LivePreviewBlockquoteViewComponent)
  },

  addCommands() {
    return {
      setBlockquote: () => ({ commands }) => commands.wrapIn(this.name),
      toggleBlockquote: () => ({ commands }) => commands.toggleWrap(this.name),
      unsetBlockquote: () => ({ commands }) => commands.lift(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockquote: {
      setBlockquote: () => ReturnType
      toggleBlockquote: () => ReturnType
      unsetBlockquote: () => ReturnType
    }
  }
}

export default LivePreviewBlockquote

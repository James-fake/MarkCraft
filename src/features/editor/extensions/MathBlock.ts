import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MathBlockView from './MathBlockView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType
    }
  }
  /**
   * 自定义事件：把「选中块后按 Enter」这件事从扩展传给节点视图。
   * 视图组件拿不到键盘事件（焦点在编辑器上），只能靠事件通道 —— 声明在这里，
   * 否则 `editor.emit/on` 会因 EditorEvents 是强类型映射而报 TS2345。
   */
  interface EditorEvents {
    'mathBlock:requestEdit': void
  }
}

const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-latex') || '',
        renderHTML: (attrs) => ({
          'data-latex': attrs.latex,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mathBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'mathBlock' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView)
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // 键盘路径（2026-10-11 用户反馈补齐）：选中公式块后 Enter 进入编辑。
      // 用 NodeSelection 判定，确保是「块被选中」而不是「光标落在块内的文本」——
      // 后者按 Enter 应该正常换行。
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const isNodeSelected =
          'node' in selection &&
          (selection as unknown as { node?: { type?: { name?: string } } }).node?.type?.name === 'mathBlock'
        if (!isNodeSelected) return false
        // 交给节点视图处理（视图订阅同一个事件名）
        editor.emit('mathBlock:requestEdit')
        return true
      },
      Backspace: ({ editor }) => {
        if (!editor.isActive('mathBlock')) return false
        const { empty } = editor.state.selection
        if (!empty) return false
        const node = editor.state.selection.$head.parent
        if (node.content.size === 0) {
          return editor.commands.deleteSelection()
        }
        return false
      },
    }
  },
})

export default MathBlock

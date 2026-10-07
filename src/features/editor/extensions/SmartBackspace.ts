import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const smartBackspaceKey = new PluginKey('smartBackspace')

/**
 * SmartBackspace — 智能回退
 *
 * 在块级节点行首按 Backspace 时，回退到 Markdown 源码形式而非直接删除：
 *   - 标题行首 Backspace → 回退为段落，保留 # 前缀文本
 *   - 引用块行首 Backspace → 提升出引用块
 *   - 代码块空行 Backspace → 回退为段落
 *   - 列表项空内容 Backspace → 退出列表
 */
const SmartBackspace = Extension.create({
  name: 'smartBackspace',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: smartBackspaceKey,
        props: {
          handleKeyDown(view, event) {
            if (event.key !== 'Backspace') return false

            const { selection, tr } = view.state
            if (!selection.empty) return false

            const $head = selection.$head
            const parent = $head.parent

            // 仅在光标位于节点内容最开头时触发
            if ($head.parentOffset !== 0) return false

            // ── 标题回退：转为段落，保留标题文本 ──
            if (parent.type.name === 'heading') {
              const level = parent.attrs.level as number
              const prefix = '#'.repeat(level) + ' '
              const paragraphType = view.state.schema.nodes.paragraph
              if (!paragraphType) return false

              tr.setNodeMarkup($head.before(), paragraphType)
              // 在文本开头插入 # 前缀
              tr.insertText(prefix, $head.before() + 1)
              view.dispatch(tr)
              return true
            }

            // ── 引用块回退：提升出引用块 ──
            if ($head.depth > 1) {
              // 检查父节点是否为 blockquote
              for (let d = $head.depth; d > 1; d--) {
                if ($head.node(d).type.name === 'blockquote') {
                  const range = $head.blockRange(view.state.doc.resolve($head.before(d)))
                  if (range) {
                    tr.lift(range, 0)
                    view.dispatch(tr)
                    return true
                  }
                }
              }
            }

            // ── 代码块空行回退：转为段落 ──
            if (parent.type.name === 'codeBlock' && parent.content.size === 0) {
              const paragraphType = view.state.schema.nodes.paragraph
              if (!paragraphType) return false
              tr.setNodeMarkup($head.before(), paragraphType)
              tr.insertText('```', $head.before() + 1)
              view.dispatch(tr)
              return true
            }

            // ── 列表项空内容回退：退出列表 ──
            if (parent.type.name === 'paragraph') {
              // 检查是否在列表项内
              for (let d = $head.depth - 1; d > 0; d--) {
                const ancestor = $head.node(d)
                if (ancestor.type.name === 'taskItem' || ancestor.type.name === 'listItem') {
                  // 空列表项 → 退出列表
                  if (parent.content.size === 0) {
                    const range = $head.blockRange(view.state.doc.resolve($head.before(d)))
                    if (range) {
                      tr.lift(range, 0)
                      view.dispatch(tr)
                      return true
                    }
                  }
                  break
                }
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

export default SmartBackspace

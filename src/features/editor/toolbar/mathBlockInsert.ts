import type { Editor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * 数学公式插入（WysiwygToolbar 的 MathPopover onInsert 逻辑抽离，P4-3）。
 *
 * inline：直接插入行内公式节点。
 * block：插入公式块；若光标已在 mathBlock 内或紧挨 mathBlock，则把新 LaTeX
 *        **追加合并**到已有块（避免连续插入产生相邻的两个空公式块），
 *        并把光标落在块后；否则创建新块。
 */
export function insertMathWithMerge(editor: Editor, latex: string, mode: 'inline' | 'block'): void {
  if (mode === 'inline') {
    editor.chain().focus().insertMathInlineNode(latex).run()
    return
  }
  const { state } = editor
  const { $head } = state.selection
  let targetPos: number | null = null
  let targetNode: ProseMirrorNode | null = null

  // 情况1：光标在 mathBlock 内部
  for (let d = $head.depth; d > 0; d--) {
    const node = $head.node(d)
    if (node.type.name === 'mathBlock') {
      targetPos = $head.before(d)
      targetNode = node
      break
    }
  }

  // 情况2：光标紧挨在 mathBlock 后面（前一个兄弟节点是 mathBlock）
  if (!targetNode) {
    const blockStart = $head.before($head.depth)
    if (blockStart > 0) {
      const $blockStart = state.doc.resolve(blockStart)
      const index = $blockStart.index()
      if (index > 0) {
        const prevSibling = $blockStart.parent.child(index - 1)
        if (prevSibling.type.name === 'mathBlock') {
          targetPos = blockStart - prevSibling.nodeSize
          targetNode = prevSibling
        }
      }
    }
  }

  if (targetNode && targetPos !== null) {
    // 追加到已有的 mathBlock
    const currentLatex = (targetNode.attrs.latex as string) || ''
    const newLatex = currentLatex ? currentLatex + ' ' + latex : latex
    editor.chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(targetPos!, undefined, {
          ...targetNode.attrs,
          latex: newLatex,
        })
        return true
      })
      .run()
    // 将光标移到公式块后面
    editor.commands.setTextSelection(targetPos + targetNode.nodeSize)
  } else {
    // 创建新的 mathBlock
    editor.chain().focus().insertMathBlock(latex).run()
    const { $head: $h } = editor.state.selection
    for (let d = $h.depth; d > 0; d--) {
      if ($h.node(d).type.name === 'mathBlock') {
        editor.commands.setTextSelection($h.after(d))
        break
      }
    }
  }
}

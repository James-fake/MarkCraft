import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { livePreviewKey, type LivePreviewState } from './LivePreviewExtension'
import { useEffect, useState } from 'react'

/**
 * LivePreviewBlockquoteViewComponent — 引用块的 Live Preview NodeView
 *
 * 光标在引用块内时显示 > 前缀，光标移走后隐藏前缀
 */
export default function LivePreviewBlockquoteView({ editor, getPos, node }: NodeViewProps) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const updateActive = () => {
      const state = livePreviewKey.getState(editor.state) as LivePreviewState | undefined
      if (!state || !state.enabled) {
        setIsActive(false)
        return
      }

      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos === undefined) {
        setIsActive(false)
        return
      }

      const { from } = editor.state.selection
      const nodeTo = pos + node.nodeSize
      setIsActive(from >= pos && from <= nodeTo)
    }

    updateActive()
    editor.on('transaction', updateActive)
    return () => {
      editor.off('transaction', updateActive)
    }
  }, [editor, getPos, node])

  return (
    <NodeViewWrapper as="blockquote">
      {isActive && (
        <span className="lp-prefix" contentEditable={false}>
          {'> '}
        </span>
      )}
      <NodeViewContent className="lp-content" />
    </NodeViewWrapper>
  )
}

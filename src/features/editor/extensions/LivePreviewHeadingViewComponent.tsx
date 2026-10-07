import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { livePreviewKey, type LivePreviewState } from './LivePreviewExtension'
import { useEffect, useState } from 'react'

export default function LivePreviewHeadingView({ node, editor, getPos }: NodeViewProps) {
  const level = (node.attrs.level as number) || 1
  const prefix = '#'.repeat(level) + ' '
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const updateActive = () => {
      const state = livePreviewKey.getState(editor.state) as LivePreviewState | undefined
      // 未启用或无状态：不显示前缀
      if (!state || !state.enabled) {
        setIsActive(false)
        return
      }

      // 通过当前节点位置判断光标是否在此节点内
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
    // 监听 transaction：切换 enabled / 移动光标 / 修改文档都会触发
    editor.on('transaction', updateActive)
    return () => {
      editor.off('transaction', updateActive)
    }
  }, [editor, getPos, node])

  const headingTag = `h${level}` as keyof JSX.IntrinsicElements
  const headingId = (node.attrs.id as string | null) || undefined

  return (
    <NodeViewWrapper as={headingTag} id={headingId}>
      {isActive && (
        <span className="lp-prefix" contentEditable={false}>
          {prefix}
        </span>
      )}
      <NodeViewContent className="lp-content" />
    </NodeViewWrapper>
  )
}

import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export default function MediaEmbedView({ node }: NodeViewProps) {
  const { src, type } = node.attrs

  return (
    <NodeViewWrapper>
      <div style={{ margin: '8px 0', textAlign: 'center' }}>
        {type === 'audio' ? (
          <audio src={src} controls style={{ width: '100%', maxWidth: 400 }} />
        ) : (
          <video src={src} controls style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 4 }} />
        )}
      </div>
    </NodeViewWrapper>
  )
}

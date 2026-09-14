import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export default function IframeView({ node }: NodeViewProps) {
  const { src, width, height } = node.attrs

  return (
    <NodeViewWrapper>
      <div style={{ margin: '8px 0', border: '1px solid var(--editor-border)', borderRadius: 4, overflow: 'hidden' }}>
        <iframe
          src={src}
          width={width}
          height={height}
          sandbox="allow-scripts allow-same-origin"
          style={{ border: 'none', display: 'block' }}
          title="Embedded content"
        />
      </div>
    </NodeViewWrapper>
  )
}

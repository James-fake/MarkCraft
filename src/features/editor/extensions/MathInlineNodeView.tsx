import type { NodeViewProps } from '@tiptap/react'
import katex from 'katex'
import EditableNodeView from './EditableNodeView'

export default function MathInlineNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  return (
    <EditableNodeView
      node={node}
      updateAttributes={updateAttributes}
      deleteNode={deleteNode}
      selected={selected}
      sourceKey="latex"
      label="行内公式"
      dataAttrs={{ 'data-type': 'mathInlineNode', 'data-latex': (node.attrs.latex as string) || '' }}
      renderPreview={(attrs) => {
        const latex = attrs.latex || ''
        try {
          const html = katex.renderToString(latex, { throwOnError: false, displayMode: false })
          return <span className="tiptap-math-inline-katex" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <span style={{ fontFamily: "'Fira Code', Consolas, monospace", fontSize: '0.9em', color: '#e96900' }}>{latex}</span>
        }
      }}
    />
  )
}

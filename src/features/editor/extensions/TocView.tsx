import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useMemo, useCallback } from 'react'

export default function TocView({ editor }: NodeViewProps) {
  const headings = useMemo(() => {
    const items: { level: number; text: string; id: string }[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        items.push({
          level: node.attrs.level,
          text: node.textContent,
          id: node.attrs.id || '',
        })
      }
    })
    return items
  }, [editor.state.doc])

  const handleClick = useCallback((id: string) => {
    if (!id) return
    const element = editor.view.dom.querySelector(`[id="${id}"]`)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [editor])

  return (
    <NodeViewWrapper>
      <div className="toc-container" data-toc="true" style={{
        border: '1px dashed var(--editor-border, #e5e7eb)',
        borderRadius: 8,
        padding: '12px 16px',
        margin: '8px 0',
        backgroundColor: 'var(--editor-bg, rgba(0,0,0,0.02))',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--editor-text)' }}>
          目录 / Table of Contents
        </div>
        {headings.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5, color: 'var(--editor-text)' }}>暂无标题</div>
        ) : (
          headings.map((h, i) => (
            <div
              key={i}
              style={{
                paddingLeft: (h.level - 1) * 16,
                fontSize: Math.max(12, 14 - h.level),
                color: 'var(--editor-text)',
                cursor: h.id ? 'pointer' : 'default',
                padding: '2px 0',
                opacity: h.level <= 2 ? 1 : 0.8,
              }}
              onClick={() => handleClick(h.id)}
            >
              {h.text}
            </div>
          ))
        )}
      </div>
    </NodeViewWrapper>
  )
}

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

export default function TableGridSelector({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 })
  const maxGrid = 8

  const handleSelect = useCallback(() => {
    editor.chain().focus().insertTable({
      rows: hoveredCell.row,
      cols: hoveredCell.col,
      withHeaderRow: true,
    }).run()
    onClose()
  }, [editor, hoveredCell, onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--editor-bg)',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          padding: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px', color: 'var(--editor-text)' }}>
          插入表格
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxGrid}, 20px)`,
            gap: '2px',
          }}
          onMouseLeave={() => setHoveredCell({ row: 0, col: 0 })}
        >
          {Array.from({ length: maxGrid }, (_, r) =>
            Array.from({ length: maxGrid }, (_, c) => {
              const isHighlighted = r < hoveredCell.row && c < hoveredCell.col
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '3px',
                    backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.2)' : 'var(--editor-border)',
                    border: isHighlighted ? '1px solid var(--button-primary, #3b82f6)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={() => setHoveredCell({ row: r + 1, col: c + 1 })}
                  onClick={handleSelect}
                />
              )
            })
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--editor-text)', opacity: 0.6, marginTop: '8px', textAlign: 'center' }}>
          {hoveredCell.row > 0 ? `${hoveredCell.row} × ${hoveredCell.col} 表格` : '选择大小'}
        </div>
      </div>
    </div>,
    document.body,
  )
}

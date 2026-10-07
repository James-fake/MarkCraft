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

  // 模态：遮罩/面板一律走 aurora 单源类（遮罩 rgba(0,0,0,.5) + z-index 3000 带由类提供）。
  // createPortal 到 body 已脱离 #aurora-root，内部只引用全局 --mc-* token。
  return createPortal(
    <div
      className="aurora-modal-overlay"
      onClick={onClose}
    >
      <div
        className="aurora-modal"
        style={{ minWidth: 0, padding: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 'var(--mc-font-base)', fontWeight: 500, marginBottom: '10px', color: 'var(--mc-text-primary)' }}>
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
                    borderRadius: 'var(--mc-radius-sm)',
                    backgroundColor: isHighlighted ? 'var(--mc-accent-soft)' : 'var(--mc-border-medium)',
                    border: isHighlighted ? '1px solid var(--mc-accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background-color var(--mc-dur-micro) ease-out, border-color var(--mc-dur-micro) ease-out',
                  }}
                  onMouseEnter={() => setHoveredCell({ row: r + 1, col: c + 1 })}
                  onClick={handleSelect}
                />
              )
            })
          )}
        </div>
        <div style={{ fontSize: 'var(--mc-font-sm)', color: 'var(--mc-text-secondary)', marginTop: '8px', textAlign: 'center' }}>
          {hoveredCell.row > 0 ? `${hoveredCell.row} × ${hoveredCell.col} 表格` : '选择大小'}
        </div>
      </div>
    </div>,
    document.body,
  )
}

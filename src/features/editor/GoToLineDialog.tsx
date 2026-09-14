import { useState, useEffect, useCallback } from 'react'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { createPortal } from 'react-dom'

interface GoToLineDialogProps {
  visible: boolean
  onClose: () => void
  currentLine: number
  totalLines: number
  onGoToLine: (line: number) => void
}

export default function GoToLineDialog({ visible, onClose, currentLine, totalLines, onGoToLine }: GoToLineDialogProps) {
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (visible) {
      setInputValue(String(currentLine))
    }
  }, [visible, currentLine])

  const handleGoToLine = useCallback(() => {
    const line = parseInt(inputValue, 10)
    if (!isNaN(line) && line >= 1 && line <= totalLines) {
      onGoToLine(line)
      onClose()
    }
  }, [inputValue, totalLines, onGoToLine, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleGoToLine()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [handleGoToLine, onClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!visible) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          width: '360px',
          backgroundColor: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--editor-border)',
          borderRadius: '8px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ padding: '16px 20px 12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            跳转到行
          </div>
          <ScrollNumberInput
            autoFocus
            min={1}
            max={totalLines}
            value={inputValue}
            onChange={(n) => setInputValue(Number.isNaN(n) ? '' : String(n))}
            onKeyDown={handleKeyDown}
            placeholder="输入行号"
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '13px',
              backgroundColor: 'rgba(128, 128, 128, 0.1)',
              color: 'var(--editor-text)',
              border: '1px solid var(--editor-border)',
              borderRadius: '4px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>
            当前行: {currentLine} / 总行数: {totalLines}
          </div>
        </div>
        <div
          style={{
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid var(--editor-border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              borderRadius: '4px',
              backgroundColor: 'rgba(128, 128, 128, 0.1)',
              color: 'var(--editor-text)',
              border: '1px solid var(--editor-border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
          >
            取消
          </button>
          <button
            onClick={handleGoToLine}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              borderRadius: '4px',
              backgroundColor: 'var(--button-primary, #3b82f6)',
              color: '#fff',
              border: '1px solid transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            跳转
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

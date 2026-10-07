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

  // 模态：遮罩/面板/按钮一律走 aurora 单源类（z-index 3000 带、材质、hover 全由类提供）。
  // createPortal 到 body 已脱离 #aurora-root，内部只引用全局 --mc-* token。
  return createPortal(
    <div
      className="aurora-modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="aurora-modal aurora-modal--sm">
        <div style={{ padding: '16px 20px 12px' }}>
          <div style={{ fontSize: 'var(--mc-font-md)', fontWeight: 600, marginBottom: '12px', color: 'var(--mc-text-primary)' }}>
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
              fontSize: 'var(--mc-font-base)',
              backgroundColor: 'var(--mc-bg-window)',
              color: 'var(--mc-text-primary)',
              border: '1px solid var(--mc-border-medium)',
              borderRadius: 'var(--mc-radius-sm)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 'var(--mc-font-sm)', color: 'var(--mc-text-tertiary)', marginTop: '8px' }}>
            当前行: {currentLine} / 总行数: {totalLines}
          </div>
        </div>
        <div
          style={{
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid var(--mc-border-subtle)',
          }}
        >
          <button className="aurora-btn aurora-btn--sm aurora-btn--secondary" onClick={onClose}>
            取消
          </button>
          <button className="aurora-btn aurora-btn--sm aurora-btn--primary" onClick={handleGoToLine}>
            跳转
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

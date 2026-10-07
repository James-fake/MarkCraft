import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

export default function ImageModal({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const [src, setSrc] = useState('')
  const srcRef = useRef<HTMLInputElement>(null)

  useEffect(() => { srcRef.current?.focus() }, [])

  const handleConfirm = useCallback(() => {
    if (!src.trim()) return
    editor.chain().focus().setImage({ src: src.trim() }).run()
    onClose()
  }, [editor, src, onClose])

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        if (dataUrl) {
          editor.chain().focus().setImage({ src: dataUrl }).run()
          onClose()
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [editor, onClose])

  // 模态：遮罩/面板/按钮一律走 aurora 单源类（z-index 3000 带、材质、hover、disabled 全由类提供）。
  // createPortal 到 body 已脱离 #aurora-root，内部只引用全局 --mc-* token。
  return createPortal(
    <div
      className="aurora-modal-overlay"
      onClick={onClose}
    >
      <div
        className="aurora-modal"
        style={{ minWidth: 0, width: '380px', maxWidth: '90vw', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 'var(--mc-font-md)', fontWeight: 600, marginBottom: '16px', color: 'var(--mc-text-primary)' }}>
          插入图片
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: 'var(--mc-font-sm)', color: 'var(--mc-text-secondary)', marginBottom: '4px' }}>
            图片 URL
          </label>
          <input
            ref={srcRef}
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://example.com/image.png"
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--mc-radius-sm)',
              border: '1px solid var(--mc-border-medium)',
              backgroundColor: 'var(--mc-bg-window)',
              color: 'var(--mc-text-primary)',
              fontSize: 'var(--mc-font-base)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--mc-text-tertiary)', fontSize: 'var(--mc-font-sm)' }}>
          — 或者 —
        </div>

        <button
          onClick={handleFileSelect}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--mc-radius-sm)',
            border: '1px dashed var(--mc-border-medium)',
            backgroundColor: 'transparent',
            color: 'var(--mc-text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--mc-font-base)',
            marginBottom: '16px',
          }}
        >
          选择本地图片
        </button>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="aurora-btn aurora-btn--sm aurora-btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="aurora-btn aurora-btn--sm aurora-btn--primary"
            onClick={handleConfirm}
            disabled={!src.trim()}
          >
            确认
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

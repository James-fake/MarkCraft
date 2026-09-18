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
          padding: '20px',
          width: '380px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--editor-text)' }}>
          插入图片
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--editor-text)', opacity: 0.7, marginBottom: '4px' }}>
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
              borderRadius: '6px',
              border: '1px solid var(--editor-border)',
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--editor-text)', opacity: 0.5, fontSize: '12px' }}>
          — 或者 —
        </div>

        <button
          onClick={handleFileSelect}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px dashed var(--editor-border)',
            backgroundColor: 'transparent',
            color: 'var(--editor-text)',
            cursor: 'pointer',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          选择本地图片
        </button>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--editor-border)',
              backgroundColor: 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!src.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: src.trim() ? 'var(--button-primary, #3b82f6)' : 'var(--editor-border)',
              color: src.trim() ? '#fff' : 'var(--editor-text)',
              cursor: src.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              opacity: src.trim() ? 1 : 0.5,
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

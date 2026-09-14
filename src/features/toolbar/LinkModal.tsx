import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

export default function LinkModal({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const [href, setHref] = useState('')
  const [text, setText] = useState('')
  const hrefRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Pre-fill if cursor is on an existing link
    const { from } = editor.state.selection
    const $pos = editor.state.doc.resolve(from)
    const linkMark = editor.schema.marks.link
    if (linkMark) {
      const mark = $pos.marks().find(m => m.type === linkMark)
      if (mark) {
        setHref(mark.attrs.href as string || '')
      }
    }
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
    )
    if (selectedText) setText(selectedText)
    hrefRef.current?.focus()
  }, [editor])

  const handleConfirm = useCallback(() => {
    if (!href.trim()) return
    if (text.trim() && !editor.state.selection.empty) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
    } else if (text.trim()) {
      editor.chain().focus().insertContent({
        type: 'text',
        text: text.trim(),
        marks: [{ type: 'link', attrs: { href: href.trim() } }],
      }).run()
    } else {
      editor.chain().focus().setLink({ href: href.trim() }).run()
    }
    onClose()
  }, [editor, href, text, onClose])

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run()
    onClose()
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
          插入链接
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--editor-text)', opacity: 0.7, marginBottom: '4px' }}>
            链接文字
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="显示文字"
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--editor-text)', opacity: 0.7, marginBottom: '4px' }}>
            URL
          </label>
          <input
            ref={hrefRef}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://"
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

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {editor.isActive('link') && (
            <button
              onClick={handleRemove}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                backgroundColor: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              移除链接
            </button>
          )}
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
            disabled={!href.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: href.trim() ? 'var(--button-primary, #3b82f6)' : 'var(--editor-border)',
              color: href.trim() ? '#fff' : 'var(--editor-text)',
              cursor: href.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              opacity: href.trim() ? 1 : 0.5,
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

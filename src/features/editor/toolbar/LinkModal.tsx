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
          插入链接
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: 'var(--mc-font-sm)', color: 'var(--mc-text-secondary)', marginBottom: '4px' }}>
            链接文字
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="显示文字"
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: 'var(--mc-font-sm)', color: 'var(--mc-text-secondary)', marginBottom: '4px' }}>
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

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {editor.isActive('link') && (
            <button className="aurora-btn aurora-btn--sm aurora-btn--danger" onClick={handleRemove}>
              移除链接
            </button>
          )}
          <button className="aurora-btn aurora-btn--sm aurora-btn--ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="aurora-btn aurora-btn--sm aurora-btn--primary"
            onClick={handleConfirm}
            disabled={!href.trim()}
          >
            确认
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

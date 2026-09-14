import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import katex from 'katex'
import { livePreviewKey, type LivePreviewState } from './LivePreviewExtension'

export default function MathBlockView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const latexAttr = (node.attrs.latex as string) || ''
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(latexAttr)
  const previewRef = useRef<HTMLDivElement>(null)
  const lpEditingRef = useRef(false)
  // KaTeX 缓存：内容未变时跳过重渲染
  const lastLatexRef = useRef('')

  useEffect(() => {
    if (editing || !previewRef.current) return

    // 内容未变，跳过渲染
    if (latexAttr === lastLatexRef.current && previewRef.current.querySelector('.katex')) {
      return
    }

    const latex = latexAttr
    if (!latex.trim()) {
      previewRef.current.innerHTML = '<span style="opacity:0.3;font-style:italic">空公式块</span>'
      lastLatexRef.current = ''
      return
    }
    try {
      katex.render(latex, previewRef.current, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
      })
      lastLatexRef.current = latex
    } catch {
      if (previewRef.current) {
        previewRef.current.textContent = latex
      }
    }
  }, [latexAttr, editing])

  useEffect(() => {
    setEditValue(latexAttr)
  }, [latexAttr])

  // Live Preview：光标进入数学公式块时自动进入编辑模式
  useEffect(() => {
    const updateActive = () => {
      const lpState = livePreviewKey.getState(editor.state) as LivePreviewState | undefined
      if (!lpState || !lpState.enabled) return

      const pos = getPos()
      if (pos === null || pos === undefined) return

      const { activeNodePos } = lpState
      const isActive = pos === activeNodePos

      if (isActive && !editing) {
        lpEditingRef.current = true
        setEditing(true)
        setEditValue(latexAttr)
      } else if (!isActive && editing && lpEditingRef.current) {
        lpEditingRef.current = false
        setEditing(false)
        updateAttributes({ latex: editValue })
      }
    }

    // 不在挂载时立即调用 updateActive()，避免 setContent 后光标短暂落在公式块内
    // 触发自动编辑模式。只在用户实际操作触发 selectionUpdate 时才检查。
    editor.on('selectionUpdate', updateActive)
    return () => {
      editor.off('selectionUpdate', updateActive)
    }
  }, [editor, getPos, editing, latexAttr, editValue, updateAttributes])

  const handleDoubleClick = () => {
    lpEditingRef.current = false
    setEditing(true)
    setEditValue(latexAttr)
  }

  const handleBlur = () => {
    if (lpEditingRef.current) return
    setEditing(false)
    updateAttributes({ latex: editValue })
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      lpEditingRef.current = false
      setEditing(false)
      updateAttributes({ latex: editValue })
    }
  }, [editValue, updateAttributes])

  return (
    <NodeViewWrapper>
      <div
        data-type="mathBlock"
        data-latex={latexAttr}
        style={{
          position: 'relative',
          margin: '0.75em 0',
          padding: '12px 16px',
          borderRadius: '8px',
          border: selected ? '2px solid var(--button-primary, #3b82f6)' : '1px solid var(--editor-border)',
          backgroundColor: 'rgba(127, 127, 127, 0.04)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onDoubleClick={handleDoubleClick}
      >
        {editing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid var(--editor-border)',
              borderRadius: '4px',
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              fontFamily: "'Fira Code', Consolas, monospace",
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        ) : (
          <div
            ref={previewRef}
            style={{
              textAlign: 'center',
              overflowX: 'auto',
              padding: '4px 0',
            }}
          />
        )}
        {!editing && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '8px',
              fontSize: '10px',
              opacity: 0.4,
              color: 'var(--editor-text)',
              pointerEvents: 'none',
            }}
          >
            双击编辑公式
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

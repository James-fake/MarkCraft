import { NodeViewWrapper } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useState, useRef, useEffect } from 'react'

interface EditableNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Record<string, string>) => void
  deleteNode: () => void
  selected: boolean
  renderPreview: (attrs: Record<string, string>) => React.ReactNode
  sourceKey: string  // 如 'latex' 或 'content'
  label: string      // 如 '行内公式' 或 '脚注'
  as?: 'span' | 'div'
  inline?: boolean
  dataAttrs?: Record<string, string>
}

export default function EditableNodeView({
  node, updateAttributes, deleteNode: _deleteNode, selected, renderPreview, sourceKey, label,
  as = 'span', inline = true, dataAttrs,
}: EditableNodeViewProps) {
  const sourceValue = (node.attrs[sourceKey] as string) || ''
  const [isEditing, setIsEditing] = useState(!sourceValue)
  const [editValue, setEditValue] = useState(sourceValue)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 同步外部属性变更
  useEffect(() => {
    setEditValue(sourceValue)
  }, [sourceValue])

  // 编辑模式自动聚焦
  useEffect(() => {
    if (!isEditing) return
    const raf = requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditValue(sourceValue)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(sourceValue)
  }

  const commitEdit = () => {
    setIsEditing(false)
    if (editValue.trim()) {
      updateAttributes({ [sourceKey]: editValue.trim() })
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue(sourceValue)
  }

  const handleBlur = () => {
    commitEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEdit()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    }
  }

  if (isEditing) {
    return (
      <NodeViewWrapper className="editable-node editing" as={as} style={inline ? { display: 'inline' } : undefined} {...dataAttrs}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            verticalAlign: inline ? 'baseline' : undefined,
          }}
        >
          <span
            style={{
              fontSize: '10px',
              opacity: 0.5,
              color: 'var(--editor-text)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              fontFamily: "'Fira Code', Consolas, monospace",
              fontSize: '13px',
              padding: '2px 6px',
              border: '1px solid var(--button-primary, #3b82f6)',
              borderRadius: '4px',
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              outline: 'none',
              resize: 'none',
              minWidth: '80px',
              maxWidth: '400px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            placeholder={`${label}...`}
          />
        </span>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      className="editable-node preview"
      as={as}
      style={inline ? { display: 'inline' } : undefined}
      onDoubleClick={handleDoubleClick}
      {...dataAttrs}
    >
      <span
        onClick={handleClick}
        title={sourceValue || `点击编辑${label}`}
        style={{
          cursor: 'pointer',
          borderRadius: '3px',
          padding: inline ? '1px 4px' : undefined,
          border: selected ? '1px solid var(--button-primary, #3b82f6)' : '1px solid transparent',
          backgroundColor: selected ? 'var(--mc-accent-soft)' : 'rgba(127, 127, 127, 0.08)',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--mc-accent-soft)'
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(127, 127, 127, 0.08)'
          }
        }}
      >
        {renderPreview(node.attrs)}
      </span>
    </NodeViewWrapper>
  )
}

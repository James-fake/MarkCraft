import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'

export default function FootnoteReferenceView({ node, updateAttributes, selected }: NodeViewProps) {
  const footnoteId = (node.attrs.id as string) || ''
  const footnoteContent = (node.attrs.content as string) || ''
  // 显示序号：取 ID 中 "-" 前的数字部分（如 "1-mqajihd4" → "1"）
  const displayNumber = footnoteId.split('-')[0] || footnoteId
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(footnoteContent)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(footnoteContent)
  }, [footnoteContent])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditing(true)
    setEditValue(footnoteContent)
  }

  const handleBlur = () => {
    setEditing(false)
    updateAttributes({ content: editValue })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setEditing(false)
      updateAttributes({ content: editValue })
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setEditValue(footnoteContent)
    }
  }

  if (editing) {
    return (
      <NodeViewWrapper as="span" style={{ display: 'inline' }}>
        <sup
          style={{
            color: 'var(--link-color, #3b82f6)',
            fontSize: '0.75em',
            verticalAlign: 'super',
            lineHeight: 0,
            position: 'relative',
          }}
        >
          [{displayNumber}]
        </sup>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '2px',
            verticalAlign: 'super',
          }}
        >
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: '12px',
              padding: '2px 6px',
              border: '1px solid var(--button-primary, #3b82f6)',
              borderRadius: '4px',
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              outline: 'none',
              fontFamily: "'Inter', -apple-system, sans-serif",
              minWidth: '120px',
              maxWidth: '300px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            placeholder="脚注内容..."
          />
        </span>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <sup
        data-type="footnoteReference"
        data-footnote-id={footnoteId}
        data-footnote-content={footnoteContent}
        onClick={handleClick}
        title={footnoteContent || '点击编辑脚注'}
        style={{
          color: 'var(--link-color, #3b82f6)',
          fontSize: '0.75em',
          verticalAlign: 'super',
          lineHeight: 0,
          cursor: 'pointer',
          borderRadius: '2px',
          padding: '0 2px',
          transition: 'background-color 0.15s',
          border: selected ? '1px solid var(--button-primary, #3b82f6)' : '1px solid transparent',
          backgroundColor: selected ? 'var(--mc-accent-soft)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--mc-accent-soft)'
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }
        }}
      >
        [{displayNumber}]
      </sup>
    </NodeViewWrapper>
  )
}

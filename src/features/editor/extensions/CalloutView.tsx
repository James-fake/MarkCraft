import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState } from 'react'

const CALLOUT_STYLES: Record<string, { color: string; icon: string }> = {
  note: { color: 'var(--mc-accent)', icon: 'ℹ️' },
  tip: { color: '#22c55e', icon: '💡' },
  warning: { color: '#f59e0b', icon: '⚠️' },
  danger: { color: '#ef4444', icon: '🔥' },
  info: { color: '#06b6d4', icon: '📘' },
  success: { color: '#16a34a', icon: '✅' },
  question: { color: '#8b5cf6', icon: '❓' },
  bug: { color: '#dc2626', icon: '🐛' },
  example: { color: '#7c3aed', icon: '📋' },
  quote: { color: '#6b7280', icon: '💬' },
  failure: { color: '#b91c1c', icon: '❌' },
}

export default function CalloutView({ node }: NodeViewProps) {
  const calloutType = (node.attrs.calloutType as string) || 'info'
  const title = (node.attrs.title as string) || ''
  const collapsible = (node.attrs.collapsible as boolean) || false

  const [collapsed, setCollapsed] = useState(false)

  const style = CALLOUT_STYLES[calloutType] || CALLOUT_STYLES.info
  const color = style.color
  const icon = style.icon
  const displayTitle = title || calloutType.charAt(0).toUpperCase() + calloutType.slice(1)

  return (
    <NodeViewWrapper>
      <div
        className="callout"
        data-callout
        data-callout-type={calloutType}
        style={{
          borderLeft: `4px solid ${color}`,
          borderRadius: '4px',
          margin: '12px 0',
          padding: '8px 12px',
          backgroundColor: `${color}1a`,
        }}
      >
        <div
          className="callout-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            color: 'var(--editor-text)',
          }}
        >
          <span className="callout-icon" style={{ fontSize: '16px' }}>
            {icon}
          </span>
          <span className="callout-title" style={{ fontWeight: 600, color }}>
            {displayTitle}
          </span>
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--editor-text)',
                fontSize: '12px',
                padding: '2px 6px',
              }}
            >
              {collapsed ? '展开' : '折叠'}
            </button>
          )}
        </div>
        <div
          className="callout-content"
          style={{
            display: collapsed ? 'none' : 'block',
            minHeight: '1em',
            color: 'var(--editor-text)',
          }}
        >
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

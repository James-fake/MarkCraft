import { useState } from 'react'
import { EditorView } from '@codemirror/view'

export interface ToolbarButtonProps {
  onClick?: () => void
  title: string
  ariaLabel: string
  disabled?: boolean
  children: React.ReactNode
  buttonRef?: React.Ref<HTMLButtonElement>
}

export function ToolbarButton({ onClick, title, ariaLabel, disabled = false, children, buttonRef }: ToolbarButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '6px 8px',
      borderRadius: '8px',
      transition: 'all 0.15s ease',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
    }
    if (disabled) {
      return { ...base, opacity: 0.3, cursor: 'not-allowed' }
    }
    if (active) {
      return { ...base, backgroundColor: 'var(--mc-accent-soft)', cursor: 'pointer' }
    }
    if (hovered) {
      return { ...base, backgroundColor: 'var(--mc-accent-soft)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer' }
    }
    return { ...base, cursor: 'pointer' }
  }

  return (
    <button
      ref={buttonRef}
      onClick={disabled ? undefined : onClick}
      style={getStyle()}
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false) }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {children}
    </button>
  )
}

export interface GroupProps {
  editorViewRef: React.RefObject<EditorView | null>
  value: string
  onChange: (value: string) => void
  onPushUndo?: (newValue: string, groupKey?: string) => void
  onFormatApplied: () => void
}

/**
 * 通用格式化应用函数
 * 将 MarkdownToolbar 的操作映射到 CM6 EditorView
 */
// eslint-disable-next-line react-refresh/only-export-components -- 纯函数与工具栏按钮组件同文件聚合，非跨组件共享
export function applyFormatToCM6(
  view: EditorView,
  formatter: (text: string, selectionStart: number, selectionEnd: number) => {
    newText: string
    newCursorStart: number
    newCursorEnd: number
  },
  onChange: (value: string) => void,
  onPushUndo?: (newValue: string, groupKey?: string) => void,
) {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  const result = formatter(doc, from, to)
  if (onPushUndo) onPushUndo(result.newText, 'format')
  onChange(result.newText)
  // 延迟设置光标，等待外部 value 同步到 CM6
  requestAnimationFrame(() => {
    if (view.dom) {
      view.focus()
      view.dispatch({
        selection: { anchor: result.newCursorStart, head: result.newCursorEnd },
      })
    }
  })
}

export function Separator() {
  return <div style={{ width: '1px', height: '20px', borderRadius: '1px', backgroundColor: 'var(--editor-border)', margin: '0 6px' }} />
}

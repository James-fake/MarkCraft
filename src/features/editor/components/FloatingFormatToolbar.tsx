import { forwardRef, useState, useRef, useEffect } from 'react'

export interface SelRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface ActiveMarks {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  link?: boolean
}

export type FormatKind = 'bold' | 'italic' | 'strike' | 'code' | 'link'

interface FloatingFormatToolbarProps {
  /** 选区锚点（视口坐标，来自 CodeMirror/ProseMirror 的 coordsAtPos） */
  rect: SelRect
  language: 'zh' | 'en'
  /** 当前选中内容的格式激活态（WYSIWYG 模式由 Tiptap 提供；源码模式为空） */
  activeMarks?: ActiveMarks
  /** 点击格式化按钮时触发 */
  onFormat: (kind: FormatKind, payload?: string) => void
  /** 点击外部/选区消失时由外层调用隐藏；组件本身不依赖它做隐藏 */
  onClose?: () => void
}

interface ToolbarAction {
  kind: FormatKind
  label: string
  titleZh: string
  titleEn: string
  style?: React.CSSProperties
}

const ACTIONS: ToolbarAction[] = [
  { kind: 'bold', label: 'B', titleZh: '加粗', titleEn: 'Bold', style: { fontWeight: 800 } },
  { kind: 'italic', label: 'I', titleZh: '斜体', titleEn: 'Italic', style: { fontStyle: 'italic' } },
  { kind: 'strike', label: 'S', titleZh: '删除线', titleEn: 'Strikethrough', style: { textDecoration: 'line-through' } },
  { kind: 'code', label: '</>', titleZh: '行内代码', titleEn: 'Inline code', style: { fontFamily: 'monospace' } },
]

const FloatingFormatToolbar = forwardRef<HTMLDivElement, FloatingFormatToolbarProps>(function FloatingFormatToolbar(
  { rect, language, activeMarks, onFormat, onClose: _onClose },
  ref
) {
  const [linkEditing, setLinkEditing] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isZh = language === 'zh'

  // 选区锚点上方放置；若贴近顶部则改到选区下方
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const midX = (rect.left + rect.right) / 2
  const placeBelow = rect.top < 48
  const top = placeBelow ? rect.bottom : rect.top
  // 估算半宽用于夹取，避免越界
  const halfW = 130
  const clampedLeft = Math.min(Math.max(midX, halfW), vw - halfW)

  useEffect(() => {
    if (linkEditing) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    }
  }, [linkEditing])

  const btnBase: React.CSSProperties = {
    minWidth: 30,
    height: 30,
    padding: '0 8px',
    borderRadius: 6,
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--editor-text, #111)',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const renderBtn = (action: ToolbarAction) => {
    const active = !!activeMarks?.[action.kind]
    return (
      <button
        key={action.kind}
        type="button"
        title={isZh ? action.titleZh : action.titleEn}
        aria-label={isZh ? action.titleZh : action.titleEn}
        aria-pressed={active}
        // 用 mousedown + preventDefault 保住编辑器选区，避免点击时失焦导致选区消失
        onMouseDown={(e) => {
          e.preventDefault()
          onFormat(action.kind)
        }}
        style={{
          ...btnBase,
          ...action.style,
          fontWeight: action.kind === 'bold' ? 800 : (btnBase.fontWeight as number),
          backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
          color: active ? 'var(--button-primary, #3b82f6)' : 'var(--editor-text, #111)',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.12)' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {action.label}
      </button>
    )
  }

  const handleLinkApply = () => {
    onFormat('link', linkUrl.trim())
    setLinkEditing(false)
    setLinkUrl('')
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={isZh ? '浮动格式工具栏' : 'Floating format toolbar'}
      // 捕获阶段阻止 mousedown 冒泡到文档监听（否则会被判定为「外部点击」而隐藏）
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top,
        left: clampedLeft,
        transform: placeBelow ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        borderRadius: 8,
        backgroundColor: 'var(--editor-bg, #fff)',
        border: '1px solid var(--editor-border, #e5e7eb)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        userSelect: 'none',
      }}
    >
      {ACTIONS.map(renderBtn)}

      <div style={{ width: 1, height: 20, backgroundColor: 'var(--editor-border, #e5e7eb)', margin: '0 4px', flexShrink: 0 }} />

      {linkEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            ref={inputRef}
            value={linkUrl}
            placeholder={isZh ? '输入链接地址' : 'Enter URL'}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLinkApply()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setLinkEditing(false)
                setLinkUrl('')
              }
            }}
            style={{
              width: 180,
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid var(--editor-border, #e5e7eb)',
              backgroundColor: 'var(--editor-bg, #fff)',
              color: 'var(--editor-text, #111)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            type="button"
            title={isZh ? '应用链接' : 'Apply link'}
            aria-label={isZh ? '应用链接' : 'Apply link'}
            onMouseDown={(e) => {
              e.preventDefault()
              handleLinkApply()
            }}
            style={{ ...btnBase, color: 'var(--button-primary, #3b82f6)' }}
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          type="button"
          title={isZh ? '插入链接' : 'Insert link'}
          aria-label={isZh ? '插入链接' : 'Insert link'}
          aria-pressed={!!activeMarks?.link}
          onMouseDown={(e) => {
            e.preventDefault()
            setLinkEditing(true)
          }}
          style={{
            ...btnBase,
            fontSize: 16,
            color: activeMarks?.link ? 'var(--button-primary, #3b82f6)' : 'var(--editor-text, #111)',
            backgroundColor: activeMarks?.link ? 'rgba(59,130,246,0.15)' : 'transparent',
          }}
        >
          🔗
        </button>
      )}
    </div>
  )
})

export default FloatingFormatToolbar

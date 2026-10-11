import { useState } from 'react'

interface WysiwygToolbarButtonProps {
  onClick: () => void
  title: string
  disabled?: boolean
  active?: boolean
  buttonRef?: React.Ref<HTMLButtonElement>
  children: React.ReactNode
}

function WysiwygToolbarButton({
  onClick,
  title,
  disabled = false,
  active = false,
  buttonRef,
  children,
}: WysiwygToolbarButtonProps) {
  const [hovered, setHovered] = useState(false)

  const getStyle = (): React.CSSProperties => {
    // ⚠️ 与源码模式工具栏的 `ToolbarButton`（groups/shared.tsx）**逐字一致**：
    //    同样的 padding / 圆角、**不设固定高度与最小宽度** —— 否则所见即所得工具栏
    //    会比源码模式矮一截、图标显小（此前是 padding 5/7 + radius 6 + 固定 28×28）。
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
      return {
        ...base,
        backgroundColor: 'var(--mc-accent-soft)',
        color: 'var(--button-primary, #3b82f6)',
        cursor: 'pointer',
      }
    }
    if (hovered) {
      return {
        ...base,
        backgroundColor: 'var(--mc-accent-soft)',
        cursor: 'pointer',
      }
    }
    return { ...base, cursor: 'pointer' }
  }

  return (
    <button
      ref={buttonRef}
      onClick={disabled ? undefined : onClick}
      style={getStyle()}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export default WysiwygToolbarButton

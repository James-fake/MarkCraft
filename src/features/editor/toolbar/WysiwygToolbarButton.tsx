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
    const base: React.CSSProperties = {
      padding: '5px 7px',
      borderRadius: '6px',
      transition: 'all 0.15s ease',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '28px',
      height: '28px',
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

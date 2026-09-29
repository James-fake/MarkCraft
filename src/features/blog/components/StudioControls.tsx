import React, { useState } from 'react'
import { useDensity } from '@hooks/useDensity'
import { AuroraSelect } from '@components/ui/AuroraSelect'

// ─── Theme context for Studio components ─────────────────────

const ThemeContext = React.createContext<{ isDark: boolean }>({ isDark: true })
export const StudioThemeProvider = ThemeContext.Provider

// eslint-disable-next-line react-refresh/only-export-components -- hook 与唯一消费组件同文件聚合，非跨组件共享
export function useStudioTheme() {
  return React.useContext(ThemeContext)
}

// ─── Section Label — gradient accent bar + micro-glow ────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { isDark } = useStudioTheme()
  // 阶段9：随全局密度缩放标题下边距（中心化控制，一处改动影响全部面板）
  const density = useDensity()
  const isComfortable = density === 'comfortable'
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: isComfortable ? 11 : 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        width: 3,
        height: 12,
        borderRadius: 2,
        background: 'linear-gradient(180deg, #a78bfa, #f472b6)',
        flexShrink: 0,
        boxShadow: '0 0 8px rgba(167,139,250,0.3)',
      }} />
      {children}
    </div>
  )
}

// ─── Stat Row — animated dot + value highlight ──────────────

export function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 11,
      padding: '4px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0,
          boxShadow: `0 0 6px ${color}60`,
        }} />
        {label}
      </div>
      <span style={{
        fontWeight: 600, opacity: 0.8,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11,
        color,
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Studio Input — glow border + inner shadow ──────────────

export function StudioInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  const { isDark } = useStudioTheme()
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '8px 12px',
        fontSize: 12,
        border: focused
          ? '1px solid rgba(167,139,250,0.6)'
          : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 10,
        backgroundColor: focused
          ? 'rgba(167,139,250,0.06)'
          : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        color: isDark ? '#e4e4e7' : '#1a1a1a',
        outline: 'none',
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxSizing: 'border-box',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        boxShadow: focused
          ? '0 0 0 3px rgba(167,139,250,0.12), inset 0 1px 2px rgba(0,0,0,0.2)'
          : 'inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    />
  )
}

// ─── Studio Textarea ────────────────────────────────────────

export function StudioTextarea({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)
  const { isDark } = useStudioTheme()
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '8px 12px',
        fontSize: 12,
        border: focused
          ? '1px solid rgba(167,139,250,0.6)'
          : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 10,
        backgroundColor: focused
          ? 'rgba(167,139,250,0.06)'
          : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        color: isDark ? '#e4e4e7' : '#1a1a1a',
        outline: 'none',
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxSizing: 'border-box',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        resize: 'vertical',
        boxShadow: focused
          ? '0 0 0 3px rgba(167,139,250,0.12), inset 0 1px 2px rgba(0,0,0,0.2)'
          : 'inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    />
  )
}

// ─── Studio Select — custom dropdown arrow ──────────────────

export function StudioSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <AuroraSelect
      value={value}
      onChange={onChange}
      options={options}
      className="aurora-select--block"
    />
  )
}

// ─── Studio Toggle — pill-shaped toggle switch ──────────────

export function StudioToggle({ active, onChange, labelOn, labelOff }: {
  active: boolean
  onChange: (v: boolean) => void
  labelOn: string
  labelOff: string
}) {
  const { isDark } = useStudioTheme()
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', border: 'none', borderRadius: 20,
        background: active ? 'rgba(167,139,250,0.12)' : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        cursor: 'pointer', transition: 'all 0.2s ease',
        borderLeft: active ? '2px solid #a78bfa' : '2px solid transparent',
      }}
    >
      <div style={{
        width: 28, height: 16, borderRadius: 8, position: 'relative',
        background: active ? 'rgba(167,139,250,0.4)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        transition: 'background 0.2s ease', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: active ? 14 : 2,
          width: 12, height: 12, borderRadius: 6,
          background: active ? '#a78bfa' : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: active ? '0 0 6px rgba(167,139,250,0.5)' : 'none',
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: active ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)') : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'),
        transition: 'color 0.2s ease',
      }}>
        {active ? labelOn : labelOff}
      </span>
    </button>
  )
}

// ─── Studio Chip — preset/tag chip button ───────────────────

export function StudioChip({ label, onClick, active, variant, onMouseEnter, onMouseLeave }: {
  label: string
  onClick: () => void
  active?: boolean
  variant?: 'default' | 'accent' | 'danger'
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const { isDark } = useStudioTheme()
  const v = variant || 'default'
  const d = isDark
  const colors = {
    default: {
      bg: active ? 'rgba(167,139,250,0.12)' : d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: active ? 'rgba(167,139,250,0.4)' : d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
      text: active ? '#a78bfa' : d ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
      hoverBg: 'rgba(167,139,250,0.1)',
      hoverBorder: 'rgba(167,139,250,0.3)',
      hoverText: '#a78bfa',
    },
    accent: {
      bg: active ? 'rgba(56,189,248,0.12)' : d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      border: active ? 'rgba(56,189,248,0.4)' : d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
      text: active ? '#38bdf8' : d ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
      hoverBg: 'rgba(56,189,248,0.1)',
      hoverBorder: 'rgba(56,189,248,0.3)',
      hoverText: '#38bdf8',
    },
    danger: {
      bg: 'rgba(239,68,68,0.06)',
      border: 'rgba(239,68,68,0.2)',
      text: 'rgba(239,68,68,0.7)',
      hoverBg: 'rgba(239,68,68,0.12)',
      hoverBorder: 'rgba(239,68,68,0.4)',
      hoverText: '#ef4444',
    },
  }
  const c = colors[v]

  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        fontSize: 10,
        fontWeight: active ? 600 : 500,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        background: c.bg,
        color: c.text,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = c.hoverBg
        e.currentTarget.style.borderColor = c.hoverBorder
        e.currentTarget.style.color = c.hoverText
        onMouseEnter?.()
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = c.bg
        e.currentTarget.style.borderColor = c.border
        e.currentTarget.style.color = c.text
        onMouseLeave?.()
      }}
    >
      {label}
    </button>
  )
}

// ─── Studio Button — primary/secondary/ghost ────────────────

export function StudioButton({ label, onClick, variant, disabled, icon, fullWidth }: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}) {
  const { isDark } = useStudioTheme()
  const v = variant || 'secondary'
  const isDisabled = disabled || false
  const d = isDark

  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: v === 'primary' ? '10px 20px' : '8px 14px',
    fontSize: v === 'primary' ? 12 : 11,
    fontWeight: v === 'primary' ? 600 : 500,
    borderRadius: v === 'primary' ? 12 : 10,
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    width: fullWidth ? '100%' : undefined,
    letterSpacing: v === 'primary' ? '0.02em' : undefined,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: isDisabled
        ? 'rgba(167,139,250,0.15)'
        : 'linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #f472b6 100%)',
      color: isDisabled ? 'rgba(255,255,255,0.3)' : '#ffffff',
      boxShadow: isDisabled ? 'none' : '0 4px 16px rgba(167,139,250,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
    },
    secondary: {
      background: d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      color: isDisabled ? (d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : (d ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
      border: `1px solid ${isDisabled ? (d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : (d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)')}`,
    },
    ghost: {
      background: 'transparent',
      color: isDisabled ? (d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : (d ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
    },
  }

  return (
    <button onClick={onClick} disabled={isDisabled}
      style={{ ...baseStyle, ...variantStyles[v] }}
      onMouseEnter={(e) => {
        if (isDisabled) return
        if (v === 'primary') {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(167,139,250,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset'
        } else if (v === 'secondary') {
          e.currentTarget.style.background = d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
          e.currentTarget.style.borderColor = d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)'
          e.currentTarget.style.color = d ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
        } else {
          e.currentTarget.style.color = d ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
        }
      }}
      onMouseLeave={(e) => {
        if (v === 'primary') {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = variantStyles.primary.boxShadow as string || 'none'
        } else if (v === 'secondary') {
          e.currentTarget.style.background = d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
          e.currentTarget.style.borderColor = d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
          e.currentTarget.style.color = isDisabled ? (d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : (d ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)')
        } else {
          e.currentTarget.style.color = isDisabled ? (d ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : (d ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')
        }
      }}
    >
      {icon}
      {label}
    </button>
  )
}

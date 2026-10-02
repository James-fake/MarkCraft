import { useState } from 'react'
import type { ThemeTokens } from './themeTokens'

// 可视化 CSS 编辑器的属性行 / 分组折叠组件（P4-3 自 VisualCssEditor.tsx 抽离）。
// PropertyRow：一行「标签 + 控件」；PropertyGroup：可折叠分组标题。

export function PropertyRow({ label, children, tk }: {
  label: string
  value: string
  children: React.ReactNode
  tk: ThemeTokens
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 9, color: tk.textMuted, width: 32, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

export function PropertyGroup({ title, icon, children, tk, defaultOpen }: {
  title: string
  icon: string
  children: React.ReactNode
  tk: ThemeTokens
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        padding: '4px 0', border: 'none', background: 'transparent',
        cursor: 'pointer', fontSize: 10, fontWeight: 700,
        color: tk.textSub, letterSpacing: '0.04em',
      }}>
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block', fontSize: 8 }}>▸</span>
        <span>{icon}</span>
        <span>{title}</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>{children}</div>}
    </div>
  )
}

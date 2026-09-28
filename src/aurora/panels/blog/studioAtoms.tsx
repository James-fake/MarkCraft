/**
 * 博客工作室 · 复用控件（Aurora token 化，不使用 features 的 StudioControls）
 * （P2-3 从 BlogPanel.tsx 拆出，2026-09-28）
 */

import type { ReactNode } from 'react'
import { AuroraSelect } from '@components/ui/AuroraSelect'

/* ============================================================
 * 复用控件（Aurora token 化，不使用 features 的 StudioControls）
 * ========================================================== */
function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="aurora-blog-section">{children}</div>
}

function StudioInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="aurora-blog-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function StudioTextarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      className="aurora-blog-textarea"
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function StudioSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <AuroraSelect value={value} onChange={onChange} options={options} />
}

function StudioToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`aurora-blog-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="aurora-blog-toggle__dot" />
    </button>
  )
}

function StudioChip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`aurora-blog-chip ${active ? 'is-active' : ''}`} onClick={onClick}>{children}</button>
  )
}

function StudioButton({ children, variant = 'secondary', onClick }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void }) {
  return (
    <button type="button" className={`aurora-blog-btn aurora-blog-btn--${variant}`} onClick={onClick}>{children}</button>
  )
}

// —— P2-3 拆分导出（消费方：主面板/兄弟模块）——
export {
  SectionLabel,
  StudioInput,
  StudioTextarea,
  StudioSelect,
  StudioToggle,
  StudioChip,
  StudioButton,
}

import { useState, useCallback } from 'react'
import { ThemeTokens } from './themeTokens'

interface BoxShadowValue {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  inset: boolean
}

function parseBoxShadow(raw: string): BoxShadowValue {
  const defaults: BoxShadowValue = { offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: '#000000', inset: false }
  if (!raw || raw === 'none') return defaults

  // Try to parse: inset? Xpx Ypx BLURpx SPREADpx COLOR
  let remaining = raw.trim()
  let inset = false
  if (remaining.startsWith('inset')) {
    inset = true
    remaining = remaining.slice(5).trim()
  }

  // Parse numeric values
  const numRegex = /(-?\d+(?:\.\d+)?)(px|em|rem)?/g
  const nums: number[] = []
  let match
  while ((match = numRegex.exec(remaining)) !== null) {
    nums.push(parseFloat(match[1]))
  }

  // Parse color (everything after the numbers)
  const colorPart = remaining.replace(/-?\d+(?:\.\d+)?(?:px|em|rem)?\s*/g, '').trim()
  let color = colorPart || '#000000'
  // Convert rgb/rgba to hex
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    color = '#' + r + g + b
  }

  return {
    offsetX: nums[0] || 0,
    offsetY: nums[1] || 0,
    blur: nums[2] || 0,
    spread: nums[3] || 0,
    color,
    inset,
  }
}

function formatBoxShadow(v: BoxShadowValue): string {
  if (v.blur === 0 && v.spread === 0 && v.offsetX === 0 && v.offsetY === 0) return 'none'
  const parts: string[] = []
  if (v.inset) parts.push('inset')
  parts.push(`${v.offsetX}px`)
  parts.push(`${v.offsetY}px`)
  if (v.blur > 0) parts.push(`${v.blur}px`)
  if (v.spread > 0) parts.push(`${v.spread}px`)
  parts.push(v.color)
  return parts.join(' ')
}

interface BoxShadowEditorProps {
  value: string
  onPreview: (property: string, value: string) => void
  onCommit: (property: string, value: string) => void
  tk: ThemeTokens
}

export function BoxShadowEditor({ value, onPreview, onCommit, tk }: BoxShadowEditorProps) {
  const parsed = parseBoxShadow(value)
  const [local, setLocal] = useState<BoxShadowValue>(parsed)

  const handleChange = useCallback((field: keyof BoxShadowValue, val: number | string | boolean) => {
    const updated = { ...local, [field]: val }
    setLocal(updated)
    const formatted = formatBoxShadow(updated)
    onPreview('box-shadow', formatted)
  }, [local, onPreview])

  const handleCommit = useCallback(() => {
    onCommit('box-shadow', formatBoxShadow(local))
  }, [local, onCommit])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Inset toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => handleChange('inset', !local.inset)}
          style={{
            padding: '2px 8px', borderRadius: 4,
            border: `1px solid ${local.inset ? tk.accentBorder : tk.inputBorder}`,
            background: local.inset ? tk.accentBg : 'transparent',
            color: local.inset ? tk.accentText : tk.textSub,
            cursor: 'pointer', fontSize: 9,
          }}
        >
          内阴影
        </button>
      </div>
      {/* Offset X/Y */}
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 8, color: tk.textMuted, width: 16, flexShrink: 0 }}>X</span>
          <input type="range" min={-30} max={30} step={1} value={local.offsetX}
            onChange={(e) => handleChange('offsetX', parseFloat(e.target.value))}
            onPointerUp={handleCommit}
            style={{ flex: 1, accentColor: tk.accent }}
          />
          <span style={{ fontSize: 8, color: tk.textFaint, width: 24 }}>{local.offsetX}px</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 8, color: tk.textMuted, width: 16, flexShrink: 0 }}>Y</span>
          <input type="range" min={-30} max={30} step={1} value={local.offsetY}
            onChange={(e) => handleChange('offsetY', parseFloat(e.target.value))}
            onPointerUp={handleCommit}
            style={{ flex: 1, accentColor: tk.accent }}
          />
          <span style={{ fontSize: 8, color: tk.textFaint, width: 24 }}>{local.offsetY}px</span>
        </div>
      </div>
      {/* Blur + Spread */}
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 8, color: tk.textMuted, width: 16, flexShrink: 0 }}>模糊</span>
          <input type="range" min={0} max={40} step={1} value={local.blur}
            onChange={(e) => handleChange('blur', parseFloat(e.target.value))}
            onPointerUp={handleCommit}
            style={{ flex: 1, accentColor: tk.accent }}
          />
          <span style={{ fontSize: 8, color: tk.textFaint, width: 24 }}>{local.blur}px</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 8, color: tk.textMuted, width: 16, flexShrink: 0 }}>扩展</span>
          <input type="range" min={-20} max={20} step={1} value={local.spread}
            onChange={(e) => handleChange('spread', parseFloat(e.target.value))}
            onPointerUp={handleCommit}
            style={{ flex: 1, accentColor: tk.accent }}
          />
          <span style={{ fontSize: 8, color: tk.textFaint, width: 24 }}>{local.spread}px</span>
        </div>
      </div>
      {/* Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, color: tk.textMuted }}>颜色</span>
        <input type="color" value={local.color}
          onChange={(e) => handleChange('color', e.target.value)}
          onPointerUp={handleCommit}
          style={{ width: 20, height: 16, border: 'none', padding: 0, cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}

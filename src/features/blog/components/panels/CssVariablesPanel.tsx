import { useState, useCallback } from 'react'
import { useStudioTheme } from '../StudioControls'
import { useThemeTokens } from './themeTokens'

// CSS 变量定义
interface VarDef {
  name: string
  label: string
  type: 'color' | 'size' | 'time'
  min?: number
  max?: number
  step?: number
  unit?: string
}

const VAR_GROUPS: Array<{ label: string; icon: string; vars: VarDef[] }> = [
  {
    label: '配色', icon: '🎨',
    vars: [
      { name: '--accent-warm', label: '主题强调色', type: 'color' },
      { name: '--accent-cool', label: '冷调强调色', type: 'color' },
      { name: '--accent-violet', label: '紫罗兰强调', type: 'color' },
      { name: '--accent-rose', label: '玫瑰强调', type: 'color' },
      { name: '--accent-emerald', label: '翡翠强调', type: 'color' },
      { name: '--bg-primary', label: '主背景色', type: 'color' },
      { name: '--bg-secondary', label: '次背景色', type: 'color' },
      { name: '--bg-card', label: '卡片背景色', type: 'color' },
      { name: '--text-primary', label: '主文字色', type: 'color' },
      { name: '--text-secondary', label: '次文字色', type: 'color' },
      { name: '--text-muted', label: '弱化文字色', type: 'color' },
      { name: '--border-color', label: '边框色', type: 'color' },
    ],
  },
  {
    label: '布局', icon: '📐',
    vars: [
      { name: '--max-width', label: '内容最大宽度', type: 'size', min: 400, max: 1400, step: 20, unit: 'px' },
      { name: '--radius', label: '大圆角', type: 'size', min: 0, max: 32, step: 1, unit: 'px' },
      { name: '--radius-sm', label: '小圆角', type: 'size', min: 0, max: 20, step: 1, unit: 'px' },
    ],
  },
  {
    label: '效果', icon: '✨',
    vars: [
      { name: '--transition', label: '过渡时间', type: 'time', min: 0, max: 100, step: 5, unit: 's' },
    ],
  },
]

// 从 customCss 中提取变量值
function extractVarValue(css: string, varName: string): string | null {
  const regex = new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`, 'g')
  let match
  let lastValue: string | null = null
  while ((match = regex.exec(css)) !== null) {
    lastValue = match[1].trim()
  }
  return lastValue
}

// 解析颜色值为 hex
function parseColor(value: string): string {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
  }
  // rgb/rgba
  const rgbMatch = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#888888'
}

// 解析尺寸值
function parseSize(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

interface CssVariablesPanelProps {
  customCss: string
  onApplyVariables: (css: string) => void
}

export function CssVariablesPanel({ customCss, onApplyVariables }: CssVariablesPanelProps) {
  const { isDark } = useStudioTheme()
  const tk = useThemeTokens()
  const [expanded, setExpanded] = useState(false)

  // 生成 :root { ... } 代码，合并/替换已有变量
  const applyVariable = useCallback((varName: string, value: string) => {
    const declaration = `${varName}: ${value};`
    // Check if there's already a :root block
    const rootRegex = /:root\s*\{([^}]*)\}/g
    let newCss = customCss
    let found = false

    // Try to update existing variable in :root block
    newCss = newCss.replace(rootRegex, (match, blockContent) => {
      const varRegex = new RegExp(varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*[^;]+;?', 'g')
      if (varRegex.test(blockContent)) {
        found = true
        return match.replace(varRegex, declaration)
      }
      // Variable not in this block, add it
      found = true
      return match.replace('}', `  ${declaration}\n}`)
    })

    if (!found) {
      // No :root block or variable not found, add new :root block
      const rootBlock = `:root {\n  ${declaration}\n}`
      newCss = customCss.trim() ? rootBlock + '\n\n' + customCss.trim() : rootBlock
    }

    onApplyVariables(newCss)
  }, [customCss, onApplyVariables])

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: tk.textSub, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '4px 0', width: '100%',
        }}
      >
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>
          ▸
        </span>
        变量面板
      </button>

      {expanded && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '8px 0',
        }}>
          {VAR_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: tk.textMuted,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{group.icon}</span> {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.vars.map(v => {
                  const rawValue = extractVarValue(customCss, v.name)
                  return (
                    <div key={v.name} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '3px 0',
                    }}>
                      <span style={{
                        fontSize: 9, color: tk.textMuted,
                        width: 70, flexShrink: 0, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {v.label}
                      </span>
                      {v.type === 'color' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                          <input
                            type="color"
                            value={rawValue ? parseColor(rawValue) : '#888888'}
                            onChange={(e) => applyVariable(v.name, e.target.value)}
                            style={{
                              width: 24, height: 24, border: `1px solid ${tk.inputBorder}`,
                              borderRadius: 6, cursor: 'pointer', padding: 0,
                              background: 'transparent',
                            }}
                          />
                          <span style={{
                            fontSize: 9, color: tk.textFaint,
                            fontFamily: "'Fira Code', monospace",
                          }}>
                            {rawValue || '(默认)'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                          <input
                            type="range"
                            min={v.min || 0}
                            max={v.max || 100}
                            step={v.step || 1}
                            value={rawValue ? parseSize(rawValue) : (v.min || 0)}
                            onChange={(e) => applyVariable(v.name, e.target.value + (v.unit || 'px'))}
                            style={{
                              flex: 1, height: 6, appearance: 'none', WebkitAppearance: 'none',
                              borderRadius: 3, outline: 'none', cursor: 'pointer',
                              background: isDark ? 'linear-gradient(to right, rgba(52,211,153,0.2), rgba(52,211,153,0.6))' : 'linear-gradient(to right, rgba(5,150,105,0.2), rgba(5,150,105,0.6))',
                            }}
                          />
                          <span style={{
                            fontSize: 9, color: tk.textFaint,
                            fontFamily: "'Fira Code', monospace",
                            width: 40, textAlign: 'right',
                          }}>
                            {rawValue || '(默认)'}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

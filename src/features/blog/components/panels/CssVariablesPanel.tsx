import { useState, useCallback } from 'react'
import { useStudioTheme } from '../StudioControls'
import { useThemeTokens } from './themeTokens'
import { useLanguage } from '@stores/LanguageStore'

// CSS 变量定义
interface VarDef {
  name: string
  zh: string
  en: string
  type: 'color' | 'size' | 'time'
  min?: number
  max?: number
  step?: number
  unit?: string
}

const VAR_GROUPS: Array<{ zh: string; en: string; icon: string; vars: VarDef[] }> = [
  {
    zh: '配色', en: 'Colors', icon: '🎨',
    vars: [
      { name: '--accent-warm', zh: '主题强调色', en: 'Theme accent', type: 'color' },
      { name: '--accent-cool', zh: '冷调强调色', en: 'Cool accent', type: 'color' },
      { name: '--accent-violet', zh: '紫罗兰强调', en: 'Violet accent', type: 'color' },
      { name: '--accent-rose', zh: '玫瑰强调', en: 'Rose accent', type: 'color' },
      { name: '--accent-emerald', zh: '翡翠强调', en: 'Emerald accent', type: 'color' },
      { name: '--bg-primary', zh: '主背景色', en: 'Primary background', type: 'color' },
      { name: '--bg-secondary', zh: '次背景色', en: 'Secondary background', type: 'color' },
      { name: '--bg-card', zh: '卡片背景色', en: 'Card background', type: 'color' },
      { name: '--text-primary', zh: '主文字色', en: 'Primary text', type: 'color' },
      { name: '--text-secondary', zh: '次文字色', en: 'Secondary text', type: 'color' },
      { name: '--text-muted', zh: '弱化文字色', en: 'Muted text', type: 'color' },
      { name: '--border-color', zh: '边框色', en: 'Border color', type: 'color' },
    ],
  },
  {
    zh: '布局', en: 'Layout', icon: '📐',
    vars: [
      { name: '--max-width', zh: '内容最大宽度', en: 'Max content width', type: 'size', min: 400, max: 1400, step: 20, unit: 'px' },
      { name: '--radius', zh: '大圆角', en: 'Large radius', type: 'size', min: 0, max: 32, step: 1, unit: 'px' },
      { name: '--radius-sm', zh: '小圆角', en: 'Small radius', type: 'size', min: 0, max: 20, step: 1, unit: 'px' },
    ],
  },
  {
    zh: '效果', en: 'Effects', icon: '✨',
    vars: [
      { name: '--transition', zh: '过渡时间', en: 'Transition duration', type: 'time', min: 0, max: 100, step: 5, unit: 's' },
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
  const { t, language } = useLanguage()
  const isZh = language === 'zh'
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
        {t.blogCss.varPanel}
      </button>

      {expanded && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '8px 0',
        }}>
          {VAR_GROUPS.map(group => (
            <div key={group.zh}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: tk.textMuted,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{group.icon}</span> {isZh ? group.zh : group.en}
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
                        {isZh ? v.zh : v.en}
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
                            {rawValue || t.blogCss.varDefault}
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
                            {rawValue || t.blogCss.varDefault}
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

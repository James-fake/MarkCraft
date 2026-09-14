import { useState, useCallback } from 'react'
import { StudioChip } from '../StudioControls'
import { useThemeTokens } from './themeTokens'
import { AuroraSelect } from '@components/ui/AuroraSelect'

/** 关键帧定义 */
interface Keyframe {
  id: string
  offset: number  // 0-100 (%)
  properties: Array<{ prop: string; value: string }>
}

/** 动画定义 */
interface AnimationDef {
  name: string
  keyframes: Keyframe[]
  duration: string      // 如 '2s'
  timingFunction: string  // 如 'ease'
  iterationCount: string  // 如 'infinite'
  targetSelector: string  // 如 '.post-content img'
}

const DEFAULT_ANIMATION: AnimationDef = {
  name: 'customAnim',
  keyframes: [
    { id: 'k1', offset: 0, properties: [{ prop: 'opacity', value: '0' }, { prop: 'transform', value: 'translateY(20px)' }] },
    { id: 'k2', offset: 100, properties: [{ prop: 'opacity', value: '1' }, { prop: 'transform', value: 'translateY(0)' }] },
  ],
  duration: '0.6s',
  timingFunction: 'ease',
  iterationCount: '1',
  targetSelector: '.post-content img',
}

// 缓动曲线选项：value 为 CSS 标准写法（不可翻译），label 为中文说明
const TIMING_FUNCTIONS: Array<{ value: string; label: string }> = [
  { value: 'ease', label: '平滑（ease）' },
  { value: 'ease-in', label: '渐入（ease-in）' },
  { value: 'ease-out', label: '渐出（ease-out）' },
  { value: 'ease-in-out', label: '渐入渐出（ease-in-out）' },
  { value: 'linear', label: '匀速（linear）' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: '平滑曲线' },
]

// 动画时长选项（值为 CSS 时间，不可翻译）
const DURATION_OPTIONS = ['0.3s', '0.5s', '0.6s', '1s', '1.5s', '2s', '3s', '5s']

// 播放次数选项
const ITERATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: '1 次（播放一次）' },
  { value: '2', label: '2 次' },
  { value: '3', label: '3 次' },
  { value: 'infinite', label: '无限循环（infinite）' },
]

const COMMON_SELECTORS = ['.post-content img', '.featured-card', '.grid-card', '.post-header h1', '.tag', 'a']

interface KeyframeEditorProps {
  onInsertCss: (css: string) => void
}

export function KeyframeEditor({ onInsertCss }: KeyframeEditorProps) {
  const tk = useThemeTokens()
  const [expanded, setExpanded] = useState(false)
  const [anim, setAnim] = useState<AnimationDef>(DEFAULT_ANIMATION)
  const [selectedKfId, setSelectedKfId] = useState<string | null>('k1')

  const selectedKf = anim.keyframes.find(k => k.id === selectedKfId)

  /** 添加关键帧 */
  const addKeyframe = useCallback(() => {
    const newKf: Keyframe = {
      id: 'k' + Date.now(),
      offset: 50,
      properties: [{ prop: 'opacity', value: '1' }],
    }
    setAnim(prev => ({
      ...prev,
      keyframes: [...prev.keyframes, newKf].sort((a, b) => a.offset - b.offset),
    }))
    setSelectedKfId(newKf.id)
  }, [])

  /** 删除关键帧 */
  const deleteKeyframe = useCallback((id: string) => {
    setAnim(prev => ({
      ...prev,
      keyframes: prev.keyframes.filter(k => k.id !== id),
    }))
    if (selectedKfId === id) setSelectedKfId(null)
  }, [selectedKfId])

  /** 更新关键帧 offset */
  const updateOffset = useCallback((id: string, offset: number) => {
    setAnim(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(k => k.id === id ? { ...k, offset: Math.max(0, Math.min(100, offset)) } : k)
        .sort((a, b) => a.offset - b.offset),
    }))
  }, [])

  /** 更新关键帧属性 */
  const updateProperty = useCallback((kfId: string, propIdx: number, field: 'prop' | 'value', val: string) => {
    setAnim(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(k => {
        if (k.id !== kfId) return k
        const properties = k.properties.map((p, i) => i === propIdx ? { ...p, [field]: val } : p)
        return { ...k, properties }
      }),
    }))
  }, [])

  /** 添加属性到关键帧 */
  const addProperty = useCallback((kfId: string) => {
    setAnim(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(k => k.id === kfId ? { ...k, properties: [...k.properties, { prop: '', value: '' }] } : k),
    }))
  }, [])

  /** 删除属性 */
  const deleteProperty = useCallback((kfId: string, propIdx: number) => {
    setAnim(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(k => k.id !== kfId ? k : { ...k, properties: k.properties.filter((_, i) => i !== propIdx) }),
    }))
  }, [])

  /** 生成 CSS */
  const generateCss = useCallback(() => {
    const kfStr = anim.keyframes
      .sort((a, b) => a.offset - b.offset)
      .map(kf => {
        const props = kf.properties
          .filter(p => p.prop.trim() && p.value.trim())
          .map(p => `    ${p.prop}: ${p.value};`)
          .join('\n')
        return `  ${kf.offset}% {\n${props}\n  }`
      })
      .join('\n')

    return `@keyframes ${anim.name} {
${kfStr}
}

${anim.targetSelector} {
  animation: ${anim.name} ${anim.duration} ${anim.timingFunction} ${anim.iterationCount};
}`
  }, [anim])

  const handleInsert = useCallback(() => {
    onInsertCss(generateCss())
  }, [generateCss, onInsertCss])

  // 复用的小标签样式
  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 9, color: tk.textMuted, marginBottom: 3, fontWeight: 600,
  }
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '5px 0', border: 'none', background: 'transparent',
          color: tk.textMuted, cursor: 'pointer', fontSize: 10,
          fontWeight: 600, letterSpacing: '0.04em',
        }}
      >
        <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        🎬 动画时间轴编辑器
      </button>

      {expanded && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: 10, borderRadius: 8,
          background: tk.inputBg, border: `1px solid ${tk.border}`,
        }}>
          {/* 功能说明提示 */}
          <div style={{
            fontSize: 9, lineHeight: 1.5, color: tk.textMuted,
            background: tk.surface, border: `1px dashed ${tk.border}`,
            borderRadius: 6, padding: '6px 8px',
          }}>
            为指定元素添加进入动画（如淡入、上移）。时间轴上的每个节点是一个「关键帧」，拖动滑块调整它在动画中的时间点，并为其填写 CSS 属性。完成后点击「插入到编辑器」即可生成 <code>@keyframes</code> 代码。
          </div>

          {/* 动画名称 + 目标选择器 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={fieldLabelStyle}>动画名称</div>
              <input
                value={anim.name}
                onChange={(e) => setAnim(prev => ({ ...prev, name: e.target.value }))}
                placeholder="动画名称，如 fadeInUp"
                style={{
                  width: '100%', padding: '4px 8px', fontSize: 10,
                  border: `1px solid ${tk.inputBorder}`, borderRadius: 6,
                  background: tk.surface, color: tk.text,
                  outline: 'none', fontFamily: "'Fira Code', monospace",
                }}
              />
            </div>
            <div>
              <div style={fieldLabelStyle}>作用元素（目标选择器）</div>
              <AuroraSelect
                value={anim.targetSelector}
                onChange={(v) => setAnim(prev => ({ ...prev, targetSelector: v }))}
                options={COMMON_SELECTORS.map(s => ({ value: s, label: s }))}
                className="aurora-select--block"
              />
            </div>
          </div>

          {/* 时间轴 */}
          <div>
            <div style={{ fontSize: 9, color: tk.textMuted, marginBottom: 4 }}>时间轴（0% 开始 → 100% 结束）</div>
            <div style={{
              position: 'relative', height: 36,
              background: tk.surface, borderRadius: 6,
              border: `1px solid ${tk.border}`,
            }}>
              {/* 0% 和 100% 标记 */}
              <div style={{ position: 'absolute', left: 4, top: 2, fontSize: 7, color: tk.textFaint }}>0%</div>
              <div style={{ position: 'absolute', right: 4, top: 2, fontSize: 7, color: tk.textFaint }}>100%</div>
              {/* 关键帧标记 */}
              {anim.keyframes.map(kf => (
                <div
                  key={kf.id}
                  onClick={() => setSelectedKfId(kf.id)}
                  style={{
                    position: 'absolute',
                    left: `calc(${kf.offset}% - 6px)`,
                    top: 10, width: 12, height: 16,
                    background: selectedKfId === kf.id ? tk.accent : tk.textMuted,
                    borderRadius: 3, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedKfId === kf.id ? `0 0 6px ${tk.accent}60` : 'none',
                  }}
                  title={`${kf.offset}%`}
                />
              ))}
            </div>
            <div style={{ fontSize: 8, color: tk.textFaint, marginTop: 2 }}>提示：点击时间轴上的节点可选中并编辑该关键帧。</div>
          </div>

          {/* 关键帧操作 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <StudioChip label="+ 添加关键帧" onClick={addKeyframe} variant="default" />
            {selectedKfId && anim.keyframes.length > 1 && (
              <StudioChip label="删除选中关键帧" onClick={() => deleteKeyframe(selectedKfId)} variant="danger" />
            )}
          </div>

          {/* 选中关键帧的编辑 */}
          {selectedKf && (
            <div style={{
              padding: 8, borderRadius: 6,
              background: tk.surface, border: `1px solid ${tk.border}`,
            }}>
              {/* offset 滑块 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: tk.textMuted, width: 56, flexShrink: 0 }}>位置（0–100%）</span>
                <input
                  type="range" min={0} max={100} value={selectedKf.offset}
                  onChange={(e) => updateOffset(selectedKf.id, parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: tk.accent }}
                />
                <span style={{ fontSize: 9, color: tk.textSub, fontFamily: "'Fira Code', monospace", width: 32, textAlign: 'right' }}>
                  {selectedKf.offset}%
                </span>
              </div>

              {/* 属性列表 */}
              <div style={{ fontSize: 9, color: tk.textMuted, marginBottom: 4 }}>该关键帧的 CSS 属性</div>
              {selectedKf.properties.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                  <input
                    value={p.prop}
                    onChange={(e) => updateProperty(selectedKf.id, idx, 'prop', e.target.value)}
                    placeholder="CSS 属性，如 opacity"
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: 9,
                      border: `1px solid ${tk.inputBorder}`, borderRadius: 4,
                      background: tk.inputBg, color: tk.text,
                      fontFamily: "'Fira Code', monospace",
                    }}
                  />
                  <input
                    value={p.value}
                    onChange={(e) => updateProperty(selectedKf.id, idx, 'value', e.target.value)}
                    placeholder="属性值，如 1"
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: 9,
                      border: `1px solid ${tk.inputBorder}`, borderRadius: 4,
                      background: tk.inputBg, color: tk.text,
                      fontFamily: "'Fira Code', monospace",
                    }}
                  />
                  <button
                    onClick={() => deleteProperty(selectedKf.id, idx)}
                    style={{
                      padding: '2px 6px', fontSize: 9, border: 'none',
                      background: 'transparent', color: 'rgba(239,68,68,0.6)', cursor: 'pointer',
                    }}
                    title="删除该属性"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => addProperty(selectedKf.id)}
                style={{
                  fontSize: 9, color: tk.textMuted, cursor: 'pointer',
                  border: 'none', background: 'transparent', padding: '2px 0',
                }}
              >+ 添加属性</button>
            </div>
          )}

          {/* 动画参数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={fieldLabelStyle}>动画时长</div>
              <AuroraSelect
                value={anim.duration}
                onChange={(v) => setAnim(prev => ({ ...prev, duration: v }))}
                options={DURATION_OPTIONS.map(d => ({ value: d, label: d }))}
                className="aurora-select--block"
              />
            </div>
            <div>
              <div style={fieldLabelStyle}>缓动方式（速度曲线）</div>
              <AuroraSelect
                value={anim.timingFunction}
                onChange={(v) => setAnim(prev => ({ ...prev, timingFunction: v }))}
                options={TIMING_FUNCTIONS}
                className="aurora-select--block"
              />
            </div>
            <div>
              <div style={fieldLabelStyle}>播放次数</div>
              <AuroraSelect
                value={anim.iterationCount}
                onChange={(v) => setAnim(prev => ({ ...prev, iterationCount: v }))}
                options={ITERATION_OPTIONS}
                className="aurora-select--block"
              />
            </div>
          </div>

          {/* 预览 + 插入 */}
          <div>
            <div style={fieldLabelStyle}>实时预览（生成的 CSS 代码）</div>
            <div style={{
              padding: 8, borderRadius: 6, maxHeight: 100, overflowY: 'auto',
              background: tk.surface, border: `1px solid ${tk.border}`,
            }}>
              <pre style={{ fontSize: 8, color: tk.textSub, fontFamily: "'Fira Code', monospace", margin: 0, whiteSpace: 'pre-wrap' }}>
                {generateCss()}
              </pre>
            </div>
          </div>
          <StudioChip label="插入到编辑器" onClick={handleInsert} variant="accent" />
        </div>
      )}
    </div>
  )
}

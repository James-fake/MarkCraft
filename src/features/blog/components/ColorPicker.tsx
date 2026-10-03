import { useRef, useCallback, useEffect } from 'react'
import { hexToRgb, rgbToHex } from '../templates/utils'
import { useLanguage } from '@stores/LanguageStore'

interface ColorPickerProps {
  color: string
  lightness: number
  saturation: number
  sharpness: number
  onColorChange: (hex: string) => void
  onLightnessChange: (v: number) => void
  onSaturationChange: (v: number) => void
  onSharpnessChange: (v: number) => void
}

// ─── HSV ↔ Hex conversion ───────────────────────────────────

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const s = max === 0 ? 0 : d / max
  return { h: h * 360, s, v: max }
}

function hsvToHex(h: number, s: number, v: number): string {
  h = ((h % 360) + 360) % 360 / 360
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r: number, g: number, b: number
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    default: r = v; g = p; b = q; break
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hsvToPureHex(h: number): string {
  return hsvToHex(h, 1, 1)
}

// ─── SV Palette (Saturation-Value 2D area) ──────────────────

function SVPalette({ hue, color, onChange }: { hue: number; color: string; onChange: (hex: string) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const hueRef = useRef(hue)
  const posRef = useRef({ x: 0, y: 0 })

  // Keep refs in sync without causing re-renders
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { hueRef.current = hue }, [hue])

  // Calculate dot position from color (only when not dragging)
  const hsv = hexToHsv(color)
  const dotX = draggingRef.current ? posRef.current.x : hsv.s
  const dotY = draggingRef.current ? posRef.current.y : 1 - hsv.v

  const updateFromPosition = useCallback((x: number, y: number) => {
    x = Math.max(0, Math.min(1, x))
    y = Math.max(0, Math.min(1, y))
    posRef.current = { x, y }
    const s = x
    const v = 1 - y
    const hex = hsvToHex(hueRef.current, s, v)
    onChangeRef.current(hex)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    draggingRef.current = true
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    updateFromPosition(x, y)
  }, [updateFromPosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    updateFromPosition(x, y)
  }, [updateFromPosition])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const pureColor = hsvToPureHex(hue)

  return (
    <div
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width: '100%',
        height: 150,
        borderRadius: 10,
        cursor: 'crosshair',
        position: 'relative',
        background: `
          linear-gradient(to bottom, transparent, #000),
          linear-gradient(to right, #fff, ${pureColor})
        `,
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Picker dot */}
      <div style={{
        position: 'absolute',
        left: `${dotX * 100}%`,
        top: `${dotY * 100}%`,
        width: 16, height: 16,
        borderRadius: 8,
        border: '2.5px solid #fff',
        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        background: color,
      }} />
    </div>
  )
}

// ─── Hue Bar ────────────────────────────────────────────────

function HueBar({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const posRef = useRef(hue / 360)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const updateFromPosition = useCallback((x: number) => {
    x = Math.max(0, Math.min(1, x))
    posRef.current = x
    onChangeRef.current(Math.round(x * 360))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const bar = barRef.current
    if (!bar) return
    bar.setPointerCapture(e.pointerId)
    draggingRef.current = true
    const rect = bar.getBoundingClientRect()
    updateFromPosition((e.clientX - rect.left) / rect.width)
  }, [updateFromPosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const bar = barRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    updateFromPosition((e.clientX - rect.left) / rect.width)
  }, [updateFromPosition])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const thumbX = draggingRef.current ? posRef.current : hue / 360

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width: '100%', height: 14, borderRadius: 7, cursor: 'pointer',
        position: 'relative',
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <div style={{
        position: 'absolute', left: `${thumbX * 100}%`, top: -2,
        width: 8, height: 18, borderRadius: 4,
        background: '#fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.3)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── Slider Row ─────────────────────────────────────────────

// Fixed accent for the picker's own chrome (slider thumbs / labels).
// This is intentionally NOT derived from the selected color so the menu
// chrome stays stable while the user picks a color — only the blog preview reacts.
const PICKER_ACCENT = '#a78bfa'

function SliderRow({ label, value, min, max, onChange, trackGradient, labelWidth = 30 }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void; trackGradient?: string; labelWidth?: number
}) {
  return (
    <div className="mc-slider" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* 标签采用固定宽度 + 右对齐，使所有标签的右边缘与滑块齐平，
          无论单字（R/G/B）还是双字中文（深浅/饱和/锐化）都对齐一致 */}
      <span style={{
        flexShrink: 0,
        width: labelWidth,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.72)',
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, position: 'relative' }}>
        <input type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%', height: 8, appearance: 'none', WebkitAppearance: 'none',
            borderRadius: 4, outline: 'none', cursor: 'pointer',
            background: trackGradient || 'linear-gradient(to right, #3f3f46, #71717a)',
          }}
        />
      </div>
      <span style={{
        flexShrink: 0,
        width: 30,
        textAlign: 'right',
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {value}
      </span>
    </div>
  )
}

// 带文字的分组分隔条，用于建立清晰的区域层次（颜色微调 / RGB 通道）
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.08em',
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
        whiteSpace: 'nowrap',
      }}>
        {text}
      </span>
      <span style={{
        flex: 1, height: 1,
        background: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)',
      }} />
    </div>
  )
}

// ─── Main ColorPicker ───────────────────────────────────────

export default function ColorPicker({
  color, lightness, saturation, sharpness,
  onColorChange, onLightnessChange, onSaturationChange, onSharpnessChange,
}: ColorPickerProps) {
  const { t } = useLanguage()
  const hsv = hexToHsv(color)
  const rgb = hexToRgb(color)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Scoped slider-thumb styling: only affects .mc-slider inputs inside this
          picker, never leaks to other panels' range inputs. Uses a FIXED accent
          so the picker's own chrome never follows the selected color. */}
      <style>{`
        .mc-slider input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${PICKER_ACCENT}; border: 2.5px solid rgba(10,10,16,0.9); box-shadow: 0 0 0 1px ${PICKER_ACCENT}30, 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; transition: box-shadow 0.15s ease; }
        .mc-slider input[type=range]::-webkit-slider-thumb:hover { box-shadow: 0 0 0 2px ${PICKER_ACCENT}40, 0 2px 8px rgba(0,0,0,0.4); }
        .mc-slider input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${PICKER_ACCENT}; border: 2.5px solid rgba(10,10,16,0.9); cursor: pointer; }
      `}</style>

      {/* SV Palette */}
      <SVPalette hue={hsv.h} color={color} onChange={onColorChange} />

      {/* Hue Bar */}
      <HueBar hue={hsv.h} onChange={(h) => {
        const newHex = hsvToHex(h, hsv.s, hsv.v)
        onColorChange(newHex)
      }} />

      {/* Color Preview + Hex Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: color, flexShrink: 0,
          boxShadow: `0 0 0 2px rgba(10,10,16,0.8), 0 0 0 4px ${color}25, 0 0 16px ${color}15`,
          transition: 'all 0.15s ease',
        }} />
        <input type="text" value={color.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onColorChange(v)
          }}
          style={{
            flex: 1, padding: '7px 12px', fontSize: 12, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
            color: '#e4e4e7', fontFamily: "'JetBrains Mono', monospace",
            outline: 'none', transition: 'border-color 0.2s ease',
            letterSpacing: '0.03em',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        />
      </div>

      {/* Color Adjustment Sliders: 深浅 / 饱和 / 锐化
          Track gradients are FIXED (neutral ramps) so the menu's own slider
          backgrounds never follow the selected color — only the blog preview does. */}
      <SectionLabel text={t.blogCss.colorFineTune} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SliderRow
          label={t.blogCss.colorLightness}
          value={lightness}
          min={0} max={100}
          onChange={onLightnessChange}
          trackGradient="linear-gradient(to right, #1a1a1a, #808080, #f5f5f5)"
        />
        <SliderRow
          label={t.blogCss.colorSaturation}
          value={saturation}
          min={0} max={200}
          onChange={onSaturationChange}
          trackGradient="linear-gradient(to right, #555, #d4d4d8)"
        />
        <SliderRow
          label={t.blogCss.colorSharpness}
          value={sharpness}
          min={0} max={200}
          onChange={onSharpnessChange}
          trackGradient="linear-gradient(to right, #555, #d4d4d8)"
        />
      </div>

      {/* RGB Channel Sliders */}
      <SectionLabel text={t.blogCss.colorRgbChannels} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SliderRow
          label="R"
          value={rgb.r}
          min={0} max={255}
          onChange={(v) => onColorChange(rgbToHex(v, rgb.g, rgb.b))}
          trackGradient="linear-gradient(to right, #000, #ff0000)"
        />
        <SliderRow
          label="G"
          value={rgb.g}
          min={0} max={255}
          onChange={(v) => onColorChange(rgbToHex(rgb.r, v, rgb.b))}
          trackGradient="linear-gradient(to right, #000, #00ff00)"
        />
        <SliderRow
          label="B"
          value={rgb.b}
          min={0} max={255}
          onChange={(v) => onColorChange(rgbToHex(rgb.r, rgb.g, v))}
          trackGradient="linear-gradient(to right, #000, #0000ff)"
        />
      </div>
    </div>
  )
}

/**
 * Color scheme processing — color schemes, custom color logic,
 * font configuration, and layout defaults
 */

import type { BlogConfig } from '../../templates'

export interface ColorScheme {
  primary: string
  secondary: string
  accent: string
  primaryLight: string
  secondaryLight: string
  accentLight: string
}

export interface FontSet {
  heading: string
  body: string
  mono: string
}

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  red: { primary: '#FF0000', secondary: '#FF4500', accent: '#FF00FF', primaryLight: 'rgba(255,0,0,0.06)', secondaryLight: 'rgba(255,69,0,0.04)', accentLight: 'rgba(255,0,255,0.04)' },
  'orange-red': { primary: '#FF4500', secondary: '#FF0000', accent: '#FF8C00', primaryLight: 'rgba(255,69,0,0.06)', secondaryLight: 'rgba(255,0,0,0.04)', accentLight: 'rgba(255,140,0,0.04)' },
  orange: { primary: '#FF8C00', secondary: '#FF4500', accent: '#FFC800', primaryLight: 'rgba(255,140,0,0.06)', secondaryLight: 'rgba(255,69,0,0.04)', accentLight: 'rgba(255,200,0,0.04)' },
  'orange-yellow': { primary: '#FFC800', secondary: '#FF8C00', accent: '#FFFF00', primaryLight: 'rgba(255,200,0,0.06)', secondaryLight: 'rgba(255,140,0,0.04)', accentLight: 'rgba(255,255,0,0.04)' },
  yellow: { primary: '#FFFF00', secondary: '#FFC800', accent: '#ADFF2F', primaryLight: 'rgba(255,255,0,0.06)', secondaryLight: 'rgba(255,200,0,0.04)', accentLight: 'rgba(173,255,47,0.04)' },
  'yellow-green': { primary: '#ADFF2F', secondary: '#FFFF00', accent: '#00FF00', primaryLight: 'rgba(173,255,47,0.06)', secondaryLight: 'rgba(255,255,0,0.04)', accentLight: 'rgba(0,255,0,0.04)' },
  green: { primary: '#00FF00', secondary: '#ADFF2F', accent: '#00CED1', primaryLight: 'rgba(0,255,0,0.06)', secondaryLight: 'rgba(173,255,47,0.04)', accentLight: 'rgba(0,206,209,0.04)' },
  'blue-green': { primary: '#00CED1', secondary: '#00FF00', accent: '#0000FF', primaryLight: 'rgba(0,206,209,0.06)', secondaryLight: 'rgba(0,255,0,0.04)', accentLight: 'rgba(0,0,255,0.04)' },
  blue: { primary: '#0000FF', secondary: '#00CED1', accent: '#4B0082', primaryLight: 'rgba(0,0,255,0.06)', secondaryLight: 'rgba(0,206,209,0.04)', accentLight: 'rgba(75,0,130,0.04)' },
  'blue-purple': { primary: '#4B0082', secondary: '#0000FF', accent: '#8B00FF', primaryLight: 'rgba(75,0,130,0.06)', secondaryLight: 'rgba(0,0,255,0.04)', accentLight: 'rgba(139,0,255,0.04)' },
  purple: { primary: '#8B00FF', secondary: '#4B0082', accent: '#FF00FF', primaryLight: 'rgba(139,0,255,0.06)', secondaryLight: 'rgba(75,0,130,0.04)', accentLight: 'rgba(255,0,255,0.04)' },
  'purple-red': { primary: '#FF00FF', secondary: '#8B00FF', accent: '#FF0000', primaryLight: 'rgba(255,0,255,0.06)', secondaryLight: 'rgba(139,0,255,0.04)', accentLight: 'rgba(255,0,0,0.04)' },
}

const FONT_FAMILIES: Record<string, FontSet> = {
  serif: { heading: "'Playfair Display', 'Noto Serif SC', Georgia, serif", body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
  sans: { heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
  mono: { heading: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
}

/** Shift hue of a hex color by given degrees */
function hueShift(hex: string, degrees: number): string {
  const rr = parseInt(hex.slice(1, 3), 16) / 255
  const gg = parseInt(hex.slice(3, 5), 16) / 255
  const bb = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rr: h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6; break
      case gg: h = ((bb - rr) / d + 2) / 6; break
      case bb: h = ((rr - gg) / d + 4) / 6; break
    }
  }
  const newH = ((h * 360 + degrees) % 360 + 360) % 360 / 360
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q
    if (t < 2/3) return p + (q-p)*(2/3-t)*6; return p
  }
  let nr: number, ng: number, nb: number
  if (s === 0) { nr = ng = nb = l } else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s; const p = 2*l-q
    nr = hue2rgb(p,q,newH+1/3); ng = hue2rgb(p,q,newH); nb = hue2rgb(p,q,newH-1/3)
  }
  const toHex = (v: number) => Math.round(v*255).toString(16).padStart(2,'0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}

/** Adjust lightness of a hex color (50 = default) */
function adjustLightness(hex: string, l: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const ll = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = ll > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const newL = Math.min(0.95, Math.max(0.05, ll + (l - 50) / 100))
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q
    if (t < 2/3) return p + (q-p)*(2/3-t)*6; return p
  }
  let rr: number, gg: number, bb: number
  if (s === 0) { rr = gg = bb = newL } else {
    const q = newL < 0.5 ? newL*(1+s) : newL+s-newL*s; const p = 2*newL-q
    rr = hue2rgb(p,q,h+1/3); gg = hue2rgb(p,q,h); bb = hue2rgb(p,q,h-1/3)
  }
  const toHex = (v: number) => Math.round(v*255).toString(16).padStart(2,'0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

/** Adjust saturation of a hex color (100 = default) */
function adjustSaturation(hex: string, sat: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const factor = sat / 100
  const newS = Math.min(1, Math.max(0, s * factor))
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q
    if (t < 2/3) return p + (q-p)*(2/3-t)*6; return p
  }
  let rr: number, gg: number, bb: number
  if (newS === 0) { rr = gg = bb = l } else {
    const q = l < 0.5 ? l*(1+newS) : l+newS-l*newS; const p = 2*l-q
    rr = hue2rgb(p,q,h+1/3); gg = hue2rgb(p,q,h); bb = hue2rgb(p,q,h-1/3)
  }
  const toHex = (v: number) => Math.round(v*255).toString(16).padStart(2,'0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

/** Adjust sharpness/vibrancy of a hex color (100 = default) */
function adjustSharpness(hex: string, sharp: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  const factor = sharp / 100
  let newS = s
  if (factor > 1) {
    const satBoost = (1 - s) * (factor - 1) * 0.5
    newS = Math.min(1, s + satBoost)
    const lShift = (0.5 - l) * (factor - 1) * 0.2
    l = Math.max(0.05, Math.min(0.95, l + lShift))
  } else {
    newS = s * factor
    const lShift = (0.5 - l) * (1 - factor) * 0.3
    l = Math.max(0.05, Math.min(0.95, l + lShift))
  }
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q-p)*6*t; if (t < 1/2) return q
    if (t < 2/3) return p + (q-p)*(2/3-t)*6; return p
  }
  let rr: number, gg: number, bb: number
  if (newS === 0) { rr = gg = bb = l } else {
    const q = l < 0.5 ? l*(1+newS) : l+newS-l*newS; const p = 2*l-q
    rr = hue2rgb(p,q,h+1/3); gg = hue2rgb(p,q,h); bb = hue2rgb(p,q,h-1/3)
  }
  const toHex = (v: number) => Math.round(v*255).toString(16).padStart(2,'0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

/**
 * Resolve the final color scheme from config, applying custom color,
 * lightness, saturation, and sharpness adjustments.
 */
export function resolveColorScheme(config: BlogConfig): ColorScheme {
  let colors = COLOR_SCHEMES[config.colorScheme] || COLOR_SCHEMES.red

  // 支持自定义颜色
  if (config.colorScheme === 'custom' && config.customColor) {
    const cc = config.customColor
    const r = parseInt(cc.slice(1, 3), 16)
    const g = parseInt(cc.slice(3, 5), 16)
    const b = parseInt(cc.slice(5, 7), 16)
    const secondary = hueShift(cc, 30)
    const accent = hueShift(cc, -30)
    colors = {
      primary: cc,
      secondary,
      accent,
      primaryLight: `rgba(${r},${g},${b},0.06)`,
      secondaryLight: `rgba(${parseInt(secondary.slice(1,3),16)},${parseInt(secondary.slice(3,5),16)},${parseInt(secondary.slice(5,7),16)},0.04)`,
      accentLight: `rgba(${parseInt(accent.slice(1,3),16)},${parseInt(accent.slice(3,5),16)},${parseInt(accent.slice(5,7),16)},0.04)`,
    }
  }

  // 根据 colorLightness 调整主色调深浅
  const lightness = config.colorLightness ?? 50
  if (lightness !== 50) {
    colors.primary = adjustLightness(colors.primary, lightness)
    colors.secondary = adjustLightness(colors.secondary, lightness)
    colors.accent = adjustLightness(colors.accent, lightness)
  }

  // 根据 colorSaturation 调整饱和度（100 = 默认）
  const saturation = config.colorSaturation ?? 100
  if (saturation !== 100) {
    colors.primary = adjustSaturation(colors.primary, saturation)
    colors.secondary = adjustSaturation(colors.secondary, saturation)
    colors.accent = adjustSaturation(colors.accent, saturation)
  }

  // 根据 colorSharpness 调整锐度/鲜艳度（100 = 默认）
  const sharpness = config.colorSharpness ?? 100
  if (sharpness !== 100) {
    colors.primary = adjustSharpness(colors.primary, sharpness)
    colors.secondary = adjustSharpness(colors.secondary, sharpness)
    colors.accent = adjustSharpness(colors.accent, sharpness)
  }

  return colors
}

/**
 * Resolve font set from config.
 */
export function resolveFonts(config: BlogConfig): FontSet {
  return FONT_FAMILIES[config.font] || FONT_FAMILIES.serif
}

/**
 * Resolve layout from config.
 */
export function resolveLayout(config: BlogConfig): string {
  return config.layout || 'magazine'
}

/**
 * Generate custom color override CSS for new themes.
 */
export function generateCustomColorOverrideCss(config: BlogConfig): string {
  if (config.colorScheme !== 'custom' || !config.customColor) return ''
  const cc = config.customColor
  const r = parseInt(cc.slice(1, 3), 16)
  const g = parseInt(cc.slice(3, 5), 16)
  const b = parseInt(cc.slice(5, 7), 16)
  const accent2 = hueShift(cc, 30)
  return `
:root {
  --accent: ${cc} !important;
  --accent2: ${accent2} !important;
  --accent-rgb: ${r},${g},${b};
}
a, .nav-link.active, .card:hover .card-title, .tag, .back-link:hover { color: ${cc}; }
.tag { background: rgba(${r},${g},${b},0.08); border-color: rgba(${r},${g},${b},0.15); }
.nav-link.active { border-bottom-color: ${cc}; }
`
}

/** 调整 HEX 颜色的明度，lightness 0-100，50=原色 */
export function adjustColorLightness(hex: string, lightness: number): string {
  // 将 hex 转为 HSL，调整 L 值
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
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

  // lightness: 50 = 原始, 0 = 最深, 100 = 最浅
  // 映射到 HSL 的 L 值：原始 L 在 lightness=50 时保持不变
  const newL = Math.min(0.95, Math.max(0.05, l + (lightness - 50) / 100))

  // HSL 转 RGB
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let rr: number, gg: number, bb: number
  if (s === 0) {
    rr = gg = bb = newL
  } else {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s
    const p = 2 * newL - q
    rr = hue2rgb(p, q, h + 1 / 3)
    gg = hue2rgb(p, q, h)
    bb = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

export function adjustColorSaturation(hex: string, saturation: number): string {
  // saturation: 100 = original, 0 = grayscale, 200 = oversaturated
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
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

  const newS = Math.min(1, Math.max(0, s * saturation / 100))

  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let rr: number, gg: number, bb: number
  if (newS === 0) {
    rr = gg = bb = l
  } else {
    const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS
    const p = 2 * l - q
    rr = hue2rgb(p, q, h + 1 / 3)
    gg = hue2rgb(p, q, h)
    bb = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`
}

export function adjustColorSharpness(hex: string, sharpness: number): string {
  // sharpness: 100 = default, 0 = muted/flat, 200 = vivid/punchy
  if (sharpness === 100) return hex
  const hsl = hexToHsl(hex)
  const factor = sharpness / 100
  let newS = hsl.s
  let newL = hsl.l
  if (factor > 1) {
    // Increase vibrance: boost saturation more for less saturated colors, push L toward 50%
    const satBoost = (100 - hsl.s) * (factor - 1) * 0.5
    newS = Math.min(100, hsl.s + satBoost)
    const lShift = (50 - hsl.l) * (factor - 1) * 0.2
    newL = Math.max(5, Math.min(95, hsl.l + lShift))
  } else {
    // Decrease vibrance: reduce saturation, push L toward 50%
    newS = hsl.s * factor
    const lShift = (50 - hsl.l) * (1 - factor) * 0.3
    newL = Math.max(5, Math.min(95, hsl.l + lShift))
  }
  return hslToHex(hsl.h, newS, newL)
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
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
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

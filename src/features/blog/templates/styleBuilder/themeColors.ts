import { adjustColorLightness, adjustColorSaturation, adjustColorSharpness } from '../colorUtils'

export interface ThemeColors {
  accent: string
  accentLight: string
  isDark: boolean
}

const ACCENT_COLORS: Record<string, { light: string; dark: string; lightBg: string; darkBg: string }> = {
  red:            { light: '#FF0000', dark: '#FF4444', lightBg: 'rgba(255,0,0,0.04)',    darkBg: 'rgba(255,68,68,0.08)' },
  'orange-red':   { light: '#FF4500', dark: '#FF6633', lightBg: 'rgba(255,69,0,0.04)',   darkBg: 'rgba(255,102,51,0.08)' },
  orange:         { light: '#FF8C00', dark: '#FFA033', lightBg: 'rgba(255,140,0,0.04)',  darkBg: 'rgba(255,160,51,0.08)' },
  'orange-yellow':{ light: '#FFC800', dark: '#FFD633', lightBg: 'rgba(255,200,0,0.04)', darkBg: 'rgba(255,214,51,0.08)' },
  yellow:         { light: '#CCCC00', dark: '#E6E633', lightBg: 'rgba(204,204,0,0.04)',  darkBg: 'rgba(230,230,51,0.08)' },
  'yellow-green': { light: '#7CB342', dark: '#9CCC65', lightBg: 'rgba(173,255,47,0.04)',darkBg: 'rgba(156,204,101,0.08)' },
  green:          { light: '#00CC00', dark: '#33CC33', lightBg: 'rgba(0,255,0,0.04)',    darkBg: 'rgba(51,204,51,0.08)' },
  'blue-green':   { light: '#00B5B5', dark: '#33CCCC', lightBg: 'rgba(0,206,209,0.04)', darkBg: 'rgba(51,204,204,0.08)' },
  blue:           { light: '#0000FF', dark: '#4444FF', lightBg: 'rgba(0,0,255,0.04)',    darkBg: 'rgba(68,68,255,0.08)' },
  'blue-purple':  { light: '#5C2D91', dark: '#7B52AB', lightBg: 'rgba(75,0,130,0.04)',   darkBg: 'rgba(123,82,171,0.08)' },
  purple:         { light: '#8B00FF', dark: '#A033FF', lightBg: 'rgba(139,0,255,0.04)',  darkBg: 'rgba(160,51,255,0.08)' },
  'purple-red':   { light: '#FF00FF', dark: '#FF44FF', lightBg: 'rgba(255,0,255,0.04)',  darkBg: 'rgba(255,68,255,0.08)' },
}

export function resolveThemeColors(config: { theme: string; colorScheme: string; customColor?: string; colorLightness?: number; colorSaturation?: number; colorSharpness?: number }): ThemeColors {
  const isDark = config.theme === 'dark'

  const scheme = ACCENT_COLORS[config.colorScheme] || ACCENT_COLORS.red
  let accent = isDark ? scheme.dark : scheme.light
  const accentLight = isDark ? scheme.darkBg : scheme.lightBg

  // Support custom color
  if (config.colorScheme === 'custom' && config.customColor) {
    accent = config.customColor
  }

  // 根据 colorLightness 调整主色调深浅（50 = 默认，<50 更深，>50 更浅）
  const lightness = config.colorLightness ?? 50
  if (lightness !== 50) {
    accent = adjustColorLightness(accent, lightness)
  }

  // 根据 colorSaturation 调整饱和度（100 = 默认）
  const saturation = config.colorSaturation ?? 100
  if (saturation !== 100) {
    accent = adjustColorSaturation(accent, saturation)
  }

  // 根据 colorSharpness 调整锐度/鲜艳度（100 = 默认）
  const sharpness = config.colorSharpness ?? 100
  if (sharpness !== 100) {
    accent = adjustColorSharpness(accent, sharpness)
  }

  return { accent, accentLight, isDark }
}

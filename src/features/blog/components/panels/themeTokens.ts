import { useStudioTheme } from '../StudioControls'

/**
 * Theme token definitions for CSS panel components.
 * Usage: const tk = useThemeTokens()
 * Then use tk.text, tk.border, etc. in inline styles.
 */
export interface ThemeTokens {
  bg: string
  border: string
  text: string
  textSub: string
  textMuted: string
  textFaint: string
  inputBg: string
  inputBorder: string
  surface: string
  accent: string
  accentBg: string
  accentBorder: string
  accentText: string
  errorColor: string
  warningColor: string
  infoColor: string
  codeColor: string
  selectorColor: string
  propertyColor: string
  valueColor: string
  commentColor: string
}

const darkTokens: ThemeTokens = {
  bg: 'rgba(10,10,16,0.95)',
  border: 'rgba(255,255,255,0.08)',
  text: '#e4e4e7',
  textSub: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  textFaint: 'rgba(255,255,255,0.2)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.08)',
  surface: 'rgba(255,255,255,0.02)',
  accent: '#34d399',
  accentBg: 'rgba(52,211,153,0.1)',
  accentBorder: 'rgba(52,211,153,0.5)',
  accentText: '#34d399',
  errorColor: 'rgba(239,68,68,0.85)',
  warningColor: 'rgba(245,158,11,0.85)',
  infoColor: 'rgba(96,165,250,0.85)',
  codeColor: '#34d399',
  selectorColor: '#a78bfa',
  propertyColor: '#7dd3fc',
  valueColor: '#c4b5fd',
  commentColor: 'rgba(255,255,255,0.25)',
}

const lightTokens: ThemeTokens = {
  bg: 'rgba(255,255,255,0.97)',
  border: 'rgba(0,0,0,0.08)',
  text: '#1a1a1a',
  textSub: 'rgba(0,0,0,0.6)',
  textMuted: 'rgba(0,0,0,0.35)',
  textFaint: 'rgba(0,0,0,0.2)',
  inputBg: 'rgba(0,0,0,0.03)',
  inputBorder: 'rgba(0,0,0,0.08)',
  surface: 'rgba(0,0,0,0.02)',
  accent: '#059669',
  accentBg: 'rgba(5,150,105,0.08)',
  accentBorder: 'rgba(5,150,105,0.4)',
  accentText: '#059669',
  errorColor: '#dc2626',
  warningColor: '#d97706',
  infoColor: '#2563eb',
  codeColor: '#059669',
  selectorColor: '#7c3aed',
  propertyColor: '#0369a1',
  valueColor: '#6d28d9',
  commentColor: 'rgba(0,0,0,0.3)',
}

export function useThemeTokens(): ThemeTokens {
  const { isDark } = useStudioTheme()
  return isDark ? darkTokens : lightTokens
}

export function getTokensForMode(isDark: boolean): ThemeTokens {
  return isDark ? darkTokens : lightTokens
}

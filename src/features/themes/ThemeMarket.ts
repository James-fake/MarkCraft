import { importThemeCSS, sanitizeThemeCSS, saveCustomTheme, applyTheme, type EditorTheme } from './ThemeManager'
import { platform } from '@platform'

/**
 * B2：主题市场远程拉取。
 * 市场清单为 JSON 数组（或 { themes: [...] }），每条含 id/name/css。
 * 拉取后复用 importThemeCSS 解析为 EditorTheme；应用前强制净化（见 installMarketTheme）。
 */

/** 默认市场地址（留空表示未配置，用户在面板中填写） */
export const DEFAULT_THEME_MARKET_ENDPOINT = ''

export interface MarketThemeMeta {
  id: string
  name: string
  type?: 'light' | 'dark'
  css: string
  author?: string
}

export async function fetchMarketThemes(endpoint: string): Promise<EditorTheme[]> {
  const url = endpoint.trim()
  if (!url) throw new Error('主题市场地址未配置')

  // P6：桌面端经主进程拉取（无 CORS）；浏览器端直连（mode: 'cors' 仅浏览器有意义）
  const res = await platform.net.fetch(url, platform.kind === 'browser' ? { mode: 'cors' } : undefined)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as MarketThemeMeta[] | { themes?: MarketThemeMeta[] }
  const list = Array.isArray(data) ? data : data.themes ?? []

  return list.map((m, i) => {
    const theme = importThemeCSS(m.css, m.name)
    theme.id = `market_${m.id || `t${i}`}`
    theme.isBuiltIn = false
    if (m.type) theme.type = m.type
    theme.customCSS = m.css
    return theme
  })
}

/** 净化后落库并应用（B2 安全加固：远程主题强制净化，避免 @import/url()/javascript: 注入） */
export function installMarketTheme(theme: EditorTheme): void {
  const safe: EditorTheme = {
    ...theme,
    customCSS: theme.customCSS ? sanitizeThemeCSS(theme.customCSS) : undefined,
  }
  saveCustomTheme(safe)
  applyTheme(safe.id)
}

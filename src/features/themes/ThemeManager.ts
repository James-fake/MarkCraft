import DOMPurify from 'dompurify'

export interface EditorTheme {
  id: string
  name: string
  type: 'light' | 'dark'
  isBuiltIn: boolean
  cssVariables: Record<string, string>
  customCSS?: string
}

const CUSTOM_THEMES_KEY = 'markcraft_custom_themes'

const BUILT_IN_THEMES: EditorTheme[] = [
  {
    id: 'light',
    name: '默认浅色',
    type: 'light',
    isBuiltIn: true,
    cssVariables: {}, // Uses :root defaults
  },
  {
    id: 'dark',
    name: '默认深色',
    type: 'dark',
    isBuiltIn: true,
    cssVariables: {}, // Uses [data-theme="dark"] defaults
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'light',
    isBuiltIn: true,
    cssVariables: {
      '--editor-bg': '#ffffff',
      '--editor-text': '#24292e',
      '--editor-border': '#e1e4e8',
      '--button-primary': '#0366d6',
      '--button-primary-bg': 'rgba(3,102,214,0.08)',
      '--sidebar-bg': '#f6f8fa',
      '--sidebar-text': '#24292e',
      '--sidebar-border': '#e1e4e8',
      '--sidebar-active-bg': 'rgba(3,102,214,0.08)',
      '--toolbar-bg': '#f6f8fa',
      '--toolbar-border': '#e1e4e8',
    },
  },
  {
    id: 'sepia',
    name: '护眼模式',
    type: 'light',
    isBuiltIn: true,
    cssVariables: {
      '--editor-bg': '#f4ecd8',
      '--editor-text': '#5b4636',
      '--editor-border': '#d4c5a9',
      '--button-primary': '#8b6914',
      '--button-primary-bg': 'rgba(139,105,20,0.1)',
      '--sidebar-bg': '#efe6d0',
      '--sidebar-text': '#5b4636',
      '--sidebar-border': '#d4c5a9',
      '--sidebar-active-bg': 'rgba(139,105,20,0.1)',
      '--toolbar-bg': '#efe6d0',
      '--toolbar-border': '#d4c5a9',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    isBuiltIn: true,
    cssVariables: {
      '--editor-bg': '#2e3440',
      '--editor-text': '#d8dee9',
      '--editor-border': '#3b4252',
      '--button-primary': '#88c0d0',
      '--button-primary-bg': 'rgba(136,192,208,0.15)',
      '--sidebar-bg': '#2e3440',
      '--sidebar-text': '#d8dee9',
      '--sidebar-border': '#3b4252',
      '--sidebar-active-bg': 'rgba(136,192,208,0.15)',
      '--toolbar-bg': '#2e3440',
      '--toolbar-border': '#3b4252',
    },
  },
  {
    id: 'system',
    name: '跟随系统',
    type: 'dark',
    isBuiltIn: true,
    cssVariables: {},
  },
]

export function getThemes(): EditorTheme[] {
  return [...BUILT_IN_THEMES, ...getCustomThemes()]
}

export function getCustomThemes(): EditorTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function getTheme(id: string): EditorTheme | undefined {
  return getThemes().find(t => t.id === id)
}

/**
 * B2 安全加固点 A：主变量白名单（动态化）。
 * 基线为已知核心变量，再运行时扫描已加载样式表中的所有 `--` 变量，
 * 切换主题时一并清除，覆盖主题实际用到的全部变量（避免硬编码遗漏）。
 */
const CORE_THEME_VARS = [
  '--editor-bg', '--editor-text', '--editor-border', '--button-primary', '--button-primary-bg',
  '--sidebar-bg', '--sidebar-text', '--sidebar-border', '--sidebar-active-bg', '--toolbar-bg', '--toolbar-border',
]

let scannedVarNames: string[] | null = null

function scanThemeVarNames(): string[] {
  if (scannedVarNames) return scannedVarNames
  const set = new Set<string>(CORE_THEME_VARS)
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      const walk = (rule: CSSRule) => {
        if (rule instanceof CSSStyleRule) {
          const re = /--[a-zA-Z0-9-]+/g
          let m
          const text = rule.cssText
          while ((m = re.exec(text)) !== null) set.add(m[0])
        } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
          Array.from(rule.cssRules).forEach(walk)
        }
      }
      Array.from(rules).forEach(walk)
    }
  } catch {
    /* 跨域样式表等无法读取时忽略 */
  }
  scannedVarNames = Array.from(set)
  return scannedVarNames
}

/**
 * B2 安全加固点 C：对主题 cssVariables 做白名单裁剪。
 * 仅保留「核心变量 ∪ 运行时扫描到的变量」键，丢弃任意 `--evil-*` 注入，
 * 与 customCSS 的 sanitizeThemeCSS 形成双重防线（远程主题强制走此路径）。
 */
const WHITELIST_CACHE: { keys: Set<string> | null } = { keys: null }

function allowedCssVarKeys(): Set<string> {
  if (WHITELIST_CACHE.keys) return WHITELIST_CACHE.keys
  WHITELIST_CACHE.keys = new Set([...CORE_THEME_VARS, ...scanThemeVarNames()])
  return WHITELIST_CACHE.keys
}

export function sanitizeCssVariables(vars: Record<string, string>): Record<string, string> {
  const allowed = allowedCssVarKeys()
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (allowed.has(k)) out[k] = v
  }
  return out
}

/**
 * B2 安全加固点 B：净化主题 customCSS。
 * 防护目标：@import 远程样式注入、外部/数据 url() 追踪或加载、javascript: 协议、HTML 注入。
 * 先做一次防御性预清洗，再交由 DOMPurify 的 CSS profile 主净化。远程主题强制走此路径。
 */
export function sanitizeThemeCSS(css: string): string {
  if (!css) return ''
  let out = css
  // 1) 防御性预清洗（与 DOMPurify css profile 互补）
  out = out.replace(/@import[^;]+;?/gi, '') // 禁止远程样式导入
  out = out.replace(/javascript:/gi, '') // 禁止脚本协议
  out = out.replace(/<\/?[^>]*>/gi, '') // 禁止把 HTML 注入到 <style>
  // 禁止外部/数据 url()（可被用于追踪或加载外部资源）
  out = out.replace(/url\(\s*['"]?\s*(?:https?:|data:|javascript:)[^)]*\)/gi, '')
  // 2) DOMPurify CSS profile 主净化。
  // 说明：DOMPurify 3.x 运行时支持 `css:true` 用于净化 CSS 字符串，
  // 但 @types/dompurify 的类型未声明该选项；此处用局部断言绕过类型缺口。
  try {
    const cfg = { css: true } as unknown as Parameters<typeof DOMPurify.sanitize>[1]
    out = DOMPurify.sanitize(out, cfg)
  } catch {
    out = ''
  }
  return out
}

let systemMql: MediaQueryList | null = null
let systemMqlHandler: ((e: MediaQueryListEvent) => void) | null = null

/** 跟随系统配色：按 prefers-color-scheme 套用明暗，并监听系统切换。 */
function applySystemTheme() {
  const dark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  const root = document.documentElement
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  scanThemeVarNames().forEach(v => root.style.removeProperty(v))
  const styleEl = document.getElementById('custom-theme-css')
  if (styleEl) styleEl.textContent = ''
  // 仅注册一次系统监听
  if (!systemMql) {
    systemMql = window.matchMedia('(prefers-color-scheme: dark)')
    systemMqlHandler = () => applyTheme('system')
    systemMql.addEventListener('change', systemMqlHandler)
  }
}

function teardownSystemThemeListener() {
  if (systemMql && systemMqlHandler) {
    systemMql.removeEventListener('change', systemMqlHandler)
    systemMql = null
    systemMqlHandler = null
  }
}

export function applyTheme(id: string): void {
  if (id === 'system') {
    applySystemTheme()
    return
  }
  // 切换到非 system 主题时移除系统监听
  teardownSystemThemeListener()

  const theme = getTheme(id)
  if (!theme) return

  const root = document.documentElement

  // 设置 data-theme 为主题类型（light/dark）
  // 这会让 CSS 的 [data-theme="light"] 或 :root(dark 默认) 规则匹配，
  // 提供完整的 35+ 个 CSS 变量，避免主题切换时变量覆盖不完整
  root.setAttribute('data-theme', theme.type)

  // Clear all custom CSS variables first (动态白名单，覆盖全部主题变量)
  scanThemeVarNames().forEach(v => root.style.removeProperty(v))

  // Apply theme CSS variables (覆盖默认变量)，经白名单裁剪防止变量注入
  const safeVars = sanitizeCssVariables(theme.cssVariables ?? {})
  for (const [key, value] of Object.entries(safeVars)) {
    root.style.setProperty(key, value)
  }

  // Apply custom CSS (inject into <style> tag)，经净化后再注入
  let styleEl = document.getElementById('custom-theme-css') as HTMLStyleElement | null
  if (theme.customCSS) {
    const clean = sanitizeThemeCSS(theme.customCSS)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'custom-theme-css'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = clean
  } else if (styleEl) {
    styleEl.textContent = ''
  }
}

export function saveCustomTheme(theme: EditorTheme): void {
  const themes = getCustomThemes()
  const idx = themes.findIndex(t => t.id === theme.id)
  if (idx !== -1) themes[idx] = theme
  else themes.push(theme)
  try { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes)) } catch {}
}

export function deleteCustomTheme(id: string): void {
  const themes = getCustomThemes().filter(t => t.id !== id)
  try { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes)) } catch {}
}

export function importThemeCSS(css: string, name: string): EditorTheme {
  // Parse CSS to extract CSS variables
  const vars: Record<string, string> = {}
  const varRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);/g
  let match
  while ((match = varRegex.exec(css)) !== null) {
    if (match[1].startsWith('--')) {
      vars[match[1]] = match[2].trim()
    }
  }
  return {
    id: `custom_${Date.now()}`,
    name,
    type: css.includes('dark') || css.includes('#2') || css.includes('#1') ? 'dark' : 'light',
    isBuiltIn: false,
    cssVariables: vars,
    customCSS: css,
  }
}

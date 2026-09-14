import { describe, it, expect, afterEach } from 'vitest'
import {
  sanitizeThemeCSS,
  applyTheme,
  saveCustomTheme,
  getCustomThemes,
  deleteCustomTheme,
} from '../ThemeManager'

describe('ThemeManager 安全加固 (B2)', () => {
  afterEach(() => {
    // 清理注入的样式与自定义主题
    const el = document.getElementById('custom-theme-css')
    if (el) el.remove()
    deleteCustomTheme('evil-b2')
    document.documentElement.removeAttribute('data-theme')
    Array.from(document.documentElement.style).forEach((p) => document.documentElement.style.removeProperty(p))
  })

  it('sanitizeThemeCSS 剥离 @import / 外部 url() / javascript: / HTML 标签', () => {
    const evil = [
      `@import url('https://evil.com/x.css');`,
      `:root{ --editor-bg: red; }`,
      `body{ background: url('https://track.com/a.png'); }`,
      `.x{ behavior: url('https://evil.com/b.htc'); }`,
      `a{ color: expression(alert(1)); }`,
    ].join('\n')
    const clean = sanitizeThemeCSS(evil)
    expect(clean).not.toContain('@import')
    expect(clean).not.toContain('https://evil.com')
    expect(clean).not.toContain('https://track.com')
    expect(clean).not.toContain('javascript:')
    // 合法变量应保留
    expect(clean).toContain('--editor-bg: red')
  })

  it('applyTheme 注入前净化 customCSS（远程主题场景）', () => {
    const evil = `@import url('https://evil.com/x.css');\n:root{ --editor-bg: #123456; }`
    saveCustomTheme({ id: 'evil-b2', name: 'evil', type: 'dark', isBuiltIn: false, cssVariables: {}, customCSS: evil })
    applyTheme('evil-b2')
    const styleEl = document.getElementById('custom-theme-css') as HTMLStyleElement | null
    expect(styleEl).not.toBeNull()
    expect(styleEl!.textContent).not.toContain('@import')
    expect(styleEl!.textContent).not.toContain('https://evil.com')
  })

  it('本地自定义主题 cssVariables 可被应用为内联样式（白名单覆盖核心变量）', () => {
    // cssVariables 经 applyTheme 写为 documentElement 内联样式，验证白名单覆盖核心变量
    const theme = {
      id: 'evil-b2',
      name: 'custom',
      type: 'dark' as const,
      isBuiltIn: false,
      cssVariables: { '--editor-bg': '#0f0f0f', '--sidebar-bg': '#1a1a1a' },
      customCSS: '',
    }
    saveCustomTheme(theme)
    applyTheme('evil-b2')
    expect(document.documentElement.style.getPropertyValue('--editor-bg')).toBe('#0f0f0f')
    expect(document.documentElement.style.getPropertyValue('--sidebar-bg')).toBe('#1a1a1a')
    expect(getCustomThemes().some((t) => t.id === 'evil-b2')).toBe(true)
  })
})

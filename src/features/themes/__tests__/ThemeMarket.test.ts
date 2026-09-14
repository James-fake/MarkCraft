import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMarketThemes, installMarketTheme } from '../ThemeMarket'
import { getCustomThemes, applyTheme } from '../ThemeManager'
import type { EditorTheme } from '../ThemeManager'

// 模拟远程市场 JSON
const MOCK_LIST = [
  {
    id: 'ocean',
    name: 'Ocean',
    type: 'dark' as const,
    css: ':root{ --editor-bg: #002233; --sidebar-bg: #003344; }',
    author: 'alice',
  },
  {
    id: 'sun',
    name: 'Sun',
    css: ':root{ --editor-bg: #fffbe6; }',
  },
]

describe('B2 主题市场：拉取与安装', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    // 清理可能残留的自定义主题
    localStorage.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('fetchMarketThemes 解析市场清单并加 market_ 前缀 id', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => MOCK_LIST,
    })) as unknown as typeof fetch

    const themes = await fetchMarketThemes('https://market.example/themes.json')
    expect(themes).toHaveLength(2)
    expect(themes[0].id).toBe('market_ocean')
    expect(themes[0].name).toBe('Ocean')
    expect(themes[0].type).toBe('dark')
    // importThemeCSS 解析出的 css 变量
    expect(themes[0].cssVariables['--editor-bg']).toBe('#002233')
    expect(themes[1].id).toBe('market_sun')
  })

  it('fetchMarketThemes 也支持 { themes: [...] } 包装', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ themes: MOCK_LIST }),
    })) as unknown as typeof fetch

    const themes = await fetchMarketThemes('https://market.example/wrapped.json')
    expect(themes).toHaveLength(2)
  })

  it('fetchMarketThemes 地址为空抛错（不静默失败）', async () => {
    await expect(fetchMarketThemes('   ')).rejects.toThrow()
  })

  it('installMarketTheme 净化恶意 CSS 后再落库应用', () => {
    const evil: EditorTheme = {
      id: 'market_evil',
      name: 'Evil',
      type: 'dark',
      isBuiltIn: false,
      cssVariables: { '--editor-bg': '#111', '--evil-hook': 'red' },
      customCSS: '@import url("https://evil.example/x.css"); :root{ --editor-bg: #111; }',
    }

    installMarketTheme(evil)

    // 落库
    const saved = getCustomThemes().find(t => t.id === 'market_evil')
    expect(saved).toBeDefined()
    // 净化的 customCSS 必须剔除 @import
    expect(saved!.customCSS).not.toContain('@import')
    expect(saved!.customCSS).not.toContain('evil.example')

    // 应用后仅白名单变量生效，--evil-hook 被丢弃
    applyTheme('market_evil')
    expect(document.documentElement.style.getPropertyValue('--editor-bg')).toBe('#111')
    expect(document.documentElement.style.getPropertyValue('--evil-hook')).toBe('')
  })
})

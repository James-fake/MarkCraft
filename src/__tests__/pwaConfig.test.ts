import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * E2 PWA 离线支持 —— 配置层回归测试。
 *
 * 说明：Service Worker 与 manifest 的产物由 vite-plugin-pwa 在 `vite build` 阶段生成，
 * 无法在 jsdom 单测中执行。因此这里锁定「配置正确性」这一层，防止后续改动
 * 意外移除 PWA 插件、放开 Excalidraw 资源预缓存、或调低体积上限导致构建失败。
 */

const ROOT = resolve(__dirname, '../..')
const viteConfig = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf-8')
const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf-8')

describe('E2 PWA 配置', () => {
  it('vite.config.ts 已引入并启用 VitePWA 插件', () => {
    expect(viteConfig).toMatch(/import\s*\{\s*VitePWA\s*\}\s*from\s*'vite-plugin-pwa'/)
    expect(viteConfig).toContain('VitePWA({')
  })

  it('注册策略为 autoUpdate 并自动注入注册脚本', () => {
    expect(viteConfig).toMatch(/registerType:\s*'autoUpdate'/)
    expect(viteConfig).toMatch(/injectRegister:\s*'auto'/)
  })

  it('manifest 包含应用名、展示模式与图标', () => {
    expect(viteConfig).toMatch(/name:\s*'MarkCraft'/)
    expect(viteConfig).toMatch(/short_name:\s*'MarkCraft'/)
    expect(viteConfig).toMatch(/display:\s*'standalone'/)
    expect(viteConfig).toContain('/icon.svg')
  })

  it('workbox 排除 Excalidraw 运行时资源，避免预缓存爆炸与字体 404', () => {
    expect(viteConfig).toContain("globIgnores: ['**/excalidraw-assets/**']")
  })

  it('workbox 预缓存体积上限已上调，保证主入口 chunk 可离线', () => {
    const m = viteConfig.match(/maximumFileSizeToCacheInBytes:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(4)
  })

  it('SPA 离线导航回退到 index.html 且清理过期缓存', () => {
    expect(viteConfig).toMatch(/navigateFallback:\s*'index\.html'/)
    expect(viteConfig).toMatch(/cleanupOutdatedCaches:\s*true/)
  })

  it('public/icon.svg 存在且为合法 SVG', () => {
    const iconPath = resolve(ROOT, 'public/icon.svg')
    expect(existsSync(iconPath)).toBe(true)
    const svg = readFileSync(iconPath, 'utf-8')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('index.html 提供 theme-color 与 iOS 独立窗口元信息', () => {
    expect(indexHtml).toContain('name="theme-color"')
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable"')
    expect(indexHtml).toContain('rel="apple-touch-icon"')
  })

  it('package.json 声明 vite-plugin-pwa 为开发依赖', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
    expect(pkg.devDependencies?.['vite-plugin-pwa']).toBeTruthy()
  })
})

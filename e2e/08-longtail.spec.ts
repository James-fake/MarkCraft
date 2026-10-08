import { test, expect, gotoView, gotoAuxView, skipSplash } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * 08 · 长尾模块
 *
 * 日记、设置、主题切换、全局搜索、快捷键。
 * 这些模块在 jsdom 里能渲染，但真实交互（月历、主题应用、浮层搜索）只能真机验。
 */

async function createNote(page: Page, name: string) {
  await page.locator('.aurora-editor__filename-input').fill(name)
  await page.locator('.aurora-editor__newfile-btn').click()
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 20_000 })
}

test.describe('日记', () => {
  test('渲染常驻月历与每日一问', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'diary')

    await expect(page.getByLabel('日记月历')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('每日一问')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.dv2-side-col')).toBeVisible()
  })
})

test.describe('设置', () => {
  test('设置面板渲染分类 Tab 且可切换', async ({ page }) => {
    await skipSplash(page)
    await gotoAuxView(page, 'settings')

    await expect(page.locator('.aurora-settings')).toBeVisible({ timeout: 30_000 })
    const tabs = page.locator('.aurora-settings__nav-tabs [role="tab"]')
    const count = await tabs.count()
    expect(count, '设置应有多个分类 Tab').toBeGreaterThan(1)

    await tabs.nth(1).click()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 })
  })
})

test.describe('主题', () => {
  test('执行「切换深色/浅色主题」→ html[data-theme] 真实翻转', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-THEME')

    const html = page.locator('html')
    const before = (await html.getAttribute('data-theme')) ?? 'dark'
    const expected = before === 'dark' ? 'light' : 'dark'

    // 真实入口：命令面板 view.toggleTheme（菜单栏「视图 → 切换深色/浅色主题」同一命令源）
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder(/搜索命令/)
    await input.waitFor({ state: 'visible', timeout: 10_000 })
    await input.fill('切换深色')
    await page.getByText('切换深色/浅色主题').first().click()

    await expect(html).toHaveAttribute('data-theme', expected, { timeout: 10_000 })
  })
})

test.describe('搜索与快捷键', () => {
  test('Ctrl+Shift+F 唤起全局搜索浮层', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-SEARCH')

    await page.keyboard.press('Control+Shift+F')
    const input = page.locator('.quick-open-input')
    await expect(input).toBeVisible({ timeout: 15_000 })

    // L-3 修复后：Escape 已是 window 级监听，**不依赖浮层内焦点**。
    // 故这里刻意先不点输入框 —— 直接按 Escape 也必须能关掉（守的就是自动聚焦竞态窗口）。
    await page.keyboard.press('Escape')
    await expect(input).toHaveCount(0, { timeout: 10_000 })
  })

  test('Ctrl+N 新建笔记（应用层拦截浏览器新窗口）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    const before = await page.locator('.aurora-tab').count()
    await page.keyboard.press('Control+n')
    // 新建后编辑器挂载（打开了新标签）
    await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 20_000 })
    expect(await page.locator('.aurora-tab').count()).toBeGreaterThan(before)
  })
})

test.describe('PWA', () => {
  test('生产构建下注册 Service Worker', async ({ page }) => {
    test.skip(!process.env.E2E_PROD, '仅在生产构建（E2E_PROD=1）下验证 SW')
    await skipSplash(page)
    await gotoView(page, 'editor')
    const hasSW = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length > 0
    })
    expect(hasSW).toBe(true)
  })
})

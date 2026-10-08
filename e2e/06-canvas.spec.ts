import { test, expect, gotoView, skipSplash } from './fixtures'

/**
 * 06 · 白板（Canvas v2）
 *
 * 最高价值：Excalidraw 引擎在真实浏览器里能否挂载。
 * jsdom 单测把引擎整个 mock 掉了，而 index.html 里明确记录过真机故障：
 * Edge 跟踪防护拦截 unpkg 会导致 Excalidraw vendor chunk 加载失败、白板全无响应 ——
 * 这类问题只有真机能验。
 */

test.describe('白板', () => {
  test('Excalidraw 引擎真实挂载，且无 chunk 加载失败', async ({ page, diag }) => {
    await skipSplash(page)
    await gotoView(page, 'canvas')

    // Excalidraw 真实根容器（jsdom 下是被 mock 的 div，真机是完整画布）
    await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 35_000 })

    // 真机不应出现模块/资源加载失败
    const errs = diag.realErrors.join('\n')
    expect(errs, `真机资源加载错误：\n${errs}`).not.toMatch(
      /ChunkLoadError|Failed to fetch dynamically imported module|Loading chunk .* failed/,
    )
  })

  test('顶栏视图切换（白板 / 思维导图 / 看板）齐备', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'canvas')

    for (const name of ['白板', '思维导图', '看板']) {
      await expect(page.getByRole('tab', { name, exact: true })).toBeVisible({ timeout: 30_000 })
    }
  })

  test('白板列表含「白板列表 / 回收站」页签，回收站空态正确', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'canvas')
    await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 35_000 })

    // 顶栏白板名 → 打开白板列表
    await page.getByTitle('白板列表').first().click()
    await expect(page.getByRole('tab', { name: /白板列表（/ })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('tab', { name: /回收站（/ }).click()
    await expect(page.getByText(/回收站为空/)).toBeVisible({ timeout: 15_000 })
  })

  test('顶栏提供「导出当前白板（PNG+JSON）」入口', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'canvas')
    await expect(page.locator('.excalidraw').first()).toBeVisible({ timeout: 35_000 })

    await expect(page.getByTitle('导出当前白板（PNG+JSON）')).toBeVisible({ timeout: 15_000 })
  })
})

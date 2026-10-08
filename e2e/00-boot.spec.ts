import { test, expect, gotoView, gotoAuxView, waitForAppReady, skipSplash } from './fixtures'

/**
 * 00 · 启动与外壳 —— 真机冒烟
 *
 * 这一组既是「基建自检」（Playwright 能否驱动真机跑通），
 * 也是「启动链路」的首批真实断言：应用能挂载、默认落点正确、无运行时崩溃。
 */
test.describe('启动与外壳', () => {
  test('应用可启动：#aurora-root 有内容，未触发白屏诊断', async ({ page, diag }) => {
    await page.goto('/')
    await waitForAppReady(page)

    // 白屏诊断守卫：启动失败时会把诊断 HTML 写进 #aurora-root（含这段特征文案）
    await expect(page.locator('#aurora-root')).not.toContainText('启动失败')

    // 应用挂载后应有实质内容
    const childCount = await page.locator('#aurora-root').evaluate((el) => el.childElementCount)
    expect(childCount).toBeGreaterThan(0)

    // 真机不应有未捕获异常（控制台 error 允许存在，页面异常不允许）
    expect(diag.pageErrors, `页面未捕获异常：\n${diag.pageErrors.join('\n')}`).toEqual([])
  })

  test('首启默认进入欢迎页', async ({ page }) => {
    await skipSplash(page)
    await page.goto('/')
    await waitForAppReady(page)

    // 欢迎面板存在（Launchpad）
    await expect(page.locator('.aurora-welcome, [class*="welcome"]').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('深链 #view=editor 直达编辑器（绕过欢迎页）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    // 编辑器空态标题
    await expect(page.locator('.aurora-editor__empty-title')).toHaveText('未打开文档')
    await expect(page.locator('.aurora-editor__openfile-btn')).toHaveText('打开文件')
  })

  test('侧栏快捷键可切换到设置（aux 视图）', async ({ page }) => {
    await skipSplash(page)
    await gotoAuxView(page, 'settings')
    // 设置面板应出现（按通用容器类兜底匹配）
    await expect(page.locator('[class*="settings"]').first()).toBeVisible({ timeout: 15_000 })
  })
})

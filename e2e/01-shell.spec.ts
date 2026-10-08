import { test, expect, gotoView, waitForAppReady, skipSplash } from './fixtures'

/**
 * 01 · 外壳与启动链路
 *
 * 覆盖 jsdom 永远测不到的首屏行为：开屏打字机动画、主题/密度防闪烁、
 * 真实菜单栏、命令面板、侧栏导航、状态栏。
 */
test.describe('启动链路', () => {
  test('首启播放开屏动画，随后自动退场并写入已看过标记', async ({ page }) => {
    // 不跳过开屏：全新 context 无 mc-splash-seen。
    // ⚠️ 必须用 waitUntil:'commit'：默认等 load 事件，而重型应用 load 完成时
    //    开屏层（最短停留 1600ms）早已退场，会误判「开屏没出现」。
    await page.goto('/', { waitUntil: 'commit' })

    // 开屏层出现（打字机逐字浮现）
    const splash = page.locator('#mc-splash')
    await expect(splash).toBeVisible({ timeout: 10_000 })
    // 逐字 span 已生成（MarkCraft 共 9 个字符）
    await expect(page.locator('#mc-splash .mc-splash__char')).toHaveCount(9)

    // 自动退场（MIN_TOTAL 1600ms 后淡出并移除）
    await expect(splash).toHaveCount(0, { timeout: 15_000 })
    const seen = await page.evaluate(() => localStorage.getItem('mc-splash-seen'))
    expect(seen).toBe('1')
  })

  test('主题防闪烁：首屏同步应用 data-theme，无闪白', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app-theme-preference', 'dark'))
    await page.goto('/')
    // 内联脚本在任何 CSS 渲染前同步打标
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('密度防闪烁：首屏同步应用 data-density', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mc-sidebar-density', 'comfortable'))
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })
})

test.describe('菜单栏', () => {
  test('渲染七组顶层菜单，且不含已移除的 App 菜单', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await expect(page.getByRole('menubar')).toBeVisible()
    for (const t of ['文件', '编辑', '视图', '前往', '工具', '窗口', '帮助']) {
      await expect(page.getByRole('menuitem', { name: t, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('menuitem', { name: 'MarkCraft' })).toHaveCount(0)
  })

  test('打开「文件」菜单并执行「新建笔记」', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await page.getByRole('menuitem', { name: '文件', exact: true }).click()
    const pop = page.locator('.aurora-menubar__pop')
    await expect(pop).toBeVisible()
    await expect(pop.getByText('新建笔记')).toBeVisible()

    await pop.getByText('新建笔记').click()
    // 执行后菜单退场（data-exiting → 卸载）
    await expect(page.locator('.aurora-menubar__pop')).toHaveCount(0, { timeout: 5_000 })
  })

  test('Esc 关闭已展开菜单', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await page.getByRole('menuitem', { name: '视图', exact: true }).click()
    await expect(page.locator('.aurora-menubar__pop')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.aurora-menubar__pop')).toHaveCount(0, { timeout: 5_000 })
  })
})

test.describe('命令面板', () => {
  test('Ctrl+K 唤起，可按关键词过滤命令', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder(/搜索命令/)
    await expect(input).toBeVisible()

    // 输入中文关键词（融合文件/命令搜索）
    await input.fill('新建')
    // 至少有一条「新建笔记」类命令命中
    await expect(page.getByText(/新建/).first()).toBeVisible()

    // Esc 关闭
    await page.keyboard.press('Escape')
    await expect(input).toHaveCount(0, { timeout: 5_000 })
  })
})

test.describe('侧栏与状态栏', () => {
  test('侧栏点击「博客」切换视图并写入 hash', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    const sidebar = page.locator('.aurora-sidebar')
    await expect(sidebar).toBeVisible()
    await sidebar.getByTitle('博客').click()

    await expect(page).toHaveURL(/#view=blog/)
    // 博客工作室已渲染
    await expect(page.getByText('博客工作室').first()).toBeVisible({ timeout: 15_000 })
  })

  test('编辑器状态栏存在命令面板入口项', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await expect(page.locator('.aurora-statusbar')).toBeVisible()
    await expect(page.getByText('⌘K 命令面板')).toBeVisible()
  })
})

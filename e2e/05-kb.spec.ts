import { test, expect, gotoView, skipSplash } from './fixtures'

/**
 * 05 · 知识库与双链图谱
 *
 * 知识库：列表 → 进入库 → 7 个 Tab（概览/笔记/搜索/问答/依赖/MOC/导出）真实切换。
 * 双链图谱：真实 SVG 渲染节点、状态栏统计、左侧导航浮层（hover 召唤）。
 */

test.describe('知识库', () => {
  test('🚨 M-1 回归：直接深链 #view=kb（播种晚于面板挂载）也能显示内置知识库', async ({ page }) => {
    await skipSplash(page)
    // 刻意**不先经过编辑器**，直接落在知识库视图：面板挂载会早于异步播种完成 ——
    // 这正是修复前的复现场景（面板只在挂载时取一次列表，之后不再刷新 → 永久空态）。
    await gotoView(page, 'kb')
    await expect(page.locator('.aurora-kb-manage')).toBeVisible({ timeout: 30_000 })

    await expect(page.locator('.aurora-kb-kbcard').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('还没有知识库')).toHaveCount(0)
  })

  test('列表 → 进入库 → 7 个 Tab 均可切换并渲染真实组件', async ({ page }) => {
    await skipSplash(page)

    // 先进应用（触发首次启动的内置「使用文档」知识库播种），等播种落标记后再进知识库。
    // ⚠️ 不能直接深链 #view=kb：面板会在播种完成前取一次列表、之后不再刷新，
    //    导致列表空（实测：kbSeed 日志已「播种完成」，但 UI 仍 0 个）。
    await gotoView(page, 'editor')
    await page.waitForFunction(
      () => localStorage.getItem('markcraft-usage-docs-seeded') === '1',
      undefined,
      { timeout: 30_000 },
    )
    await gotoView(page, 'kb')

    const card = page.locator('.aurora-kb-kbcard').first()
    await expect(card).toBeVisible({ timeout: 25_000 })
    await card.click()

    // 7 个 Tab 齐备
    for (const title of ['概览', '笔记', '搜索', '问答', '依赖', 'MOC', '导出']) {
      await expect(page.locator(`[title="${title}"]`).first()).toBeVisible({ timeout: 20_000 })
    }

    // 搜索 Tab → 真实搜索面板
    await page.locator('[title="搜索"]').first().click()
    await expect(page.getByPlaceholder(/搜索库内文件内容/)).toBeVisible({ timeout: 15_000 })

    // MOC Tab → 真实目录生成器
    await page.locator('[title="MOC"]').first().click()
    await expect(page.getByText('知识库目录（MOC）')).toBeVisible({ timeout: 15_000 })

    // 导出 Tab → 真实导出菜单
    await page.locator('[title="导出"]').first().click()
    await expect(page.getByText('导出知识库')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('双链图谱', () => {
  test('真实渲染 SVG 节点，状态栏统计笔记数', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'graph')

    await expect(page.locator('.aurora-graph__svg')).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('.aurora-graph__node').first()).toBeVisible({ timeout: 25_000 })
    // 状态栏含「笔记」统计
    await expect(page.locator('.aurora-statusbar')).toContainText('笔记', { timeout: 15_000 })
  })

  test('左缘感应条 hover 召唤导航浮层（含布局/范围分组）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'graph')
    await expect(page.locator('.aurora-graph__node').first()).toBeVisible({ timeout: 25_000 })

    const zone = page.locator('.aurora-graph__hoverzone')
    await expect(zone).toBeVisible()
    await zone.hover()

    const overlay = page.locator('.aurora-graph__overlay')
    await expect(overlay).toBeVisible({ timeout: 15_000 })
    // 浮层内分组（范围 / 模式 / 布局 …）
    await expect(overlay.locator('.aurora-graph__group-title').first()).toBeVisible()
  })

  test('图谱导出 JSON → 经平台层触发真实下载', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'graph')
    await expect(page.locator('.aurora-graph__node').first()).toBeVisible({ timeout: 25_000 })

    // 打开导出菜单（视图控制条右侧的下载按钮）
    const exportBtn = page.locator('.aurora-graph__controls button[title="导出"]')
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await exportBtn.click()

    const menu = page.locator('.aurora-graph__menu')
    await expect(menu).toBeVisible({ timeout: 10_000 })

    // 该路径此前是内联 <a download>，P1 后统一收敛到 platform.saveBlob ——
    // 这里用真实 download 事件确认收敛未改变可观测行为。
    const downloadPromise = page.waitForEvent('download')
    await menu.getByRole('button', { name: /导出 JSON/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('knowledge-graph.json')
  })
})

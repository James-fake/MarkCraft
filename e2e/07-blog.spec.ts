import { test, expect, gotoView, skipSplash } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * 07 · 博客工作室
 *
 * 覆盖：挂载、主题市场（默认展示全部 63 个主题 + 精品置顶）、主题切换驱动预览 iframe 实时更新。
 * 预览生成对配置有 ~300ms 防抖，故断言必须轮询而非同步读取。
 */

async function createNote(page: Page, name: string, content: string) {
  await page.locator('.aurora-editor__filename-input').fill(name)
  await page.locator('.aurora-editor__newfile-btn').click()
  const prose = page.locator('.ProseMirror').first()
  await prose.waitFor({ state: 'visible', timeout: 20_000 })
  // ⚠️ 必须写入正文：空文档的博客预览只会显示「暂无待预览文档」，
  //    主题切换断言会因此永远失败（与主题无关）。
  await prose.click()
  await page.keyboard.type(content)
  // 等编辑器内容同步回 FileStore
  await page.waitForTimeout(1_500)
}

/** 进入博客工作室，并准备好一篇**有正文**的普通笔记作为待发布内容 */
async function openBlog(page: Page) {
  await skipSplash(page)
  await gotoView(page, 'editor')
  await createNote(page, 'E2E-BLOG', '# 博客标题\n\n这是用于博客预览的正文内容。')
  await gotoView(page, 'blog')
  await expect(page.getByText('博客工作室').first()).toBeVisible({ timeout: 30_000 })
}

test.describe('博客工作室', () => {
  test('挂载：外壳 + 状态栏「篇待发布」来自真实文档计数', async ({ page }) => {
    await openBlog(page)
    await expect(page.getByText(/篇待发布/)).toBeVisible({ timeout: 15_000 })
  })

  test('主题市场默认展示全部主题（不止精品），精品置顶', async ({ page }) => {
    await openBlog(page)

    // 功能面板首次默认收起：点「样式」tab（首个）展开主题市场
    await page.locator('.aurora-blog__tab').first().click()

    const names = page.locator('.aurora-blog-theme__name b')
    await expect(names.first()).toBeVisible({ timeout: 25_000 })

    const count = await names.count()
    // 旧行为只露 12 个精品；现应展示全量（63）
    expect(count, `主题市场应展示全部主题，实际 ${count} 个`).toBeGreaterThan(50)

    // 非精品主题「诗歌」也在场（证明不是只露精品）
    await expect(page.locator('.aurora-blog-theme__name b', { hasText: /^诗歌$/ })).toHaveCount(1)
    // 精品主题「终端」也在场
    await expect(page.locator('.aurora-blog-theme__name b', { hasText: /^终端$/ })).toHaveCount(1)
  })

  test('切换主题 → 预览 iframe 实时渲染对应主题模板', async ({ page }) => {
    await openBlog(page)
    await page.locator('.aurora-blog__tab').first().click()

    const iframe = page.locator('iframe[title="博客预览"]')
    await expect(iframe).toBeVisible({ timeout: 25_000 })

    const before = (await iframe.getAttribute('srcdoc')) ?? ''
    expect(before.length).toBeGreaterThan(0)

    // 点「终端」主题卡（精确匹配名称，避免命中描述里含「终端」的卡）
    const terminalCard = page
      .locator('.aurora-blog-theme')
      .filter({ has: page.locator('.aurora-blog-theme__name b', { hasText: /^终端$/ }) })
      .first()
    await expect(terminalCard).toBeVisible({ timeout: 20_000 })
    await terminalCard.click()

    // 预览有 ~300ms 防抖 → 轮询等待 srcdoc 更新为 terminal 模板特征
    await expect
      .poll(async () => (await iframe.getAttribute('srcdoc')) ?? '', { timeout: 20_000 })
      .toContain('hero-cursor')
  })
})

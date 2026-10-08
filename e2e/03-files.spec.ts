import { test, expect, gotoView, skipSplash, waitForAppReady } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * 03 · 文件管理
 *
 * 覆盖：拖拽导入、空态文件列表打开、同名去重（2026-10-07 审查 M1 修复的真机验证）、
 * IndexedDB 持久化。
 */

/** 通过命令面板的文件搜索确认某文件存在（真实读取 FileStore 派生列表） */
async function expectFileInPalette(page: Page, query: string, namePattern: RegExp) {
  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder(/搜索命令/)
  await input.waitFor({ state: 'visible', timeout: 10_000 })
  await input.fill(query)
  await expect(page.getByText(namePattern).first()).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Escape')
}

/** 在页面内构造一个 DataTransfer，含若干文件，用于拖拽导入 */
async function makeDropHandle(page: Page, files: Array<{ name: string; content: string }>) {
  return page.evaluateHandle((items) => {
    const dt = new DataTransfer()
    for (const it of items) {
      dt.items.add(new File([it.content], it.name, { type: 'text/markdown' }))
    }
    return dt
  }, files)
}

test.describe('文件管理', () => {
  test('拖入 md 文件 → 打开编辑器 → 关闭后空态列表可再点开', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    // 拖入一个文件 → 自动打开
    const dt = await makeDropHandle(page, [{ name: 'list-open.md', content: '# 列表打开' }])
    await page.dispatchEvent('body', 'drop', { dataTransfer: dt })
    await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 20_000 })

    // 关闭当前文件（⌘W / Ctrl+W → file.close）→ 回到空态
    await page.keyboard.press('Control+w')
    const row = page.locator('.aurora-emptyfiles__row', { hasText: 'list-open' })
    await expect(row.first()).toBeVisible({ timeout: 15_000 })

    // 点击该行 → 重新打开编辑器
    await row.first().click()
    await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 15_000 })
  })

  test('🚨 一次拖入两个同名文件 → 去重为 name.md / name (1).md（M1 修复真机验证）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    const dt = await makeDropHandle(page, [
      { name: 'dupname.md', content: '# 甲' },
      { name: 'dupname.md', content: '# 乙' },
    ])
    await page.dispatchEvent('body', 'drop', { dataTransfer: dt })

    // 两个文件都必须存在，且第二个被去重加序号（不得重名并存）
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder(/搜索命令/)
    await input.waitFor({ state: 'visible', timeout: 10_000 })
    await input.fill('dupname')
    await expect(page.getByText(/^dupname\.md$/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^dupname \(1\)\.md$/).first()).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')
  })

  test('新建笔记刷新页面后仍在（IndexedDB 持久化）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await page.locator('.aurora-editor__filename-input').fill('E2E-PERSIST')
    await page.locator('.aurora-editor__newfile-btn').click()
    await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 20_000 })

    // L-1 修复后：saveState 虽是 300ms 防抖，但 pagehide / beforeunload 会补写挂起的变更，
    // 故这里**刻意不等待**防抖窗口 —— 立即刷新也必须不丢数据（本用例正是守这条行为）。
    await page.reload()
    await waitForAppReady(page)

    await expectFileInPalette(page, 'E2E-PERSIST', /E2E-PERSIST\.md/)
  })
})

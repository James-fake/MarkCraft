import { test, expect, gotoView, skipSplash } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * 02 · 编辑器
 *
 * 覆盖真实编辑行为：新建笔记、WYSIWYG（Tiptap）与源码（CodeMirror 6）双模式切换、
 * Markdown ↔ 富文本往返一致性、工具栏。
 * 这些在 jsdom 里要么被 mock、要么挂载即崩，只能真机验。
 *
 * ⚠️ 选择器注意：顶栏模式按钮是 `button.aurora-mode-toggle`，而标签页是
 *    `div[role=button]`（可访问名含文件名 + 「关闭标签」）。若笔记名里带「源码/预览」
 *    等词，`getByRole('button', { name: '源码' })` 会命中标签页 → strict 冲突。
 *    故一律 `exact: true`，且笔记名避开这些关键词。
 */

/** 在编辑器空态新建一篇笔记，并等待 WYSIWYG 编辑器挂载 */
async function createNote(page: Page, name: string) {
  await page.locator('.aurora-editor__filename-input').fill(name)
  await page.locator('.aurora-editor__newfile-btn').click()
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 20_000 })
}

/** 顶栏模式切换按钮（精确匹配，避免命中同名标签页） */
function modeBtn(page: Page, label: '源码' | '所见即所得' | '预览') {
  return page.getByRole('button', { name: label, exact: true })
}

test.describe('编辑器 · 挂载与模式', () => {
  test('空态新建笔记后挂载 WYSIWYG 编辑器（默认所见即所得）', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    await expect(page.locator('.aurora-editor__empty-title')).toHaveText('未打开文档')
    await createNote(page, 'E2E-A')

    // Tiptap / ProseMirror 真实挂载
    await expect(page.locator('.ProseMirror').first()).toBeVisible()
    // 顶栏模式按钮组在场
    await expect(modeBtn(page, '所见即所得')).toBeVisible()
    await expect(modeBtn(page, '源码')).toBeVisible()
  })

  test('切换到源码模式挂载 CodeMirror 6', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-B')

    await modeBtn(page, '源码').click()
    // CodeMirror 真实挂载
    await expect(page.locator('.cm-editor-container .cm-content')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('编辑器 · Markdown ↔ 富文本往返', () => {
  test('源码输入 Markdown，切回所见即所得后渲染为富文本', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-C')

    // 切到源码，写入 Markdown
    await modeBtn(page, '源码').click()
    const cmContent = page.locator('.cm-editor-container .cm-content')
    await cmContent.waitFor({ state: 'visible', timeout: 15_000 })
    await cmContent.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('# 往返标题')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('这是**加粗**正文。')

    // 切回所见即所得
    await modeBtn(page, '所见即所得').click()

    // Markdown 被渲染成真正的富文本结构（标题 + 加粗），而非纯文本。
    // ⚠️ 注意：默认 livePreview:true（SettingsStore 默认值），所见即所得会以「装饰」
    //    形式保留 markdown 标记（h1 的 textContent 形如「# 往返标题」）——
    //    这是实时预览的有意设计，故用 toContainText 而非 toHaveText。
    const prose = page.locator('.ProseMirror').first()
    await expect(prose.locator('h1')).toContainText('往返标题', { timeout: 15_000 })
    await expect(prose.locator('strong')).toContainText('加粗')
  })

  test('所见即所得输入文本，切到源码后体现为 Markdown', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-D')

    const prose = page.locator('.ProseMirror').first()
    await prose.click()
    await page.keyboard.type('真机输入的正文内容')

    await modeBtn(page, '源码').click()
    const cmContent = page.locator('.cm-editor-container .cm-content')
    await cmContent.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(cmContent).toContainText('真机输入的正文内容', { timeout: 15_000 })
  })
})

test.describe('编辑器 · 工具栏', () => {
  test('WYSIWYG 工具栏渲染格式化控件', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-E')

    await expect(page.locator('.wysiwyg-toolbar')).toBeVisible({ timeout: 15_000 })
  })
})

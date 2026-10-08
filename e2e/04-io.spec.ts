import { test, expect, gotoView, skipSplash } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * 04 · 导入与导出
 *
 * 导出：工具栏「更多」→「另存为」→ SaveAsModal（12 种格式）→ 真实产出文件。
 * 导入：拖入 .html / .txt → 经统一管线转成 Markdown（含 turndown GFM 表格保真）。
 */

/**
 * 强制走「浏览器下载」回退分支。
 * SaveAsModal 在 `'showSaveFilePicker' in window` 为真时用 File System Access API
 * （会弹**原生**保存对话框，Playwright 无法处理而卡死）——故先摘掉该 API。
 */
async function forceDownloadFallback(page: Page) {
  await page.addInitScript(() => {
    const del = (o: object, k: string) => {
      try {
        delete (o as Record<string, unknown>)[k]
      } catch {
        /* ignore */
      }
    }
    del(window, 'showSaveFilePicker')
    del(window, 'showDirectoryPicker')
    if (typeof Window !== 'undefined') {
      del(Window.prototype, 'showSaveFilePicker')
      del(Window.prototype, 'showDirectoryPicker')
    }
  })
}

async function createNote(page: Page, name: string) {
  await page.locator('.aurora-editor__filename-input').fill(name)
  await page.locator('.aurora-editor__newfile-btn').click()
  await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 20_000 })
}

/** 打开「更多 → 另存为」，返回 modal */
async function openSaveAs(page: Page) {
  // ⚠️ 「更多」在页面上有两处：侧栏分组标题 + 工具栏按钮 → 必须限定在工具栏内
  await page.locator('.wysiwyg-toolbar').getByTitle('更多').click()
  await page.locator('.aurora-dropdown__item', { hasText: '另存为' }).click()
  const modal = page.locator('.save-as-modal')
  await modal.waitFor({ state: 'visible', timeout: 15_000 })
  return modal
}

async function makeDropHandle(page: Page, files: Array<{ name: string; content: string; type: string }>) {
  return page.evaluateHandle((items) => {
    const dt = new DataTransfer()
    for (const it of items) dt.items.add(new File([it.content], it.name, { type: it.type }))
    return dt
  }, files)
}

test.describe('导出', () => {
  test('「更多 → 另存为」可达，且默认导出 Markdown 真实下载文件', async ({ page }) => {
    await forceDownloadFallback(page)
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-EXPORT')

    const modal = await openSaveAs(page)
    await expect(modal.locator('.save-as-title')).toHaveText('另存为')
    // 确认已回退到浏览器下载模式（无 File System Access 位置选择器）
    await expect(page.locator('.save-as-location-row')).toHaveCount(0)

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.locator('.save-as-btn-confirm').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })

  test('L-2 修复：「另存为」可从命令面板与 Ctrl+Shift+S 触达', async ({ page }) => {
    await forceDownloadFallback(page)
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-SAVEAS')

    // ① 命令面板：修复前 file.saveAs 不在命令目录里，完全不可达
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder(/搜索命令/)
    await input.waitFor({ state: 'visible', timeout: 10_000 })
    await input.fill('另存为')
    await page.getByText('另存为', { exact: true }).first().click()
    await expect(page.locator('.save-as-modal')).toBeVisible({ timeout: 15_000 })

    await page.locator('.save-as-close-btn').click()
    await expect(page.locator('.save-as-modal')).toHaveCount(0, { timeout: 10_000 })

    // ② Ctrl+Shift+S：内置《使用文档》一直声明该键位，此前并未绑定
    await page.keyboard.press('Control+Shift+s')
    await expect(page.locator('.save-as-modal')).toBeVisible({ timeout: 15_000 })
  })

  test('格式选择器提供全部 12 种导出格式', async ({ page }) => {
    await forceDownloadFallback(page)
    await skipSplash(page)
    await gotoView(page, 'editor')
    await createNote(page, 'E2E-EXPORT-FMT')

    const modal = await openSaveAs(page)
    await modal.locator('.save-as-select').click()

    // 抽样断言几个非默认格式（覆盖不同生成路径：矢量/文本/图片/打包）
    for (const label of ['PDF (.pdf)', 'Word (.docx)', 'LaTeX (.tex)', 'EPUB (.epub)', 'PNG (.png)']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    }
  })
})

test.describe('导入', () => {
  test('拖入 .html → 转为 Markdown，且表格保真为 GFM 表格', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    const html =
      '<h1>导入标题</h1><p>正文段落</p>' +
      '<table><thead><tr><th>列A</th><th>列B</th></tr></thead>' +
      '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    const dt = await makeDropHandle(page, [{ name: 'import-test.html', content: html, type: 'text/html' }])
    await page.dispatchEvent('body', 'drop', { dataTransfer: dt })

    // 打开的文件应已转成 Markdown：切源码查看
    await page.locator('.ProseMirror').first().waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByRole('button', { name: '源码', exact: true }).click()
    const cm = page.locator('.cm-editor-container .cm-content')
    await cm.waitFor({ state: 'visible', timeout: 15_000 })

    await expect(cm).toContainText('导入标题', { timeout: 15_000 })
    // turndown 默认丢弃 <table>；本项目用 turndown-plugin-gfm 修复 → 应产出 GFM 表格
    await expect(cm).toContainText('| 列A | 列B |', { timeout: 15_000 })
  })

  test('拖入 .txt → 新建并打开笔记', async ({ page }) => {
    await skipSplash(page)
    await gotoView(page, 'editor')

    const dt = await makeDropHandle(page, [{ name: 'plain-note.txt', content: '纯文本内容 ABC', type: 'text/plain' }])
    await page.dispatchEvent('body', 'drop', { dataTransfer: dt })

    await page.getByRole('button', { name: '源码', exact: true }).click()
    const cm = page.locator('.cm-editor-container .cm-content')
    await cm.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(cm).toContainText('纯文本内容 ABC', { timeout: 15_000 })
  })
})

import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 14 · Electron Vault CRUD 落盘（P4-B 集成）
 *
 * 验证「界面操作 → 真实磁盘 .md」这条**完整链路**在真机成立（单测只覆盖到
 * syncTree 这一层，本用例补上 UI 动作 → FileStore → syncTree → 磁盘）：
 *   ① 空态新建笔记 → 磁盘出现新 .md
 *   ② 文件树右键「重命名」→ 磁盘 .md 改名（旧名消失）
 *   ③ 文件树右键「删除」+ 确认 → 磁盘 .md 移除
 *   ④ 编辑器输入内容 → 磁盘 .md 同步（关闭标签页再重开内容仍在）
 *
 * ⚠️ 不弹原生对话框（同 11/12）；文件树是编辑器左缘 hover 浮层，靠 hover 左缘召唤。
 * 前置：`npm run electron:compile` 产出 out/main 与 out/preload。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page
let vaultDir: string

test.setTimeout(120_000)

test.beforeAll(async () => {
  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-vault-crud-'))
  writeFileSync(join(vaultDir, 'seed.md'), '# Seed\n\n种子。\n')

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({ args: [MAIN_MJS], env })
  win = await app.firstWindow()
  await win.addInitScript((root: string) => {
    localStorage.setItem('markcraft.lastVault', root)
  }, vaultDir)
  await win.reload()
  await win.waitForFunction(
    () => {
      const root = document.getElementById('aurora-root')
      return !!root && root.childElementCount > 0
    },
    undefined,
    { timeout: 60_000 },
  )
  await win.locator('#mc-splash').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})

  // 进入编辑器（首页 WelcomePanel 不渲染文件树）→ 空态
  await win.locator('button.aurora-sidebar-item[title="编辑器"]').click()
  await win.locator('.aurora-editor__empty-files').waitFor({ state: 'visible', timeout: 15_000 })
})

test.afterAll(async () => {
  await app?.close()
  try { rmSync(vaultDir, { recursive: true, force: true }) } catch { /* 清理失败不阻断 */ }
})

/** 召唤编辑器左缘文件树浮层（hover 左缘 → hover-intent 220ms → 浮层滑入） */
async function summonFileTree(): Promise<void> {
  await win.locator('.aurora-editor__hoverzone--left').hover()
  await win.locator('.aurora-editor__overlay--left').waitFor({ state: 'visible', timeout: 10_000 })
}

test.describe('Electron Vault CRUD 落盘（P4-B 集成）', () => {
  test('空态新建笔记 → 磁盘出现新 .md', async () => {
    await win.locator('.aurora-editor__filename-input').fill('新笔记')
    await win.locator('.aurora-editor__newfile-btn').click()

    const created = join(vaultDir, '新笔记.md')
    await expect.poll(() => existsSync(created), { timeout: 10_000 }).toBe(true)
    expect(readFileSync(created, 'utf-8')).toBe('')
  })

  test('编辑器输入内容 → 磁盘 .md 同步；关闭标签页再重开内容仍在', async () => {
    // 真实事故（2026-10-09 用户报障）：输入「工作日记」→ 关闭文件 → 重开只剩「工作」。
    // 根因：原子写产生的 .tmp 事件未被抑制 → 触发整树重载 → 节点 id 全换 →
    //       标签页仍拿旧 id → 之后所有编辑被静默丢弃（updateFileContent 找不到节点）。
    const target = join(vaultDir, '新笔记.md')
    await win.locator('.ProseMirror').click()
    await win.locator('.ProseMirror').type('工作日记')

    // 编辑器 500ms 防抖 + 写盘 300ms 防抖 → 等内容真的落到磁盘
    await expect
      .poll(() => (existsSync(target) ? readFileSync(target, 'utf-8') : ''), { timeout: 10_000 })
      .toBe('工作日记')

    // 关闭标签页 → 应用回到**空态文件列表**（此时左缘 hover 浮层不存在，不能再用 summonFileTree）
    // → 从列表重新打开 → 内容必须还在（锁「重开只剩前半截」这一现象）
    await win.locator('.aurora-tab__close').first().click()
    const browser = win.locator('.aurora-editor__empty-files')
    await browser.waitFor({ state: 'visible', timeout: 15_000 })
    await expect(browser).toContainText('新笔记.md')

    await browser.getByText('新笔记.md').first().click()
    await win.locator('.ProseMirror').waitFor({ state: 'visible', timeout: 15_000 })
    await expect(win.locator('.ProseMirror')).toContainText('工作日记')
    expect(readFileSync(target, 'utf-8')).toBe('工作日记')
  })

  test('文件树右键「重命名」→ 磁盘 .md 改名（旧名消失）', async () => {
    await summonFileTree()
    const row = win.locator('.aurora-filetree__item', { hasText: '新笔记.md' })
    await row.click({ button: 'right' })
    await win.locator('.aurora-filetree__ctxmenu-item', { hasText: '重命名' }).click()

    const input = win.locator('.aurora-filetree__rename-input')
    await input.fill('改名后')
    await input.press('Enter')

    const renamed = join(vaultDir, '改名后.md')
    await expect.poll(() => existsSync(renamed), { timeout: 10_000 }).toBe(true)
    expect(existsSync(join(vaultDir, '新笔记.md'))).toBe(false)
  })

  test('文件树右键「删除」+ 确认 → 磁盘 .md 移除', async () => {
    await summonFileTree()
    const row = win.locator('.aurora-filetree__item', { hasText: '改名后.md' })
    await row.click({ button: 'right' })
    await win.locator('.aurora-filetree__ctxmenu-item--danger').click()
    // 删除确认弹层（Portal 到 body）→ 点 danger 按钮确认
    await win.locator('.aurora-filetree__confirm-btn--danger').click()

    const target = join(vaultDir, '改名后.md')
    await expect.poll(() => existsSync(target), { timeout: 10_000 }).toBe(false)
    // 种子文件仍在（删除只作用于目标）
    expect(existsSync(join(vaultDir, 'seed.md'))).toBe(true)
  })
})

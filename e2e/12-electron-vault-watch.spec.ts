import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 12 · Electron Vault 文件监听（P4-C 集成）
 *
 * 验证「用户在文件管理器 / IDE / git 改了磁盘，文件树跟随刷新」这一通路在
 * **真实桌面壳**成立。
 *
 * 流程：
 *  1. 预置 Vault（note-1.md），addInitScript 注 lastVault → reload 加载
 *  2. 进入编辑器，断言 note-1.md 可见
 *  3. **外部新增** external-add.md → 等监听防抖（500ms）+ reload → 断言出现
 *  4. **外部删除** note-1.md → 断言从文件树消失
 *
 * ⚠️ 不弹原生对话框（同 11-electron-vault）。
 * 前置：`npm run electron:compile` 已产出 out/main 与 out/preload（P4-C 监听通道）。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page
let vaultDir: string

test.setTimeout(120_000)

test.beforeAll(async () => {
  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-vault-watch-e2e-'))
  writeFileSync(join(vaultDir, 'note-1.md'), '# Seed\n\n初始种子文件。\n')

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
    // 首启独立引导是整屏的，会挡住主界面断言 → 预置「已问过」标记
    localStorage.setItem('markcraft.onboardingProfile.v1', '1')
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

  // 进入编辑器（首页 WelcomePanel 不渲染文件树）
  await win.locator('button.aurora-sidebar-item[title="编辑器"]').click()
  await win.locator('.aurora-editor__empty-files').waitFor({ state: 'visible', timeout: 15_000 })
  await expect(win.getByText('note-1.md', { exact: false })).toBeVisible({ timeout: 15_000 })
})

test.afterAll(async () => {
  await app?.close()
  try { rmSync(vaultDir, { recursive: true, force: true }) } catch { /* 清理失败不阻断 */ }
})

test.describe('Electron Vault 文件监听（P4-C 集成）', () => {
  test('外部新增 .md → 文件树出现', async () => {
    // 模拟用户在资源管理器 / IDE 新建文件
    writeFileSync(join(vaultDir, 'external-add.md'), '# External\n\n外部新增的笔记。\n')
    // 监听：per-path 200ms 防抖 + FileStore 500ms reload 防抖 + IPC + 重渲染
    // 给足 5s，避免在 Windows 慢盘上首触不可见
    await expect(win.getByText('external-add.md', { exact: false })).toBeVisible({ timeout: 8_000 })
  })

  test('外部删除 .md → 文件树移除', async () => {
    rmSync(join(vaultDir, 'note-1.md'))
    // 等待 200ms 事件防抖 + 500ms reload 防抖 + IPC + 重渲染
    await expect(win.getByText('note-1.md', { exact: false })).toHaveCount(0, { timeout: 8_000 })
  })
})

import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 11 · Electron Vault 存储（P4 集成）
 *
 * 验证「打开 Vault → 真实 .md 读进文件树」这一加载分支在**真实桌面壳**成立。
 *
 * ⚠️ 不弹原生对话框（headless 无法安全交互）：改用 `addInitScript` 把 Vault 根路径写进
 *    localStorage（`markcraft.lastVault`），再 `reload` 让 FileStore 的加载分支读到它、
 *    从磁盘建树。写入路径（编辑落盘）由 `vaultService.test.ts` 的单元测试严格覆盖。
 *
 * 前置：`npm run electron:compile` 产出 `out/main` 与 `out/preload`。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page
let vaultDir: string

test.setTimeout(120_000)

test.beforeAll(async () => {
  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-vault-e2e-'))
  writeFileSync(join(vaultDir, 'note-1.md'), '# From Disk\n\n这篇笔记来自真实磁盘文件。\n')
  mkdirSync(join(vaultDir, 'sub'))
  writeFileSync(join(vaultDir, 'sub', 'note-2.md'), '# Nested\n\n子目录里的笔记。\n')
  // 点开头项不应进树
  mkdirSync(join(vaultDir, '.markcraft'))
  writeFileSync(join(vaultDir, '.markcraft', 'config.json'), '{}')

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({ args: [MAIN_MJS], env })
  win = await app.firstWindow()
  // 在应用脚本运行前把 Vault 根写进 localStorage，reload 后让加载分支读到
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
})

test.afterAll(async () => {
  await app?.close()
  try {
    rmSync(vaultDir, { recursive: true, force: true })
  } catch {
    /* 清理失败不阻断 */
  }
})

test.describe('Electron Vault 存储（P4 集成）', () => {
  // 首页是「欢迎」面板（WelcomePanel），不渲染文件树；进入编辑器（无活动文件时
  // 显示 EditorEmptyState → EmptyFileBrowser：扁平列表，分组展示根目录 / 子目录
  // 文件，无需展开）。故三条断言都在点击侧栏「编辑器」之后进行。
  test.beforeEach(async () => {
    const editorNav = win.locator('button.aurora-sidebar-item[title="编辑器"]')
    await editorNav.click()
    // 等空态文件浏览器挂载
    await win.locator('.aurora-editor__empty-files').waitFor({ state: 'visible', timeout: 15_000 })
  })

  test('文件树读入磁盘上的真实 .md（根目录）', async () => {
    await expect(win.getByText('note-1.md', { exact: false })).toBeVisible({ timeout: 15_000 })
  })

  test('文件树递归读入子目录里的 .md（扁平分组，无需展开）', async () => {
    await expect(win.getByText('note-2.md', { exact: false })).toBeVisible({ timeout: 15_000 })
    // 子目录文件夹名作为分组标题可见
    await expect(win.locator('.aurora-emptyfiles__group-title', { hasText: 'sub' })).toBeVisible()
  })

  test('点开头项（.markcraft）不出现在文件树', async () => {
    // 配置目录不应作为可见文件/文件夹渲染（扁平列表也只列 .md）
    const count = await win.locator('text=.markcraft').count()
    expect(count).toBe(0)
  })
})

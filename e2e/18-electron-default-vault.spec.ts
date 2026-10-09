import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * 18 · 安装向导「默认存储位置」被应用采用（集成）
 *
 * 链路：安装包把用户选的路径写到 `$INSTDIR\default-vault.txt`
 * （= `dirname(process.resourcesPath)/default-vault.txt`）→ 应用首启、**从未选过 Vault** 时
 * 读取并采用为 Vault → 文件树出现该目录下的笔记。
 *
 * 用**打包产物**测（开发态 `process.resourcesPath` 指向 electron 分发目录，语义不同）：
 * 直接在 exe 同级写 `default-vault.txt` 模拟安装向导的产物。
 * 用 `--user-data-dir` 隔离 → 保证 localStorage 里没有 `lastVault`（= 首次启动）。
 *
 * 前置：`npm run electron:pack`（或 dist）。
 */

/** 与 13 号用例同源：取**最新**的打包产物（按 **exe 文件自身** mtime 降序） */
function findPackagedExe(): string | null {
  const exeNames = ['MarkCraft.exe', 'markcraft.exe']
  const roots = readdirSync(process.cwd(), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^release/.test(d.name))
    .map((d) => join(process.cwd(), d.name))
  const found: { path: string; mtime: number }[] = []
  for (const dir of roots) {
    for (const exe of exeNames) {
      const p = join(dir, 'win-unpacked', exe)
      if (existsSync(p)) {
        let mtime = 0
        try {
          mtime = statSync(p).mtimeMs
        } catch {
          /* 不可读 → 视为最旧 */
        }
        found.push({ path: p, mtime })
        break
      }
    }
  }
  found.sort((a, b) => b.mtime - a.mtime)
  return found[0]?.path ?? null
}

const PACKAGED_EXE = findPackagedExe()

let app: ElectronApplication
let win: Page
let vaultDir: string
let userDataDir: string
let defaultVaultFile: string

test.setTimeout(120_000)

test.beforeAll(async () => {
  if (!PACKAGED_EXE) return

  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-defvault-'))
  writeFileSync(join(vaultDir, 'setup-note.md'), '# 来自安装向导默认位置\n\n正文。\n')

  // 模拟安装向导 customInstall 的产物：exe 同级的 default-vault.txt（UTF-16LE，与 NSIS
  // 的 FileWriteUTF16LE 一致 —— 见 build/installer.nsh）
  defaultVaultFile = join(dirname(PACKAGED_EXE), 'default-vault.txt')
  writeFileSync(defaultVaultFile, Buffer.from(vaultDir, 'utf16le'))

  userDataDir = mkdtempSync(join(tmpdir(), 'markcraft-defvault-ud-'))

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({
    executablePath: PACKAGED_EXE,
    args: [`--user-data-dir=${userDataDir}`],
    env,
  })
  win = await app.firstWindow()
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
  // 清掉模拟文件：否则会残留、影响后续打包态用例
  try {
    if (defaultVaultFile) rmSync(defaultVaultFile, { force: true })
  } catch {
    /* 清理失败不阻断 */
  }
  for (const d of [vaultDir, userDataDir]) {
    try {
      if (d) rmSync(d, { recursive: true, force: true })
    } catch {
      /* 清理失败不阻断 */
    }
  }
})

test.describe('安装向导默认存储位置（集成）', () => {
  test.skip(!PACKAGED_EXE, '未找到 release*/win-unpacked 打包产物（先跑 npm run electron:pack）')

  test('主进程读取 default-vault.txt 并正确解码（UTF-16LE）', async () => {
    const got = await win.evaluate(() => window.markcraft!.setup!.defaultVault())
    expect(got).toBe(vaultDir)
  })

  test('首启（无 lastVault）采用该目录为 Vault → 文件列表出现其笔记，且顶部显示存储位置', async () => {
    // 进入编辑器（首页 WelcomePanel 不渲染文件列表）
    await win.locator('button.aurora-sidebar-item[title="编辑器"]').click()
    // ⚠️ 未打开文档时，文件列表由 `.aurora-editor__empty-files`（EmptyFileBrowser）渲染；
    //    `.aurora-filetree__item`（左缘 hover 浮层）只在编辑态出现，故这里断言前者。
    await expect(win.locator('.aurora-editor__empty-files')).toContainText('setup-note.md', {
      timeout: 20_000,
    })
    // 顶部「当前存储位置」= 该 Vault 路径（用户能一眼看到文件到底存在哪）
    await expect(win.locator('.aurora-emptyfiles__storage-path')).toHaveText(vaultDir, {
      timeout: 15_000,
    })
  })

  test('在该 Vault 内新建笔记 → 真实落盘到该目录（用户报的 bug 复现点）', async () => {
    await win.locator('.aurora-editor__filename-input').fill('新建的笔记')
    await win.locator('.aurora-editor__newfile-btn').click()

    const created = join(vaultDir, '新建的笔记.md')
    await expect.poll(() => existsSync(created), { timeout: 15_000 }).toBe(true)
  })
})

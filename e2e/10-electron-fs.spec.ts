import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 10 · Electron 文件系统（P3）
 *
 * 验证「打通 fs」这一层在**真实桌面壳**里成立：
 *   - preload 暴露 `window.markcraft.fs` / `dialog` / `shell`；
 *   - readDirectory 能读真实目录树（含子目录）；
 *   - writeFile 走**原子写**（临时文件 + rename，不残留 .tmp）且自动建父目录；
 *   - exists 对不存在路径返回 false 而非抛错；
 *   - revealInFolder（打开原文件所在位置）对真实文件返回 true，对幽灵路径返回 false。
 *
 * ⚠️ 不在此 invoke `dialog.openDirectory / openFile / saveFile`：它们会弹出
 *   原生对话框并**阻塞**无显示环境，无法在 E2E 中安全交互。其能力由 P3 平台层 +
 *   主进程 handler 保证，UI 交互留待人工冒烟。
 *
 * 前置：`npm run electron:compile` 产出 `out/main` 与 `out/preload`。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page
let vaultDir: string
let rootMd: string
let subMd: string

test.setTimeout(120_000)

test.beforeAll(async () => {
  // 准备一个临时 Vault：根目录两个 .md + 一个子目录（含一个 .md）
  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-vault-'))
  rootMd = join(vaultDir, 'index.md')
  writeFileSync(rootMd, '# Vault Root\n')
  writeFileSync(join(vaultDir, 'note-a.md'), 'note a\n')
  mkdirSync(join(vaultDir, 'sub'))
  subMd = join(vaultDir, 'sub', 'note-b.md')
  writeFileSync(subMd, 'note b\n')

  // ⚠️ 同 09：剥离 ELECTRON_RUN_AS_NODE（否则 Electron 退化为纯 Node），并关 GPU / 沙箱
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({ args: [MAIN_MJS], env })
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
  try {
    rmSync(vaultDir, { recursive: true, force: true })
  } catch {
    /* 清理失败不阻断 */
  }
})

test.describe('Electron 文件系统（P3）', () => {
  test('preload 暴露 window.markcraft.fs / dialog / shell', async () => {
    const ok = await win.evaluate(
      () =>
        typeof window.markcraft?.fs?.readDirectory === 'function' &&
        typeof window.markcraft?.fs?.writeFile === 'function' &&
        typeof window.markcraft?.dialog?.openDirectory === 'function' &&
        typeof window.markcraft?.shell?.showItemInFolder === 'function',
    )
    expect(ok).toBe(true)
  })

  test('readDirectory 读取真实目录树（含子目录）', async () => {
    const entries = (await win.evaluate((dir) => window.markcraft!.fs.readDirectory(dir), vaultDir)) as Array<{
      name: string
      path: string
      isDirectory: boolean
      isFile: boolean
    }>
    const names = entries.map((e) => e.name)
    expect(names).toContain('index.md')
    expect(names).toContain('note-a.md')
    expect(names).toContain('sub')

    const sub = entries.find((e) => e.name === 'sub')
    expect(sub?.isDirectory).toBe(true)
    expect(sub?.path).toBe(join(vaultDir, 'sub'))
  })

  test('readDirectory(recursive) 递归收集子目录里的文件', async () => {
    const entries = (await win.evaluate(
      (dir) => window.markcraft!.fs.readDirectory(dir, { recursive: true }),
      vaultDir,
    )) as Array<{ name: string; path: string; isDirectory: boolean }>
    const paths = entries.map((e) => e.path)
    expect(paths).toContain(subMd)
  })

  test('writeFile + readFile 往返（父目录自动创建 + 原子写不残留 .tmp）', async () => {
    const deepMd = join(vaultDir, 'out', 'deep', 'result.md')
    await win.evaluate(
      ([p, content]) => window.markcraft!.fs.writeFile(p, content),
      [deepMd, 'hello fs\n'] as [string, string],
    )
    const got = (await win.evaluate((p) => window.markcraft!.fs.readFile(p), deepMd)) as string
    expect(got).toBe('hello fs\n')

    // 原子写：写完后该层目录不应有任何 .tmp 残留
    const outDir = join(vaultDir, 'out')
    const leftover = (await win.evaluate(
      (dir) => window.markcraft!.fs.readDirectory(dir).then((es) => es.some((e) => e.name.endsWith('.tmp'))),
      outDir,
    )) as boolean
    expect(leftover).toBe(false)
  })

  test('exists 对不存在路径返回 false，对真实路径返回 true（不抛错）', async () => {
    const missing = (await win.evaluate((p) => window.markcraft!.fs.exists(p), join(vaultDir, 'ghost.md'))) as boolean
    expect(missing).toBe(false)
    const present = (await win.evaluate((p) => window.markcraft!.fs.exists(p), rootMd)) as boolean
    expect(present).toBe(true)
  })

  test('revealInFolder（打开原文件所在位置）：真实文件返回 true，幽灵路径返回 false', async () => {
    const real = (await win.evaluate((p) => window.markcraft!.shell.showItemInFolder(p), rootMd)) as boolean
    expect(real).toBe(true)
    const fake = (await win.evaluate((p) => window.markcraft!.shell.showItemInFolder(p), join(vaultDir, 'ghost.md'))) as boolean
    expect(fake).toBe(false)
  })
})

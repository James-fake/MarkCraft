import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 13 · Electron 打包产物冒烟（P5）
 *
 * 验证 `electron-builder --dir` 产出的**真实打包应用**能起来并正确渲染 —— 这是
 * 单靠 dev/`--dist` 起窗覆盖不到的一层：打包后渲染进程经 `app.isPackaged` 走
 * `loadFile(dist/index.html)`（file:// 协议），若 vite 产物用了绝对 `/assets/...`
 * 就会白屏。本用例专门守这条（对应 vite.config 生产 `base: './'`）。
 *
 * 前置：`npm run electron:pack`（= build + electron:compile + electron-builder --dir）
 *   产出 `release` 目录下的 `win-unpacked/MarkCraft.exe`。
 * 若产物不存在（如 CI 未跑打包），用例 **skip** 而非 fail —— 打包冒烟是可选重活。
 */

function findPackagedExe(): string | null {
  const roots = readdirSync(process.cwd(), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^release/.test(d.name))
    .map((d) => d.name)
  const exeNames = ['MarkCraft.exe', 'markcraft.exe']
  for (const root of roots) {
    for (const exe of exeNames) {
      const p = join(process.cwd(), root, 'win-unpacked', exe)
      if (existsSync(p)) return p
    }
  }
  return null
}

const PACKAGED_EXE = findPackagedExe()

let app: ElectronApplication
let win: Page

test.setTimeout(120_000)

test.beforeAll(async () => {
  if (!PACKAGED_EXE) return
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'
  // 打包应用用 executablePath 启动（非 out/main/index.mjs）
  app = await electron.launch({ executablePath: PACKAGED_EXE, env })
  win = await app.firstWindow()
})

test.afterAll(async () => {
  await app?.close()
})

test.describe('Electron 打包产物冒烟（P5）', () => {
  test.skip(!PACKAGED_EXE, '未找到 release/win-unpacked 打包产物（先跑 npm run electron:pack）')

  test('打包应用起窗并渲染（非白屏：file:// 相对资源加载成功）', async () => {
    await win.waitForFunction(
      () => {
        const root = document.getElementById('aurora-root')
        return !!root && root.childElementCount > 0
      },
      undefined,
      { timeout: 60_000 },
    )
    // 冒烟：标题栏品牌名可见 → 说明渲染进程真正跑起来（而非资源 404 白屏）
    await expect(win.getByText('MarkCraft', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  })

  test('打包应用无渲染进程控制台错误（资源加载正常）', async () => {
    const errors: string[] = []
    win.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    // 触发一次导航式等待，收集稳态下的 console error
    await win.waitForTimeout(2_000)
    // 过滤掉与 SW / favicon 等无关噪音，只关心脚本/样式加载失败
    const fatal = errors.filter(
      (e) => /Failed to load|ERR_FILE_NOT_FOUND|net::ERR|is not defined|Cannot read/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})

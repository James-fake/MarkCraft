import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'node:path'

/**
 * 09 · Electron 桌面壳（P2）
 *
 * 与其余 spec 不同：这里**不开浏览器**，而是用 Playwright 的 Electron 驱动真实启动
 * 桌面壳，验证其它套件永远测不到的那一层：
 *   - 无边框窗口能起、渲染进程能加载；
 *   - preload 注入了 `window.markcraft`（平台层据此分派到 electron 实现）；
 *   - 窗口控制经 **IPC 真实生效**（浏览器侧只能降级为「失焦 / 全屏」）；
 *   - 安全基线（contextIsolation 开、渲染进程无 node 集成）。
 *
 * ⚠️ 前置：`npm run electron:compile` 产出 `out/main` 与 `out/preload`。
 *    dev 模式下窗口加载 Vite dev server（playwright.config 的 webServer 会复用 / 拉起）。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

let app: ElectronApplication
let win: Page

test.setTimeout(120_000)

test.beforeAll(async () => {
  // ⚠️ 两个本环境必备的开关（缺一都会「启动即崩」）：
  //  - ELECTRON_RUN_AS_NODE：若被设为 1，Electron 退化为纯 Node，app/BrowserWindow 全为 undefined；
  //  - MARKCRAFT_DISABLE_GPU：沙箱无可用 GPU，否则 GPU 进程崩溃会拖垮整个应用。
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'

  app = await electron.launch({ args: [MAIN_MJS], env })
  win = await app.firstWindow()
  // 应用就绪口径：#aurora-root 挂载 + 开屏退场
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
})

test.describe('Electron 桌面壳', () => {
  test('窗口启动并加载渲染进程（title 为 MarkCraft）', async () => {
    await expect(win.locator('#aurora-root')).toBeVisible()
    expect(await win.title()).toBe('MarkCraft')
  })

  test('preload 注入 window.markcraft（平台层据此走 electron 实现）', async () => {
    const injected = await win.evaluate(() => typeof window.markcraft?.window?.minimize === 'function')
    expect(injected).toBe(true)
  })

  test('安全基线：contextIsolation 开启，渲染进程拿不到 node 模块能力', async () => {
    const leaked = await win.evaluate(() => {
      const w = window as unknown as { require?: unknown; module?: unknown; exports?: unknown }
      return {
        hasRequire: typeof w.require !== 'undefined',
        hasModule: typeof w.module !== 'undefined',
        hasExports: typeof w.exports !== 'undefined',
      }
    })
    // 只断言 CJS 三件套不存在：Electron 会往隔离世界注入精简的 process（非 node 集成），
    // 故不以 process 作为判据，避免断言过严而误报。
    expect(leaked.hasRequire).toBe(false)
    expect(leaked.hasModule).toBe(false)
    expect(leaked.hasExports).toBe(false)
  })

  test('窗口最小化经 IPC 真实生效（浏览器侧只能降级为失焦）', async () => {
    await win.evaluate(() => window.markcraft!.window.minimize())
    await expect
      .poll(
        () =>
          app.evaluate(({ BrowserWindow }) => {
            const w = BrowserWindow.getAllWindows()[0]
            return w ? w.isMinimized() : null
          }),
        { timeout: 15_000 },
      )
      .toBe(true)

    // 还原，避免影响后续用例
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.restore())
  })

  test('窗口最大化切换经 IPC 真实生效，并可还原', async () => {
    const isMax = () =>
      app.evaluate(({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows()[0]
        return w ? w.isMaximized() : null
      })

    await win.evaluate(() => window.markcraft!.window.toggleMaximize())
    await expect.poll(isMax, { timeout: 15_000 }).toBe(true)

    await win.evaluate(() => window.markcraft!.window.toggleMaximize())
    await expect.poll(isMax, { timeout: 15_000 }).toBe(false)
  })
})

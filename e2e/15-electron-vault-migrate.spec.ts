import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 15 · IndexedDB → Vault 一次性迁移（P4-D 集成）
 *
 * 验证桌面端「检测到 IDB 旧笔记 → 弹引导 → 选文件夹迁移 → 真实 .md 落盘 + 采用为 Vault」。
 *
 * 手法：
 *  - 用 `--user-data-dir=<临时目录>` 隔离 IndexedDB（否则会读到开发机真实数据）；
 *  - 首启（IDB 空）后经 `win.evaluate` 把旧状态种进 IDB（`kv` 表 / key=`markcraft-file-manager`）；
 *  - `reload` → FileStore 的加载分支读到旧数据 → 弹迁移引导；
 *  - 原生目录对话框无法无头驱动 → 主进程经 `MARKCRAFT_TEST_OPEN_DIR` 注入目标目录（见 main）。
 *
 * 前置：`npm run electron:compile`。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')

const LEGACY_STATE = {
  rootFolder: {
    id: 'root', name: 'MarkCraft', type: 'folder', isExpanded: true, createdAt: 1, updatedAt: 1,
    children: [
      { id: 'f1', name: '旧笔记一.md', type: 'file', content: '# 一\n\n第一篇。\n', createdAt: 1, updatedAt: 1 },
      {
        id: 'd1', name: '归档', type: 'folder', isExpanded: true, createdAt: 1, updatedAt: 1,
        children: [{ id: 'f2', name: '旧笔记二.md', type: 'file', content: '# 二\n\n第二篇。\n', createdAt: 1, updatedAt: 1 }],
      },
    ],
  },
  tabs: [], activeTabId: null, searchQuery: '', sidebarVisible: true,
}

let app: ElectronApplication
let win: Page
let vaultDir: string
let userDataDir: string

test.setTimeout(120_000)

const waitMount = () =>
  win.waitForFunction(
    () => {
      const root = document.getElementById('aurora-root')
      return !!root && root.childElementCount > 0
    },
    undefined,
    { timeout: 60_000 },
  )

test.beforeAll(async () => {
  vaultDir = mkdtempSync(join(tmpdir(), 'markcraft-migrate-target-'))
  userDataDir = mkdtempSync(join(tmpdir(), 'markcraft-migrate-userdata-'))

  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'
  env.MARKCRAFT_TEST_OPEN_DIR = vaultDir

  app = await electron.launch({ args: [MAIN_MJS, `--user-data-dir=${userDataDir}`], env })
  win = await app.firstWindow()
  await waitMount()
  await win.locator('#mc-splash').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
  // 让首启的防抖 save（300ms）与指南迁移落定，避免它随后覆盖我们种入的数据
  await win.waitForTimeout(2500)

  // 种入 IDB 旧数据（此时应用已用 Dexie 建好 markcraft 库）
  await win.evaluate(async (json: string) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('markcraft')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put({ key: 'markcraft-file-manager', value: json })
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  }, JSON.stringify(LEGACY_STATE))

  // reload → 加载分支读到旧 IDB → 触发迁移引导
  await win.reload()
  await waitMount()
  await win.locator('#mc-splash').waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
})

test.afterAll(async () => {
  await app?.close()
  try { rmSync(vaultDir, { recursive: true, force: true }) } catch { /* 清理失败不阻断 */ }
  try { rmSync(userDataDir, { recursive: true, force: true }) } catch { /* 清理失败不阻断 */ }
})

const promptTitle = () => win.locator('.aurora-modal__title', { hasText: '迁移到本地文件夹' })

test.describe('IndexedDB → Vault 迁移（P4-D 集成）', () => {
  test('检测到 IDB 旧笔记 → 弹迁移引导', async () => {
    await expect(promptTitle()).toBeVisible({ timeout: 20_000 })
    // 文案含可迁移篇数（2 篇）
    await expect(win.locator('.aurora-modal__desc')).toContainText('2')
  })

  test('点「选择文件夹并迁移」→ 真实 .md 落盘 + 采用为 Vault', async () => {
    await win.getByRole('button', { name: '选择文件夹并迁移' }).click()

    const f1 = join(vaultDir, '旧笔记一.md')
    const f2 = join(vaultDir, '归档', '旧笔记二.md')
    await expect.poll(() => existsSync(f1), { timeout: 15_000 }).toBe(true)
    await expect.poll(() => existsSync(f2), { timeout: 15_000 }).toBe(true)
    expect(readFileSync(f1, 'utf-8')).toContain('第一篇')
    expect(readFileSync(f2, 'utf-8')).toContain('第二篇')

    // 迁移后引导关闭
    await expect(promptTitle()).toHaveCount(0, { timeout: 10_000 })
  })
})

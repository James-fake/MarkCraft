import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 17 · Pandoc sidecar（P6.2 集成）
 *
 * 验证 `window.markcraft.pandoc` → IPC → **主进程 spawn Pandoc** → 返回真 EPUB 字节。
 *
 * ⚠️ Pandoc 二进制约 225MB，**不入库**（`.gitignore` 忽略 `resources/pandoc/`），需先
 *    `npm run fetch:pandoc`。未下载时用例 **skip**（不 fail）—— 与 exportEpub 的回退
 *    策略一致：没有 Pandoc 时导出走内置最小 EPUB 生成器。
 *
 * 前置：`npm run electron:compile`。
 */

const MAIN_MJS = join(process.cwd(), 'out/main/index.mjs')
const PANDOC_BIN = join(process.cwd(), 'resources', 'pandoc', 'win', 'pandoc.exe')
const HAS_PANDOC = existsSync(PANDOC_BIN)

let app: ElectronApplication
let win: Page

test.setTimeout(120_000)

test.beforeAll(async () => {
  if (!HAS_PANDOC) return
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v
  }
  env.MARKCRAFT_DISABLE_GPU = '1'
  env.MARKCRAFT_NO_SANDBOX = '1'
  app = await electron.launch({ args: [MAIN_MJS], env })
  win = await app.firstWindow()
  await win.waitForFunction(() => {
    const root = document.getElementById('aurora-root')
    return !!root && root.childElementCount > 0
  }, undefined, { timeout: 60_000 })
})

test.afterAll(async () => {
  await app?.close()
})

test.describe('Pandoc sidecar（P6.2 集成）', () => {
  test.skip(!HAS_PANDOC, '未下载 Pandoc（先跑 npm run fetch:pandoc）')

  test('preload 暴露 pandoc，且主进程探测到可用', async () => {
    const has = await win.evaluate(() => typeof window.markcraft?.pandoc?.convert === 'function')
    expect(has).toBe(true)
    expect(await win.evaluate(() => window.markcraft!.pandoc.available())).toBe(true)
  })

  test('Markdown → EPUB：返回真 EPUB（ZIP，含 mimetype）', async () => {
    const result = await win.evaluate(async () => {
      const r = await window.markcraft!.pandoc.convert('# 标题\n\n正文段落。\n', 'markdown', 'epub')
      if (r.error || !r.buffer) return { error: r.error ?? 'no buffer' }
      const bytes = new Uint8Array(r.buffer)
      // EPUB 是 ZIP：前两字节应为 'PK'
      const magic = String.fromCharCode(bytes[0], bytes[1])
      // mimetype 条目以 stored（未压缩）方式靠前，文本里应能搜到
      const head = new TextDecoder('latin1').decode(bytes.slice(0, 256))
      return { error: null, magic, size: bytes.length, hasMimetype: head.includes('application/epub+zip') }
    })

    expect(result.error).toBeNull()
    expect(result.magic).toBe('PK')
    expect(result.hasMimetype).toBe(true)
    expect(result.size ?? 0).toBeGreaterThan(1000)
  })
})

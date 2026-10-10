import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * 19 · 日记输入不被回滚（时序回归锁）
 *
 * 真实事故（2026-10-10 用户报障）：在日记里输入「工作日记」，**几秒后最后两个字自己消失**。
 *
 * 成因：`useTiptapContentSync` 只比对「父级 value 是否 === 自己最后发出的值」，
 * 而编辑器的 onChange 有 **300ms 防抖** → 父级 value 天然落后于 `lastEmittedMd`。
 * 此时若有任何一次父级 value 变化（例如 Vault 重载把磁盘旧内容灌回 store），
 * 这个「滞后值」会被误判成「外部改动」→ `setContent(旧值)` → 把用户刚敲的字回滚掉。
 *
 * 修法：加两道闸 —— ① 命中「自己发出过的值」集合直接跳过；② 编辑器**聚焦中一律不回灌**。
 *
 * ⚠️ 这是时序缺陷，单测覆盖不到，必须走真机 E2E。
 * 前置：`npm run electron:compile`。
 */

let app: ElectronApplication
let win: Page
let vaultDir: string

test.beforeAll(async () => {
  vaultDir = mkdtempSync(join(tmpdir(), 'mc-diary-vault-'))
  app = await electron.launch({
    args: ['out/main/index.mjs', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'mc-diary-ud-'))}`],
    env: (() => {
      const e: Record<string, string> = {}
      for (const [k, v] of Object.entries(process.env)) {
        if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') e[k] = v
      }
      e.MARKCRAFT_DISABLE_GPU = '1'
      e.MARKCRAFT_NO_SANDBOX = '1'
      return e
    })(),
  })
  win = await app.firstWindow()
  await win.addInitScript((root) => {
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
})

test.afterAll(async () => {
  await app?.close()
  try {
    rmSync(vaultDir, { recursive: true, force: true })
  } catch {
    /* 清理失败不阻断 */
  }
})

test.describe('日记 · 输入不被回滚', () => {
  test('输入「工作日记」后等待数秒，内容不被截断（编辑器 + 磁盘都完整）', async () => {
    // 进日记面板
    await win.locator('button.aurora-sidebar-item[title="日记"]').click()
    const editorBody = win.locator('.ProseMirror')
    await editorBody.waitFor({ state: 'visible', timeout: 20_000 })

    await editorBody.click()
    await editorBody.type('工作日记')

    // 立刻确认输入进去了（否则失败原因就不是「回滚」而是「没输进去」）
    await expect(editorBody).toContainText('工作日记', { timeout: 5_000 })

    // ⚠️ 关键触发：从**外部**往 Vault 写一个 .md —— 这会合法触发整树重载，
    //    重载后 store 里当日日记的 content 会退回「磁盘上的旧值」。
    //    此时若同步逻辑把「滞后的父级 value」当外部改动回灌，用户刚敲的字就会被回滚。
    //    （这正是用户报障的真实链路：重载 → 回灌 → 丢字）
    writeFileSync(join(vaultDir, '__外部改动.md'), '# 外部\n')

    // 等足：外部改动防抖 500ms + 编辑器 300ms + 写盘 300ms + 回灌窗口
    await win.waitForTimeout(3000)

    // ① 编辑器里的内容必须还在（这正是用户报障的「几秒后自己消失」）
    await expect(editorBody).toContainText('工作日记')

    // ② 磁盘上的当日日记文件也必须完整
    const today = new Date()
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`
    // ⚠️ 日记落在 Vault 内的「日记」子文件夹里，不能只看根目录 → 递归查找
    const findDiary = (dir: string): string | null => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) {
          const hit = findDiary(p)
          if (hit) return hit
        } else if (e.name === `${ymd}.md`) {
          return p
        }
      }
      return null
    }
    await expect
      .poll(() => {
        const f = findDiary(vaultDir)
        return f ? readFileSync(f, 'utf-8') : ''
      }, { timeout: 10_000 })
      .toContain('工作日记')

    // ③ Vault 里不应出现内置「使用文档」文件夹（说明书不落盘）
    const names = readdirSync(vaultDir)
    expect(names.some((n) => n.includes('使用文档'))).toBe(false)
  })
})

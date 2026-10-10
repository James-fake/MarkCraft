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

    // 分批输入：第一批让「首次输入即建文件」的草稿流转成真实文件（fileId 从 undefined 提升），
    // 第二批用于验证光标位置没被拽走。
    await editorBody.type('工作')
    await win.waitForTimeout(1500) // 越过建文件 + 提升窗口
    await editorBody.type('日记')

    // 立刻确认顺序正确（若光标被拽回开头，这里会看到 "日记工作" 而失败）
    await expect(editorBody).toContainText('工作日记', { timeout: 5_000 })

    // ⚠️ 关键触发（这才是用户报障的真实链路）：**从外部把当日日记文件改成别的内容**。
    //    这会合法触发整树重载 → store 里该日记的 value 变成「外部内容」，
    //    它与本编辑器发出过的任何值都不相等（echo=false），而此刻用户**仍在聚焦打字**。
    //    旧逻辑此时会把它当「外部改动」回灌：setContent(外部内容)（丢字）
    //    + setTextSelection(0)（光标跳回开头）—— 正是用户看到的两个现象。
    const diaryFile = (() => {
      const find = (dir: string): string | null => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const q = join(dir, e.name)
          if (e.isDirectory()) {
            const hit = find(q)
            if (hit) return hit
          } else if (/^\d{4}-\d{2}-\d{2}\.md$/.test(e.name)) return q
        }
        return null
      }
      return find(vaultDir)
    })()
    expect(diaryFile, '第一批输入应已建出当日日记文件').toBeTruthy()

    // ⚠️ 必须先等 >3s：主进程对「应用自己刚写过的路径」有 3s 抑制窗口
    //    （selfWrites TTL），在窗口内从外部改同一路径会被当成回声吞掉，触发不了重载。
    await win.waitForTimeout(4000)
    writeFileSync(diaryFile as string, '# 外部改写\n')

    // 等足：外部改动防抖 500ms + 重载 + 回灌窗口
    await win.waitForTimeout(2500)

    // ① 编辑器里的内容必须还在（这正是用户报障的「几秒后自己消失」）
    await expect(editorBody).toContainText('工作日记')

    // 继续敲一个字：既验证光标没被拽回开头（会追加到末尾而非插到最前），
    // 也让「编辑器里的草稿」回写到 store/磁盘（外部改动后需要一次输入才会回写）
    await editorBody.type('！')
    await expect(editorBody).toContainText('工作日记！')

    // ①b 绝不能变成外部内容（那正是回灌丢字的证据）
    await expect(editorBody).not.toContainText('外部改写')

    // 光标必须在**末尾**（正是用户报障的「光标自动回到开头」）
    const caretAtEnd = await win.evaluate(() => {
      const el = document.querySelector('.ProseMirror')
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0) return -1
      const text = el.textContent ?? ''
      const range = sel.getRangeAt(0)
      const pre = range.cloneRange()
      pre.selectNodeContents(el)
      pre.setEnd(range.endContainer, range.endOffset)
      return pre.toString().length === text.length ? 1 : 0
    })
    expect(caretAtEnd, '输入后光标应停在末尾，而不是被拽回开头').toBe(1)


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

/**
 * backupService · 恢复结果的落盘确认（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-11-08 审查 M-C-2，数据完整性）：
 *
 * 桌面 Vault 模式下 `persistFiles` 只把树交回 FileStore（`runtimeFilesApplier`），
 * 真正的写盘发生在后续 syncTree 的 300ms 防抖里。旧实现的 applier 是 `void` 返回、
 * `persistFiles` 也不 await —— 恢复流程在文件落盘前就宣告成功，用户此刻退出应用，
 * 刚恢复的文件全部丢失。
 *
 * 本文件锁死：
 *   ① applier 返回 Promise 时，`importVaultWithStrategy` 必须等它 resolve 才算完成；
 *   ② `flushVault()` 必须等挂起的写入结束（退出前冲刷的语义）。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { FileManagerState } from '../types/fileManager'
import { bindRuntimeFiles, flushVault, importVaultWithStrategy } from './backupService'
import { kvClear } from '@core/storage/kv'

const T = 1700000000000

function runtimeState(): FileManagerState {
  return {
    rootFolder: {
      id: 'root',
      name: 'root',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [
        { id: 'a', name: 'a.md', type: 'file', content: '# a', createdAt: T, updatedAt: T },
      ],
    },
    tabs: [],
    activeTabId: null,
    searchQuery: '',
    sidebarVisible: true,
  }
}

function backupJson(): string {
  return JSON.stringify({
    version: '1.0',
    type: 'markcraft-vault-backup',
    exportedAt: new Date().toISOString(),
    data: { files: runtimeState() },
  })
}

/** 一个只能由测试手动放行的 Promise */
function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

beforeEach(async () => {
  localStorage.clear()
  await kvClear()
})

afterEach(() => {
  bindRuntimeFiles(null, null)
})

describe('backupService · 恢复落盘必须可等待', () => {
  it('applier 返回 Promise 时，恢复流程等它完成才 resolve（修复前提前返回）', async () => {
    const write = deferred()
    const applied: FileManagerState[] = []
    bindRuntimeFiles(
      () => runtimeState(),
      (next) => {
        applied.push(next)
        return write.promise
      },
    )

    let settled = false
    const importing = importVaultWithStrategy(backupJson(), 'overwrite').then((r) => {
      settled = true
      return r
    })

    await tick()
    expect(applied).toHaveLength(1)
    // 修复前：persistFiles 不 await applier → 此处已 settled=true
    expect(settled).toBe(false)

    write.release()
    const result = await importing
    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(1)
  })

  it('flushVault 等待挂起写入结束（退出前冲刷）', async () => {
    const write = deferred()
    bindRuntimeFiles(() => runtimeState(), () => write.promise)

    const importing = importVaultWithStrategy(backupJson(), 'overwrite')
    await tick()

    let flushed = false
    const flushing = flushVault().then(() => {
      flushed = true
    })
    await tick(10)
    expect(flushed).toBe(false)

    write.release()
    await flushing
    expect(flushed).toBe(true)
    await importing
  })

  it('无挂起写入时 flushVault 立即完成（不阻塞退出）', async () => {
    bindRuntimeFiles(() => runtimeState(), () => undefined)
    await expect(flushVault()).resolves.toBeUndefined()
  })
})

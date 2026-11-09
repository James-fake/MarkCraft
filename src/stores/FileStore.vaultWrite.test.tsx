/**
 * FileStore · Vault 载入顺序 与 恢复落盘的可等待性（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-11-08 审查 M-C-2 / M-C-3，数据完整性）：
 *
 * ① `hydrateFromVault` 曾用 `void platform.vault?.registerRoot(root)` 后立刻
 *    `loadVault(root)`。两者是**两次独立 IPC invoke**，主进程可并发处理 ——
 *    readDir 完全可能先到、命中白名单缺位被整体拒绝（注释声称的顺序性不成立）。
 *
 * ② 恢复备份/导入时 `runtimeFilesApplier` 只把树塞回内存就返回，写盘留给
 *    syncTree 的 300ms 防抖。用户在这个窗口内退出应用，刚恢复的文件全部丢失。
 *    applier 现在必须 await 落盘冲刷（flushSync），恢复流程才 resolve。
 *
 * 夹具：mock 掉 platform 与 vaultService（只验证编排顺序，不重复测真实写盘 ——
 * 后者由 vaultService.test.ts 覆盖）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { FileNode } from '../types/fileManager'
import { kvClear } from '@core/storage/kv'

const h = vi.hoisted(() => {
  const registerRoot = vi.fn()
  return {
    registerRoot,
    loadVault: vi.fn(),
    checkVaultWritable: vi.fn(),
    syncTree: vi.fn(),
    flushSync: vi.fn(),
    readLastVault: vi.fn(),
    platform: {
      kind: 'electron' as const,
      app: { userData: async () => null },
      setup: { defaultVault: async () => null },
      vault: { registerRoot },
      fs: { watch: () => () => {} },
      dialog: { openDirectory: async () => null },
    },
  }
})

vi.mock('../platform', () => ({ platform: h.platform }))
vi.mock('../services/vaultService', () => ({
  loadVault: h.loadVault,
  syncTree: h.syncTree,
  flushSync: h.flushSync,
  resetSync: vi.fn(),
  readLastVault: h.readLastVault,
  persistVaultRoot: vi.fn(),
  readSetupVaultApplied: vi.fn(() => null),
  markSetupVaultApplied: vi.fn(),
  checkVaultWritable: h.checkVaultWritable,
  flattenNotes: vi.fn(() => []),
}))

// 必须在 mock 之后 import（FileStore 会拿到 mock 版 platform / vaultService）
import { LanguageProvider } from './LanguageStore'
import { UndoRedoProvider } from './UndoRedoStore'
import { FileManagerProvider, useFileManager } from './FileStore'
import { importVaultWithStrategy } from '../services/backupService'

const T = 1700000000000

function vaultTree(): FileNode {
  return {
    id: 'root',
    name: 'vault',
    type: 'folder',
    createdAt: T,
    updatedAt: T,
    children: [
      { id: 'a', name: 'a.md', type: 'file', content: '# a', createdAt: T, updatedAt: T },
    ],
  }
}

function backupJson(): string {
  return JSON.stringify({
    version: '1.0',
    type: 'markcraft-vault-backup',
    exportedAt: new Date().toISOString(),
    data: {
      files: {
        rootFolder: {
          id: 'root2',
          name: 'vault',
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            { id: 'b', name: 'b.md', type: 'file', content: '# b', createdAt: T, updatedAt: T },
          ],
        },
        tabs: [],
        activeTabId: null,
        searchQuery: '',
        sidebarVisible: true,
      },
    },
  })
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <UndoRedoProvider>
        <FileManagerProvider>{children}</FileManagerProvider>
      </UndoRedoProvider>
    </LanguageProvider>
  )
}

beforeEach(async () => {
  localStorage.clear()
  await kvClear()
  h.registerRoot.mockReset()
  h.loadVault.mockReset().mockResolvedValue(vaultTree())
  h.checkVaultWritable.mockReset().mockResolvedValue(true)
  h.syncTree.mockReset()
  h.flushSync.mockReset().mockResolvedValue(undefined)
  h.readLastVault.mockReset().mockReturnValue('C:/vault')
})

afterEach(() => {
  cleanup()
})

describe('FileStore · Vault 根登记必须先于载入', () => {
  it('registerRoot 未 resolve 前不得开始 loadVault（修复前并发 invoke 抢跑）', async () => {
    const gate = deferred()
    h.registerRoot.mockImplementation(() => gate.promise)

    renderHook(() => useFileManager(), { wrapper: Wrapper })

    await waitFor(() => expect(h.registerRoot).toHaveBeenCalledWith('C:/vault'))
    // 登记仍在飞行中：此时不得发起 loadVault
    expect(h.loadVault).not.toHaveBeenCalled()

    gate.release()
    await waitFor(() => expect(h.loadVault).toHaveBeenCalledWith('C:/vault'))
  })

  it('registerRoot 失败也继续载入（失败仅记日志，不阻断启动）', async () => {
    h.registerRoot.mockRejectedValue(new Error('denied'))
    renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(h.loadVault).toHaveBeenCalledWith('C:/vault'))
  })

  it('[回归] checkVaultWritable 探针必须在 registerRoot 之后（否则白名单缺位误报不可写）', async () => {
    // 真实事故（2026-11-09 v11）：探针写走 mc:fs:writeFile → assertAllowedPath，
    // 若在 registerRoot 之前跑，根不在白名单 → OUT_OF_BOUNDS → 误报「无法写入」。
    const order: string[] = []
    h.registerRoot.mockImplementation(async () => {
      order.push('registerRoot')
    })
    h.checkVaultWritable.mockImplementation(async () => {
      order.push('checkVaultWritable')
      return true
    })
    h.loadVault.mockImplementation(async () => {
      order.push('loadVault')
      return vaultTree()
    })

    renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(h.loadVault).toHaveBeenCalled())

    const iRegister = order.indexOf('registerRoot')
    const iWritable = order.indexOf('checkVaultWritable')
    const iLoad = order.indexOf('loadVault')
    expect(iRegister).toBeGreaterThanOrEqual(0)
    expect(iWritable).toBeGreaterThanOrEqual(0)
    expect(iRegister).toBeLessThan(iWritable)
    expect(iWritable).toBeLessThan(iLoad)
  })
})

describe('FileStore · 恢复备份必须等到写盘冲刷完成', () => {
  it('applier 会 await flushSync；恢复流程在冲刷结束前不 resolve', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    const gate = deferred()
    h.flushSync.mockImplementation(() => gate.promise)

    let settled = false
    const importing = importVaultWithStrategy(backupJson(), 'overwrite').then((r) => {
      settled = true
      return r
    })

    // applier 恢复后必须触发一次落盘冲刷（修复前 applier 只 setState，从不 flush）
    await waitFor(() => expect(h.flushSync).toHaveBeenCalled())
    expect(settled).toBe(false)

    gate.release()
    const res = await importing
    expect(res.success).toBe(true)
    // 恢复的树已进入内存 state
    expect(result.current.rootFolder.children?.map((c) => c.name)).toContain('b.md')
  })
})

/**
 * 旧 IndexedDB 一次性搬迁 · 空库守卫（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-11-08 审查 M-C-1，数据完整性）：
 *
 * `indexedDB.open(name)` **不带 version** 时，库不存在会新建一个空库并触发
 * `onupgradeneeded`。旧实现对此不设防：`readAll` 对缺失 store 返回 `[]`，四类数据
 * 全部「读空」后仍然 `markDone()` —— 等于把「没有旧数据」永久钉死。若用户之后
 * 回滚/降级、或旧库来自另一个 profile 被复制回来，数据再也无法迁移（启动即跳过）。
 *
 * 本文件锁死：
 *   ① 本次 open 新建了库（onupgradeneeded）→ 视为无旧数据，**不置标记**（可重试）；
 *   ② 库存在但一个预期对象仓库都没有 → 同上；
 *   ③ 真有旧库 → 正常搬迁并置标记（守卫不误伤）；
 *   ④ 已置标记 → 直接跳过，不再 open。
 *
 * jsdom 没有 indexedDB，这里注入一个最小假实现（只覆盖迁移用到的 API 面）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { StorageBackend } from './backend'
import { migrateLegacyIndexedDb } from './legacyIdbMigrate'

const DONE_KEY = 'markcraft-idb-to-disk-migrated'

type StoreData = Record<string, unknown[]>

interface FakeDb {
  objectStoreNames: { contains: (name: string) => boolean }
  transaction: (store: string) => { objectStore: () => { getAll: () => unknown } }
  close: () => void
}

function makeDb(stores: StoreData): FakeDb {
  return {
    objectStoreNames: {
      contains: (name: string) => Object.prototype.hasOwnProperty.call(stores, name),
    },
    transaction: (store: string) => ({
      objectStore: () => ({
        getAll: () => {
          // 真实 IDBRequest 是异步回调；这里用 setTimeout 保持同一时序语义
          const req: { result?: unknown[]; onsuccess?: () => void } = {}
          setTimeout(() => {
            req.result = stores[store] ?? []
            req.onsuccess?.()
          }, 0)
          return req
        },
      }),
    }),
    close: vi.fn(),
  }
}

/** 注入假 indexedDB；`existing` 为 undefined 表示库不存在（open 会新建空库） */
function installFakeIdb(opts: { existing?: StoreData; databasesApi?: boolean }) {
  const opened: FakeDb[] = []
  const open = vi.fn(() => {
    const req: {
      result?: FakeDb
      onsuccess?: () => void
      onupgradeneeded?: () => void
      onerror?: () => void
    } = {}
    setTimeout(() => {
      const db = makeDb(opts.existing ?? {})
      opened.push(db)
      req.result = db
      // 库不存在：先 upgradeneeded 再 success（与浏览器一致）
      if (!opts.existing) req.onupgradeneeded?.()
      req.onsuccess?.()
    }, 0)
    return req
  })
  const fake: Record<string, unknown> = { open }
  if (opts.databasesApi) {
    fake.databases = async () => (opts.existing ? [{ name: 'markcraft' }] : [])
  }
  Object.defineProperty(globalThis, 'indexedDB', {
    value: fake,
    configurable: true,
    writable: true,
  })
  return { open, opened }
}

function memoryBackend(): StorageBackend & { setText: ReturnType<typeof vi.fn> } {
  const map = new Map<string, string>()
  return {
    getText: async (k: string) => map.get(k) ?? null,
    setText: vi.fn(async (k: string, v: string) => {
      map.set(k, v)
    }),
    remove: async (k: string) => {
      map.delete(k)
    },
    keys: async () => [...map.keys()],
  } as unknown as StorageBackend & { setText: ReturnType<typeof vi.fn> }
}

const originalIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  if (originalIdb) Object.defineProperty(globalThis, 'indexedDB', originalIdb)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

describe('migrateLegacyIndexedDb · 空库守卫', () => {
  it('库不存在（open 新建空库）→ 返回 false 且**不置**迁移标记（保持可重试）', async () => {
    // 关键前提：没有 databases() API → legacyDbExists 保守返回 true，让 open 去判定
    installFakeIdb({})
    const backend = memoryBackend()

    await expect(migrateLegacyIndexedDb(backend)).resolves.toBe(false)
    // 修复前：走完空搬迁后 markDone() → 标记被永久置位，将来真有旧库也无法迁移
    expect(localStorage.getItem(DONE_KEY)).toBeNull()
    expect(backend.setText).not.toHaveBeenCalled()
  })

  it('库存在但没有任何预期对象仓库 → 同样不置标记（不是可迁移的旧库）', async () => {
    installFakeIdb({ existing: {}, databasesApi: true })
    const backend = memoryBackend()

    await expect(migrateLegacyIndexedDb(backend)).resolves.toBe(false)
    expect(localStorage.getItem(DONE_KEY)).toBeNull()
    expect(backend.setText).not.toHaveBeenCalled()
  })

  it('真有旧库（含 kv）→ 正常搬迁、写入后端并置标记（守卫不误伤）', async () => {
    installFakeIdb({
      existing: { kv: [{ key: 'markcraft-file-manager', value: '{"a":1}' }] },
      databasesApi: true,
    })
    const backend = memoryBackend()

    await expect(migrateLegacyIndexedDb(backend)).resolves.toBe(true)
    expect(backend.setText).toHaveBeenCalledWith('markcraft-file-manager', '{"a":1}')
    expect(localStorage.getItem(DONE_KEY)).toBe('done')
  })

  it('已置标记 → 直接跳过，连 open 都不再调用（幂等）', async () => {
    const { open } = installFakeIdb({
      existing: { kv: [{ key: 'k', value: 'v' }] },
      databasesApi: true,
    })
    localStorage.setItem(DONE_KEY, 'done')
    const backend = memoryBackend()

    await expect(migrateLegacyIndexedDb(backend)).resolves.toBe(false)
    expect(open).not.toHaveBeenCalled()
    expect(backend.setText).not.toHaveBeenCalled()
  })
})

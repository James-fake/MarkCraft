// L1 core/storage —— localStorage → IndexedDB 的大数据迁移，以及带降级的读写。
//
// Phase 1（2026-09-17）自 stores/storage/migrate.ts **原样下沉**（内容未作任何改写）：
// 同 db.ts —— 基建不应寄居在状态层，否则 services 必须反向引用 stores。
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 1。
import { idbAdapter } from './db'

const MIGRATION_KEY = 'markcraft-idb-migrated'

/**
 * 从 localStorage 迁移大数据到 IndexedDB
 * 迁移完成后保留 localStorage 副本（不删除，作为回滚保险）
 */
const KEYS_TO_MIGRATE = [
  'markcraft-file-manager',
  'graph-snapshots',
  'graph-view-snapshots',
]

export async function migrateToIndexedDB(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === 'done') return

  for (const key of KEYS_TO_MIGRATE) {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        await idbAdapter.setItem(key, value)
      } catch (e) {
        console.error(`[migrate] 迁移 ${key} 失败:`, e)
      }
    }
  }

  localStorage.setItem(MIGRATION_KEY, 'done')
}

/** 优先从 IndexedDB 读取，降级到 localStorage */
export async function loadLargeData(key: string): Promise<string | null> {
  const idbValue = await idbAdapter.getItem(key)
  if (idbValue !== null) return idbValue
  // 降级到 localStorage（首次访问未迁移时）
  return localStorage.getItem(key)
}

/** 存储大数据：同时写 IndexedDB（不写 localStorage 以节省配额） */
export async function saveLargeData(key: string, value: string): Promise<void> {
  try {
    await idbAdapter.setItem(key, value)
  } catch (e) {
    console.error(`[saveLargeData] IndexedDB 写入失败，降级 localStorage:`, e)
    try {
      localStorage.setItem(key, value)
    } catch {
      // localStorage 也满，忽略
    }
  }
}

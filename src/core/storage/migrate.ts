// L1 core/storage —— localStorage → 磁盘存储 的大数据迁移，以及带降级的读写。
//
// 原先这里是 localStorage → IndexedDB。移除网页形态后，存储介质换成**磁盘文件**
// （见 ./backend），但「大数据不放 localStorage」的分层不变：
//   - 小数据（设置/书签/最近文件）仍走 localStorage
//   - 大数据（文件树快照、图谱快照）走磁盘存储
import { getStorageBackend } from './backend'

const MIGRATION_KEY = 'markcraft-localstorage-migrated'

/**
 * 从 localStorage 迁移大数据到磁盘存储。
 * 迁移完成后**保留 localStorage 副本**（不删除，作为回滚保险）。
 */
const KEYS_TO_MIGRATE = [
  'markcraft-file-manager',
  'graph-snapshots',
  'graph-view-snapshots',
]

export async function migrateLocalStorageToStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === 'done') return

  const backend = await getStorageBackend()
  // ⚠️ 有任一键搬迁失败就不置 done（2026-11-03 审查 P2）：此前失败也写标记，
  //    后续启动不会再迁移，该键永久降级为 localStorage（5MB 上限）—— 大文件树会静默写失败。
  let allOk = true
  for (const key of KEYS_TO_MIGRATE) {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        await backend.setText(key, value)
      } catch (e) {
        allOk = false
        console.error(`[migrate] 迁移 ${key} 失败:`, e)
      }
    }
  }

  if (allOk) localStorage.setItem(MIGRATION_KEY, 'done')
}

/** 优先从磁盘存储读取，降级到 localStorage（首次访问尚未迁移时） */
export async function loadLargeData(key: string): Promise<string | null> {
  const backend = await getStorageBackend()
  const stored = await backend.getText(key)
  if (stored !== null) return stored
  return localStorage.getItem(key)
}

/** 存储大数据：写磁盘存储；失败时降级 localStorage（不丢数据） */
export async function saveLargeData(key: string, value: string): Promise<void> {
  try {
    const backend = await getStorageBackend()
    await backend.setText(key, value)
  } catch (e) {
    console.error(`[saveLargeData] 磁盘存储写入失败，降级 localStorage:`, e)
    try {
      localStorage.setItem(key, value)
    } catch {
      // localStorage 也满，忽略
    }
  }
}

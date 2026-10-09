// L1 core/storage —— 旧 IndexedDB（Dexie 时代）→ 磁盘存储的**一次性**数据搬迁。
//
// 为什么必须有：移除网页形态时删掉了 Dexie，但老用户的**知识库 / 白板 / 版本历史 / PDF**
// 都还躺在 IndexedDB 里。不搬就会「升级即丢数据」。
//
// 实现要点：
// - 用**原生 indexedDB API**（不依赖 Dexie —— 它正被移除）；
// - 库不存在就直接置标记跳过（新装用户零开销）；
// - 全部搬到新后端的同名/同前缀键上（kv 原样；versions/backups/blobs 加前缀）；
// - 完成后置 localStorage 标记，之后每次启动只读一个标记。
import type { StorageBackend } from './backend'
import { bytesToBase64, blobToBytes } from './base64'

const LEGACY_DB = 'markcraft'
const DONE_KEY = 'markcraft-idb-to-disk-migrated'

interface LegacyKv {
  key: string
  value: string
}
interface LegacyVersion {
  versionId: string
  fileId: string
  content: string
  timestamp: number
  operation: 'save' | 'manual' | 'auto'
  wordCount: number
  locked?: boolean
}
interface LegacyBackup {
  id?: number
  createdAt: number
  type: 'auto' | 'manual'
  data: string
}
interface LegacyBlob {
  pdfId: string
  fileId?: string
  blob: Blob
  name?: string
  createdAt: number
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, 'done')
  } catch {
    /* localStorage 不可用则下次再试，幂等 */
  }
}

/** 旧库是否存在（`indexedDB.databases()` 不可用时保守返回 true，让 open 去判定） */
async function legacyDbExists(): Promise<boolean> {
  const anyIdb = indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> }
  if (typeof anyIdb.databases !== 'function') return true
  try {
    const list = await anyIdb.databases()
    return list.some((d) => d.name === LEGACY_DB)
  } catch {
    return true
  }
}

function openLegacyDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(LEGACY_DB)
    } catch {
      resolve(null)
      return
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(store)) {
      resolve([])
      return
    }
    try {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve((req.result ?? []) as T[])
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

/**
 * 把旧 IndexedDB 的全部数据搬到给定后端。幂等；失败不抛（不阻断启动）。
 * 返回是否真的执行了搬迁（供日志/测试观察）。
 */
export async function migrateLegacyIndexedDb(backend: StorageBackend): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  try {
    if (localStorage.getItem(DONE_KEY) === 'done') return false
  } catch {
    return false
  }

  if (!(await legacyDbExists())) {
    markDone()
    return false
  }

  const db = await openLegacyDb()
  if (!db) {
    markDone()
    return false
  }

  try {
    // ① kv：键名原样搬（文件树快照、知识库、白板…）
    for (const row of await readAll<LegacyKv>(db, 'kv')) {
      if (row?.key) await backend.setText(row.key, row.value)
    }

    // ② versions：一条一个键（与 recordStore 的前缀一致）
    for (const r of await readAll<LegacyVersion>(db, 'versions')) {
      if (r?.versionId) await backend.setText('version:' + r.versionId, JSON.stringify(r))
    }

    // ③ backups：一条一个键，并修正自增序列（否则新备份会覆盖旧 id）
    const backups = await readAll<LegacyBackup>(db, 'backups')
    let maxId = 0
    for (const b of backups) {
      if (b?.id == null) continue
      maxId = Math.max(maxId, b.id)
      await backend.setText('backup:' + b.id, JSON.stringify(b))
    }
    if (maxId > 0) await backend.setText('backup-seq', String(maxId))

    // ④ blobs：Blob → base64（与 blobStore 的落盘形态一致）
    for (const b of await readAll<LegacyBlob>(db, 'blobs')) {
      if (!b?.pdfId || !b.blob) continue
      const bytes = await blobToBytes(b.blob)
      await backend.setText(
        'blob:' + b.pdfId,
        JSON.stringify({
          pdfId: b.pdfId,
          fileId: b.fileId,
          name: b.name,
          createdAt: b.createdAt,
          type: b.blob.type || 'application/pdf',
          dataBase64: bytesToBase64(bytes),
        }),
      )
    }
  } finally {
    try {
      db.close()
    } catch {
      /* 忽略 */
    }
  }

  markDone()
  return true
}

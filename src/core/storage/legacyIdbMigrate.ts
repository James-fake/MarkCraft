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
import { logger } from '@utils/logger'

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

/** 旧库里出现过的对象仓库；一个都没有 = 不是「有数据的老库」 */
const LEGACY_STORES = ['kv', 'versions', 'backups', 'blobs'] as const

interface OpenedLegacyDb {
  db: IDBDatabase
  /** 本次 open 触发了 onupgradeneeded → 库原本不存在，是被 open **新建**的空库 */
  created: boolean
}

function openLegacyDb(): Promise<OpenedLegacyDb | null> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    // ⚠️ 不带 version 的 open 在库不存在时会**新建**一个空库并触发 onupgradeneeded。
    //    必须记住这个信号：它不是「有旧库但为空」，而是「根本没有旧库」。
    let created = false
    try {
      req = indexedDB.open(LEGACY_DB)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = () => {
      created = true
    }
    req.onsuccess = () => resolve({ db: req.result, created })
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) {
      resolve([])
      return
    }
    try {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve((req.result ?? []) as T[])
      // ⚠️ 读取失败必须 reject（2026-11-03 审查 P1）：此前 resolve([]) 把「读不出来」
      //    当成「没有数据」，迁移照样 markDone —— 老用户的版本历史/备份被永久放弃。
      req.onerror = () => reject(new Error(`[migrate] 读取旧库 ${store} 失败`))
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
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

  const opened = await openLegacyDb()
  if (!opened) {
    // ⚠️ 打开失败**不得** markDone（2026-11-03 审查 P1）：onblocked（另一窗口占用旧库）
    //    与 onerror（库损坏/配额）都是可能自愈的瞬时失败。此前直接置 done 会让老用户的
    //    知识库/版本历史/PDF 永久留在死库里、再也不会重试（升级即静默丢数据）。
    //    保留标记 → 下次启动重试；只有「确认没有旧库」或「搬迁全部成功」才置 done。
    return false
  }

  // ⚠️ 空库守卫（2026-11-08 审查 M-C-1，数据完整性）：`indexedDB.open(name)` 不带
  //    version 时，库不存在会**新建**一个空库（onupgradeneeded 触发）。此前该分支继续
  //    往下读 → 所有 readAll 都拿到空数组 → 照样 markDone()，等于把「没有旧数据」
  //    永久钉死。若用户之后回滚/降级、或旧库来自另一个 profile 被复制回来，
  //    数据将再也无法迁移（标记已置，启动即跳过）。
  //    同理：库存在但一个预期对象仓库都没有（被其它模块/版本建过）也不是可迁移的旧库。
  //    两者都视为「本次无旧数据」—— 安全退出、**不置标记**，保持可重试（幂等、零写入）。
  const hasLegacyStore = LEGACY_STORES.some((s) => opened.db.objectStoreNames.contains(s))
  if (opened.created || !hasLegacyStore) {
    try {
      opened.db.close()
    } catch {
      /* 忽略 */
    }
    logger.info('[migrate] 未发现可迁移的旧 IndexedDB（空库/无预期仓库），保留重试机会')
    return false
  }

  try {
    // ① kv：键名原样搬（文件树快照、知识库、白板…）
    for (const row of await readAll<LegacyKv>(opened.db, 'kv')) {
      if (row?.key) await backend.setText(row.key, row.value)
    }

    // ② versions：一条一个键（与 recordStore 的前缀一致）
    for (const r of await readAll<LegacyVersion>(opened.db, 'versions')) {
      if (r?.versionId) await backend.setText('version:' + r.versionId, JSON.stringify(r))
    }

    // ③ backups：一条一个键，并修正自增序列（否则新备份会覆盖旧 id）
    const backups = await readAll<LegacyBackup>(opened.db, 'backups')
    let maxId = 0
    for (const b of backups) {
      if (b?.id == null) continue
      maxId = Math.max(maxId, b.id)
      await backend.setText('backup:' + b.id, JSON.stringify(b))
    }
    if (maxId > 0) await backend.setText('backup-seq', String(maxId))

    // ④ blobs：Blob → base64（与 blobStore 的落盘形态一致）
    for (const b of await readAll<LegacyBlob>(opened.db, 'blobs')) {
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
  } catch (err) {
    // 搬迁中途失败（读失败 / 写盘失败 / Blob 解码失败）→ 不 markDone，下次启动重试。
    // 已写入的部分是幂等覆盖（同键同值），重试安全。
    logger.error('[migrate] 旧 IndexedDB 搬迁未完成，保留重试机会：', err)
    return false
  } finally {
    try {
      opened.db.close()
    } catch {
      /* 忽略 */
    }
  }

  markDone()
  return true
}

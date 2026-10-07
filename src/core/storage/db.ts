// L1 core/storage —— 持久化基础设施（IndexedDB / Dexie 封装）。
//
// Phase 1（2026-09-17）自 stores/storage/db.ts **原样下沉**（内容未作任何改写）：
// 持久化基建不属于状态层 —— 它寄居在 stores 下会迫使领域操作层 services
// 反向引用 stores，这正是「环 #2：stores > services > stores」的真因。
// 下沉到 L1 后，services → core 与 stores → core 均为合法的单向依赖。
//
// 见《MarkCraft_解耦实施方案_2026-09-17.md》Phase 1。
import Dexie, { Table } from 'dexie'

/**
 * MarkCraft IndexedDB 数据库
 * 用于存储大数据量内容：文件树、图谱快照、笔记版本、备份等
 * 小数据（设置、书签、最近文件等）仍用 localStorage
 */
export interface KVRecord {
  key: string
  value: string
}

export interface BackupRecord {
  id?: number
  createdAt: number
  type: 'auto' | 'manual'
  data: string
}

export interface NoteVersionRecord {
  versionId: string
  fileId: string
  content: string
  timestamp: number
  operation: 'save' | 'manual' | 'auto'
  wordCount: number
  locked?: boolean
}

/** C3：内嵌 PDF 的 blob 存储（离线可用）。pdfId 为全局唯一；fileId 用于按文件清理 */
export interface BlobRecord {
  pdfId: string
  fileId?: string
  blob: Blob
  name?: string
  createdAt: number
}

export class MarkCraftDB extends Dexie {
  kv!: Table<KVRecord, string>
  backups!: Table<BackupRecord, number>
  versions!: Table<NoteVersionRecord, string>
  blobs!: Table<BlobRecord, string>

  constructor() {
    super('markcraft')
    this.version(1).stores({
      kv: 'key',
      backups: '++id, createdAt, type',
      versions: 'versionId, fileId, timestamp',
    })
    // C3：增量迁移到 v2，新增 blobs 表。Dexie 会保留 v1 的全部表，老用户数据不丢。
    this.version(2).stores({
      blobs: 'pdfId, fileId, createdAt',
    })
  }
}

export const db = new MarkCraftDB()

/** IndexedDB KV 适配器：替代 localStorage 存储大数据 */
export const idbAdapter = {
  async getItem(key: string): Promise<string | null> {
    const rec = await db.kv.get(key)
    return rec?.value ?? null
  },
  async setItem(key: string, value: string): Promise<void> {
    await db.kv.put({ key, value })
  },
  async removeItem(key: string): Promise<void> {
    await db.kv.delete(key)
  },
  async keys(): Promise<string[]> {
    const all = await db.kv.toArray()
    return all.map(r => r.key)
  },
}

// L1 core/storage —— 笔记版本历史与备份记录的存取。
//
// 存储介质已从 IndexedDB（Dexie 的 versions / backups 表）换成**磁盘 KV**（见 ./backend）：
// 每条记录一个键（`version:<id>` / `backup:<id>`），复用同一套后端。
// 之所以不另开后端：记录条数少（版本/备份都是几十到几百条），扫描式列举完全够用，
// 换来「一套后端 + 可读可备份的 JSON」。
import { kvGet, kvSet, kvDelete, kvKeys } from './kv'

export interface NoteVersionRecord {
  versionId: string
  fileId: string
  content: string
  timestamp: number
  operation: 'save' | 'manual' | 'auto'
  wordCount: number
  locked?: boolean
}

export interface BackupRecord {
  id?: number
  createdAt: number
  type: 'auto' | 'manual'
  data: string
}

const VERSION_PREFIX = 'version:'
const BACKUP_PREFIX = 'backup:'
const BACKUP_SEQ_KEY = 'backup-seq'

/** 列举全部版本记录 */
export async function listVersions(): Promise<NoteVersionRecord[]> {
  const out: NoteVersionRecord[] = []
  for (const key of (await kvKeys()).filter((k) => k.startsWith(VERSION_PREFIX))) {
    const raw = await kvGet(key)
    if (!raw) continue
    try {
      out.push(JSON.parse(raw) as NoteVersionRecord)
    } catch {
      /* 坏数据跳过，不打断列举 */
    }
  }
  return out
}

/** 全量替换版本记录（导入备份时用）：先清空再写入 */
export async function replaceAllVersions(recs: NoteVersionRecord[]): Promise<void> {
  for (const key of (await kvKeys()).filter((k) => k.startsWith(VERSION_PREFIX))) {
    await kvDelete(key)
  }
  await upsertVersions(recs)
}

/** 逐条 upsert（不清空已有）—— 对应原 Dexie 的 bulkPut 语义 */
export async function upsertVersions(recs: NoteVersionRecord[]): Promise<void> {
  for (const r of recs) {
    await kvSet(VERSION_PREFIX + r.versionId, JSON.stringify(r))
  }
}

/** 某个文件的全部版本 */
export async function listVersionsByFile(fileId: string): Promise<NoteVersionRecord[]> {
  return (await listVersions()).filter((v) => v.fileId === fileId)
}

/** 新增/覆盖单条版本（对应原 `table('versions').add()`） */
export async function addVersion(rec: NoteVersionRecord): Promise<void> {
  await kvSet(VERSION_PREFIX + rec.versionId, JSON.stringify(rec))
}

export async function getVersion(versionId: string): Promise<NoteVersionRecord | null> {
  const raw = await kvGet(VERSION_PREFIX + versionId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as NoteVersionRecord
  } catch {
    return null
  }
}

export async function deleteVersion(versionId: string): Promise<void> {
  await kvDelete(VERSION_PREFIX + versionId)
}

export async function deleteVersions(versionIds: string[]): Promise<void> {
  for (const id of versionIds) await kvDelete(VERSION_PREFIX + id)
}

/** 局部更新单条版本（对应原 `table('versions').update()`） */
export async function updateVersion(
  versionId: string,
  patch: Partial<NoteVersionRecord>,
): Promise<void> {
  const cur = await getVersion(versionId)
  if (!cur) return
  await kvSet(VERSION_PREFIX + versionId, JSON.stringify({ ...cur, ...patch }))
}

/** 新增备份，返回自增 id（原先由 Dexie 的 ++id 提供） */
export async function addBackup(rec: BackupRecord): Promise<number> {
  const seqRaw = await kvGet(BACKUP_SEQ_KEY)
  const next = (seqRaw ? Number(seqRaw) : 0) + 1
  await kvSet(BACKUP_SEQ_KEY, String(next))
  await kvSet(BACKUP_PREFIX + next, JSON.stringify({ ...rec, id: next }))
  return next
}

/** 列举全部备份（按 createdAt 升序，与 Dexie 表顺序一致） */
export async function listBackups(): Promise<BackupRecord[]> {
  const out: BackupRecord[] = []
  for (const key of (await kvKeys()).filter((k) => k.startsWith(BACKUP_PREFIX))) {
    const raw = await kvGet(key)
    if (!raw) continue
    try {
      out.push(JSON.parse(raw) as BackupRecord)
    } catch {
      /* 坏数据跳过 */
    }
  }
  return out.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

export async function getBackup(id: number): Promise<BackupRecord | null> {
  const raw = await kvGet(BACKUP_PREFIX + id)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BackupRecord
  } catch {
    return null
  }
}

export async function deleteBackup(id: number): Promise<void> {
  await kvDelete(BACKUP_PREFIX + id)
}

export async function deleteBackups(ids: number[]): Promise<void> {
  for (const id of ids) await kvDelete(BACKUP_PREFIX + id)
}

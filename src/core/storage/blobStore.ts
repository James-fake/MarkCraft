// L1 core/storage —— 内嵌 PDF 的 blob 存取。
//
// 存储介质已从 IndexedDB（Dexie）换成**磁盘 KV**（见 ./backend）：blob 以 base64 存在
// `<userData>/storage/kv/blob%3A<pdfId>.json`，复用同一套后端（桌面 = 磁盘，单测 = 内存）。
// 之所以不另开二进制后端：PDF 体积通常在个位数 MB，base64 的 33% 膨胀可接受，
// 换来的是「一套后端 + 一份可读可备份的 JSON」。
import { kvGet, kvSet, kvDelete, kvKeys } from './kv'
import { bytesToBase64, base64ToBytes, blobToBytes } from './base64'

const BLOB_PREFIX = 'blob:'

/** 落盘形态（JSON 可读；二进制走 base64） */
interface StoredBlob {
  pdfId: string
  fileId?: string
  name?: string
  createdAt: number
  type: string
  dataBase64: string
}

/** 保存入参（原先由 db.ts 的 BlobRecord 提供；db.ts 删除后本地定义） */
export interface PdfBlobRecord {
  pdfId: string
  fileId?: string
  blob: Blob
  name?: string
  createdAt: number
}

export async function savePdfBlob(rec: PdfBlobRecord): Promise<void> {
  const bytes = await blobToBytes(rec.blob)
  const stored: StoredBlob = {
    pdfId: rec.pdfId,
    fileId: rec.fileId,
    name: rec.name,
    createdAt: rec.createdAt,
    type: rec.blob.type || 'application/pdf',
    dataBase64: bytesToBase64(bytes),
  }
  await kvSet(BLOB_PREFIX + rec.pdfId, JSON.stringify(stored))
}

export async function getPdfBlob(pdfId: string): Promise<Blob | null> {
  const raw = await kvGet(BLOB_PREFIX + pdfId)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as StoredBlob
    const bytes = base64ToBytes(s.dataBase64)
    return new Blob([bytes as unknown as BlobPart], { type: s.type || 'application/pdf' })
  } catch {
    return null // 坏数据当作不存在，不打断渲染
  }
}

export async function deletePdfBlob(pdfId: string): Promise<void> {
  await kvDelete(BLOB_PREFIX + pdfId)
}

/** 删除某文件下的全部 blob（文件删除时级联清理） */
export async function deleteBlobsByFile(fileId: string): Promise<void> {
  const keys = await kvKeys()
  for (const key of keys.filter((k) => k.startsWith(BLOB_PREFIX))) {
    const raw = await kvGet(key)
    if (!raw) continue
    try {
      const s = JSON.parse(raw) as StoredBlob
      if (s.fileId === fileId) await kvDelete(key)
    } catch {
      /* 坏数据跳过 */
    }
  }
}

/** 生成全局唯一的 pdfId */
export function generatePdfId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `pdf-${rand}`
}

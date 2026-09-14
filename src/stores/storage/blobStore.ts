import { db, type BlobRecord } from './db'

/**
 * C3：内嵌 PDF 的 blob 存取（IndexedDB via Dexie）。
 * 用于把本地 PDF 文件存入离线库，编辑器通过 pdfId 引用，不依赖外链。
 */

export async function savePdfBlob(rec: BlobRecord): Promise<void> {
  await db.blobs.put(rec)
}

export async function getPdfBlob(pdfId: string): Promise<Blob | null> {
  const rec = await db.blobs.get(pdfId)
  return rec?.blob ?? null
}

export async function deletePdfBlob(pdfId: string): Promise<void> {
  await db.blobs.delete(pdfId)
}

/** 删除某文件下的全部 blob（文件删除时级联清理） */
export async function deleteBlobsByFile(fileId: string): Promise<void> {
  await db.blobs.where('fileId').equals(fileId).delete()
}

/** 生成全局唯一的 pdfId */
export function generatePdfId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `pdf-${rand}`
}

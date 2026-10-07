import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { db, type BlobRecord } from '../db'

describe('Dexie 数据库 schema 与 v2 迁移 (C3)', () => {
  it('v2 含 blobs 表，且 v1 表（kv/backups/versions）共存可用、数据不丢', async () => {
    // 写入 v1 数据，验证迁移后仍可读写（Dexie 增量版本保留旧表）
    await db.kv.put({ key: 'c3-mig', value: 'v1-data' })
    expect((await db.kv.get('c3-mig'))?.value).toBe('v1-data')

    // 写入 v2 blobs 表
    // 注意：fake-indexeddb 在 Node 环境用 structuredClone 持久化，只认 Node 原生 Blob
    // （jsdom 的 Blob 会被克隆成 {}），故测试用 node:buffer 的 Blob 验证 round-trip。
    const rec: BlobRecord = {
      pdfId: 'pdf-test-1',
      fileId: 'file-x',
      blob: new NodeBlob(['%PDF-1.4 fake'], { type: 'application/pdf' }),
      name: 'demo.pdf',
      createdAt: Date.now(),
    }
    await db.blobs.put(rec)

    const got = await db.blobs.get('pdf-test-1')
    expect(got?.pdfId).toBe('pdf-test-1')
    expect(got?.fileId).toBe('file-x')
    expect(got?.blob).toBeInstanceOf(NodeBlob)

    // v1 数据在写入 v2 之后仍然在
    expect((await db.kv.get('c3-mig'))?.value).toBe('v1-data')

    // 索引可用（按 fileId 查询）
    const byFile = await db.blobs.where('fileId').equals('file-x').toArray()
    expect(byFile.length).toBe(1)

    // 清理
    await db.blobs.delete('pdf-test-1')
    await db.kv.delete('c3-mig')
  })
})

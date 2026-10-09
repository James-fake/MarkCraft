import { describe, it, expect, beforeEach } from 'vitest'
import { getStorageBackend, resetStorageBackendForTests } from '../backend'
import { kvGet, kvSet, kvDelete, kvKeys, kvClear } from '../kv'
import { savePdfBlob, getPdfBlob, deletePdfBlob, deleteBlobsByFile } from '../blobStore'
import {
  addVersion,
  listVersions,
  listVersionsByFile,
  getVersion,
  updateVersion,
  deleteVersion,
  deleteVersions,
  replaceAllVersions,
  addBackup,
  listBackups,
  getBackup,
  deleteBackup,
  deleteBackups,
} from '../recordStore'
import { bytesToBase64, base64ToBytes, blobToBytes } from '../base64'
import { migrateLegacyIndexedDb } from '../legacyIdbMigrate'

/**
 * 存储层（替代原 IndexedDB / Dexie）。
 *
 * jsdom 里 `platform.app.userData()` 为 null → 自动退化到**内存后端**，
 * 因此这些用例覆盖的是「键值语义 + 各领域存储的读写契约」，
 * 磁盘后端的具体路径由 Electron E2E 覆盖。
 */

beforeEach(async () => {
  resetStorageBackendForTests()
  await kvClear()
})

describe('storage backend（jsdom → 内存后端）', () => {
  it('无 userData 时退化为内存后端，且 KV 读写闭环', async () => {
    const backend = await getStorageBackend()
    expect(backend).toBeTruthy()

    expect(await kvGet('a')).toBeNull()
    await kvSet('a', '1')
    expect(await kvGet('a')).toBe('1')
    expect(await kvKeys()).toContain('a')

    await kvDelete('a')
    expect(await kvGet('a')).toBeNull()
  })

  it('kvClear 清空全部键', async () => {
    await kvSet('x', '1')
    await kvSet('y', '2')
    await kvClear()
    expect(await kvKeys()).toEqual([])
  })
})

describe('base64 工具', () => {
  it('字节 ↔ base64 往返无损（含 0x00 与 0xFF）', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 66])
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes])
  })
})

describe('blobStore（PDF 内嵌）', () => {
  it('保存 → 读取 → 删除；字节与 MIME 保持', async () => {
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' })
    await savePdfBlob({ pdfId: 'p1', fileId: 'f1', blob: pdf, name: 'a.pdf', createdAt: 1 })

    const got = await getPdfBlob('p1')
    expect(got).toBeTruthy()
    expect(got!.type).toBe('application/pdf')
    expect([...(await blobToBytes(got!))]).toEqual([0x25, 0x50, 0x44, 0x46])

    await deletePdfBlob('p1')
    expect(await getPdfBlob('p1')).toBeNull()
  })

  it('deleteBlobsByFile 只删该文件下的 blob', async () => {
    const mk = () => new Blob([new Uint8Array([1])], { type: 'application/pdf' })
    await savePdfBlob({ pdfId: 'a', fileId: 'f1', blob: mk(), createdAt: 1 })
    await savePdfBlob({ pdfId: 'b', fileId: 'f2', blob: mk(), createdAt: 1 })

    await deleteBlobsByFile('f1')
    expect(await getPdfBlob('a')).toBeNull()
    expect(await getPdfBlob('b')).toBeTruthy()
  })

  it('坏数据当作不存在（不抛）', async () => {
    await kvSet('blob:broken', '{not json')
    expect(await getPdfBlob('broken')).toBeNull()
  })
})

describe('recordStore · 版本历史', () => {
  const mk = (id: string, fileId = 'f1', ts = 1) => ({
    versionId: id,
    fileId,
    content: 'c',
    timestamp: ts,
    operation: 'manual' as const,
    wordCount: 1,
  })

  it('新增 / 列举 / 按文件过滤 / 取单条', async () => {
    await addVersion(mk('v1'))
    await addVersion(mk('v2', 'f2'))

    expect((await listVersions()).length).toBe(2)
    expect((await listVersionsByFile('f1')).map((v) => v.versionId)).toEqual(['v1'])
    expect((await getVersion('v2'))?.fileId).toBe('f2')
  })

  it('局部更新（锁定）与删除', async () => {
    await addVersion(mk('v1'))
    await updateVersion('v1', { locked: true })
    expect((await getVersion('v1'))?.locked).toBe(true)

    await deleteVersion('v1')
    expect(await getVersion('v1')).toBeNull()
  })

  it('deleteVersions 批量删；replaceAllVersions 先清空再写入', async () => {
    await addVersion(mk('v1'))
    await addVersion(mk('v2'))
    await deleteVersions(['v1'])
    expect((await listVersions()).map((v) => v.versionId)).toEqual(['v2'])

    await replaceAllVersions([mk('v9')])
    expect((await listVersions()).map((v) => v.versionId)).toEqual(['v9'])
  })
})

describe('recordStore · 备份', () => {
  it('自增 id、按 createdAt 升序列举、取单条与删除', async () => {
    const id1 = await addBackup({ createdAt: 20, type: 'auto', data: '{}' })
    const id2 = await addBackup({ createdAt: 10, type: 'manual', data: '{}' })
    expect(id2).toBeGreaterThan(id1)

    const all = await listBackups()
    expect(all.map((b) => b.createdAt)).toEqual([10, 20]) // 升序
    expect((await getBackup(id1))?.type).toBe('auto')

    await deleteBackup(id1)
    expect(await getBackup(id1)).toBeNull()

    await deleteBackups([id2])
    expect(await listBackups()).toEqual([])
  })
})

describe('legacyIdbMigrate（旧 IndexedDB 一次性搬迁）', () => {
  it('环境无 indexedDB 时安全返回 false（不抛）', async () => {
    const backend = await getStorageBackend()
    // jsdom 未引入 fake-indexeddb → indexedDB 不存在
    await expect(migrateLegacyIndexedDb(backend)).resolves.toBe(false)
  })
})

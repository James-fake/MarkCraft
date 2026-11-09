import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { kvClear, kvGet, kvKeys } from '@core/storage/kv'
import { replaceAllVersions, addBackup, listBackups } from './recordStore'
import type { NoteVersionRecord, BackupRecord } from './recordStore'

/**
 * 回归锁（2026-11-03 审查 P1）：
 * ① replaceAllVersions 原实现「先删光再写」—— 中途失败（磁盘满/权限）时旧版本已删、
 *    新版本未落，「恢复备份」本身成了数据丢失点。现改为先写后删。
 * ② addBackup 的自增序列是「读-改-写」，并发调用会读到同一 seq 互相覆盖；现已串行化。
 */
const T = 1700000000000

function version(id: string, fileId: string): NoteVersionRecord {
  return {
    versionId: id,
    fileId,
    content: `# ${id}`,
    createdAt: T,
    label: '',
  } as NoteVersionRecord
}

function backup(createdAt: number): BackupRecord {
  return { createdAt, type: 'manual', data: '{}' } as BackupRecord
}

describe('recordStore · replaceAllVersions 先写后删', () => {
  beforeEach(async () => {
    await kvClear()
  })

  it('替换后只保留新集合（旧的被清理）', async () => {
    await replaceAllVersions([version('v1', 'f1'), version('v2', 'f1')])
    expect((await kvKeys()).filter((k) => k.startsWith('version:')).sort()).toEqual([
      'version:v1',
      'version:v2',
    ])

    await replaceAllVersions([version('v3', 'f2')])
    const keys = (await kvKeys()).filter((k) => k.startsWith('version:')).sort()
    expect(keys).toEqual(['version:v3'])
    expect(await kvGet('version:v3')).toBeTruthy()
  })

  it('写入失败时旧数据不被清除（可重试）', async () => {
    await replaceAllVersions([version('old1', 'f1'), version('old2', 'f1')])
    // 让写入抛错（模拟磁盘满）
    const spy = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('ENOSPC: no space left on device')
    })
    await expect(replaceAllVersions([version('new1', 'f2')])).rejects.toThrow(/ENOSPC/)
    spy.mockRestore()
    // 旧版本必须还在 —— 这是「恢复备份」不能成为数据丢失点的底线
    const keys = (await kvKeys()).filter((k) => k.startsWith('version:')).sort()
    expect(keys).toEqual(['version:old1', 'version:old2'])
  })
})

describe('recordStore · addBackup 并发序列', () => {
  beforeEach(async () => {
    await kvClear()
  })

  it('并发两次 addBackup → id 不重复、两条记录都在', async () => {
    const [a, b] = await Promise.all([addBackup(backup(T)), addBackup(backup(T + 1))])
    expect(new Set([a, b]).size).toBe(2)
    const all = await listBackups()
    expect(all).toHaveLength(2)
    expect(all.map((r) => r.id).sort()).toEqual([a, b].sort())
  })

  it('并发 5 次 → id 连续且无覆盖', async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, (_, i) => addBackup(backup(T + i))))
    expect([...ids].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5])
    expect(await listBackups()).toHaveLength(5)
  })

  it('一次失败不阻塞后续入队（队列吞错但调用方能看到拒绝）', async () => {
    const spy = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('boom')
    })
    await expect(addBackup(backup(T))).rejects.toThrow(/boom/)
    spy.mockRestore()
    const id = await addBackup(backup(T + 1))
    expect(typeof id).toBe('number')
  })
})

describe('fileTree · 版本不匹配时先备份再重建', () => {
  const KEY = 'markcraft-file-manager'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('旧树原文被写入备份键，不会被静默丢弃', async () => {
    const legacyTree = JSON.stringify({
      rootFolder: { id: 'root', name: 'root', type: 'folder', children: [{ id: 'f', name: '重要笔记.md', type: 'file', content: '别丢' }] },
      tabs: [],
      activeTabId: null,
      searchQuery: '',
      sidebarVisible: true,
    })
    localStorage.setItem(KEY, legacyTree)
    localStorage.setItem(`${KEY}-version`, 'v0-legacy')

    const { loadState } = await import('../files/fileTree')
    const state = loadState('zh')
    // 返回种子树（版本不匹配的正常行为）
    expect(state.rootFolder.children?.some((c) => c.name === '重要笔记.md')).toBeFalsy()
    // 但原文必须在备份键里
    expect(localStorage.getItem(`${KEY}-backup-vv0-legacy`)).toBe(legacyTree)
  })
})

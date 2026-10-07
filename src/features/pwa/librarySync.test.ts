import { describe, it, expect } from 'vitest'
import { FileNode } from '../../types/fileManager'
import {
  collectFiles,
  exportLibraryBundle,
  parseLibraryBundle,
  mergeLibraryFiles,
} from './librarySync'

function makeRoot(): FileNode {
  return {
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      { id: 'inbox', name: '收件箱', type: 'folder', children: [] },
      { id: 'f1', name: 'a.md', type: 'file', content: 'hello', createdAt: 10, updatedAt: 10 },
      { id: 'f2', name: 'b.md', type: 'file', content: 'world', createdAt: 20, updatedAt: 20 },
    ],
  }
}

describe('librarySync', () => {
  it('collectFiles 递归收集全部笔记', () => {
    expect(collectFiles(makeRoot()).map(f => f.id).sort()).toEqual(['f1', 'f2'])
  })

  it('exportLibraryBundle 可导出并解析回', () => {
    const json = exportLibraryBundle(makeRoot(), new Date('2026-08-06T00:00:00Z'))
    const bundle = parseLibraryBundle(json)
    expect(bundle.type).toBe('markcraft-library')
    expect(bundle.files).toHaveLength(2)
    expect(bundle.exportedAt).toBe('2026-08-06T00:00:00.000Z')
  })

  it('parseLibraryBundle 非法内容抛错', () => {
    expect(() => parseLibraryBundle('not json')).toThrow()
    expect(() => parseLibraryBundle('{"foo":1}')).toThrow()
  })

  it('mergeLibraryFiles 新增计数（同 id 同时间视为跳过）', () => {
    const existing = [{ id: 'f1', name: 'a', content: '', createdAt: 1, updatedAt: 1 }]
    const incoming = [
      { id: 'f1', name: 'a', content: '', createdAt: 1, updatedAt: 1 },
      { id: 'f2', name: 'b', content: '', createdAt: 2, updatedAt: 2 },
    ]
    const r = mergeLibraryFiles(existing, incoming)
    expect(r.added).toBe(1)
    expect(r.updated).toBe(0)
    expect(r.skipped).toBe(1)
    expect(r.total).toBe(2)
  })

  it('mergeLibraryFiles 较新备份覆盖、较旧跳过', () => {
    const existing = [{ id: 'f1', name: 'a', content: 'old', createdAt: 1, updatedAt: 100 }]
    const incoming = [
      { id: 'f1', name: 'a', content: 'new', createdAt: 1, updatedAt: 200 }, // 更新
      { id: 'f2', name: 'b', content: 'keep', createdAt: 2, updatedAt: 50 }, // 但 existing 没有
    ]
    const r = mergeLibraryFiles(existing, incoming)
    expect(r.updated).toBe(1)
    expect(r.added).toBe(1)
    const merged = r.merged.find(f => f.id === 'f1')!
    expect(merged.content).toBe('new')
  })

  it('mergeLibraryFiles 备份更旧则跳过（保护本地产物）', () => {
    const existing = [{ id: 'f1', name: 'a', content: 'mine', createdAt: 1, updatedAt: 300 }]
    const incoming = [{ id: 'f1', name: 'a', content: 'old-backup', createdAt: 1, updatedAt: 100 }]
    const r = mergeLibraryFiles(existing, incoming)
    expect(r.skipped).toBe(1)
    expect(r.updated).toBe(0)
    expect(r.merged.find(f => f.id === 'f1')!.content).toBe('mine')
  })
})

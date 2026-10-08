/**
 * vaultService 单元测试（P4 磁盘后端）。
 *
 * 用内存磁盘 mock 掉 `platform.fs`，验证：
 *  - loadVault 从磁盘建树（读 content、跳过点开头项如 .markcraft）；
 *  - syncTree 增量写回：改内容 / 改名(rename) / 删除 / 新建 都正确落到磁盘。
 * 这样既覆盖「笔记以真实 .md 落盘」的核心语义，又不依赖脆弱的富文本编辑器 E2E。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

interface DiskEntry {
  isDir: boolean
  content: string
  mtime: number
}

const { disk, mockFs, mockPlatform } = vi.hoisted(() => {
  const disk = new Map<string, DiskEntry>()
  const mockFs = {
    readDirectory: vi.fn(async (root: string, opts?: { recursive?: boolean; includeHidden?: boolean }) => {
      const out: Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean; size: number; mtimeMs: number }> = []
      for (const [p, v] of disk) {
        if (p === root) continue
        if (!p.startsWith(root + '/')) continue
        if (!opts?.includeHidden && p.split('/').some((seg) => seg.startsWith('.'))) continue
        out.push({
          name: p.split('/').pop() as string,
          path: p,
          isDirectory: v.isDir,
          isFile: !v.isDir,
          size: v.content.length,
          mtimeMs: v.mtime,
        })
      }
      return out
    }),
    readFile: vi.fn(async (p: string) => disk.get(p)?.content ?? ''),
    writeFile: vi.fn(async (p: string, content: string) => {
      const parent = p.slice(0, p.lastIndexOf('/'))
      if (!disk.has(parent)) disk.set(parent, { isDir: true, content: '', mtime: Date.now() })
      disk.set(p, { isDir: false, content, mtime: Date.now() })
    }),
    exists: vi.fn(async (p: string) => disk.has(p)),
    stat: vi.fn(async (p: string) => {
      const v = disk.get(p)
      return { name: p.split('/').pop() as string, path: p, isDirectory: v?.isDir ?? false, isFile: !(v?.isDir ?? false), size: v?.content.length ?? 0, mtimeMs: v?.mtime ?? 0 }
    }),
    mkdir: vi.fn(async (p: string) => {
      if (!disk.has(p)) disk.set(p, { isDir: true, content: '', mtime: Date.now() })
    }),
    rename: vi.fn(async (oldP: string, newP: string) => {
      const v = disk.get(oldP)
      if (v) {
        disk.delete(oldP)
        disk.set(newP, v)
      }
    }),
    remove: vi.fn(async (p: string) => {
      disk.delete(p)
    }),
  }
  const mockPlatform = {
    kind: 'electron' as const,
    fs: mockFs,
    dialog: { openDirectory: vi.fn(async () => '/vault') },
    shell: { showItemInFolder: vi.fn(async () => true) },
  }
  return { disk, mockFs, mockPlatform }
})

vi.mock('../platform', () => ({ platform: mockPlatform }))

import { loadVault, syncTree } from './vaultService'
import type { FileNode } from '../types/fileManager'

const ROOT = '/vault'
const waitSync = () => new Promise((r) => setTimeout(r, 400))

function findByName(node: FileNode, name: string): FileNode | undefined {
  if (node.name === name) return node
  return node.children?.flatMap((c) => findByName(c, name) ?? []).find(Boolean)
}

beforeEach(() => {
  disk.clear()
  disk.set(ROOT, { isDir: true, content: '', mtime: Date.now() })
  mockFs.readDirectory.mockClear()
  mockFs.writeFile.mockClear()
  mockFs.rename.mockClear()
  mockFs.remove.mockClear()
})

afterEach(() => {
  disk.clear()
})

describe('vaultService.loadVault', () => {
  it('从磁盘建树并读取 .md 正文，跳过点开头项（.markcraft）', async () => {
    disk.set(`${ROOT}/a.md`, { isDir: false, content: 'hello a', mtime: 1 })
    disk.set(`${ROOT}/sub`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/sub/b.md`, { isDir: false, content: 'hello b', mtime: 2 })
    disk.set(`${ROOT}/.markcraft`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/.markcraft/config.json`, { isDir: false, content: '{}', mtime: 1 })

    const tree = await loadVault(ROOT)

    expect(tree.type).toBe('folder')
    const a = findByName(tree, 'a.md')
    expect(a?.type).toBe('file')
    expect(a?.content).toBe('hello a')
    const sub = findByName(tree, 'sub')
    expect(sub?.type).toBe('folder')
    expect(findByName(tree, 'b.md')?.content).toBe('hello b')
    // 点开头项不进树
    expect(findByName(tree, '.markcraft')).toBeUndefined()
  })
})

describe('vaultService.syncTree（增量写回磁盘）', () => {
  it('编辑正文 → 写回对应 .md', async () => {
    disk.set(`${ROOT}/n.md`, { isDir: false, content: 'old', mtime: 1 })
    const tree = await loadVault(ROOT)
    const n = findByName(tree, 'n.md')!
    n.content = 'new content'

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.get(`${ROOT}/n.md`)?.content).toBe('new content')
    expect(mockFs.writeFile).toHaveBeenCalledWith(`${ROOT}/n.md`, 'new content')
  })

  it('改名 → 磁盘 rename（旧路径消失、新路径出现）', async () => {
    disk.set(`${ROOT}/old.md`, { isDir: false, content: 'x', mtime: 1 })
    const tree = await loadVault(ROOT)
    const n = findByName(tree, 'old.md')!
    n.name = 'new.md'

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/old.md`)).toBe(false)
    expect(disk.get(`${ROOT}/new.md`)?.content).toBe('x')
    expect(mockFs.rename).toHaveBeenCalledWith(`${ROOT}/old.md`, `${ROOT}/new.md`)
  })

  it('删除树中节点 → 磁盘文件被移除', async () => {
    disk.set(`${ROOT}/d.md`, { isDir: false, content: 'y', mtime: 1 })
    const tree = await loadVault(ROOT)
    tree.children = tree.children?.filter((c) => c.name !== 'd.md')

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/d.md`)).toBe(false)
    expect(mockFs.remove).toHaveBeenCalledWith(`${ROOT}/d.md`)
  })

  it('新建节点 → 写出新 .md 文件', async () => {
    const tree = await loadVault(ROOT)
    tree.children = [
      ...(tree.children ?? []),
      { id: 'new-id', name: 'created.md', type: 'file', content: 'fresh', createdAt: 1, updatedAt: 1 },
    ]

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.get(`${ROOT}/created.md`)?.content).toBe('fresh')
    expect(mockFs.writeFile).toHaveBeenCalledWith(`${ROOT}/created.md`, 'fresh')
  })

  it('无变更时不做任何写操作（避免每次编辑重写整 Vault）', async () => {
    disk.set(`${ROOT}/s.md`, { isDir: false, content: 'stable', mtime: 1 })
    const tree = await loadVault(ROOT)

    syncTree(tree, ROOT)
    await waitSync()

    expect(mockFs.writeFile).not.toHaveBeenCalled()
    expect(mockFs.rename).not.toHaveBeenCalled()
    expect(mockFs.remove).not.toHaveBeenCalled()
  })
})

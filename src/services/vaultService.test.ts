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
      if (!v) {
        // 贴近真实 fs.rename：源不存在 → 抛 ENOENT（调用方据此走退化分支）
        const err = new Error(`ENOENT: no such file or directory, rename '${oldP}' -> '${newP}'`) as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      }
      // 贴近真实 fs.rename 语义：目录改名/移动时，整棵子树一并迁移
      const moves: Array<[string, DiskEntry]> = []
      for (const [p, e] of disk) {
        if (p === oldP) moves.push([p, e])
        else if (v.isDir && p.startsWith(oldP + '/')) moves.push([p, e])
      }
      for (const [p] of moves) disk.delete(p)
      for (const [p, e] of moves) {
        const np = p === oldP ? newP : newP + p.slice(oldP.length)
        disk.set(np, e)
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

describe('vaultService.syncTree（rename / move / delete 联动 · P4-B）', () => {
  it('移动文件到子文件夹 → 磁盘 rename 到新父目录（旧路径消失）', async () => {
    disk.set(`${ROOT}/m.md`, { isDir: false, content: 'mv', mtime: 1 })
    disk.set(`${ROOT}/dest`, { isDir: true, content: '', mtime: 1 })
    const tree = await loadVault(ROOT)
    const m = findByName(tree, 'm.md')!
    const dest = findByName(tree, 'dest')!
    // 模拟 moveNode：从根摘除，挂到 dest 下
    tree.children = tree.children!.filter((c) => c.id !== m.id)
    dest.children = [...(dest.children ?? []), m]

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/m.md`)).toBe(false)
    expect(disk.get(`${ROOT}/dest/m.md`)?.content).toBe('mv')
    expect(mockFs.rename).toHaveBeenCalledWith(`${ROOT}/m.md`, `${ROOT}/dest/m.md`)
  })

  it('文件夹改名 → 磁盘目录一并 rename，旧目录不残留', async () => {
    disk.set(`${ROOT}/sub`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/sub/b.md`, { isDir: false, content: 'b', mtime: 2 })
    const tree = await loadVault(ROOT)
    findByName(tree, 'sub')!.name = 'renamed'

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/sub`)).toBe(false)
    expect(disk.has(`${ROOT}/sub/b.md`)).toBe(false)
    expect(disk.get(`${ROOT}/renamed/b.md`)?.content).toBe('b')
  })

  it('移动文件夹到另一文件夹 → 整棵子树随父目录迁移', async () => {
    disk.set(`${ROOT}/box`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/pack`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/pack/p.md`, { isDir: false, content: 'p', mtime: 2 })
    const tree = await loadVault(ROOT)
    const pack = findByName(tree, 'pack')!
    const box = findByName(tree, 'box')!
    // 模拟 moveNode：pack 从根移到 box 下
    tree.children = tree.children!.filter((c) => c.id !== pack.id)
    box.children = [...(box.children ?? []), pack]

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/pack`)).toBe(false)
    expect(disk.has(`${ROOT}/pack/p.md`)).toBe(false)
    expect(disk.get(`${ROOT}/box/pack/p.md`)?.content).toBe('p')
  })

  it('删除文件夹 → 其中 .md 全部移除（目录本身按策略留盘，避免误删用户手放目录）', async () => {
    disk.set(`${ROOT}/del`, { isDir: true, content: '', mtime: 1 })
    disk.set(`${ROOT}/del/x.md`, { isDir: false, content: 'x', mtime: 1 })
    disk.set(`${ROOT}/del/y.md`, { isDir: false, content: 'y', mtime: 1 })
    const tree = await loadVault(ROOT)
    tree.children = tree.children!.filter((c) => c.name !== 'del')

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/del/x.md`)).toBe(false)
    expect(disk.has(`${ROOT}/del/y.md`)).toBe(false)
    expect(mockFs.remove).toHaveBeenCalledWith(`${ROOT}/del/x.md`)
    expect(mockFs.remove).toHaveBeenCalledWith(`${ROOT}/del/y.md`)
  })

  it('改名文件且不带 .md 后缀 → 磁盘仍写 .md（diskName 防御性补后缀）', async () => {
    disk.set(`${ROOT}/x.md`, { isDir: false, content: 'x', mtime: 1 })
    const tree = await loadVault(ROOT)
    findByName(tree, 'x.md')!.name = 'y' // store 层会补 .md；此处测底层 diskName 防御

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.has(`${ROOT}/x.md`)).toBe(false)
    expect(disk.get(`${ROOT}/y.md`)?.content).toBe('x')
  })

  it('旧路径不在盘上（外部已删）时改名 → 退化为在新路径写出，避免丢内容', async () => {
    disk.set(`${ROOT}/gone.md`, { isDir: false, content: 'keep', mtime: 1 })
    const tree = await loadVault(ROOT)
    const n = findByName(tree, 'gone.md')!
    n.name = 'kept.md'
    // 模拟外部把旧文件删了（rename 会 ENOENT）
    disk.delete(`${ROOT}/gone.md`)

    syncTree(tree, ROOT)
    await waitSync()

    expect(disk.get(`${ROOT}/kept.md`)?.content).toBe('keep')
  })
})

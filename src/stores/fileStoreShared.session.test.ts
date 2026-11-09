import { describe, it, expect, beforeEach } from 'vitest'
import { mergeUnsavedEdits, pathOfNode, nodeByPath } from './fileStoreShared'
import type { FileNode } from '../types/fileManager'
import { kvClear } from '@core/storage/kv'
import { saveSessionSnapshot, loadSessionSnapshot, clearSessionSnapshot } from '../services/sessionSnapshot'

/**
 * 回归锁（2026-11-03 审查 P1；2026-11-08 H-7 扩充）：
 * ① 整树 reload 竞态 —— 外部事件触发的重载会用磁盘旧内容覆盖「已进 state 但未落盘」
 *    的编辑，用户的编辑从 state 和磁盘双双消失。mergeUnsavedEdits 仅对 `isDirty` 标签
 *    保留内存版本。
 * ② H-7 数据丢失 —— 纯外部改动（标签非 dirty）必须采用磁盘新内容，绝不能被内存旧内容
 *    覆盖写回（见下方 H-7 回归用例）。
 * ③ Vault 模式会话态 —— 标签页此前完全不落盘（save effect 直接 return），重启全丢。
 */
const T = 1700000000000

function file(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file', content, createdAt: T, updatedAt: T }
}

function folder(id: string, name: string, children: FileNode[]): FileNode {
  return { id, name, type: 'folder', children, createdAt: T, updatedAt: T }
}

describe('mergeUnsavedEdits · reload 竞态下保留未落盘编辑', () => {
  it('dirty 标签且内存内容 ≠ 磁盘内容 → 保留内存版本并标记 dirty', () => {
    const prev = folder('root', 'root', [
      folder('f1', '笔记', [file('a', 'a.md', '# 我改过的新内容')]),
    ])
    // 磁盘读回的是旧内容，且 id 全部重新生成（reload 的真实形态）
    const next = folder('root2', 'root', [
      folder('f2', '笔记', [file('a2', 'a.md', '# 磁盘旧内容')]),
    ])

    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [{ fileId: 'a', isDirty: true }])

    expect(dirtyNewIds.has('a2')).toBe(true)
    expect(nodeByPath(root, '笔记/a.md')?.content).toBe('# 我改过的新内容')
    // 不修改入参
    expect(nodeByPath(next, '笔记/a.md')?.content).toBe('# 磁盘旧内容')
  })

  it('dirty 标签但内容一致 → 采用磁盘版本，不标记 dirty', () => {
    const prev = folder('root', 'root', [file('a', 'a.md', '同内容')])
    const next = folder('root2', 'root', [file('a2', 'a.md', '同内容')])
    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [{ fileId: 'a', isDirty: true }])
    expect(dirtyNewIds.size).toBe(0)
    expect(nodeByPath(root, 'a.md')?.content).toBe('同内容')
  })

  it('dirty 标签但磁盘上文件被外部删除 → 不复活、不抛错', () => {
    const prev = folder('root', 'root', [file('a', 'a.md', '内存内容')])
    const next = folder('root2', 'root', [])
    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [{ fileId: 'a', isDirty: true }])
    expect(dirtyNewIds.size).toBe(0)
    expect(root.children).toEqual([])
  })

  it('多个标签：只保留 dirty 的那个；非 dirty 标签即便被外部改动也采用磁盘版本', () => {
    const prev = folder('root', 'root', [file('a', 'a.md', 'A 改过'), file('b', 'b.md', 'B 未改')])
    const next = folder('root2', 'root', [file('a2', 'a.md', 'A 旧'), file('b2', 'b.md', 'B 外部改过')])
    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [
      { fileId: 'a', isDirty: true },
      { fileId: 'b', isDirty: false },
    ])
    expect([...dirtyNewIds]).toEqual(['a2'])
    expect(nodeByPath(root, 'a.md')?.content).toBe('A 改过')
    expect(nodeByPath(root, 'b.md')?.content).toBe('B 外部改过')
  })

  it('H-7 回归：外部改动且无本地编辑（tab 非 dirty）→ 采用磁盘新内容，不标脏、不回写旧内容', () => {
    const prev = folder('root', 'root', [file('a', 'a.md', '# 与磁盘一致的旧内容')])
    // 外部编辑器 / 同步盘把文件改成新内容，reload 读回新内容且 id 重新生成
    const next = folder('root2', 'root', [file('a2', 'a.md', '# 外部改过的新内容')])
    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [{ fileId: 'a', isDirty: false }])
    expect(dirtyNewIds.size).toBe(0)
    expect(nodeByPath(root, 'a.md')?.content).toBe('# 外部改过的新内容')
  })

  it('H-7 回归：标签无 isDirty 字段（会话恢复 / 老数据）→ 同样采用磁盘内容', () => {
    const prev = folder('root', 'root', [file('a', 'a.md', '# 与磁盘一致的旧内容')])
    const next = folder('root2', 'root', [file('a2', 'a.md', '# 外部改过的新内容')])
    const { root, dirtyNewIds } = mergeUnsavedEdits(prev, next, [{ fileId: 'a' }])
    expect(dirtyNewIds.size).toBe(0)
    expect(nodeByPath(root, 'a.md')?.content).toBe('# 外部改过的新内容')
  })

  it('pathOfNode / nodeByPath 互逆（含中文与多级目录）', () => {
    const tree = folder('root', 'root', [
      folder('f1', '工作', [folder('f2', '项目甲', [file('x', '设计稿.md', '')])]),
    ])
    const rel = pathOfNode(tree, 'x')
    expect(rel).toBe('工作/项目甲/设计稿.md')
    expect(nodeByPath(tree, rel!)?.id).toBe('x')
    expect(nodeByPath(tree, '不存在的/路径.md')).toBeNull()
  })
})

describe('sessionSnapshot · 会话态持久化', () => {
  beforeEach(async () => {
    await kvClear()
  })

  it('写入后可读回（含相对路径与活动标签）', async () => {
    await saveSessionSnapshot({
      tabs: [{ path: '工作/设计稿.md', name: '设计稿.md' }],
      activeTabPath: '工作/设计稿.md',
      searchQuery: '关键词',
      sidebarVisible: false,
    })
    const got = await loadSessionSnapshot()
    expect(got?.tabs).toHaveLength(1)
    expect(got?.tabs[0].path).toBe('工作/设计稿.md')
    expect(got?.activeTabPath).toBe('工作/设计稿.md')
    expect(got?.searchQuery).toBe('关键词')
    expect(got?.sidebarVisible).toBe(false)
  })

  it('无数据 → null；清理后 → null', async () => {
    expect(await loadSessionSnapshot()).toBeNull()
    await saveSessionSnapshot({ tabs: [], activeTabPath: null, searchQuery: '', sidebarVisible: true })
    expect(await loadSessionSnapshot()).not.toBeNull()
    await clearSessionSnapshot()
    expect(await loadSessionSnapshot()).toBeNull()
  })

  it('损坏数据 → null（不抛错）', async () => {
    const { kvSet } = await import('@core/storage/kv')
    await kvSet('markcraft-session-v1', '{not json')
    expect(await loadSessionSnapshot()).toBeNull()
  })
})

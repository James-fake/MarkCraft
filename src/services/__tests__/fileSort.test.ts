import { describe, it, expect } from 'vitest'
import {
  addChildNode,
  renumberChildrenOrder,
  sortFileNodes,
  deleteNodeRecursive,
  updateNode,
} from '../fileService'
import type { FileNode } from '../../types/fileManager'

function node(id: string, type: 'file' | 'folder', order?: number): FileNode {
  return { id, name: id, type, createdAt: order ?? 0, updatedAt: 0, order }
}

describe('G6 文档级自定义排序', () => {
  it('addChildNode 为新节点分配连续 order', () => {
    let root: FileNode = { id: 'root', name: 'root', type: 'folder', createdAt: 0, updatedAt: 0, children: [node('a', 'file', 1), node('b', 'file', 2)] }
    root = addChildNode(root, 'root', node('c', 'file'))
    const c = root.children!.find((n) => n.id === 'c')!
    expect(c.order).toBe(3)
  })

  it('renumberChildrenOrder 按数组顺序重排 order 为 1..n', () => {
    let root: FileNode = {
      id: 'root', name: 'root', type: 'folder', createdAt: 0, updatedAt: 0,
      children: [node('a', 'file', 5), node('b', 'file', 2), node('c', 'file', 9)],
    }
    root = renumberChildrenOrder(root, 'root')
    expect(root.children!.map((n) => n.order)).toEqual([1, 2, 3])
  })

  it('sortFileNodes：folder 优先，其次 order 升序，无 order 排末尾', () => {
    const nodes = [
      node('file-x', 'file', 2),
      node('folder-z', 'folder', 5),
      node('file-y', 'file'), // 无 order
      node('folder-a', 'folder', 1),
      node('file-w', 'file', 1),
    ]
    const sorted = sortFileNodes(nodes).map((n) => n.id)
    expect(sorted).toEqual(['folder-a', 'folder-z', 'file-w', 'file-x', 'file-y'])
  })

  it('模拟移动后 order 连续且位置正确', () => {
    // 初始 root 下 a(1) b(2) c(3)
    let root: FileNode = {
      id: 'root', name: 'root', type: 'folder', createdAt: 0, updatedAt: 0,
      children: [node('a', 'file', 1), node('b', 'file', 2), node('c', 'file', 3)],
    }
    // 把 c 移到 index 0：先删除再插入
    const moved = { ...root.children!.find((n) => n.id === 'c')! }
    root = deleteNodeRecursive(root, 'c')
    root = updateNode(root, 'root', (parent) => {
      const children = [...(parent.children || [])]
      children.splice(0, 0, moved)
      return { ...parent, children }
    })
    root = renumberChildrenOrder(root, 'root')
    expect(root.children!.map((n) => n.id)).toEqual(['c', 'a', 'b'])
    expect(root.children!.map((n) => n.order)).toEqual([1, 2, 3])
    // 排序后 c 在最前
    expect(sortFileNodes(root.children!).map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('旧节点无 order 时排序不报错且按创建时间稳定', () => {
    const nodes = [node('old2', 'file'), node('old1', 'file')]
    const sorted = sortFileNodes(nodes).map((n) => n.id)
    expect(sorted).toEqual(['old2', 'old1'])
  })
})

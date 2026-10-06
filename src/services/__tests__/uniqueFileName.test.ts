import { describe, it, expect } from 'vitest'
import { uniqueFileName } from '../fileService'
import type { FileNode } from '../../types/fileManager'

function file(name: string): FileNode {
  return { id: name, name, type: 'file', content: '', createdAt: 0, updatedAt: 0 }
}
function root(children: FileNode[]): FileNode {
  return { id: 'root', name: 'root', type: 'folder', children, createdAt: 0, updatedAt: 0 }
}

describe('uniqueFileName（新建/导入同名去重）', () => {
  it('无冲突时返回 base.md', () => {
    expect(uniqueFileName(root([]), '笔记')).toBe('笔记.md')
  })

  it('已有同名时从 (1) 开始（VS Code 风格）', () => {
    expect(uniqueFileName(root([file('笔记.md')]), '笔记')).toBe('笔记 (1).md')
  })

  it('已有 (1) 时给 (2)', () => {
    expect(uniqueFileName(root([file('笔记.md'), file('笔记 (1).md')]), '笔记')).toBe('笔记 (2).md')
  })

  it('base 已带 .md 后缀时保留', () => {
    expect(uniqueFileName(root([]), '笔记.md')).toBe('笔记.md')
  })

  it('仅按文件判重，文件夹同名不算冲突', () => {
    const folder: FileNode = { id: 'f', name: '笔记.md', type: 'folder', children: [], createdAt: 0, updatedAt: 0 }
    expect(uniqueFileName(root([folder]), '笔记')).toBe('笔记.md')
  })
})

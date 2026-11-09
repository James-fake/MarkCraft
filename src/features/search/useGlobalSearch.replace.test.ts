import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalSearch } from './useGlobalSearch'
import type { FileNode } from '../../types/fileManager'

/**
 * 回归锁（2026-11-03 审查 P1，全局替换）：
 * ① replaceAll 原先只处理时间过滤，忽略 folderIds/tags —— 用户按文件夹过滤后点
 *    「全部替换」会把过滤掉的文件一起改掉（越界写用户数据）。
 * ② 替换串里的 `$&`/`$1` 被 String.replace 解释为模式引用，用户输入含 `$` 的文本
 *    （价格、shell 命令）会得到意外结果。
 */
const T = 1700000000000

function file(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file', content, createdAt: T, updatedAt: T }
}

function tree(): FileNode {
  return {
    id: 'root',
    name: 'root',
    type: 'folder',
    createdAt: T,
    updatedAt: T,
    children: [
      {
        id: 'folderA',
        name: '工作',
        type: 'folder',
        createdAt: T,
        updatedAt: T,
        children: [file('a1', 'a.md', 'foo 在 A 里')],
      },
      {
        id: 'folderB',
        name: '私人',
        type: 'folder',
        createdAt: T,
        updatedAt: T,
        children: [file('b1', 'b.md', 'foo 在 B 里')],
      },
    ],
  }
}

describe('replaceAll · 过滤器与替换串转义', () => {
  it('folderIds 过滤生效：只改选中文件夹内的文件', () => {
    const { result } = renderHook(() => useGlobalSearch())
    const modified = result.current.replaceAll(tree(), 'foo', 'bar', {
      filters: { folderIds: ['folderA'] },
    })
    expect(modified).toHaveLength(1)
    expect(modified[0].fileId).toBe('a1')
    expect(modified[0].newContent).toBe('bar 在 A 里')
  })

  it('无过滤时改全部（不误伤正常路径）', () => {
    const { result } = renderHook(() => useGlobalSearch())
    const modified = result.current.replaceAll(tree(), 'foo', 'bar')
    expect(modified.map((m) => m.fileId).sort()).toEqual(['a1', 'b1'])
  })

  it('标签过滤生效：只改含指定标签的文件', () => {
    const t = tree()
    // 给 A 里的文件加标签
    ;(t.children![0].children![0] as FileNode).content = 'foo #项目'
    const { result } = renderHook(() => useGlobalSearch())
    const modified = result.current.replaceAll(t, 'foo', 'bar', { filters: { tags: ['项目'] } })
    expect(modified).toHaveLength(1)
    expect(modified[0].fileId).toBe('a1')
  })

  it('字面模式下替换串的 $& / $1 不被解释', () => {
    const { result } = renderHook(() => useGlobalSearch())
    const t: FileNode = {
      id: 'root',
      name: 'root',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [file('x', 'x.md', '价格 foo 元')],
    }
    const modified = result.current.replaceAll(t, 'foo', '[$&]')
    expect(modified[0].newContent).toBe('价格 [$&] 元')
  })

  it('正则模式保留 $1 捕获组语义', () => {
    const { result } = renderHook(() => useGlobalSearch())
    const t: FileNode = {
      id: 'root',
      name: 'root',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [file('x', 'x.md', 'key=value')],
    }
    const modified = result.current.replaceAll(t, '(\\w+)=(\\w+)', '$2:$1', { regex: true })
    expect(modified[0].newContent).toBe('value:key')
  })
})

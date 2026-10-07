/**
 * LinkIndexStore.updateFileIndex 增量更新测试
 *
 * 背景：updateFileIndex 历史上无调用方（索引仅 rootFolder 变更时全量重建），
 * P1-1 将其接入编辑器内容变化（EditorLayout 防抖调用）。本测试验证增量更新
 * 的反链/出链正确性，防止"编辑时反链面板实时刷新"引入回归。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import React from 'react'
import { LinkIndexProvider, useLinkIndex } from '../LinkIndexStore'
import type { FileNode } from '../../types/fileManager'

function makeFile(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file', content, createdAt: 0, updatedAt: 0 }
}

type Ctx = ReturnType<typeof useLinkIndex>
let ctx: Ctx | null = null

function Consumer() {
  ctx = useLinkIndex()
  return null
}

function setup(root: FileNode) {
  render(
    <LinkIndexProvider rootFolder={root}>
      <Consumer />
    </LinkIndexProvider>
  )
  return ctx
}

// 等待 rebuildIndex 的 300ms 防抖完成
async function waitRebuild(ms = 450) {
  await act(async () => {
    await new Promise(r => setTimeout(r, ms))
  })
}

const A = makeFile('a', 'A.md', '正文 A')
const B = makeFile('b', 'B.md', '正文 B')
const C = makeFile('c', 'C.md', '正文 C')

function rootWith(files: FileNode[]): FileNode {
  return { id: 'root', name: 'root', type: 'folder', createdAt: 0, updatedAt: 0, children: files }
}

beforeEach(() => {
  ctx = null
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LinkIndexStore.updateFileIndex 增量更新', () => {
  it('全量 rebuild 建立初始反链', async () => {
    const linkA = makeFile('a', 'A.md', '提到 [[B]] 的正文')
    setup(rootWith([linkA, B]))
    await waitRebuild()

    const backlinks = ctx!.getBacklinks('b')
    expect(backlinks.length).toBe(1)
    expect(backlinks[0].sourceFileId).toBe('a')
    expect(backlinks[0].target).toBe('B')
    expect(backlinks[0].context).toContain('提到 [[B]]')
  })

  it('编辑移除链接后目标文件反链清空', async () => {
    const linkA = makeFile('a', 'A.md', '提到 [[B]] 的正文')
    setup(rootWith([linkA, B]))
    await waitRebuild()
    expect(ctx!.getBacklinks('b').length).toBe(1)

    // A 编辑后不再链接 B
    await act(async () => {
      ctx!.updateFileIndex('a', '不再提及任何笔记', 'A.md')
    })
    expect(ctx!.getBacklinks('b').length).toBe(0)
  })

  it('编辑新增链接后目标文件反链出现', async () => {
    setup(rootWith([A, B, C]))
    await waitRebuild()
    expect(ctx!.getBacklinks('c').length).toBe(0)

    // A 编辑后新增 [[C]]
    await act(async () => {
      ctx!.updateFileIndex('a', '新增指向 [[C]] 的链接', 'A.md')
    })
    const backlinks = ctx!.getBacklinks('c')
    expect(backlinks.length).toBe(1)
    expect(backlinks[0].sourceFileId).toBe('a')
  })

  it('编辑后 A 的自身出链更新（移除旧、加入新）', async () => {
    const linkA = makeFile('a', 'A.md', '提到 [[B]] 的正文')
    setup(rootWith([linkA, B, C]))
    await waitRebuild()
    expect(ctx!.getOutgoingLinks('a').map(l => l.target)).toEqual(['B'])

    await act(async () => {
      ctx!.updateFileIndex('a', '改为链接 [[C]]', 'A.md')
    })
    expect(ctx!.getOutgoingLinks('a').map(l => l.target)).toEqual(['C'])
    // B 反链消失、C 反链出现
    expect(ctx!.getBacklinks('b').length).toBe(0)
    expect(ctx!.getBacklinks('c').length).toBe(1)
  })

  it('indexVersion 在增量更新后递增（驱动面板实时刷新）', async () => {
    setup(rootWith([A, B]))
    await waitRebuild()
    const v0 = ctx!.indexVersion

    await act(async () => {
      ctx!.updateFileIndex('a', '任意内容变化', 'A.md')
    })
    expect(ctx!.indexVersion).toBeGreaterThan(v0)
  })

  it('同一文件多次增量更新不产生重复反链', async () => {
    const linkA = makeFile('a', 'A.md', '提到 [[B]] 的正文')
    setup(rootWith([linkA, B]))
    await waitRebuild()

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        ctx!.updateFileIndex('a', '继续提到 [[B]] 的正文', 'A.md')
      })
    }
    expect(ctx!.getBacklinks('b').length).toBe(1)
  })
})

/**
 * 知识库成员定义（`getKbFiles`）契约测试
 * ------------------------------------------------------------
 * 背景（2026-09-13）：知识库详情页「发布博客」原本只把 `folderId` 子树交给博客工作室，
 * 而知识库自己的「笔记」列表用的是 `getKbFiles` —— 三类来源：
 *   ① folderId 文件夹下的 .md  ② kb.fileIds 手动添加  ③ kb.rules 规则匹配
 * 两处口径不一致 → 博客里会凭空少掉「手动添加 / 规则命中」的库内笔记。
 * 现在博客改为直接复用 `getKbFiles`（D4 单一数据源），本测试锁死这份定义。
 *
 * 同时守护一处潜在崩溃：folderId 已失效（文件夹被删/树重新挂载）时，
 * findNode 返回 null，不得把 null 传进 collectMarkdownFiles（否则读 node.type 抛错）。
 */
import { describe, it, expect } from 'vitest'
import { getKbFiles } from './kbStore'
import type { FileNode } from '@src/types/fileManager'
import type { KnowledgeBase } from './kbTypes'

const t = 1700000000000
const file = (id: string, name: string, content = ''): FileNode =>
  ({ id, name, type: 'file', content, createdAt: t, updatedAt: t })
const folder = (id: string, name: string, children: FileNode[] = []): FileNode =>
  ({ id, name, type: 'folder', children, createdAt: t, updatedAt: t })

/** 文件树：KB 文件夹（2 篇 md + 1 个非 md）/ 另一个文件夹（1 篇 md）/ 根下 1 篇 md */
const ROOT = folder('root', 'root', [
  folder('f-kb', '知识库文件夹', [
    file('n1', '库内笔记一.md', '#a'),
    file('n2', '库内笔记二.md', '#b'),
    file('x1', '库内图片.png'),
  ]),
  folder('f-other', '其他', [file('n3', '外部笔记.md', '#c')]),
  file('n4', '根目录笔记.md', '#d'),
])

const kb = (over: Partial<KnowledgeBase> = {}): KnowledgeBase => ({
  id: 'kb-1', name: '测试库', description: '', folderId: 'f-kb',
  createdAt: t, updatedAt: t, canvasIds: [], fileIds: [], rules: [],
  ...over,
})

describe('getKbFiles · 知识库成员定义', () => {
  it('① folderId 文件夹下的 .md 全部计入，非 .md 排除', () => {
    expect(getKbFiles(ROOT, kb()).sort()).toEqual(['n1', 'n2'])
  })

  it('② 手动添加的 fileIds（位于文件夹之外）同样计入 —— 只取子树会漏掉这类库内笔记', () => {
    expect(getKbFiles(ROOT, kb({ fileIds: ['n4'] })).sort()).toEqual(['n1', 'n2', 'n4'])
  })

  it('③ 规则命中的文件计入（name 规则）', () => {
    const ids = getKbFiles(ROOT, kb({ rules: [{ id: 'r1', type: 'name', value: 'name:外部', enabled: true }] }))
    expect(ids.sort()).toEqual(['n1', 'n2', 'n3'])
  })

  it('禁用的规则不生效', () => {
    const ids = getKbFiles(ROOT, kb({ rules: [{ id: 'r1', type: 'name', value: 'name:外部', enabled: false }] }))
    expect(ids.sort()).toEqual(['n1', 'n2'])
  })

  it('去重：文件既在 folderId 下又手动添加时只出现一次', () => {
    expect(getKbFiles(ROOT, kb({ fileIds: ['n1'] })).sort()).toEqual(['n1', 'n2'])
  })

  it('folderId 失效（文件夹不在树中）不抛错，且手动添加/规则仍生效', () => {
    const stale = kb({ folderId: 'f-deleted', fileIds: ['n4'] })
    expect(() => getKbFiles(ROOT, stale)).not.toThrow()
    expect(getKbFiles(ROOT, stale)).toEqual(['n4'])
  })

  it('manual fileIds 指向文件夹节点或已不存在的 id 时忽略', () => {
    expect(getKbFiles(ROOT, kb({ fileIds: ['f-other', 'ghost'] })).sort()).toEqual(['n1', 'n2'])
  })
})

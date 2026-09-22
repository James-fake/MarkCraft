import { describe, it, expect } from 'vitest'
import {
  USAGE_DOC_FOLDER_NAMES,
  resolveUsageDocsScope,
} from './usageDocs'
import { createInitialFileTree, collectAllFiles } from './fileTree'
import type { FileNode } from '../../types/fileManager'
// 播种侧与默认树侧的名字常量：本测试逐字核对，防两处字面量漂移
import { USAGE_DOC_FOLDER as ZH_FOLDER, USAGE_DOC_ALL as ZH_PAGES } from '@core/data/defaultDocs/usageDocs/zh'
import { USAGE_DOC_FOLDER as EN_FOLDER } from '@core/data/defaultDocs/usageDocs/en'

const file = (id: string, name: string): FileNode => ({
  id, name, type: 'file', content: '', createdAt: 0, updatedAt: 0,
})
const folder = (id: string, name: string, children: FileNode[]): FileNode => ({
  id, name, type: 'folder', children, createdAt: 0, updatedAt: 0, isExpanded: true,
})

describe('resolveUsageDocsScope —— 内置使用文档的单源判定', () => {
  it('1) 名字常量与默认树 / 播种用的是同一批字面量（防漂移锁）', () => {
    expect(USAGE_DOC_FOLDER_NAMES).toContain(ZH_FOLDER)
    expect(USAGE_DOC_FOLDER_NAMES).toContain(EN_FOLDER)
    // 默认树确实用它建文件夹（名字来源单一）
    const tree = createInitialFileTree('zh')
    const names = (tree.children ?? []).map((c) => c.name)
    expect(names).toContain(ZH_FOLDER)
  })

  it('2) 默认树：命中文件夹，且 hiddenIds = 文件夹自身 + 全部 16 篇文档', () => {
    const tree = createInitialFileTree('zh')
    const scope = resolveUsageDocsScope(tree)

    expect(scope.folderId).toBeTruthy()
    const docsFolder = (tree.children ?? []).find((c) => c.name === ZH_FOLDER)!
    expect(scope.folderId).toBe(docsFolder.id)

    // 文件夹自身计入
    expect(scope.hiddenIds.has(docsFolder.id)).toBe(true)
    // 每篇文档都计入（数量与数据源一致，不写死 16）
    const pageIds = collectAllFiles(docsFolder).map((f) => f.id)
    expect(pageIds.length).toBe(ZH_PAGES.length)
    for (const id of pageIds) expect(scope.hiddenIds.has(id)).toBe(true)
    expect(scope.hiddenIds.size).toBe(pageIds.length + 1)
  })

  it('3) 对照组：普通文件夹与普通笔记**不得**被计入（防「条件恒真」）', () => {
    const tree = createInitialFileTree('zh')
    const scope = resolveUsageDocsScope(tree)
    const myNotes = (tree.children ?? []).find((c) => c.name === '我的笔记')!
    expect(scope.hiddenIds.has(myNotes.id)).toBe(false)

    // 另造一棵带普通笔记的树：普通笔记 id 不在隐藏集内
    const plain = folder('root', '文件管理器', [
      folder('f-notebook', '我的笔记', [file('file-a', '笔记 A.md'), file('file-b', '笔记 B.md')]),
    ])
    const s2 = resolveUsageDocsScope(plain)
    expect(s2.folderId).toBeNull()
    expect(s2.hiddenIds.size).toBe(0)
    expect(s2.hiddenIds.has('file-a')).toBe(false)
    expect(s2.hiddenIds.has('f-notebook')).toBe(false)
  })

  it('4) 嵌套层级：文件夹不在根下（深层）同样命中，且后代完整', () => {
    const deep = folder('root', '文件管理器', [
      folder('f-l1', '资料', [
        folder('f-l2', '归档', [
          folder('f-docs', ZH_FOLDER, [
            file('d1', '00 开始使用.md'),
            folder('f-sub', '子目录', [file('d2', '01 界面布局.md')]),
          ]),
        ]),
      ]),
      file('keep', '普通笔记.md'),
    ])
    const scope = resolveUsageDocsScope(deep)
    expect(scope.folderId).toBe('f-docs')
    // 多级后代都计入
    expect(scope.hiddenIds.has('d1')).toBe(true)
    expect(scope.hiddenIds.has('f-sub')).toBe(true)
    expect(scope.hiddenIds.has('d2')).toBe(true)
    // 同树内的普通笔记不受影响
    expect(scope.hiddenIds.has('keep')).toBe(false)
  })

  it('5) 英文库名同样命中（多语言一份实现）', () => {
    const en = folder('root', 'File Manager', [folder('f-en', EN_FOLDER, [file('e1', '00 Getting Started.md')])])
    const scope = resolveUsageDocsScope(en)
    expect(scope.folderId).toBe('f-en')
    expect(scope.hiddenIds.has('e1')).toBe(true)
  })

  it('6) 树为空 / null / 无该文件夹 → folderId=null 且集合为空（不抛错）', () => {
    expect(resolveUsageDocsScope(null).folderId).toBeNull()
    expect(resolveUsageDocsScope(undefined).hiddenIds.size).toBe(0)
    // 只有文件、没有该文件夹的树
    const noFolder = folder('root', '文件管理器', [file('x', 'x.md')])
    expect(resolveUsageDocsScope(noFolder).hiddenIds.size).toBe(0)
    // 名字相近但不等 → 不命中（避免过度匹配）
    const near = folder('root', '文件管理器', [folder('f', 'MarkCraft 使用文档 备份', [file('n', 'n.md')])])
    expect(resolveUsageDocsScope(near).folderId).toBeNull()
  })
})

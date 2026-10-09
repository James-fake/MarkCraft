/**
 * 内置「MarkCraft 使用文档」知识库播种契约测试（`stores/kbSeed.ts`）
 * ------------------------------------------------------------
 * 用户需求（2026-09-21）：首次进入 MarkCraft，知识库界面默认已存在一个
 * 「MarkCraft 使用文档」知识库，库内笔记 = MarkCraft 各功能的使用说明。
 *
 * 本测试锁死播种层对外承诺的三条硬约束 —— 它们都不是实现细节，而是产品语义：
 *   ① **幂等**：重复调用（React StrictMode 双跑 / 重挂载 / 二次进入）不重复建库、不重复建文件；
 *   ② **不复活**：用户主动删掉该知识库后，下次进入不得重建（种子复活是反模式）；
 *   ③ **零丢失**：老用户「我的笔记」下的旧文档只做迁移 —— 不改名、不删除、**id 不变**
 *      （改名会切断 `[[双链]]`，换 id 会让已打开的标签页失去指向）。
 *
 * 另锁两条容易静默回归的行为：
 *   ④ 建文件必须显式 `openAfterCreate = false` —— 否则首次进入会瞬间开出 16 个标签页；
 *   ⑤ 已有同名文件夹时复用而非再造一个（且不覆写用户自己写的同名笔记）。
 *
 * 知识库持久化走磁盘存储层（jsdom 下自动退化为内存后端）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { kvSet, kvClear } from '@core/storage/kv'
import { collectAllFiles } from '@core/files/fileTree'
import type { FileNode } from '../types/fileManager'
import { ensureUsageDocsKb, USAGE_DOCS_SEED_KEY, type UsageDocsSeedDeps } from './kbSeed'
import { getKbList, loadKb, deleteKb, createKbInFolder } from './kbStore'
import {
  USAGE_DOC_ALL as ZH_ALL,
  USAGE_DOC_FOLDER as ZH_FOLDER,
} from '@core/data/defaultDocs/usageDocs/zh'
import {
  USAGE_DOC_ALL as EN_ALL,
  USAGE_DOC_FOLDER as EN_FOLDER,
} from '@core/data/defaultDocs/usageDocs/en'

// ─── 测试用文件树构造（可变，模拟 FileStore 的就地更新语义） ───

let seq = 0
const t = 1700000000000

const fileNode = (name: string, content = '# 内置内容'): FileNode => ({
  id: `f-${++seq}`, name, type: 'file', content, createdAt: t, updatedAt: t,
})
const folderNode = (name: string, children: FileNode[] = []): FileNode => ({
  id: `d-${++seq}`, name, type: 'folder', children, createdAt: t, updatedAt: t,
})

function locate(root: FileNode, id: string): { parent: FileNode | null; node: FileNode | null } {
  const stack: FileNode[] = [root]
  while (stack.length) {
    const cur = stack.shift() as FileNode
    if (cur.id === id) return { parent: null, node: cur }
    for (const c of cur.children ?? []) {
      if (c.id === id) return { parent: cur, node: c }
      stack.push(c)
    }
  }
  return { parent: null, node: null }
}

function findByName(root: FileNode, name: string): FileNode | null {
  const stack: FileNode[] = [root]
  while (stack.length) {
    const cur = stack.shift() as FileNode
    if (cur.name === name) return cur
    for (const c of cur.children ?? []) stack.push(c)
  }
  return null
}

interface Harness {
  root: FileNode
  deps: UsageDocsSeedDeps
  /** createFile 调用流水（用于断言 openAfterCreate 与调用次数） */
  created: { parentId: string; name: string; openAfterCreate: boolean | undefined }[]
  /** moveNode 调用流水（期望只用于迁移旧文档） */
  moved: { id: string; target: string }[]
  folderCreateCount: number
}

/** 用内存文件树模拟 useFileManager 暴露的三个写操作，记录调用流水 */
function harness(root: FileNode, lang: 'zh' | 'en' = 'zh'): Harness {
  const h: Harness = {
    root,
    created: [],
    moved: [],
    folderCreateCount: 0,
    deps: null as unknown as UsageDocsSeedDeps,
  }
  h.deps = {
    rootFolder: root,
    lang,
    createFolder: (parentId, name) => {
      h.folderCreateCount++
      const node = folderNode(name)
      const parent = locate(root, parentId).node
      if (!parent?.children) throw new Error(`createFolder: 父节点不存在 ${parentId}`)
      parent.children.push(node)
      return node.id
    },
    createFile: (parentId, name, content, openAfterCreate) => {
      h.created.push({ parentId, name, openAfterCreate })
      const node = fileNode(name, content ?? '')
      const parent = locate(root, parentId).node
      if (!parent?.children) throw new Error(`createFile: 父节点不存在 ${parentId}`)
      parent.children.push(node)
      return node.id
    },
    moveNode: (nodeId, targetParentId) => {
      h.moved.push({ id: nodeId, target: targetParentId })
      const { parent, node } = locate(root, nodeId)
      const target = locate(root, targetParentId).node
      if (!node || !parent?.children || !target?.children) return false
      parent.children = parent.children.filter((c) => c.id !== nodeId)
      target.children.push(node)
      return true
    },
  }
  return h
}

/**
 * 真实 FileStore 的根节点 id 固定为 `'root'` —— 播种/建库都走 `createFolder('root', ...)`，
 * 故测试假树的根也必须叫 `root`，否则测的不是同一条路径。
 */
const asRoot = (node: FileNode): FileNode => {
  node.id = 'root'
  return node
}

/** 首启形态：root → 我的笔记（空） */
const freshRoot = () => asRoot(folderNode('文件管理器', [folderNode('我的笔记', [])]))
const namesIn = (node: FileNode) => collectAllFiles(node).map((f) => f.name)

beforeEach(async () => {
  localStorage.clear()
  await kvClear()
})

describe('kbSeed · 首启默认存在「MarkCraft 使用文档」知识库', () => {
  it('① 空树播种：建出同名文件夹 + 同名知识库，笔记 = 全部内置篇章', async () => {
    const root = freshRoot()
    const h = harness(root)

    const kbId = await ensureUsageDocsKb(h.deps)

    expect(typeof kbId).toBe('string')
    const list = await getKbList()
    expect(list.map((k) => k.name)).toEqual([ZH_FOLDER])

    const folder = findByName(root, ZH_FOLDER)
    expect(folder?.type).toBe('folder')
    expect(namesIn(folder as FileNode)).toEqual(ZH_ALL.map((p) => p.fileName))

    // 知识库的 folderId 必须指向该文件夹 —— 否则「笔记」tab 会是空的
    const kb = await loadKb(kbId as string)
    expect(kb?.folderId).toBe(folder?.id)
  })

  it('② 播种建的文件必须 openAfterCreate=false —— 否则首启瞬间开出 16 个标签页', async () => {
    const h = harness(freshRoot())

    await ensureUsageDocsKb(h.deps)

    expect(h.created.length).toBe(ZH_ALL.length)
    expect(h.created.every((c) => c.openAfterCreate === false)).toBe(true)
  })

  it('③ 幂等：二次播种复用同一知识库，不再新建文件夹与文件', async () => {
    const root = freshRoot()
    const h = harness(root)

    const first = await ensureUsageDocsKb(h.deps)
    const afterFirst = { files: h.created.length, folders: h.folderCreateCount }

    const second = await ensureUsageDocsKb(h.deps)

    expect(second).toBe(first)
    expect(h.created.length).toBe(afterFirst.files)
    expect(h.folderCreateCount).toBe(afterFirst.folders)
    expect((await getKbList()).length).toBe(1)
  })

  it('④ 并发/双调用去重：同一时刻两次播种只产生一个知识库', async () => {
    const h = harness(freshRoot())

    const [a, b] = await Promise.all([ensureUsageDocsKb(h.deps), ensureUsageDocsKb(h.deps)])

    expect(a).toBe(b)
    expect((await getKbList()).length).toBe(1)
    expect(h.created.length).toBe(ZH_ALL.length)
  })

  it('⑤ 不复活：用户删除该知识库后，再次进入不得重建', async () => {
    const h = harness(freshRoot())
    const kbId = await ensureUsageDocsKb(h.deps)
    expect(localStorage.getItem(USAGE_DOCS_SEED_KEY)).toBe('1')

    await deleteKb(kbId as string, false)
    expect(await getKbList()).toEqual([])

    expect(await ensureUsageDocsKb(h.deps)).toBeNull()
    expect(await getKbList()).toEqual([])
  })

  it('⑥ 已有其他知识库不受影响，只追加使用文档库', async () => {
    const h = harness(freshRoot())
    await createKbInFolder('我的知识库', '自己建的', 'root')

    const kbId = await ensureUsageDocsKb(h.deps)

    const names = (await getKbList()).map((k) => k.name).sort()
    expect(names).toEqual(['MarkCraft 使用文档', '我的知识库'].sort())
    expect((await loadKb(kbId as string))?.folderId).toBe(findByName(h.root, ZH_FOLDER)?.id)
  })
})

describe('kbSeed · 与既有文件树共存（补齐 / 复用 / 迁移）', () => {
  it('⑦ 已有同名文件夹：复用而不新建，缺篇补齐，用户写的同名笔记不被覆写', async () => {
    const mine = fileNode('01 界面布局.md', '# 我自己写的界面布局')
    const docs = folderNode(ZH_FOLDER, [mine])
    const root = asRoot(folderNode('文件管理器', [docs, folderNode('我的笔记', [])]))
    const h = harness(root)

    await ensureUsageDocsKb(h.deps)

    expect(h.folderCreateCount).toBe(0)
    expect(findByName(root, ZH_FOLDER)?.id).toBe(docs.id)
    // 同名笔记原样保留（既没被删也没被重新赋值）
    expect(docs.children?.[0]).toBe(mine)
    expect(mine.content).toBe('# 我自己写的界面布局')
    // 其余篇章补齐
    expect(namesIn(docs).length).toBe(ZH_ALL.length)
    expect(h.created.length).toBe(ZH_ALL.length - 1)
  })

  it('⑧ 老用户迁移：旧三篇搬入新文件夹，原名/原 id 不变，「我的笔记」保留用户自己的笔记', async () => {
    const manual = fileNode('用户手册.md', '# 用户手册全文')
    const tutorial = fileNode('Markdown 入门教程.md', '# 教程')
    const guide = fileNode('知识链接体系指南.md', '# 指南')
    const own = fileNode('我自己的笔记.md', '# 私有')
    const myNotes = folderNode('我的笔记', [manual, tutorial, guide, own])
    const root = asRoot(folderNode('文件管理器', [myNotes]))
    const h = harness(root)

    await ensureUsageDocsKb(h.deps)

    const docs = findByName(root, ZH_FOLDER) as FileNode
    const files = collectAllFiles(docs)

    // ① 迁移而非删除，且 **id 不变** —— 这是「标签页 / [[双链]] 不失效」的充要条件
    for (const old of [manual, tutorial, guide]) {
      const hit = files.find((f) => f.id === old.id)
      expect(hit, `${old.name} 应仍以原 id 存在`).toBeTruthy()
      expect(hit?.name).toBe(old.name) // 不改名：改名会切断 [[双链]]
    }

    // ② 旧名已覆盖的篇章不重复创建（避免同名两份）
    const createdNames = h.created.map((c) => c.name)
    expect(createdNames).not.toContain('Markdown 入门教程.md')
    expect(createdNames).not.toContain('知识链接体系指南.md')

    // ③ 全部内置篇章到位，且《用户手册》全文作为额外一篇保留
    expect(namesIn(docs).length).toBe(ZH_ALL.length + 1)
    expect(namesIn(docs).filter((n) => n === '用户手册.md').length).toBe(1)

    // ④ 用户自己的笔记原地不动
    expect(myNotes.children?.map((c) => c.name)).toEqual(['我自己的笔记.md'])
    expect(h.moved.length).toBe(3)
    expect(h.moved.every((m) => m.target === docs.id)).toBe(true)
  })

  it('⑨ 无任何旧文档时不做多余的 moveNode', async () => {
    const h = harness(freshRoot())
    await ensureUsageDocsKb(h.deps)
    expect(h.moved).toEqual([])
  })
})

describe('kbSeed · 英文语言包', () => {
  it('⑩ lang=en 时建出英文文件夹与英文知识库，篇数与中文一致', async () => {
    const root = asRoot(folderNode('File Manager', [folderNode('My Notes', [])]))
    const h = harness(root, 'en')

    const kbId = await ensureUsageDocsKb(h.deps)

    expect((await getKbList()).map((k) => k.name)).toEqual([EN_FOLDER])
    const folder = findByName(root, EN_FOLDER) as FileNode
    expect(namesIn(folder)).toEqual(EN_ALL.map((p) => p.fileName))
    expect((await loadKb(kbId as string))?.folderId).toBe(folder.id)
  })

  it('⑪ lang=en 时旧英文《用户手册》一并迁入且不改名', async () => {
    const manual = fileNode('User Manual.md', '# User Manual')
    const myNotes = folderNode('My Notes', [manual])
    const root = asRoot(folderNode('File Manager', [myNotes]))
    const h = harness(root, 'en')

    await ensureUsageDocsKb(h.deps)

    const docs = findByName(root, EN_FOLDER) as FileNode
    expect(collectAllFiles(docs).find((f) => f.id === manual.id)?.name).toBe('User Manual.md')
    expect(namesIn(docs).length).toBe(EN_ALL.length + 1)
    expect(myNotes.children).toEqual([])
  })
})

describe('kbSeed · 老用户升级路径（悬空 folderId 自愈）', () => {
  it('⑫ 悬空 folderId：重新挂载文件夹、补齐笔记，且仍是同一个知识库', async () => {
    // 复现历史竞态留下的坏状态：知识库在，但它指向的文件夹已不在树上（幽灵 id）。
    // 这正是用户看到的「知识库能进、里面 0 篇」。
    const manual = fileNode('用户手册.md', '# 用户手册全文')
    const tutorial = fileNode('Markdown 入门教程.md', '# 教程')
    const guide = fileNode('知识链接体系指南.md', '# 指南')
    const own = fileNode('我自己的笔记.md', '# 私有')
    const myNotes = folderNode('我的笔记', [manual, tutorial, guide, own])
    const root = asRoot(folderNode('文件管理器', [myNotes]))
    const h = harness(root)

    const broken = await createKbInFolder(ZH_FOLDER, '内置文档', 'ghost-folder-id')
    localStorage.setItem(USAGE_DOCS_SEED_KEY, '1') // 已播种过 —— 用户此刻正处此状态

    const kbId = await ensureUsageDocsKb(h.deps)

    // ① 不是删掉重建：kb.id 不变、库数量不变（保住 rules / tasks / 导出记录等积累）
    expect(kbId).toBe(broken.id)
    expect((await getKbList()).map((k) => k.id)).toEqual([broken.id])

    // ② folderId 已从幽灵 id 修正为树上真实存在的文件夹 —— 这直接决定「库里有没有笔记」
    const folder = findByName(root, ZH_FOLDER) as FileNode
    expect(folder?.type).toBe('folder')
    expect((await loadKb(broken.id))?.folderId).toBe(folder.id)

    // ③ 笔记补齐：全部内置篇章 + 迁移来的旧《用户手册》全文
    const files = collectAllFiles(folder)
    expect(files.length).toBe(ZH_ALL.length + 1)

    // ④ 旧文档迁移而非重建：id 与文件名都不变（护住 [[双链]] 与已打开的标签页）
    for (const old of [tutorial, guide]) {
      expect(files.find((f) => f.id === old.id)?.name).toBe(old.name)
    }

    // ⑤ 用户自己的笔记零丢失
    expect(myNotes.children?.map((c) => c.name)).toEqual(['我自己的笔记.md'])
  })

  it('⑬ 自愈幂等：folderId 修好后再次进入直接短路，不再建库建文件', async () => {
    const root = asRoot(folderNode('文件管理器', [folderNode('我的笔记', [])]))
    const h = harness(root)
    await createKbInFolder(ZH_FOLDER, '内置文档', 'ghost-folder-id')
    localStorage.setItem(USAGE_DOCS_SEED_KEY, '1')

    const first = await ensureUsageDocsKb(h.deps)
    const snapshot = { files: h.created.length, folders: h.folderCreateCount }

    const second = await ensureUsageDocsKb(h.deps)

    expect(second).toBe(first)
    expect((await getKbList()).length).toBe(1)
    expect(h.created.length).toBe(snapshot.files)
    expect(h.folderCreateCount).toBe(snapshot.folders)
  })

  it('⑭ 健康知识库短路：folderId 可解析即复用，不补齐用户自己清空过的笔记', async () => {
    const docs = folderNode(ZH_FOLDER, []) // 用户把库里的内置笔记删光了
    const root = asRoot(folderNode('文件管理器', [docs, folderNode('我的笔记', [])]))
    const h = harness(root)
    const kb = await createKbInFolder(ZH_FOLDER, '内置文档', docs.id)

    expect(await ensureUsageDocsKb(h.deps)).toBe(kb.id)
    expect(h.created).toEqual([]) // 删掉就是删掉，不复活
    expect(h.folderCreateCount).toBe(0)
  })
})

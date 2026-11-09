/**
 * FileStore · rename/move 同名碰撞守卫（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-11-03 穷尽式审查 P0-2，数据丢失级）：
 *
 * store 层不挡重名时，vaultService.doSync 的 `fs.rename(prev.path, cur.path)` 会
 * **静默覆盖**磁盘上的同名文件 —— 树里两个节点共享一条磁盘路径，原文件内容永久
 * 丢失（无确认、无备份、无回收站）。本文件锁死的行为：
 *   ① moveNode 到含同名子节点的文件夹 → 拒绝，节点留在原位、内容不动；
 *   ② renameNode 改成兄弟同名 → 拒绝；对**自身**的大小写变体改名（Windows 惯例）
 *      → 放行（磁盘上是同一文件，rename 安全）；
 *   ③ 守卫是两层防御：同步预检（stateRef，用户交互路径的返回值）+ updater 内深度
 *      防御（prev，同批次复合写入的数据安全兜底）—— 守卫不得破坏 FileStore.batch ②
 *      锁死的「createFolder → moveNode 同批次 prev 链」行为。
 *
 * 夹具同 FileStore.batch.test.tsx：最小 Provider 栈，存储走磁盘存储层（jsdom 退化内存）。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { kvSet, kvClear } from '@core/storage/kv'
import type { FileManagerState } from '../types/fileManager'
import { findNode, findParentId } from '../services/fileService'
import { LanguageProvider } from './LanguageStore'
import { UndoRedoProvider } from './UndoRedoStore'
import { FileManagerProvider, useFileManager } from './FileStore'

const T = 1700000000000
const STORAGE_KEY = 'markcraft-file-manager'

function seedTree(): FileManagerState {
  return {
    rootFolder: {
      id: 'root',
      name: '文件管理器',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [
        {
          id: 'folder-a',
          name: '文件夹 A',
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            { id: 'doc-a', name: '同名文档.md', type: 'file', content: '# A 版内容', createdAt: T, updatedAt: T },
          ],
        },
        {
          id: 'folder-b',
          name: '文件夹 B',
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            { id: 'doc-b', name: '同名文档.md', type: 'file', content: '# B 版内容', createdAt: T, updatedAt: T },
          ],
        },
        {
          id: 'lone-doc',
          name: '独立笔记.md',
          type: 'file',
          content: '# 独立笔记',
          createdAt: T,
          updatedAt: T,
        },
      ],
    },
    tabs: [],
    activeTabId: null,
    searchQuery: '',
    sidebarVisible: true,
  }
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <UndoRedoProvider>
        <FileManagerProvider>{children}</FileManagerProvider>
      </UndoRedoProvider>
    </LanguageProvider>
  )
}

beforeEach(async () => {
  localStorage.clear()
  await kvClear()
  localStorage.setItem(`${STORAGE_KEY}-version`, 'v5')
  await kvSet(STORAGE_KEY, JSON.stringify(seedTree()))
})

afterEach(async () => {
  cleanup()
  await new Promise((r) => setTimeout(r, 350))
  await kvClear()
})

describe('FileStore · moveNode 同名碰撞守卫', () => {
  it('移动到含同名子节点的文件夹 → 拒绝，节点留在原位且内容不动', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let ok = true
    act(() => {
      ok = result.current.moveNode('doc-b', 'folder-a')
    })
    expect(ok).toBe(false)
    // 拒绝 = 结构不变：doc-b 仍在文件夹 B，A 里的原文件未被覆盖
    expect(findParentId(result.current.rootFolder, 'doc-b')).toBe('folder-b')
    expect(findNode(result.current.rootFolder, 'doc-a')?.content).toBe('# A 版内容')
    expect(findNode(result.current.rootFolder, 'doc-b')?.content).toBe('# B 版内容')
  })

  it('正常移动（目标无同名）→ 仍可用（守卫不误伤）', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let ok = false
    act(() => {
      ok = result.current.moveNode('lone-doc', 'folder-a')
    })
    expect(ok).toBe(true)
    expect(findParentId(result.current.rootFolder, 'lone-doc')).toBe('folder-a')
  })

  it('同批次 createFolder → moveNode 复合写入不被守卫破坏（prev 链回归）', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let folderId = ''
    let ok = false
    act(() => {
      folderId = result.current.createFolder('root', '新建文件夹')
      // 目标父节点在本批次里刚刚诞生 —— 守卫若用 stateRef 快照查父级会误拒
      ok = result.current.moveNode('lone-doc', folderId)
    })
    expect(ok).toBe(true)
    expect(findParentId(result.current.rootFolder, 'lone-doc')).toBe(folderId)
  })

  it('同批次（已有 pending update）下的拒绝必须如实返回 false（M-C-5 返回值契约）', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let ok = true
    act(() => {
      // 先排一次更新：React 18 会跳过后续 setState 的 eager 求值，updater 延后执行。
      // 旧实现把 `rejected` 写在 updater 里再 `return !rejected` → 此时恒返回 true，
      // 而实际移动已被守卫拒绝（契约撒谎）。
      result.current.createFolder('root', '无关文件夹')
      ok = result.current.moveNode('doc-b', 'folder-a')
    })

    expect(ok).toBe(false)
    // 拒绝 = 结构不变（数据安全不依赖返回值，但返回值必须与之一致）
    expect(findParentId(result.current.rootFolder, 'doc-b')).toBe('folder-b')
    expect(findNode(result.current.rootFolder, 'doc-a')?.content).toBe('# A 版内容')
  })

  it('移动到不存在的节点 → 返回 false 且不改树（批处理下同样成立）', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let ok = true
    act(() => {
      // 先排一次更新让后续 setState 跳过 eager 求值 —— 旧实现此时 updater 延后执行，
      // `rejected` 仍为 false，于是对「目标不存在」谎报 true。
      result.current.createFolder('root', '无关文件夹')
      ok = result.current.moveNode('lone-doc', 'no-such-folder')
    })
    expect(ok).toBe(false)
    expect(findParentId(result.current.rootFolder, 'lone-doc')).toBe('root')
  })
})

describe('FileStore · renameNode 同名碰撞守卫', () => {
  it('改成兄弟同名 → 拒绝，原名与原内容不动', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    // 先在同文件夹造一个兄弟（folder-b 里只有 doc-b 自己）
    act(() => {
      result.current.createFile('folder-b', '另一篇.md', '# 另一篇', false)
    })
    let ok = true
    act(() => {
      ok = result.current.renameNode('doc-b', '另一篇')
    })
    expect(ok).toBe(false)
    expect(findNode(result.current.rootFolder, 'doc-b')?.name).toBe('同名文档.md')
    expect(findNode(result.current.rootFolder, 'lone-doc')?.content).toBe('# 独立笔记')
  })

  it('对自身的纯大小写改名（.MD → .md，磁盘上是同一文件）→ 放行', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let ok = false
    act(() => {
      // lone-doc 原名 '独立笔记.md'；目标 '独立笔记.MD' 与自身 toLowerCase 相等
      // 且 id === 自身被排除 → 无碰撞 → 放行
      ok = result.current.renameNode('lone-doc', '独立笔记.MD')
    })
    expect(ok).toBe(true)
    expect(findNode(result.current.rootFolder, 'lone-doc')?.name).toBe('独立笔记.MD')
  })

  it('带 .md 后缀自动补全的重命名同样受守卫约束', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    // 先在同文件夹造兄弟 '另一篇.md'，再把 doc-b 改成 '另一篇'（自动补 .md）→ 碰撞
    act(() => {
      result.current.createFile('folder-b', '另一篇.md', '# 另一篇', false)
    })
    let ok = true
    act(() => {
      ok = result.current.renameNode('doc-b', '另一篇')
    })
    expect(ok).toBe(false)
    expect(findNode(result.current.rootFolder, 'doc-b')?.name).toBe('同名文档.md')
  })
})

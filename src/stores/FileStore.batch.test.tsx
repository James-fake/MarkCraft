/**
 * FileStore · 两阶段初始化 与 同批次写入的累积语义（回归锁）
 * ------------------------------------------------------------
 * 背景（2026-09-21 缺陷「知识库能进、里面 0 篇」）：
 *
 * FileStore 的 state 是**两阶段**初始化的：
 *   ① 同步 `loadState()`：localStorage 只存版本号（树在 IndexedDB），无树可读 → 造一棵
 *      **全新默认树 T0**（首启种子：使用文档文件夹 + 我的笔记）；
 *   ② 异步 `loadStateAsync()`：读 IndexedDB 权威树 → **整体覆盖** state。
 *
 * 两者之间是一个竞态窗口。任何在这窗口里按树写入的调用方（如内置使用文档播种）都会：
 *   · 命中 T0 自带的「使用文档」文件夹（同名 → 不新建），把笔记建进 T0 的文件夹；
 *   · 随后 T0 被权威旧树覆盖 → 笔记与文件夹 id 一起消失；
 *   · 而调用方拿到的 id 已被写进持久化数据（KB.folderId）→ **悬空引用**。
 *
 * 本文件锁死两条防线：
 *   A. `hydrated` 信号必须如实反映「权威树是否就位」—— 它是调用方判断能否写入的唯一依据；
 *   B. 写操作必须靠 `setState(prev => ...)` **依次累积**。moveNode 曾用 `stateRef` 快照
 *      算出整棵树后直接替换 rootFolder，在同一批次内会覆盖掉先前 updater 的成果 ——
 *      最严重的后果不是显示错乱，而是 movedNode 因目标父不存在而**静默消失**（数据丢失）。
 *
 * 夹具用最小 Provider 栈（Language > UndoRedo > FileManager），不引 aurora 装配层，
 * 以免 stores → aurora 的反向依赖（守卫 `no-aurora-ui-import`）。
 * 存储走磁盘存储层（jsdom 下自动退化为内存后端，见 @core/storage/backend）。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { kvSet, kvClear } from '@core/storage/kv'
import { collectAllFiles } from '@core/files/fileTree'
import type { FileNode, FileManagerState } from '../types/fileManager'
import { findNode, findParentId } from '../services/fileService'
import { LanguageProvider } from './LanguageStore'
import { UndoRedoProvider } from './UndoRedoStore'
import { FileManagerProvider, useFileManager } from './FileStore'

const T = 1700000000000
const STORAGE_KEY = 'markcraft-file-manager'

function findByName(root: FileNode, name: string): FileNode | null {
  const stack: FileNode[] = [root]
  while (stack.length) {
    const cur = stack.shift() as FileNode
    if (cur.name === name) return cur
    for (const c of cur.children ?? []) stack.push(c)
  }
  return null
}

/** 老用户的权威旧树：我的笔记 → 用户手册.md（无「使用文档」文件夹、无知识库） */
function legacyTree(): FileManagerState {
  return {
    rootFolder: {
      id: 'root',
      name: '文件管理器',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [
        {
          id: 'my-notes',
          name: '我的笔记',
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            { id: 'legacy-doc', name: '用户手册.md', type: 'file', content: '# 旧手册全文', createdAt: T, updatedAt: T },
          ],
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
  // 版本号匹配 → loadState 不会重建 localStorage 树（树只在 IndexedDB 里，制造出「同步
  // 兜底树 T0 + 异步权威树」的两阶段现场）；同时让 loadStateAsync 不提前 return null。
  localStorage.setItem(`${STORAGE_KEY}-version`, 'v5')
  await kvSet(STORAGE_KEY, JSON.stringify(legacyTree()))
})

afterEach(async () => {
  cleanup()
  // saveState 是 300ms 防抖且定时器是模块级的 —— 等它跑完再清，避免污染下一个用例
  await new Promise((r) => setTimeout(r, 350))
  await kvClear()
})

describe('FileStore · 两阶段初始化（hydrated 信号）', () => {
  it('① 水合前是同步兜底树：自带「使用文档」文件夹，却看不到 IndexedDB 里的权威内容', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })

    // 首次 render 同步走 loadState → localStorage 无树 → 全新默认树（首启种子）
    expect(result.current.hydrated).toBe(false)
    expect(findByName(result.current.rootFolder, 'MarkCraft 使用文档')).toBeTruthy()
    expect(findNode(result.current.rootFolder, 'legacy-doc')).toBeNull()

    // 水合后换成 IndexedDB 权威旧树：兜底树连同其中那个**同名文件夹**一起被丢弃
    await waitFor(() => expect(result.current.hydrated).toBe(true))
    expect(findNode(result.current.rootFolder, 'legacy-doc')).toBeTruthy()
    expect(findByName(result.current.rootFolder, 'MarkCraft 使用文档')).toBeNull()
  })
})

describe('FileStore · 同批次写入的累积语义', () => {
  it('② createFolder → moveNode → createFile 同批次：三者都必须落在同一棵树上', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    // 起点是权威旧树 —— 这正是老用户升级路径的现场
    expect(findNode(result.current.rootFolder, 'legacy-doc')).toBeTruthy()

    let folderId = ''
    act(() => {
      folderId = result.current.createFolder('root', 'MarkCraft 使用文档')
      // 目标父节点在本批次里刚刚诞生；若 moveNode 沿用 stateRef 快照求值，
      // 它会因找不到该父节点而把 legacy-doc 从原位置摘下后丢弃
      result.current.moveNode('legacy-doc', folderId)
      result.current.createFile(folderId, '01 界面布局.md', '# 新篇', false)
    })

    const root = result.current.rootFolder

    // ① 新文件夹落地（挡住「被快照整体覆盖」）
    expect(findNode(root, folderId), '新文件夹被同批次的 moveNode 覆盖掉了').toBeTruthy()

    // ② 旧文档没有消失，且已在新文件夹下（数据丢失防线）
    const moved = findNode(root, 'legacy-doc')
    expect(moved, '旧文档被静默丢弃 —— 这是数据丢失，不是显示问题').toBeTruthy()
    expect(findParentId(root, 'legacy-doc')).toBe(folderId)

    // ③ 新建的篇章也在同一文件夹下
    const created = findByName(root, '01 界面布局.md')
    expect(created).toBeTruthy()
    expect(findParentId(root, created!.id)).toBe(folderId)

    // ④ 原位置只减不增：旧文档已搬走，不留副本
    expect(collectAllFiles(findNode(root, 'my-notes')!).map((f) => f.name)).not.toContain('用户手册.md')
  })
})

/**
 * FileStore · openFile 切标签：`activeTabId` 与 `isActive` 必须始终同源
 * ----------------------------------------------------------------------------
 * 背景（2026-09-22，由 usageDocBrief 用例 8 在高负载整跑下抓出）：
 *
 * `openFile` 曾把「找/建标签」与「设 activeTabId」拆成**两次** setState，中间靠一个
 * `let newActiveTabId` 旁路变量传值。而 `setState(updater)` 的 updater 只在**渲染期**运行 ——
 * 只有 React 的「急切求值」（该 fiber 更新队列为空）才会让它同步跑一次并给变量赋值。
 * 于是：**同一 tick 内的第二次及以后的 setState 都拿不到该变量**（队列非空 ⇒ 跳过急切求值），
 * 旁路变量仍是 null ⇒ 第二次 setState 被整段跳过 ⇒ `activeTabId` 不更新。
 *
 * 症状（用户可见）：点一个**已经在标签栏里打开**的文件，编辑器不切过去 —— 甚至出现
 * 「tab 的 isActive=true，但 activeTabId 指着另一篇」的自相矛盾状态（当时渲染的是错的那篇）。
 *
 * 本锁用**同一 tick 内连开三次**（A → B → A）复现：第 3 次必然落在「非急切求值」路径上，
 * 旧实现下 activeTabId 会停在 B。
 */
describe('FileStore · openFile 切标签（activeTabId 与 isActive 同源）', () => {
  it('③ 同 tick 内 A → B → A：必须切回 A，且 isActive 标记与 activeTabId 一致', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let a = ''
    let b = ''
    act(() => {
      a = result.current.createFile('my-notes', 'A.md', '# A', false)
      b = result.current.createFile('my-notes', 'B.md', '# B', false)
      // 三次 openFile 落在同一个 React 批次里 —— 后两次必走「非急切求值」路径
      result.current.openFile(a)
      result.current.openFile(b)
      result.current.openFile(a)
    })

    expect(result.current.getActiveFileId(), 'openFile 打开已存在标签时必须切过去（旧实现会停在上一个）').toBe(a)

    // 不变式：恰有一个 tab isActive，且它就是 activeTabId 指向的那个
    const tabs = result.current.tabs
    const actives = tabs.filter((t) => t.isActive)
    expect(actives, `isActive 标记必须恰有一个为真，实际 ${actives.length} 个`).toHaveLength(1)
    expect(actives[0].fileId).toBe(result.current.getActiveFileId())
    expect(tabs.find((t) => t.id === result.current.activeTabId)?.fileId).toBe(a)
  })

  it('④ 开关顺序无关：B → A → B 同样必须切到 B（防「只对最后一次生效」的伪修复）', async () => {
    const { result } = renderHook(() => useFileManager(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    let a = ''
    let b = ''
    act(() => {
      a = result.current.createFile('my-notes', 'A.md', '# A', false)
      b = result.current.createFile('my-notes', 'B.md', '# B', false)
      result.current.openFile(b)
      result.current.openFile(a)
      result.current.openFile(b)
    })

    expect(result.current.getActiveFileId()).toBe(b)
    expect(result.current.tabs.filter((t) => t.isActive)).toHaveLength(1)
    expect(result.current.tabs.find((t) => t.isActive)!.fileId).toBe(b)
  })
})

/**
 * FileStore · 内置「使用文档」= **瞬态（预览）标签**（回归锁）
 * ============================================================================
 * 用户需求（2026-09-22，第二轮）：
 *   「从 MarkCraft 使用文档知识库中的笔记点击进入后，退出来到编辑器界面不要再次显示这个笔记，
 *     也就是不要保存这个使用文档笔记文件。使用文档的笔记只能从这个知识库中点击进入。」
 *
 * 语义拆解 = 四条互相独立的约束，本文件逐条钉死（缺一条就退化成「部分无痕」）：
 *   ① **不进「最近文件」** —— 否则内联「插入双链」的候选与欢迎页「继续《…》」会把说明书当用户文档；
 *   ② **不进标签栏**（`AuroraTabs` 过滤，见 AuroraTabs 的测试）—— 它不是「打开的文件」；
 *   ③ **不落盘** —— 否则「看着说明书时刷新 / 关闭」会被记成「上次打开的文档」；
 *   ④ **离开编辑器视图即整体回收**（`closeTransientTabs`）。
 * 并且用**普通笔记对照组**证明这些都是条件式的 ——「不存在」类断言在功能整块坏掉时同样恒真。
 *
 * 夹具用最小 Provider 栈（Language > UndoRedo > FileManager），不引 aurora 装配层
 * （避免 stores → aurora 的反向依赖，守卫 `no-aurora-ui-import`）。IndexedDB 用 fake-indexeddb。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { db } from '@core/storage/db'
import { loadLargeData } from '@core/storage/migrate'
import { getRecentFiles } from '@core/files/recentFiles'
import type { FileManagerState } from '../types/fileManager'
import { LanguageProvider } from './LanguageStore'
import { UndoRedoProvider } from './UndoRedoStore'
import { FileManagerProvider, useFileManager } from './FileStore'
import { USAGE_DOC_FOLDER, USAGE_DOC_ALL } from '@core/data/defaultDocs/usageDocs/zh'

const T = 1700000000000
const STORAGE_KEY = 'markcraft-file-manager'
/** core/files/recentFiles 的内部键（未导出，此处按值引用：脏数据必须原样构造才真实） */
const RECENT_KEY = 'markcraft_recent_files'

/** 内置篇章首篇的真实文件名（'00 开始使用.md'）—— 判定靠**文件名命中清单**，故必须用真名 */
const BUILTIN_NAME = USAGE_DOC_ALL[0].fileName
const FOLDER_ID = 'docs-folder'
const BUILTIN_ID = 'builtin-doc'
const NOTES_FOLDER_ID = 'my-notes'
const NOTE_ID = 'user-note'

/** 权威树：内置使用文档文件夹（含 1 篇说明书）+「我的笔记」（含 1 篇用户笔记） */
function fixtureState(): FileManagerState {
  return {
    rootFolder: {
      id: 'root',
      name: '文件管理器',
      type: 'folder',
      createdAt: T,
      updatedAt: T,
      children: [
        {
          id: FOLDER_ID,
          name: USAGE_DOC_FOLDER,
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            {
              id: BUILTIN_ID,
              name: BUILTIN_NAME,
              type: 'file',
              content: '# MarkCraft 使用文档\n\n内置说明书正文。',
              createdAt: T,
              updatedAt: T,
            },
          ],
        },
        {
          id: NOTES_FOLDER_ID,
          name: '我的笔记',
          type: 'folder',
          createdAt: T,
          updatedAt: T,
          children: [
            {
              id: NOTE_ID,
              name: '普通笔记.md',
              type: 'file',
              content: '# 普通笔记\n\n用户自己的内容。',
              createdAt: T,
              updatedAt: T,
            },
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

/** 按真实落盘读取路径取回持久化 state（与 loadStateAsync 同一条链路） */
async function readPersisted(): Promise<FileManagerState | null> {
  const raw = await loadLargeData(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as FileManagerState) : null
}

async function mountHydrated() {
  const r = renderHook(() => useFileManager(), { wrapper: Wrapper })
  await waitFor(() => expect(r.result.current.hydrated).toBe(true))
  return r
}

beforeEach(async () => {
  localStorage.clear()
  await db.kv.clear()
  // 版本号匹配 → loadState 不重建树（树只在 IDB 里，制造两阶段现场）；
  // 迁移键置位 → 避免 loadStateAsync 往权威树里注入《知识链接体系指南》干扰断言。
  localStorage.setItem(`${STORAGE_KEY}-version`, 'v5')
  localStorage.setItem('markcraft-migrated-link-guide-v2', '1')
  await db.kv.put({ key: STORAGE_KEY, value: JSON.stringify(fixtureState()) })
})

afterEach(async () => {
  cleanup()
  // saveState 是 300ms 防抖且定时器是**模块级**的 —— 等它跑完再清，避免污染下一个用例
  await new Promise((r) => setTimeout(r, 350))
  await db.kv.clear()
})

describe('FileStore · 内置使用文档 = 瞬态标签', () => {
  it('① 打开使用文档：标签标为瞬态，且**不进「最近文件」**', async () => {
    const { result } = await mountHydrated()
    expect(getRecentFiles(), '前置条件：最近文件应为空').toEqual([])

    act(() => { result.current.openFile(BUILTIN_ID) })

    expect(result.current.getActiveFileId()).toBe(BUILTIN_ID)
    const tab = result.current.tabs.find((t) => t.fileId === BUILTIN_ID)
    expect(tab, '使用文档应当以标签承载内容链路（activeFileId → 内容 → 只读简介页）').toBeTruthy()
    expect(tab!.isTransient, '使用文档的标签必须是瞬态').toBe(true)
    // ① 不进最近 —— 否则会被欢迎页「继续《…》」与「插入双链」候选当成用户文档
    expect(getRecentFiles().map((f) => f.fileId)).not.toContain(BUILTIN_ID)
  })

  // ★ 对照组：证明「瞬态 / 不进最近」是条件式的，而不是把整套打开逻辑弄坏了
  it('② 对照组 · 普通笔记：标签不是瞬态，且照常进「最近文件」', async () => {
    const { result } = await mountHydrated()

    act(() => { result.current.openFile(NOTE_ID) })

    expect(result.current.getActiveFileId()).toBe(NOTE_ID)
    const tab = result.current.tabs.find((t) => t.fileId === NOTE_ID)
    expect(tab).toBeTruthy()
    expect(tab!.isTransient).toBeUndefined()
    expect(getRecentFiles().map((f) => f.fileId)).toContain(NOTE_ID)
  })

  it('③ 退出使用文档：瞬态标签整体回收，落回最后打开的那篇永久文档（activeTabId 与 isActive 同源）', async () => {
    const { result } = await mountHydrated()

    act(() => { result.current.openFile(NOTE_ID) })       // 永久文档
    act(() => { result.current.openFile(BUILTIN_ID) })    // 瞬态预览（激活）
    expect(result.current.getActiveFileId()).toBe(BUILTIN_ID)

    act(() => { result.current.closeTransientTabs() })

    expect(result.current.tabs.some((t) => t.isTransient)).toBe(false)
    expect(result.current.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(result.current.getActiveFileId()).toBe(NOTE_ID)
    // 🚨 同源校验：isActive 与 activeTabId 不得互相矛盾（该缺陷模式已在本仓出现过一次）
    expect(result.current.tabs.filter((t) => t.isActive).map((t) => t.id))
      .toEqual([result.current.activeTabId])
  })

  it('④ 一篇不剩时退出：回到「未打开文档」空态（编辑器里不留任何痕迹）', async () => {
    const { result } = await mountHydrated()

    act(() => { result.current.openFile(BUILTIN_ID) })
    act(() => { result.current.closeTransientTabs() })

    expect(result.current.tabs).toEqual([])
    expect(result.current.activeTabId).toBeNull()
    expect(result.current.getActiveFileId()).toBeNull()
  })

  it('⑤ 打开普通文档：现存瞬态标签被一并回收（预览被正式打开替换）', async () => {
    const { result } = await mountHydrated()

    act(() => { result.current.openFile(BUILTIN_ID) })
    expect(result.current.tabs.map((t) => t.fileId)).toEqual([BUILTIN_ID])

    act(() => { result.current.openFile(NOTE_ID) })

    // 不得在标签栏底下留一个隐形的说明书标签
    expect(result.current.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(result.current.tabs.some((t) => t.isTransient)).toBe(false)
    expect(result.current.getActiveFileId()).toBe(NOTE_ID)
  })

  it('⑥ 落盘不含瞬态标签 ——「看着说明书时刷新」不会被记成「上次打开的文档」', async () => {
    const { result } = await mountHydrated()

    act(() => { result.current.openFile(NOTE_ID) })
    act(() => { result.current.openFile(BUILTIN_ID) })   // 此刻激活的是瞬态

    // 等防抖保存真的把「含标签」的那一版写进 IndexedDB（夹具版本 tabs 为空，故可作就绪闸口）
    await waitFor(async () => {
      const s = await readPersisted()
      expect(s?.tabs.length ?? 0).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const persisted = (await readPersisted())!
    expect(persisted.tabs.some((t) => t.isTransient)).toBe(false)
    expect(persisted.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    // 悬空 activeTabId 会让下次启动「标题栏说打开了文件、编辑区却是空的」——必须一并修正
    expect(persisted.activeTabId).toBe(persisted.tabs[0].id)
  })

  it('⑦ 老数据净化：遗留在「最近文件」里的使用文档条目在启动后被清掉，用户自己的条目原样保留', async () => {
    // 旧版 openFile 无条件 addRecentFile 留下的脏数据（最靠前 = 会被欢迎页当作「继续《…》」）
    localStorage.setItem(RECENT_KEY, JSON.stringify([
      { fileId: BUILTIN_ID, fileName: BUILTIN_NAME, lastOpened: T, isPinned: false },
      { fileId: NOTE_ID, fileName: '普通笔记.md', lastOpened: T - 1000, isPinned: false },
    ]))

    const { result } = await mountHydrated()

    await waitFor(() => {
      expect(getRecentFiles().map((f) => f.fileId)).not.toContain(BUILTIN_ID)
    })
    // ⚠️ 别把「净化」做成「清空」：用户的笔记条目必须留下
    expect(getRecentFiles().map((f) => f.fileId)).toEqual([NOTE_ID])
    expect(result.current.hydrated).toBe(true)
  })
})

describe('FileStore · 升级迁移：旧版永久落盘的使用文档标签在启动时被剥掉', () => {
  /**
   * 旧版（瞬态标签机制上线前）落盘的脏数据：点开的使用文档作为**普通标签**（无 isTransient
   * 字段）随 tabs/activeTabId 整体序列化。最恶劣现场 = activeTabId 正指向说明书 ——
   * 升级后一进编辑器就直接落在「MarkCraft 使用文档」上（2026-09-22 第三轮报障）。
   */
  function legacyPersistedState(): FileManagerState {
    const base = fixtureState()
    return {
      ...base,
      tabs: [
        { id: 'tab-builtin', fileId: BUILTIN_ID, name: BUILTIN_NAME, isActive: true },
        { id: 'tab-note', fileId: NOTE_ID, name: '普通笔记.md', isActive: false },
      ],
      activeTabId: 'tab-builtin',
    }
  }

  it('⑧ IndexedDB 权威树路径（本次报障的真实路径）：启动即剥掉旧标签并回写净化版落盘', async () => {
    await db.kv.put({ key: STORAGE_KEY, value: JSON.stringify(legacyPersistedState()) })

    const { result } = await mountHydrated()

    // 内存态：说明书标签被剥掉，激活落回最后打开的永久文档（普通笔记）
    expect(result.current.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(result.current.getActiveFileId()).toBe(NOTE_ID)
    expect(result.current.activeTabId).toBe('tab-note')
    // isActive 与 activeTabId 同源（该矛盾模式在本仓出现过，必须钉死）
    expect(result.current.tabs.filter((t) => t.isActive).map((t) => t.id))
      .toEqual([result.current.activeTabId])
    // 落盘态也净化（hydrated 翻转触发的回写），否则下次启动又会原样还原
    await waitFor(async () => {
      const persisted = await readPersisted()
      expect(persisted?.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
      expect(persisted?.activeTabId).toBe('tab-note')
    }, { timeout: 3000 })
  })

  it('⑨ localStorage 兜底路径（IDB 为空的老用户）：同步初始树同样被净化，旧标签不得熬到 hydrated 后被转正', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersistedState()))
    await db.kv.clear() // 制造「IDB 读不到 → asyncState=null → 沿用同步树」的升级现场

    const { result } = await mountHydrated()

    expect(result.current.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(result.current.getActiveFileId()).toBe(NOTE_ID)
    expect(result.current.activeTabId).toBe('tab-note')
  })

  it('⑩ 对照组 · 迁移不误删：落盘里只有普通文档标签时原样保留（不换引用、不改激活态）', async () => {
    const clean = {
      ...fixtureState(),
      tabs: [{ id: 'tab-note', fileId: NOTE_ID, name: '普通笔记.md', isActive: true }],
      activeTabId: 'tab-note',
    }
    await db.kv.put({ key: STORAGE_KEY, value: JSON.stringify(clean) })

    const { result } = await mountHydrated()

    expect(result.current.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(result.current.tabs[0].isActive).toBe(true)
    expect(result.current.activeTabId).toBe('tab-note')
    // 等防抖窗口过去后再核对落盘未被搅动
    const persisted = await readPersisted()
    expect(persisted?.tabs.map((t) => t.fileId)).toEqual([NOTE_ID])
    expect(persisted?.activeTabId).toBe('tab-note')
  })
})

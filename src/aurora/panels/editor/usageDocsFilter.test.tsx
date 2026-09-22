// @vitest-environment jsdom
//
// 回归锁 ①：内置「使用文档」不得出现在**编辑器的文件列表**里
// ==========================================================================
// 用户需求（2026-09-22）：「文档的笔记内容（即来自使用文档知识库的笔记）不应出现在
// 编辑功能的文件列表中，需在文件树的数据来源或渲染层面予以过滤排除。」
//
// 本文件覆盖两条编辑列表：FileTree（编辑器左栏 / 侧栏滑入）与 EmptyFileBrowser（空态引导页）。
// 判定单源 = core/files/usageDocs#resolveUsageDocsScope（自带单测 usageDocs.test.ts），
// 这里只验「渲染层真的照它过滤了」+「该判定真的翻转得动」。
//
// ⚠️ 两个坑，都踩过：
//   1) **FileStore 的 hydration 是异步的**（同步 loadState 只是兜底 T0，随后被 IndexedDB 权威树覆盖）
//      → 渲染后同步断言会读到尚未水合的树，必须先等 hydrated。
//   2) 前置动作（建普通笔记 / 改名）**不能在组件的 useEffect 里 act()** ——
//      那会与 testing-library 的 act 包装嵌套，报 "Should not already be working"。
//      正确做法：用探针组件捕获 store API，再在测试体内 `act()` 里调用。
//   3) 必须带**对照组**：默认树本来就把 16 篇内置文档放在「MarkCraft 使用文档」文件夹里，
//      若只断言「列表里没有这些名字」，一旦列表因别的原因（渲染失败）为空也会「通过」。
//      故：① 先断言普通笔记**在**列表里（证扫描面非空）；② 再把该文件夹改名，
//      断言文档**重新出现**（证过滤的成因就是名字判定，而非它们碰巧不在）。
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import { RealProviders } from '../../providers/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { FileTree } from './FileTree'
import { EmptyFileBrowser } from './EmptyFileBrowser'
import { USAGE_DOC_FOLDER as ZH_FOLDER, USAGE_DOC_ALL as ZH_PAGES } from '@core/data/defaultDocs/usageDocs/zh'

const PAGE_NAMES = ZH_PAGES.map((p) => p.fileName)
const PLAIN_NOTE = '普通笔记.md'
const NOTES_FOLDER = '我的笔记'
const RENAMED = '归档资料'

type FileApi = ReturnType<typeof useFileManager>
/** 探针：把 store API 暴露给测试体（避免在 effect 里 act） */
let api: FileApi | null = null
function CaptureApi() { api = useFileManager(); return null }

async function renderWith(ui: React.ReactNode) {
  api = null
  const r = render(
    <RealProviders>
      <CaptureApi />
      {ui}
    </RealProviders>,
  )
  await waitFor(() => expect(api?.hydrated).toBe(true))
  return r
}

const treeNames = (c: HTMLElement) =>
  [...c.querySelectorAll('.aurora-filetree__item-name')].map((e) => e.textContent || '')
const emptyNames = (c: HTMLElement) =>
  [...c.querySelectorAll('.aurora-emptyfiles__row-name')].map((e) => e.textContent || '')

/** 在「我的笔记」下建一篇普通笔记（对照组：证列表非空、且过滤不误伤） */
async function seedPlainNote() {
  const notes = (api!.rootFolder.children ?? []).find((c) => c.name === NOTES_FOLDER)!
  await act(async () => { api!.createFile(notes.id, PLAIN_NOTE, '# 普通笔记\n\n这是一篇普通笔记。') })
}
/** 对照组动作：把内置文档文件夹改名 → 判定不再命中 */
async function renameDocsFolder() {
  const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
  await act(async () => { api!.renameNode(docs.id, RENAMED) })
}

describe('编辑器文件列表：内置「使用文档」过滤', () => {
  beforeAll(() => {
    ;(window as any).indexedDB = (window as any).indexedDB || {}
  })

  it('1) FileTree：文档文件夹与其 16 篇均不出现；普通笔记与普通文件夹仍在（扫描面非空）', async () => {
    const { container } = await renderWith(<FileTree hideTopbar />)
    await seedPlainNote()
    await waitFor(() => expect(treeNames(container)).toContain(PLAIN_NOTE))
    const names = treeNames(container)

    expect(names).toContain(NOTES_FOLDER)

    // 正题：内置文档文件夹与全部篇章都不可见
    expect(names).not.toContain(ZH_FOLDER)
    for (const page of PAGE_NAMES) expect(names).not.toContain(page)
  })

  it('2) FileTree 对照组：把该文件夹改名 → 文档重新出现（证「红/绿」由名字判定驱动）', async () => {
    const { container } = await renderWith(<FileTree hideTopbar />)
    await renameDocsFolder()

    await waitFor(() => expect(treeNames(container)).toContain(RENAMED))
    const names = treeNames(container)
    // 改名后不再命中内置库名 → 文件夹行与篇章行都应回来
    expect(names).toContain(PAGE_NAMES[0])
  })

  it('3) EmptyFileBrowser（空态引导页）：只列普通笔记，计数同步为 1', async () => {
    const { container } = await renderWith(<EmptyFileBrowser />)
    await seedPlainNote()
    await waitFor(() => expect(emptyNames(container)).toContain(PLAIN_NOTE))

    const rows = emptyNames(container)
    expect(rows).toHaveLength(1)
    // 计数徽标必须与可见行同源（不是先算总数再过滤）
    expect(container.querySelector('.aurora-emptyfiles__count')?.textContent).toBe('1')

    // 内置文档一律不出现
    for (const page of PAGE_NAMES) expect(rows).not.toContain(page)
    // 「MarkCraft 使用文档」分组标题也不该出现（否则会留下一个空分组）
    const groupTitles = [...container.querySelectorAll('.aurora-emptyfiles__group-title')].map((e) => e.textContent)
    expect(groupTitles).not.toContain(ZH_FOLDER)
  })

  it('4) EmptyFileBrowser 对照组：改名的文档文件夹会作为普通分组重新出现', async () => {
    const { container } = await renderWith(<EmptyFileBrowser />)
    await renameDocsFolder()

    await waitFor(() => expect(emptyNames(container)).toContain(PAGE_NAMES[0]))
    const groupTitles = [...container.querySelectorAll('.aurora-emptyfiles__group-title')].map((e) => e.textContent)
    expect(groupTitles).toContain(RENAMED)
  })

  // ── 回归锁（2026-09-22 紧急修复）：用户报障「所有笔记都从列表里消失」──
  // 旧口径把整棵内置文件夹子树都过滤掉 → 用户放进该文件夹的自己的笔记也跟着消失。
  // 新口径只过滤「文件名命中内置清单」的那几篇；文件夹行在有用户内容时保留。
  it('5) 🚨 回归：用户笔记放进**内置文档文件夹**内 → 文件夹行与该笔记都**仍在**列表里（只有说明书那几篇被过滤）', async () => {
    const { container } = await renderWith(<FileTree hideTopbar />)
    const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
    await act(async () => { api!.createFile(docs.id, PLAIN_NOTE, '# 我的笔记\n\n用户自己的内容。', false) })

    await waitFor(() => expect(treeNames(container)).toContain(PLAIN_NOTE))
    const names = treeNames(container)
    // 用户笔记可见 + 承载它的文件夹行也可见（否则用户点不到）
    expect(names).toContain(PLAIN_NOTE)
    expect(names).toContain(ZH_FOLDER)
    // 内置说明书仍被过滤（同一个文件夹内，双向对照）
    for (const page of PAGE_NAMES) expect(names).not.toContain(page)
  })

  it('6) 回归对照：EmptyFileBrowser 里用户笔记在内置文件夹内同样可见，计数同步为 1', async () => {
    const { container } = await renderWith(<EmptyFileBrowser />)
    const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
    await act(async () => { api!.createFile(docs.id, PLAIN_NOTE, '# 我的笔记', false) })

    await waitFor(() => expect(emptyNames(container)).toContain(PLAIN_NOTE))
    expect(emptyNames(container)).toHaveLength(1)
    expect(container.querySelector('.aurora-emptyfiles__count')?.textContent).toBe('1')
    // 承载它的分组标题 = 内置文件夹名（该文件夹现在有用户内容 → 作为普通分组出现）
    const groupTitles = [...container.querySelectorAll('.aurora-emptyfiles__group-title')].map((e) => e.textContent)
    expect(groupTitles).toContain(ZH_FOLDER)
  })
})

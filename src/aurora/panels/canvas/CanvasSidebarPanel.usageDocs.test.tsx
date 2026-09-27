// @vitest-environment jsdom
//
// 回归锁：白板「文件」Tab 必须与编辑器文件列表**同源过滤**内置「使用文档」
// ==========================================================================
// 用户报障（2026-09-24）：白板文件列表仍在展示「MarkCraft 使用文档」知识库的内置篇章，
// 而编辑功能的文件列表已按 usageDocs.hiddenIds 把它们过滤掉 → 两侧内容不同步。
//
// 修复前：CanvasSidebarPanel.tsx 的 FilesTab 直接 `flattenFileTree(rootFolder).filter(depth>0)`，
// 未套用 usageDocs 过滤，于是内置说明书那 16 篇（及其所在文件夹）全出现在白板里。
// 修复后：白板侧改用与编辑器**同一个** `useUsageDocsScope()`（单源判定 core/files/usageDocs，
// 由该 hook 包成响应式、useMemo 整树只算一次），过滤 hiddenIds。
//
// 本文件只验「白板渲染层真的照它过滤了」+「该判定真的翻转得动」（对照组）。
// 纯函数判定本身由 usageDocs.test.ts 覆盖，这里不重复。
//
// 沿用 usageDocsFilter.test.tsx 的三个坑：
//   1) FileStore hydration 异步 → 先等 api.hydrated；
//   2) 建/改名动作在测试体 act() 里做，不在组件 effect 里（否则与 testing-library act 嵌套报错）；
//   3) 必带对照组，且先证「普通笔记/用户文件夹在列表里」（扫描面非空），避免「列表碰巧为空也通过」。
import React from 'react'
import { render, act, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import { RealProviders } from '../../providers/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { CanvasSidebarPanel } from './CanvasSidebarPanel'
import { USAGE_DOC_FOLDER as ZH_FOLDER, USAGE_DOC_ALL as ZH_PAGES } from '@core/data/defaultDocs/usageDocs/zh'

const PAGE_NAMES = ZH_PAGES.map((p) => p.fileName)
const PLAIN_NOTE = '普通笔记.md'
const NOTES_FOLDER = '我的笔记'
const RENAMED = '归档资料'

let api: ReturnType<typeof useFileManager> | null = null
function CaptureApi() { api = useFileManager(); return null }

async function renderSidebar() {
  api = null
  const r = render(
    <RealProviders>
      <CaptureApi />
      <CanvasSidebarPanel engine={null} onOpenFile={() => {}} />
    </RealProviders>,
  )
  await waitFor(() => expect(api?.hydrated).toBe(true))
  // 切到「文件」Tab（默认焦点在大纲）
  fireEvent.click(await r.findByTitle('文件'))
  return r
}

/** 白板「文件」Tab 当前可见的全部行名（文件夹行 + 文件行，统一走 .aurora-csp__item-title） */
const names = (c: HTMLElement) =>
  [...c.querySelectorAll('.aurora-csp__item-title')].map((e) => e.textContent || '')

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

describe('白板文件列表：内置「使用文档」过滤（与编辑器同步）', () => {
  beforeAll(() => {
    (window as any).indexedDB = (window as any).indexedDB || {}
  })

  it('1) 文档文件夹与其 16 篇均不出现；普通笔记与普通文件夹仍在（扫描面非空）', async () => {
    const { container } = await renderSidebar()
    await seedPlainNote()
    await waitFor(() => expect(names(container)).toContain(PLAIN_NOTE))
    const list = names(container)

    // 扫描面非空：用户文件夹 + 普通笔记都可见
    expect(list).toContain(NOTES_FOLDER)
    expect(list).toContain(PLAIN_NOTE)

    // 正题：内置文档文件夹与全部篇章都不可见（白板不再多出一摞编辑器侧看不到的文件）
    expect(list).not.toContain(ZH_FOLDER)
    for (const page of PAGE_NAMES) expect(list).not.toContain(page)
  })

  it('2) 对照组：把该文件夹改名 → 文档重新出现（证「红/绿」由名字判定驱动，而非碰巧不在）', async () => {
    const { container } = await renderSidebar()
    await renameDocsFolder()

    await waitFor(() => expect(names(container)).toContain(RENAMED))
    const list = names(container)
    // 改名后不再命中内置库名 → 内置篇章作为普通文件重新出现
    expect(list).toContain(PAGE_NAMES[0])
  })

  // ── 回归锁：用户报障的「反向」——若口径不小心又变回「整棵文件夹子树过滤」，
  //    用户放进该文件夹的自己的笔记也会跟着消失。新口径只过滤文件名命中内置清单的那几篇；
  //    文件夹行在有用户内容时保留。
  it('3) 🚨 回归：用户笔记放进内置文档文件夹内 → 文件夹行与用户笔记仍在（只过滤说明书那几篇）', async () => {
    const { container } = await renderSidebar()
    const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
    await act(async () => { api!.createFile(docs.id, PLAIN_NOTE, '# 我的笔记\n\n用户自己的内容。', false) })

    await waitFor(() => expect(names(container)).toContain(PLAIN_NOTE))
    const list = names(container)
    // 用户笔记可见 + 承载它的文件夹行也可见（否则用户点不到）
    expect(list).toContain(PLAIN_NOTE)
    expect(list).toContain(ZH_FOLDER)
    // 内置说明书仍被过滤（同一个文件夹内，双向对照）
    for (const page of PAGE_NAMES) expect(list).not.toContain(page)
  })
})

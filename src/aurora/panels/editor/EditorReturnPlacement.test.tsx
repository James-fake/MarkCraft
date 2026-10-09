// @vitest-environment jsdom
//
// 回归锁：编辑器「返回来源」按钮的**落点**（2026-09-23 用户报障）
// ==========================================================================
// 用户原话：「从其他功能等地方点击笔记进入到编辑界面，顶部会有一个返回按钮，
//   现在这个位置非常的不合理，现在要求将这个返回按钮放置到文件打开标签左侧。」
//
// 改动前：返回按钮渲染在 `.aurora-editor__returnbar` —— 它是工具栏**下方**独立的一整行
//   （padding 6px 12px 0），只为一个芯片吃掉一整行纵向空间，且游离于标签行之外。
// 改动后：常态编辑下它并入**标签行首位**、落在 `.aurora-tabs` **之前**；不再有独立整行。
//
// 本文件锁四件事（缺一条就会出现「位置换了但回不去」这类隐性回归）：
//   ① 常态编辑：按钮在工具栏标签区内，且 **DOM 顺序先于标签**（这是「左侧」的唯一可靠判据，
//      比断言某个新增类名更抗重构）；`.aurora-editor__returnbar` 不再出现。
//   ② 内置《使用文档》只读简介页**不渲染工具栏**，而那里它是**唯一回跳入口** ⇒ 必须仍可达。
//   ③ 未打开文档的空态同理（既有 smoke 测试 7 正走这条路径，不能被顺手弄丢）。
//   ④ 对照组：没有来源上下文时，两种版式都不该冒出返回按钮（证明 ①②③ 不是恒真）。
//
// ⚠️ 两个夹具陷阱：
//   · **FileStore 是模块级单例**：上一个用例 `openFile` 过，下一个用例就不是空态了 ⇒
//     空态一律显式 `closeAllTabs()` 造出来，别指望「默认没打开文件」。
//   · 断言的「位置」用 `compareDocumentPosition`（DOM 顺序）而不是「离屏幕左边多少像素」：
//     jsdom 不做布局，`getBoundingClientRect` 恒为 0 ⇒ 几何断言在这里只会假绿/假红。
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RealProviders } from '../../providers/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { setEditorReturn, clearEditorReturn, getEditorReturn } from '../../navigation/navReturn'
import { USAGE_DOC_FOLDER as ZH_FOLDER } from '@core/data/defaultDocs/usageDocs/zh'

// 真实 EditorLayout / VersionHistoryPanel 依赖 CodeMirror / TipTap，jsdom 挂不起来 ——
// mock 掉即可，本文件不关心编辑内核。
vi.mock('../../../features/editor/EditorLayout', () => ({
  EditorLayout: () => <div data-testid="real-editorlayout">REAL_EDITOR_LAYOUT</div>,
}))
vi.mock('../../../features/editor/VersionHistoryPanel', () => ({
  VersionHistoryPanel: () => <div data-testid="version-history">VERSION_HISTORY</div>,
}))

import { EditorPanel } from './EditorPanel'

const PLAIN_NOTE = '返回落点-普通笔记.md'
const SOURCE_LABEL = '甲知识库 · 图谱'

type FileApi = ReturnType<typeof useFileManager>
let api: FileApi | null = null
function CaptureApi() { api = useFileManager(); return null }

async function renderPanel(nav = vi.fn()) {
  api = null
  const r = render(
    <RealProviders>
      <CaptureApi />
      <EditorPanel nav={nav} />
    </RealProviders>,
  )
  await waitFor(() => expect(api?.hydrated).toBe(true))
  return { ...r, nav }
}

/** 在「我的笔记」下建一篇普通笔记并打开（幂等：FileStore 是模块单例，多段重挂不能重复建） */
async function openPlainNote() {
  const notes = (api!.rootFolder.children ?? []).find((c) => c.name === '我的笔记')!
  let node = (notes.children ?? []).find((c) => c.name === PLAIN_NOTE)
  if (!node) {
    await act(async () => { api!.createFile(notes.id, PLAIN_NOTE, '# 返回落点\n\n正文。') })
    const refreshed = (api!.rootFolder.children ?? []).find((c) => c.name === '我的笔记')!
    node = (refreshed.children ?? []).find((c) => c.name === PLAIN_NOTE)!
  }
  await act(async () => { api!.openFile(node!.id) })
}

/** 打开内置《使用文档》首篇（只读简介页；该版式整块不渲染工具栏） */
async function openFirstUsageDoc() {
  const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
  const first = (docs.children ?? []).find((c) => c.type === 'file')!
  await act(async () => { api!.openFile(first.id) })
}

/** 显式造空态：关掉所有标签（不能用「默认没打开文件」——单例会把上个用例的标签带进来） */
async function closeAllToEmpty(container: HTMLElement) {
  await act(async () => { api!.closeAllTabs() })
  await waitFor(() => expect(container.querySelector('.aurora-toolbar')).toBeNull())
}

const q = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement | null

/** b 是否在 DOM 顺序上位于 a 之前 */
function precedes(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
}

beforeEach(() => {
  clearEditorReturn() // 模块级单例：不清会让用例互相串来源
})

describe('编辑器「返回来源」按钮落点', () => {
  it('① 常态编辑：按钮并入标签行、位于文件标签**左侧**，且不再独占一整行', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-a', label: SOURCE_LABEL })
    const { container } = await renderPanel()
    await openPlainNote()
    await waitFor(() => expect(q(container, '.aurora-tab')).toBeTruthy())

    const toolbar = q(container, '.aurora-toolbar')
    expect(toolbar).toBeTruthy() // 前置：常态编辑确实有工具栏行
    const tabsZone = q(container, '.aurora-toolbar__tabs')
    const tabs = q(container, '.aurora-tabs')
    const btn = q(container, '.aurora-editor__return')
    expect(tabs).toBeTruthy() // 前置：确实有标签（否则「标签左侧」无从谈起）
    expect(btn).toBeTruthy()
    expect(btn!.textContent).toContain(`返回 ${SOURCE_LABEL}`)

    // 核心判据：按钮在工具栏的标签区内（不在工具栏之外），且在标签**之前**
    expect(tabsZone!.contains(btn!)).toBe(true)
    expect(toolbar!.contains(btn!)).toBe(true)
    expect(precedes(tabs!, btn!)).toBe(true)
  })

  it('①b 常态编辑：返回按钮**不再独占一整行**（原先那个独立容器消失）', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-a', label: SOURCE_LABEL })
    const { container } = await renderPanel()
    await openPlainNote()
    await waitFor(() => expect(q(container, '.aurora-tab')).toBeTruthy())

    // 前置：确实处在「有工具栏 + 有返回按钮」的常态编辑（否则这条断言可能是空转）
    expect(q(container, '.aurora-toolbar')).toBeTruthy()
    expect(q(container, '.aurora-editor__return')).toBeTruthy()
    // 判据：原来那个位于工具栏**下方**、只为一个芯片而存在的整行容器不再出现
    expect(q(container, '.aurora-editor__returnbar')).toBeNull()
  })

  it('② 使用文档只读简介页：工具栏缺席，但返回按钮仍经极简行可达（唯一回跳入口不丢）', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-usage', label: ZH_FOLDER })
    const { container } = await renderPanel()
    await openFirstUsageDoc()
    await waitFor(() => expect(q(container, '.aurora-brief')).toBeTruthy())

    // 前置：该版式确实不渲染工具栏（否则本用例测的不是「无标签行」这条分支）
    expect(q(container, '.aurora-toolbar')).toBeNull()
    expect(q(container, '.aurora-tabs')).toBeNull()

    const bar = q(container, '.aurora-editor__returnbar')
    expect(bar).toBeTruthy()
    const btn = q(container, '.aurora-editor__return')
    expect(btn).toBeTruthy()
    expect(bar!.contains(btn!)).toBe(true)
    expect(btn!.textContent).toContain(`返回 ${ZH_FOLDER}`)
  })

  it('③ 未打开文档的空态：同上，仍保留返回入口', async () => {
    setEditorReturn({ view: 'graph', label: '双链图谱' })
    const { container } = await renderPanel()
    await closeAllToEmpty(container)

    expect(q(container, '.aurora-toolbar')).toBeNull() // 空态无工具栏
    const btn = q(container, '.aurora-editor__return')
    expect(btn).toBeTruthy()
    expect(btn!.textContent).toContain('返回 双链图谱')
  })

  it('④ 对照组：没有来源上下文时，两种版式都不渲染返回按钮', async () => {
    const { container } = await renderPanel()
    await openPlainNote()
    // 常态编辑（有标签行）也不该冒出返回按钮
    expect(q(container, '.aurora-editor__return')).toBeNull()
    expect(q(container, '.aurora-editor__returnbar')).toBeNull()
    // 空态同样不该有
    await closeAllToEmpty(container)
    expect(q(container, '.aurora-editor__return')).toBeNull()
  })

  it('⑤ 按钮语义不变：点一次回跳来源视图并清空上下文（一次性）', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-a', label: SOURCE_LABEL })
    const { container, nav } = await renderPanel()
    await openPlainNote()
    await waitFor(() => expect(q(container, '.aurora-tab')).toBeTruthy())

    // 本用例**只**锁语义（落点由 ① 单独锁 —— 一条断言只证一件事，
    // 否则「回跳对不对」与「位置搬没搬」会焊在一起、红了也说不清为哪个原因）
    const btn = q(container, '.aurora-editor__return')!
    act(() => { btn.click() })

    expect(nav).toHaveBeenCalledWith('kb', 'kb-a')
    expect(getEditorReturn()).toBeNull()
  })
})

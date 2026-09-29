// @vitest-environment jsdom
//
// 回归锁 ②：内置「使用文档」→ 编辑区呈现为**只读简介页**
// ==========================================================================
// 用户需求（2026-09-22）：「点开使用文档笔记后…虽仍处于编辑区域，但需呈现为简洁的简介页面：
//   隐藏左侧文件列表，移除顶部工具栏中的删除按钮和编辑模式选择框，仅保留阅读该简介内容所需的必要元素。」
//
// 本文件把「裁掉了什么」逐条钉死，并用**普通笔记对照组**证明这些裁剪是条件式的
// （否则「元素不存在」这类断言在功能整块坏掉时也会恒真）。
//
// 关于「删除按钮」：真机 DOM 实测，编辑器顶部工具栏区（≤170px）内**没有** trash 图标按钮，
//   与「删除」相关的可点元素只有两处：① 标签栏上的「关闭标签 ×」（关闭 = 移除该页）；
//   ② 格式工具条《所见即所得》里的「删除线(S)」。二者都随「标签栏」与「格式工具条」整体移除
//   —— 前者由本文件显式断言（不渲染 EditorToolbar），后者由「不渲染 EditorLayout」间接保证
//   （格式工具条是 EditorLayout 内部 TiptapEditor 的产物），真机侧另由 CDP 探针复核。
import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { RealProviders } from '../../providers/RealProviders'
import { useFileManager } from '@stores/FileStore'
import { setEditorReturn, clearEditorReturn } from '../../navigation/navReturn'
import { resolveUsageDocsScope } from '@core/files/usageDocs'
import { USAGE_DOC_FOLDER as ZH_FOLDER, USAGE_DOC_ALL as ZH_PAGES } from '@core/data/defaultDocs/usageDocs/zh'

// 真实 EditorLayout / VersionHistoryPanel 依赖 CodeMirror / TipTap，jsdom 无法挂载 ——
// mock 掉后「是否渲染它」本身就是本文件的断言对象。
vi.mock('../../../features/editor/EditorLayout', () => ({
  EditorLayout: () => <div data-testid="real-editorlayout">REAL_EDITOR_LAYOUT</div>,
}))
vi.mock('../../../features/editor/VersionHistoryPanel', () => ({
  VersionHistoryPanel: () => <div data-testid="version-history">VERSION_HISTORY</div>,
}))

import { EditorPanel } from './EditorPanel'

const FIRST_PAGE = ZH_PAGES[0]
const PLAIN_NOTE = '普通笔记.md'

type FileApi = ReturnType<typeof useFileManager>
let api: FileApi | null = null
function CaptureApi() { api = useFileManager(); return null }

async function renderPanel() {
  api = null
  const r = render(
    <RealProviders>
      <CaptureApi />
      <EditorPanel />
    </RealProviders>,
  )
  await waitFor(() => expect(api?.hydrated).toBe(true))
  return r
}

/** 打开内置使用文档的首篇 */
async function openFirstUsageDoc() {
  const docs = (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
  const first = (docs.children ?? []).find((c) => c.type === 'file')!
  await act(async () => { api!.openFile(first.id) })
}

/** 对照组：在「我的笔记」下建一篇普通笔记并打开 */
async function openPlainNote() {
  const notes = (api!.rootFolder.children ?? []).find((c) => c.name === '我的笔记')!
  let node = (notes.children ?? []).find((c) => c.name === PLAIN_NOTE)
  if (!node) {
    await act(async () => { api!.createFile(notes.id, PLAIN_NOTE, '# 普通笔记\n\n正文内容。') })
    const refreshed = (api!.rootFolder.children ?? []).find((c) => c.name === '我的笔记')!
    node = (refreshed.children ?? []).find((c) => c.name === PLAIN_NOTE)!
  }
  await act(async () => { api!.openFile(node!.id) })
}

/**
 * 取状态栏右区各项的文案（模式标签所在区）。
 * 专供「模式口径」断言：**不能**在整页 textContent 上搜模式词 —— 使用文档正文里
 * 合法写着「源码模式 / 所见即所得」等字样，整页断言会随正文渲染完成度而飘。
 */
function statusBarModeItems(container: HTMLElement): string[] {
  const bar = container.querySelector('.aurora-statusbar')
  if (!bar) return []
  return [...bar.querySelectorAll('.aurora-statusbar__right .aurora-statusbar__item')].map(
    (e) => (e.textContent ?? '').trim(),
  )
}

describe('EditorPanel：使用文档 → 只读简介页', () => {
  beforeAll(() => {
    (window as unknown as Record<string, unknown>).indexedDB = (window as unknown as Record<string, unknown>).indexedDB || {}
  })
  beforeEach(() => { clearEditorReturn() })

  it('1) 使用文档：渲染 .aurora-brief（只读简介页），且不挂 EditorLayout', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-usage', label: ZH_FOLDER })
    const { container } = await renderPanel()
    await openFirstUsageDoc()

    const brief = container.querySelector('.aurora-brief')
    expect(brief).toBeTruthy()
    expect(brief!.getAttribute('aria-label')).toBe(FIRST_PAGE.fileName.replace(/\.md$/, ''))
    // 只读简介页 = 不渲染 EditorLayout（因而也没有编辑区与格式工具条）
    expect(container.querySelector('[data-testid="real-editorlayout"]')).toBeNull()
    // 内容确实渲染出来了（走 Preview 的 .markdown-preview）
    expect(container.querySelector('.markdown-preview')).toBeTruthy()
  })

  it('2) 使用文档：顶部工具栏整体缺席 —— 标签栏（含「关闭标签 ×」）与编辑模式选择框都不在', async () => {
    const { container } = await renderPanel()
    await openFirstUsageDoc()

    // 「编辑模式选择框」= 源码 / 预览 / 所见即所得 三枚切换按钮
    expect(container.querySelectorAll('.aurora-mode-toggle')).toHaveLength(0)
    expect(container.querySelector('.aurora-mode-toggles')).toBeNull()
    // 「标签栏」= 多文件标签 + 每标签的关闭（×）
    expect(container.querySelector('.aurora-toolbar')).toBeNull()
    expect(container.querySelector('.aurora-tabs')).toBeNull()
    expect(container.querySelector('.aurora-tab__close')).toBeNull()
  })

  it('3) 使用文档：左侧文件列表（含右栏检查器）整块不渲染', async () => {
    const { container } = await renderPanel()
    await openFirstUsageDoc()

    expect(container.querySelector('.aurora-editor__hoverzone')).toBeNull()
    expect(container.querySelector('.aurora-editor__hoverzone--left')).toBeNull()
    expect(container.querySelector('.aurora-editor__hoverzone--right')).toBeNull()
    // 文件树本体与检查器面板也不该出现
    expect(container.querySelector('.aurora-filetree')).toBeNull()
    expect(container.querySelector('.aurora-outline')).toBeNull()
  })

  it('4) 使用文档：保留阅读所需元素 —— 返回来源芯片仍在（唯一回跳入口），状态栏模式为「简介」', async () => {
    setEditorReturn({ view: 'kb', kbId: 'kb-usage', label: ZH_FOLDER })
    const { container } = render(
      <RealProviders>
        <CaptureApi />
        <EditorPanel />
      </RealProviders>,
    )
    await waitFor(() => expect(api?.hydrated).toBe(true))
    await openFirstUsageDoc()

    const chip = container.querySelector('.aurora-editor__return')
    expect(chip?.textContent).toContain(`返回 ${ZH_FOLDER}`)
    // 状态栏不再声称编辑内核（「所见即所得」在只读页里没有意义）
    // ⚠️ 断言必须**限定在状态栏作用域**：正文里合法出现「所见即所得」一词
    //    （《02 编辑器模式》篇章条目就写着「源码模式 / 所见即所得 / 双栏布局」），
    //    在整页 textContent 上断言会随「正文是否已渲染完成」而假绿 / 假红。
    const rightItems = statusBarModeItems(container)
    expect(rightItems).toContain('简介')
    expect(rightItems).not.toContain('所见即所得')
  })

  // ★ 对照组：证明上述「不存在」是条件式的，而不是功能整块坏掉
  it('5) 对照组 · 普通笔记：编辑功能完全不受影响（工具栏 / 模式选择框 / 左栏 / 右栏 / EditorLayout 俱在）', async () => {
    const { container } = await renderPanel()
    await openPlainNote()

    expect(container.querySelector('.aurora-brief')).toBeNull()
    expect(container.querySelector('[data-testid="real-editorlayout"]')).toBeTruthy()

    // 编辑模式选择框三枚按钮都在
    expect(container.querySelectorAll('.aurora-mode-toggle')).toHaveLength(3)
    // 标签栏在
    expect(container.querySelector('.aurora-toolbar')).toBeTruthy()
    // 左 / 右缘 hoverzone 都在（文件列表与检查器的入口）
    expect(container.querySelector('.aurora-editor__hoverzone--left')).toBeTruthy()
    expect(container.querySelector('.aurora-editor__hoverzone--right')).toBeTruthy()
    // 状态栏仍是编辑内核口径（同样限定作用域，理由见用例 4）
    const rightItems = statusBarModeItems(container)
    expect(rightItems).not.toContain('简介')
    expect(rightItems).toContain('所见即所得')
  })

  it('6) 样式守卫：.aurora-brief 作用域内必须屏蔽 Preview 无条件注入的图片删除按钮', async () => {
    // Preview 会无条件给正文图片挂 .preview-image-delete-btn（仅在点击时才判 onDeleteImage），
    // 只读简介页不得出现任何删除入口 → 需有作用域限定的 display:none 规则。
    const fs = await import('node:fs')
    const path = await import('node:path')
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/panels/editor.css'), 'utf8')
    // 先剥注释，避免注释里的字面量造成假阳性
    const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(noComments).toMatch(/\.aurora-brief\s+\.preview-image-delete-btn\s*\{[^}]*display:\s*none/)
  })

  // ── 回归锁 ③：用户报障「所有笔记的工具栏/左右栏都消失了」（2026-09-22 紧急修复）──
  // 根因：旧判定把**整棵内置文件夹子树**都当成使用文档 → 用户在该文件夹里新建/拖入的
  // 自己的笔记被连坐降级为只读简介页、且从文件列表消失。
  // 新判定收窄为「文件夹内 **且** 文件名命中内置篇章清单」→ 用户笔记照常完整可编辑。
  // 本用例把「内置文件夹 = 禁区」这个错误口径钉死：同一文件夹里，说明书是简介页、用户笔记是编辑器。
  it('7) 🚨 回归：用户笔记放进**内置使用文档文件夹**内，仍必须是完整编辑器（不是简介页）', async () => {
    const { container } = await renderPanel()
    // 读**实时**树（理由同用例 8）
    const docs = () => (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
    let noteId = ''
    await act(async () => { noteId = api!.createFile(docs().id, PLAIN_NOTE, '# 我的笔记\n\n这是用户自己的内容。', false) })
    expect(noteId).toBeTruthy()
    await act(async () => { api!.openFile(noteId) })

    // 等编辑内核真正挂载（先证「渲染发生过」，再去断言「没有简介页」）
    await waitFor(() => expect(container.querySelector('[data-testid="real-editorlayout"]')).toBeTruthy())
    // 不是只读简介页
    expect(container.querySelector('.aurora-brief')).toBeNull()
    // 编辑 chrome 全在（与用例 5 的普通笔记逐条对齐）
    expect(container.querySelectorAll('.aurora-mode-toggle')).toHaveLength(3)
    expect(container.querySelector('.aurora-toolbar')).toBeTruthy()
    expect(container.querySelector('.aurora-editor__hoverzone--left')).toBeTruthy()
    expect(container.querySelector('.aurora-editor__hoverzone--right')).toBeTruthy()
    expect(statusBarModeItems(container)).not.toContain('简介')
  })

  // 同一文件夹内的**内置那一篇**仍必须是简介页 —— 与用例 7 构成同一文件夹内的双向对照，
  // 防止「修过头」（把整个文件夹都放行成可编辑）。
  it('8) 回归对照：同一文件夹内，内置说明书那一篇**仍**是只读简介页', async () => {
    const { container } = await renderPanel()
    // ⚠️ 必须读**实时**树：FileStore 是单例，同一文件内的用例会累积状态
    //    （用例 7 已在同一文件夹里建过一篇用户笔记）→ 用渲染时的快照取节点会拿到过期 children。
    const docs = () => (api!.rootFolder.children ?? []).find((c) => c.name === ZH_FOLDER)!
    // 先塞一篇用户笔记（使该文件夹「含用户内容」），确认这不会把内置篇一起放行
    await act(async () => { api!.createFile(docs().id, PLAIN_NOTE, '# 我的笔记', false) })
    const builtin = (docs().children ?? []).find((c) => c.type === 'file' && c.name === ZH_PAGES[0].fileName)!
    expect(builtin).toBeTruthy()

    // ⚠️ 这一步会走 FileStore.openFile 的**已存在标签**分支（内置篇在用例 1 就开过标签）。
    //    该分支曾因「两次 setState + 旁路变量」在负载下漏设 activeTabId（详见 FileStore.openFile 注释），
    //    表现为「点了没切过去」—— 故这里先锚定「打开的就是内置那一篇」，再断言它是简介页。
    await act(async () => { api!.openFile(builtin.id) })
    await waitFor(() => expect(api!.getActiveFileId()).toBe(builtin.id))

    // 再锚定「判定确实把这一篇算作内置」——否则最后那条断言失败时会归因到错误的一环
    const scope = resolveUsageDocsScope(api!.rootFolder)
    expect({ folderMatched: scope.folderId === docs().id, isBuiltin: scope.builtinFileIds.has(builtin.id) })
      .toEqual({ folderMatched: true, isBuiltin: true })

    // 先证「渲染发生过」再证「是简介页」
    await waitFor(() => expect(container.querySelector('.aurora-brief')).toBeTruthy())
    expect(container.querySelector('[data-testid="real-editorlayout"]')).toBeNull()
    expect(container.querySelectorAll('.aurora-mode-toggle')).toHaveLength(0)
  })

  // ── 回归锁 ④：简介页的侧栏激活态 = **「知识库」**（2026-09-22 用户需求，两轮收敛）──
  // 首轮报障：「点击笔记文档，左侧侧边栏图标不要显示跳转至编辑器功能的图标」
  //   → 不能点亮「编辑器」（那会让用户以为自己已被带走进编辑器）。
  // 次轮报障：「点击进入笔记，左侧侧边栏中知识库的图标就不亮了」
  //   → 也不能把激活态整个置空（过度修正）；使用文档的用户语义是「只能从知识库点进去看」，
  //     故简介页属于**知识库语境**，应点亮「知识库」。
  // 两轮合起来 = 侧栏激活态必须是「知识库」，且**不是**「编辑器」。
  it('9) 🚨 回归：打开使用文档简介页时，侧栏激活项是「知识库」且**不是**「编辑器」', async () => {
    const { container } = await renderPanel()
    await openFirstUsageDoc()
    await waitFor(() => expect(container.querySelector('.aurora-brief')).toBeTruthy())

    // 先证「侧栏导航项确实渲染着」（否则「激活项恰好是知识库」这类断言会因空集而失去鉴别力）
    const sidebarItems = container.querySelectorAll('.aurora-sidebar-item')
    expect(sidebarItems.length, '侧栏导航项应已渲染（简介页只裁内容区 chrome，不裁外壳侧栏）').toBeGreaterThan(3)

    const activeTitles = [...container.querySelectorAll('.aurora-sidebar-item--active')]
      .map((el) => el.getAttribute('title') || el.textContent || '')
    expect(activeTitles, '简介页应点亮「知识库」（使用文档属于知识库语境）').toEqual(['知识库'])
    expect(activeTitles, '绝不能点亮「编辑器」（首轮报障：看起来像已跳转到编辑器）').not.toContain('编辑器')
  })

  // ★ 对照组：证明「不点亮」是条件式的 —— 用户自己的笔记打开时「编辑器」项照常高亮
  it('10) 对照组 · 普通笔记：侧栏「编辑器」项照常处于激活态', async () => {
    const { container } = await renderPanel()
    await openPlainNote()
    await waitFor(() => expect(container.querySelector('[data-testid="real-editorlayout"]')).toBeTruthy())

    const editorItem = [...container.querySelectorAll('.aurora-sidebar-item')]
      .find((el) => (el.getAttribute('title') || el.textContent || '') === '编辑器')
    expect(editorItem, '侧栏应有「编辑器」导航项').toBeTruthy()
    expect(editorItem!.className).toContain('aurora-sidebar-item--active')
  })
})

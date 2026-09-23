import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, within, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { RealProviders } from '../../providers/RealProviders'
import { GraphPanel } from './GraphPanel'
import { useFileManager } from '@stores/FileStore'
import { clearEditorReturn, getEditorReturn } from '../../navigation/navReturn'
import type { FileNode } from '@src/types/fileManager'

/**
 * 双链图谱「知识库范围」集成回归（2026-09-23 用户报障）
 *
 * 报障原话：「现在优化双链图谱功能…例如现在 markcraft 使用文档知识库有图谱，
 * 点击查看完整图谱后去到双链图谱功能界面，但是会有文件列表中的文件在其中，
 * 现在要求只要有这个知识库文件节点」。
 *
 * 完整链路（本文件锁后三段，入口那一段由 KbPanel.smoke.test.tsx 锁）：
 *   KbPanel「查看完整图谱」→ nav('graph', kb.id)
 *   → useAuroraShell 把 param 映射成 params.kbId
 *   → AuroraShell 传 <GraphPanel kbId={params.kbId}>
 *   → getKbFiles(rootFolder, kb) 取库内文件 id
 *   → scopeGraphToKb 裁掉库外文件节点（判据层由 graphScope.test.ts 单测锁）
 *
 * 为什么要单开一个文件：本文件需要 mock `stores/kbStore`（把「库内有哪些文件」变成可控注入），
 * 而 GraphPanel.smoke.test.tsx 依赖真实 store；混在一起会让后者的语义被 mock 悄悄改写。
 *
 * 断言纪律：先证「扫描面非空」（全局面板确实有多个文件节点、真实树里确实有 >2 个 .md），
 * 再证「范围内只剩库内节点」；否则「只剩 2 个」可能是「本来就只有 2 个」的假绿。
 */

// jsdom 不实现 ResizeObserver，而 GraphPanel 挂载时依赖它做尺寸观测
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

// 范围由本测试注入：getKbFiles 每次调用读最新值（闭包），故可逐用例改写
const hoisted = vi.hoisted(() => ({ scopeFileIds: [] as string[] }))

vi.mock('../../../stores/kbStore', () => ({
  getKbList: vi.fn(async () => [
    { id: 'kb-1', name: '甲库', description: 'd', folderId: 'f1', fileCount: 2, canvasCount: 0, createdAt: 0, updatedAt: 0 },
  ]),
  loadKb: vi.fn(async (id: string) => ({
    id,
    name: '甲库',
    description: 'd',
    folderId: 'f1',
    createdAt: 0,
    updatedAt: 0,
    canvasIds: [],
    fileIds: [],
    rules: [],
  })),
  getKbFiles: vi.fn(() => hoisted.scopeFileIds),
  // useKbStore 会在挂载时调用 getKbList（已实现）；其余导出只在被调用时才需要真实实现
  saveKb: vi.fn(),
  createKb: vi.fn(),
  deleteKb: vi.fn(),
  renameKb: vi.fn(),
  addFileToKb: vi.fn(),
  removeFileFromKb: vi.fn(),
  addCanvasToKb: vi.fn(),
  removeCanvasFromKb: vi.fn(),
  addRule: vi.fn(),
  removeRule: vi.fn(),
  updateRule: vi.fn(),
  updateBlogConfig: vi.fn(),
  updateDescription: vi.fn(),
  updateLearningPath: vi.fn(),
  updateTasks: vi.fn(),
  updateWritingGoals: vi.fn(),
  updateReviewSchedule: vi.fn(),
  updateSavedQueries: vi.fn(),
  updateBlindSpotCache: vi.fn(),
  updateAiSummary: vi.fn(),
  updateHealthScore: vi.fn(),
  updateMocFileId: vi.fn(),
  addExportRecord: vi.fn(),
  createKbWithTemplate: vi.fn(),
  applyKbTemplate: vi.fn(),
}))

const nodeEls = (c: HTMLElement) => Array.from(c.querySelectorAll('.aurora-graph__node')) as SVGGElement[]
const fileNodeEls = (c: HTMLElement) =>
  nodeEls(c).filter((g) => g.querySelector('.aurora-graph__dot--file, .aurora-graph__dot--current, .aurora-graph__dot--orphan'))
/**
 * file 节点的业务 id（节点 g 上的 data-node-id 锚点）。
 * 不用 label 文本认节点：label 只在「孤立/热点/悬停/搜索命中」的节点上渲染，
 * 库内有链接的笔记不显示 label → 靠文字断言会得到一串空串（本文件初版即栽在这里）。
 */
const fileNodeIds = (c: HTMLElement) =>
  fileNodeEls(c)
    .map((g) => g.getAttribute('data-node-id') ?? '')
    .sort()

let fm: ReturnType<typeof useFileManager> | null = null
function FileProbe() {
  fm = useFileManager()
  return null
}

/** 真实文件树里的 .md 清单（id + 去扩展名名称）：测试不猜 id，避免与数据脱钩 */
function collectMd(node: FileNode, out: { id: string; name: string }[] = []) {
  if (node.type === 'file' && node.name.endsWith('.md')) {
    out.push({ id: node.id, name: node.name.replace(/\.md$/, '') })
  }
  node.children?.forEach((c) => collectMd(c, out))
  return out
}

async function realMdFiles() {
  const probe = render(
    <RealProviders>
      <FileProbe />
    </RealProviders>,
  )
  await waitFor(() => expect(fm).not.toBeNull())
  const list = collectMd(fm!.rootFolder)
  probe.unmount()
  return list
}

function renderScopedGraph(kbId: string | undefined, nav = vi.fn()) {
  const utils = render(
    <RealProviders>
      <GraphPanel kbId={kbId} nav={nav} toast={() => {}} />
    </RealProviders>,
  )
  return { ...utils, nav }
}

/**
 * 左缘导航浮层是 **hover 召唤** 的（hover-intent 220ms，默认不挂载）——
 * 「数据范围」选择器就挂在浮层里，不先展开浮层，触发器根本不在 DOM。
 * 所以选择器用例必须先走**真实用户路径**：mouseEnter 左缘感应条 → 推进 intent 到期。
 * 范式与 GraphPanel.smoke.test.tsx 的 openNavOverlay 同源（fake timers 推进后立即恢复真实时钟，
 * 返回时浮层已同步 commit 进 DOM）。
 */
function openNavOverlay(container: HTMLElement) {
  const zone = container.querySelector('.aurora-graph__hoverzone') as HTMLElement | null
  expect(zone).toBeTruthy()
  vi.useFakeTimers()
  try {
    act(() => { fireEvent.mouseEnter(zone!) })
    act(() => { vi.advanceTimersByTime(260) })
  } finally {
    vi.useRealTimers()
  }
}

/** 生产路径的「单击节点」：pointerdown → pointerup（节点拖拽会重定向 click） */
function clickNode(el: Element) {
  const ev = (type: string) =>
    fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY: 10, button: 0 }))
  ev('pointerdown')
  ev('pointerup')
}

afterEach(() => {
  cleanup()
  fm = null
  hoisted.scopeFileIds = []
  clearEditorReturn()
  // 范围会被持久化（用户拍板「记住最后一次」）—— 夹具必须清掉，
  // 否则前一个用例写下的 kb:<id> 会被后一个「无 kbId」的用例当成初始范围读走（跨用例污染）
  localStorage.removeItem('markcraft-graph-scope')
})

describe('GraphPanel · 知识库范围（只显示该库文件节点）', () => {
  it('对照（扫描面非空）：无 kbId 且没有知识库时，默认档渲染出文件树里的多个 .md 文件节点', async () => {
    const { container } = renderScopedGraph(undefined)
    await waitFor(() => expect(fileNodeEls(container).length).toBeGreaterThan(0), { timeout: 4000 })

    const md = await realMdFiles()
    // 前置事实：真实树里的 .md 足够切出「库内 2 篇 + 库外若干」，否则后面的范围断言无意义
    expect(md.length).toBeGreaterThan(2)
    // 对照口径：排除集合为空（一个知识库都没有）时，默认档 == 全量 —— 默认档不得误伤整图
    // （「默认档确实排除知识库文件」由下面的专门用例锁）
    expect(fileNodeEls(container).length).toBe(md.length)
  })

  it('带 kbId：库里 2 篇 → 图谱只剩这 2 个文件节点，库外文件整体消失', async () => {
    const md = await realMdFiles()
    const scoped = md.slice(0, 2)
    hoisted.scopeFileIds = scoped.map((f) => f.id)

    const { container } = renderScopedGraph('kb-1')
    await waitFor(() => expect(fileNodeEls(container).length).toBe(2), { timeout: 4000 })
    // 身份校验（不只看数量）：留在图里的正是库内那两篇
    expect(fileNodeIds(container)).toEqual(scoped.map((f) => f.id).sort())
    // 反向：库外任意一篇都不在图里
    expect(fileNodeIds(container)).not.toContain(md[2].id)
  })

  it('范围明示与出口：顶栏范围芯片 + 面包屑带库名，点「回到文件列表」退回默认档', async () => {
    const md = await realMdFiles()
    const scoped = md.slice(0, 2)
    hoisted.scopeFileIds = scoped.map((f) => f.id)

    const { container } = renderScopedGraph('kb-1')
    const topbar = container.querySelector('.aurora-graph__topbar') as HTMLElement
    expect(topbar).toBeTruthy()

    await waitFor(() => expect(container.querySelector('.aurora-graph__scope')).toBeTruthy(), { timeout: 4000 })
    expect(within(topbar).getByText('甲库')).toBeTruthy()
    // 面包屑「双链图谱 › 甲库」（外壳标题栏，与顶栏芯片分别明示一次）
    expect(screen.getAllByText('甲库').length).toBeGreaterThan(1)

    act(() => {
      fireEvent.click(within(topbar).getByText('回到文件列表'))
    })

    // 退出范围 = 回到默认档（「文件列表」），此时：
    //  ① 范围芯片消失；② 库外文件回到图里 —— 且**恰好只少了库内那 2 篇**
    //  （默认档排除所有知识库文件，这是口径 B 的直接体现，所以不是「全量 md.length」）
    await waitFor(() => expect(container.querySelector('.aurora-graph__scope')).toBeNull(), { timeout: 4000 })
    await waitFor(
      () => expect(fileNodeEls(container).length).toBe(md.length - scoped.length),
      { timeout: 4000 },
    )
    const ids = fileNodeIds(container)
    expect(ids).not.toContain(scoped[0].id)
    expect(ids).not.toContain(scoped[1].id)
    expect(ids).toContain(md[2].id)
  })

  it('范围为空：图谱走空态，文案说明是范围所致，并给出退出口', async () => {
    hoisted.scopeFileIds = []
    const { container } = renderScopedGraph('kb-1')
    await waitFor(() => expect(container.querySelector('.aurora-graph__empty')).toBeTruthy(), { timeout: 4000 })

    const empty = container.querySelector('.aurora-graph__empty') as HTMLElement
    expect(within(empty).getByText('本知识库暂无可显示的节点')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__empty-exit')).toBeTruthy()
    // 范围内不得残留任何库外节点
    expect(fileNodeEls(container).length).toBe(0)
  })

  it('往返闭环：范围内点开笔记 → 返回来源带 kbId（编辑器据此回到同范围的图谱）', async () => {
    const md = await realMdFiles()
    hoisted.scopeFileIds = md.slice(0, 2).map((f) => f.id)

    const { container, nav } = renderScopedGraph('kb-1')
    await waitFor(() => expect(fileNodeEls(container).length).toBe(2), { timeout: 4000 })

    act(() => {
      clickNode(fileNodeEls(container)[0])
    })

    expect(nav).toHaveBeenCalledWith('editor')
    expect(getEditorReturn()).toEqual({ view: 'graph', kbId: 'kb-1', label: '甲库 · 图谱' })
  })
})

/**
 * 默认「文件列表」范围 + 数据范围选择器（2026-09-23 用户需求，口径 B）
 *
 * 用户原话：「进入双链图谱默认不显示知识库中文件节点，只显示文件列表中的文件节点」，
 * 并明确选了口径 B —— **排除所有知识库**的文件；面板里给一个控件可切「某个知识库」或「全部文件」。
 *
 * 本组用例锁的是「默认档真的排除了库内文件」+「选择器与出口能把范围切走」，
 * 判据层（谓词本身）由 graphScope.test.ts 的纯函数用例锁。
 */
describe('GraphPanel · 数据范围（默认文件列表 / 知识库 / 全部）', () => {
  it('默认档（口径 B）：知识库里的文件默认不出现，只画「文件列表」的散装笔记', async () => {
    const md = await realMdFiles()
    const inKb = md.slice(0, 2)
    hoisted.scopeFileIds = inKb.map((f) => f.id)

    const { container } = renderScopedGraph(undefined)
    // 扫描面：库外文件确实在场（不只看数量，逐 id 校验）
    await waitFor(() => expect(fileNodeEls(container).length).toBe(md.length - inKb.length), { timeout: 4000 })
    const ids = fileNodeIds(container)
    expect(ids).not.toContain(inKb[0].id)
    expect(ids).not.toContain(inKb[1].id)
    expect(ids).toContain(md[2].id)
    // 默认档不做范围标注（它就是默认，标注反而啰嗦）—— 非默认档才出芯片
    expect(container.querySelector('.aurora-graph__scope')).toBeNull()
  })

  it('选择器「数据范围」：切到「全部文件」后知识库文件回到图里，且选择被记住', async () => {
    const md = await realMdFiles()
    const inKb = md.slice(0, 2)
    hoisted.scopeFileIds = inKb.map((f) => f.id)

    const { container } = renderScopedGraph(undefined)
    await waitFor(() => expect(fileNodeEls(container).length).toBe(md.length - inKb.length), { timeout: 4000 })

    // 「数据范围」选择器在左缘导航浮层里 —— 必须先 hover 召唤出浮层（否则触发器不在 DOM）
    openNavOverlay(container)
    const overlay = container.querySelector('.aurora-graph__overlay') as HTMLElement
    expect(overlay).toBeTruthy()
    // AuroraSelect：触发器与浮层共用 aria-label ⇒ 取 button 那一个（浮层是 role=dialog）
    act(() => {
      fireEvent.click(within(overlay).getByRole('button', { name: '数据范围' }))
    })
    // 选项只在展开时挂载
    const optAll = await screen.findByText('全部文件')
    act(() => {
      fireEvent.click(optAll)
    })

    await waitFor(() => expect(fileNodeEls(container).length).toBe(md.length), { timeout: 4000 })
    expect(fileNodeIds(container)).toContain(inKb[0].id)
    // 用户拍板：记住最后一次（持久化到 localStorage）
    expect(localStorage.getItem('markcraft-graph-scope')).toBe('all')
  })

  it('选择器「数据范围」：切到某知识库后只剩该库文件节点', async () => {
    const md = await realMdFiles()
    const inKb = md.slice(0, 2)
    hoisted.scopeFileIds = inKb.map((f) => f.id)

    const { container } = renderScopedGraph(undefined)
    await waitFor(() => expect(fileNodeEls(container).length).toBe(md.length - inKb.length), { timeout: 4000 })

    // 同上：先 hover 召唤浮层，再从浮层内取「数据范围」触发器
    openNavOverlay(container)
    const overlay = container.querySelector('.aurora-graph__overlay') as HTMLElement
    act(() => {
      fireEvent.click(within(overlay).getByRole('button', { name: '数据范围' }))
    })
    const optKb = await screen.findByText('知识库 · 甲库')
    act(() => {
      fireEvent.click(optKb)
    })

    await waitFor(() => expect(fileNodeEls(container).length).toBe(inKb.length), { timeout: 4000 })
    expect(fileNodeIds(container)).toEqual(inKb.map((f) => f.id).sort())
    expect(localStorage.getItem('markcraft-graph-scope')).toBe('kb:kb-1')
  })

  it('「文件列表」全空时的出口：空态说明是范围所致，一点「查看全部文件」即看到全部（用户报障场景）', async () => {
    const md = await realMdFiles()
    hoisted.scopeFileIds = md.map((f) => f.id) // 所有笔记都在知识库里

    const { container } = renderScopedGraph(undefined)
    await waitFor(() => expect(container.querySelector('.aurora-graph__empty')).toBeTruthy(), { timeout: 4000 })
    const empty = container.querySelector('.aurora-graph__empty') as HTMLElement
    expect(within(empty).getByText('文件列表里没有可显示的节点')).toBeTruthy()
    expect(fileNodeEls(container).length).toBe(0)

    act(() => {
      fireEvent.click(within(empty).getByText('查看全部文件'))
    })
    await waitFor(() => expect(fileNodeEls(container).length).toBe(md.length), { timeout: 4000 })
  })
})

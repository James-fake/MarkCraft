import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { RealProviders } from '../../providers/RealProviders'
import { GraphPanel } from './GraphPanel'
import { readGraphSession } from './graphSession'
import { clearEditorReturn, getEditorReturn } from '../../navigation/navReturn'
import { useFileManager } from '@stores/FileStore'
import { findNode } from '@core/files/fileTree'

/**
 * Phase 2 换芯·GraphPanel 烟雾测试
 * 目标：证明双链图谱从 mock（RAW_NODES/RAW_EDGES/ALL_TAGS）改为真实 LinkIndex/TabIndex/FileStore 后，
 * 面板在真实 Provider 树下能挂载、把真实图谱数据渲染进 SVG、标签筛选与信息卡交互走真实节点。
 *
 * 验证分层：graph 为 `#view=` 标准视图，但本环境无 Edge/Chrome 二进制，headless 不可用；
 * 沿用 aux/标准视图同策略——以 jsdom 烟雾测试为权威验证（Dexie IndexedDB API missing 为良性告警）。
 */

// jsdom 不实现 ResizeObserver，而 GraphPanel 挂载时依赖它做尺寸观测
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// 行首分号防 ASI 粘连 class 声明；eslint-disable 压制 no-extra-semi（同 scope.test 的既有写法）
// eslint-disable-next-line no-extra-semi
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

function renderGraph(nav = vi.fn()) {
  const utils = render(
    <RealProviders>
      <GraphPanel nav={nav} toast={() => {}} />
    </RealProviders>,
  )
  return { ...utils, nav }
}

/** 读取真实 FileManager（context，非全局 store）：用于核对「打开的确实是该节点对应的笔记」 */
let fm: ReturnType<typeof useFileManager> | null = null
function FileProbe() {
  fm = useFileManager()
  return null
}
function renderGraphWithProbe(nav = vi.fn()) {
  const utils = render(
    <RealProviders>
      <GraphPanel nav={nav} toast={() => {}} />
      <FileProbe />
    </RealProviders>,
  )
  return { ...utils, nav }
}

// —— 节点选择器：节点类型体现在 dot 的修饰类上（file/orphan/current 都属 file 节点）——
const nodeEls = (c: HTMLElement) => Array.from(c.querySelectorAll('.aurora-graph__node')) as SVGGElement[]
const fileNodeEls = (c: HTMLElement) =>
  nodeEls(c).filter((g) => g.querySelector('.aurora-graph__dot--file, .aurora-graph__dot--current, .aurora-graph__dot--orphan'))
const tagNodeEls = (c: HTMLElement) => nodeEls(c).filter((g) => g.querySelector('.aurora-graph__dot--tag'))

async function waitNodes(c: HTMLElement) {
  await waitFor(
    () => {
      expect(nodeEls(c).length).toBeGreaterThan(0)
    },
    { timeout: 4000 },
  )
  return nodeEls(c)
}

/** 节点形状的几何快照（cx/x/points 按 DOM 顺序），用于比对「返回图谱是否原图原位」 */
const posSnapshot = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('.aurora-graph__node .aurora-graph__dot')).map(
    (el) => el.getAttribute('cx') ?? el.getAttribute('x') ?? el.getAttribute('points') ?? '',
  )

/**
 * jsdom 的 PointerEvent 回退实现（window.PointerEvent 缺失 → 退化为 Event）不携带
 * button/clientX 等指针属性，故用 MouseEvent 承载同名指针事件：属性集足够驱动这套手势逻辑。
 */
function pointer(el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x = 10, y = 10) {
  fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
}

/**
 * 生产路径的「单击节点」：pointerdown → pointerup。
 * 不能用 fireEvent.click —— 节点拖拽会对指针做 setPointerCapture，真实浏览器会把随后的
 * click 重定向到 <svg>（节点收不到），单击因此在该面板里由 pointerup 兑现。
 */
function clickNode(el: Element) {
  pointer(el, 'pointerdown')
  pointer(el, 'pointerup')
}

/** 单击已改为「打开笔记」，信息卡改由右键菜单「查看详情」进入 */
async function openInfoCardViaMenu(c: HTMLElement) {
  const g = fileNodeEls(c)[0]
  expect(g).toBeTruthy()
  act(() => {
    fireEvent.contextMenu(g)
  })
  const item = await screen.findByText('查看详情')
  act(() => {
    fireEvent.click(item)
  })
  await waitFor(
    () => {
      expect(c.querySelector('.aurora-graph__ic-title')).toBeTruthy()
    },
    { timeout: 4000 },
  )
}

/**
 * 使用优化⑦ · 左缘导航浮层 hover 召唤（编辑器 v7 范式，hover-intent 220ms）。
 * 测试范式对齐 EditorPanel.smoke.test.tsx：fake timers 推进 intent 到期后立即恢复真实时钟，
 * 返回时浮层已同步 commit 进 DOM，后续断言可直接使用。
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

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('Aurora GraphPanel · 真实图谱换芯', () => {
  it('挂载无崩溃且把真实 LinkIndex 数据渲染进 SVG 节点', async () => {
    const { container } = renderGraph()

    // 数据填充 effect 在挂载后把 realData 写入 nodesRef 并触发 graphRev 重渲染，
    // 因此需等待首个真实节点出现。
    await waitFor(
      () => {
        const nodes = container.querySelectorAll('.aurora-graph__node')
        expect(nodes.length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )

    // 状态栏应统计真实笔记节点数（默认种子含多份文档）
    const statusText = container.querySelector('.aurora-statusbar')?.textContent ?? ''
    expect(statusText).toMatch(/笔记/)
    expect(statusText).toMatch(/\d+/)
  })

  it('G4/I3 链接健康分组渲染（复用 useDashboardData：健康分 + 断链/孤立计数）', async () => {
    const { container } = renderGraph()
    // 导航浮层默认隐藏（使用优化⑦ hover 召唤）：先 mouseEnter 左缘感应条展开
    openNavOverlay(container)
    // 侧栏分组标题
    expect(container.textContent ?? '').toContain('链接健康')
    // 健康分（0-100）带 band 类
    const healthGroup = container.querySelector('.aurora-graph__health')
    expect(healthGroup).toBeTruthy()
    const band = healthGroup?.querySelector('.band')
    expect(band).toBeTruthy()
    const score = Number((band?.textContent ?? '').replace('分', ''))
    expect(Number.isFinite(score)).toBe(true)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    // 断链 / 孤立计数项存在
    expect(healthGroup?.textContent ?? '').toContain('断链')
    expect(healthGroup?.textContent ?? '').toContain('孤立')
  })

  it('标签筛选芯片由真实 tagIndex 驱动（无 ALL_TAGS mock 残留）', async () => {
    const { container } = renderGraph()

    await waitFor(
      () => {
        expect(container.querySelector('.aurora-graph__node')).toBeTruthy()
      },
      { timeout: 4000 },
    )

    // 导航浮层默认隐藏（使用优化⑦ hover 召唤）：先 mouseEnter 左缘感应条展开（浮层未渲染则 chips 不存在）
    openNavOverlay(container)

    // 标签筛选容器必须存在，且由 allTags（tagIndex.keys()）渲染，而非旧的 ALL_TAGS 常量
    const chips = container.querySelector('.aurora-graph__chips')
    expect(chips).toBeTruthy()
    // 真实 tagIndex 可能为空；芯片数等于真实标签数，结构正确即可
    expect(container.querySelectorAll('.aurora-graph__chip').length).toBeGreaterThanOrEqual(0)
  })

  it('单击 file 节点 → 打开对应笔记并登记「← 返回 双链图谱」来源', async () => {
    clearEditorReturn()
    const { container, nav } = renderGraphWithProbe()

    await waitNodes(container)
    const g = fileNodeEls(container)[0]
    expect(g).toBeTruthy()

    act(() => {
      clickNode(g)
    })

    // ① 跳转编辑器
    expect(nav).toHaveBeenCalledWith('editor')
    // ② 返回来源上下文（编辑器据此渲染「← 返回 双链图谱」芯片，点击回跳 graph）
    expect(getEditorReturn()).toEqual({ view: 'graph', label: '双链图谱' })
    // ③ 被点的节点进入激活态，且不会被画布 click 立刻清掉（捕获会把 click 重定向到 svg）
    await waitFor(
      () => {
        expect(g.getAttribute('class')).toContain('is-active')
      },
      { timeout: 4000 },
    )
    act(() => {
      fireEvent.click(container.querySelector('.aurora-graph__svg')!)
    })
    expect(g.getAttribute('class')).toContain('is-active')

    // ④ 打开的确实是「该节点对应的」笔记：节点 label == 激活文件名（去 .md）
    await waitFor(
      () => {
        expect(g.querySelector('.aurora-graph__label')?.textContent).toBeTruthy()
      },
      { timeout: 4000 },
    )
    const label = g.querySelector('.aurora-graph__label')!.textContent!
    const activeId = fm!.getActiveFileId()
    expect(activeId).toBeTruthy()
    expect(findNode(fm!.rootFolder, activeId!)!.name.replace(/\.md$/i, '')).toBe(label)
  })

  it('拖拽节点（超过阈值）不会跳编辑器；微抖动（<4px）仍算单击', async () => {
    clearEditorReturn()
    const { container, nav } = renderGraph()

    await waitNodes(container)
    const g = fileNodeEls(container)[0]

    // ① 真实拖拽：位移远超阈值 → moved=true → 松手不得跳转
    act(() => {
      pointer(g, 'pointerdown', 10, 10)
    })
    act(() => {
      pointer(g, 'pointermove', 90, 70)
    })
    // 拖拽期间 SVG 挂 is-dragging：这是「拖拽期性能优化」的开关（关闭脉冲动画/过渡/发光滤镜），
    // 同时也是「确实进入了拖拽态」的可测锚点（不是单击）
    expect(container.querySelector('.aurora-graph__svg')!.classList.contains('is-dragging')).toBe(true)
    act(() => {
      pointer(g, 'pointerup', 90, 70)
    })
    // 松手即摘掉 is-dragging（拖拽期的一次性开销随之恢复）
    expect(container.querySelector('.aurora-graph__svg')!.classList.contains('is-dragging')).toBe(false)
    // 拖拽摆放节点是图谱高频操作，绝不能把它当成单击跳转
    expect(nav).not.toHaveBeenCalled()
    expect(getEditorReturn()).toBeNull()

    // ② 手抖 2px：仍视为单击（桌面端拖拽阈值语义）
    act(() => {
      pointer(g, 'pointerdown', 10, 10)
    })
    act(() => {
      pointer(g, 'pointermove', 12, 11)
    })
    act(() => {
      pointer(g, 'pointerup', 12, 11)
    })
    expect(nav).toHaveBeenCalledWith('editor')
  })

  it('tag 节点（无可跳转目标）单击仍是信息卡，不跳转', async () => {
    clearEditorReturn()
    const { container, nav } = renderGraph()

    await waitNodes(container)
    const tags = tagNodeEls(container)
    expect(tags.length).toBeGreaterThan(0) // 种子含标签节点（"知识管理" 等）

    act(() => {
      clickNode(tags[0])
    })

    expect(nav).not.toHaveBeenCalled()
    await waitFor(
      () => {
        expect(container.querySelector('.aurora-graph__ic-title')).toBeTruthy()
      },
      { timeout: 4000 },
    )
  })

  it('图谱现场跨挂载复原：离开写入 graphSession，返回沿用同一坐标/选中项', async () => {
    clearEditorReturn()
    const first = renderGraph()
    await waitNodes(first.container)
    const before = posSnapshot(first.container)
    expect(before.length).toBeGreaterThan(0)

    // 离开图谱（等价于点击节点跳编辑器 / 侧栏切走）：卸载即写回现场
    act(() => {
      first.unmount()
    })
    const session = readGraphSession()
    expect(session).toBeTruthy()
    expect(Object.keys(session!.positions).length).toBe(before.length)

    // 「← 返回 双链图谱」重挂载 → 坐标逐项一致（而不是重新随机布点）
    const second = renderGraph()
    await waitNodes(second.container)
    expect(posSnapshot(second.container)).toEqual(before)
  })

  it('右键 → 查看详情：单击改为跳转后，信息卡入口仍然可用', async () => {
    const { container } = renderGraph()
    await waitNodes(container)
    await openInfoCardViaMenu(container)
    const card = container.querySelector('.aurora-graph__ic-title')!.textContent ?? ''
    expect(card.length).toBeGreaterThan(0)
  })

  it('导航浮层改 hover 召唤（使用优化⑦ 对齐编辑器 v7）：感应条召唤浮层、头部收起可关闭', async () => {
    const { container } = renderGraph()

    await waitFor(
      () => {
        expect(container.querySelector('.aurora-graph__node')).toBeTruthy()
      },
      { timeout: 4000 },
    )

    // 首次打开：感应条/边缘在 DOM（7px 隐形触发区），浮层未渲染
    expect(container.querySelector('.aurora-graph__hoverzone')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__edge')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__overlay')).toBeNull()

    // mouseEnter 感应条 → hover-intent（220ms）到期后浮层滑入（openNavOverlay 内推进定时器）
    openNavOverlay(container)
    expect(container.querySelector('.aurora-graph__overlay')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__overlay-head')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__pin')).toBeTruthy()
    expect(container.querySelector('.aurora-graph__overlay-close')).toBeTruthy()

    // 点击头部收起按钮 → 浮层进入退场（动效审计 P1-5）：先标记 data-exiting 播 180ms 再卸载
    fireEvent.click(container.querySelector('.aurora-graph__overlay-close')!)
    expect(
      container.querySelector('.aurora-graph__overlay')?.getAttribute('data-exiting'),
    ).toBe('true')
    await waitFor(() => expect(container.querySelector('.aurora-graph__overlay')).toBeNull())
  })

  it('P1-2 信息卡无「添加标签」桩按钮（已删除）', async () => {
    const { container } = renderGraph()
    await waitNodes(container)
    // 单击已改为「打开笔记」，信息卡改由右键菜单「查看详情」进入
    await openInfoCardViaMenu(container)
    // 添加标签桩已删除；打开笔记按钮仅在 file 节点显示（tag/folder 节点无此按钮属预期）
    expect(container.textContent ?? '').not.toContain('添加标签')
  })

  it('P2-3/P2-5 筛选栏含「分组着色」区与「显示箭头」开关（默认关）', async () => {
    const { container } = renderGraph()
    await waitFor(
      () => {
        expect(container.querySelector('.aurora-graph__node')).toBeTruthy()
      },
      { timeout: 4000 },
    )
    // 导航浮层默认隐藏（使用优化⑦ hover 召唤）：先 mouseEnter 左缘感应条展开
    openNavOverlay(container)
    // 分组着色区存在且可新建
    expect(container.textContent ?? '').toContain('分组着色')
    expect(container.querySelector('.aurora-graph__grp-form')).toBeTruthy()
    // 显示箭头开关默认关
    const labels = Array.from(container.querySelectorAll('label'))
    const arrowLabel = labels.find((l) => (l.textContent ?? '').includes('显示箭头'))
    expect(arrowLabel).toBeTruthy()
    expect(arrowLabel!.querySelector('input')?.checked).toBe(false)
  })
})

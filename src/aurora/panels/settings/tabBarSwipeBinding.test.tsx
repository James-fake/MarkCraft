import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RealProviders } from '../../app/RealProviders'
import { SettingsPanel } from './SettingsPanel'
import { KbPanel } from '../kb/KbPanel'
import { CanvasSidebarPanel } from '../canvas/CanvasSidebarPanel'

/**
 * 顶栏功能切换 tab「栏内左右滑动」契约测试
 *
 * 用户诉求：「顶栏的功能切换 tab，支持左右滑动」—— 手势必须挂在 **tab 栏本身**，
 * 而不只是内容区。本文件锁死三件事：
 *   1. tab 栏容器上真的挂了 onPointerDown（在 tab 栏内起手能被接住）
 *   2. 内容区同样挂了（两处都能起手）
 *   3. 从 tab 栏起手横滑 → 触发 index 切换（用真实 pointerdown → pointermove → pointerup 轨迹）
 *
 * ⚠️ jsdom 不实现指针捕获重定向，故一律用 pointerdown → pointerup 轨迹，
 *    禁用 fireEvent.click（那是假路径，全绿但真机无反应）。
 */

/** 读取元素上的 React 事件属性（React 17+ 把 props 挂在 __reactProps$* 上） */
function reactProps(el: Element | null): Record<string, unknown> | null {
  if (!el) return null
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'))
  return key ? (el as unknown as Record<string, Record<string, unknown>>)[key] : null
}

/** jsdom 缺 PointerEvent → 用 MouseEvent 承载同名指针事件（带 button/clientX） */
function pointer(type: string, x: number, y = 0): MouseEvent {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  Object.defineProperty(e, 'pointerType', { value: 'mouse' })
  Object.defineProperty(e, 'isPrimary', { value: true })
  return e
}

/** 在给定 tab 栏内合成一次「向左横滑 dist px」的真实轨迹 */
function swipeLeftIn(bar: HTMLElement, dist: number) {
  const target = bar.querySelector('button') ?? bar
  fireEvent(target, pointer('pointerdown', 600))
  // document 级 move/up（hook 注册在 document 上）
  for (let i = 1; i <= 18; i++) fireEvent(document, pointer('pointermove', 600 - (dist * i) / 18))
  fireEvent(document, pointer('pointerup', 600 - dist))
}

afterEach(() => cleanup())

describe('顶栏 tab 栏内滑动 · 绑定存在性', () => {
  it('设置页：tab 栏与内容区都挂了 onPointerDown', () => {
    const { container } = render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-settings__nav-tabs')
    const content = container.querySelector('.aurora-settings__content')
    expect(bar).toBeTruthy()
    expect(content).toBeTruthy()
    // tab 栏本身必须可接手势（这是用户诉求的核心）
    expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
    expect(typeof reactProps(bar)?.onClickCapture).toBe('function')
    // 内容区同样可起手
    expect(typeof reactProps(content)?.onPointerDown).toBe('function')
  })

  it('设置页：在 tab 栏内横滑可切换分类（真实 pointer 轨迹）', () => {
    const { container } = render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-settings__nav-tabs') as HTMLElement
    const activeOf = () => container.querySelector('.aurora-settings__nav-tab--active')?.textContent?.trim()
    const before = activeOf()

    swipeLeftIn(bar, 500)

    const after = activeOf()
    expect(after).not.toBe(before)
  })

  it('知识库：subbar tab 栏与内容区都挂了手势', () => {
    const { container } = render(
      <RealProviders>
        <KbPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-kb-subbar-tabs')
    const content = container.querySelector('.aurora-kb-content')
    // 知识库面板在无 KB 时可能停在列表页（无 subbar）；有则必须挂上
    if (bar) {
      expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
      expect(typeof reactProps(bar)?.onClickCapture).toBe('function')
    }
    if (content) expect(typeof reactProps(content)?.onPointerDown).toBe('function')
  })

  it('白板：侧栏 tab 行挂了手势（且不带 enabled 门控）', () => {
    const { container } = render(
      <RealProviders>
        <CanvasSidebarPanel
          view="canvas"
          engine={null}
          nav={() => {}}
          toast={() => {}}
        />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-csp__tabs')
    expect(bar).toBeTruthy()
    expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
    expect(typeof reactProps(bar)?.onClickCapture).toBe('function')
  })

  it('白板：在 tab 行内横滑可切换 Tab（无 enabled 门控 → 默认可用）', () => {
    const { container } = render(
      <RealProviders>
        <CanvasSidebarPanel
          view="canvas"
          engine={null}
          nav={() => {}}
          toast={() => {}}
        />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-csp__tabs') as HTMLElement
    const tabs = [...container.querySelectorAll('.aurora-csp__tab')]
    const activeIdx = () => tabs.findIndex((t) => t.className.includes('--active'))

    const before = activeIdx()
    swipeLeftIn(bar, 400)
    const after = activeIdx()

    // 应切到下一个（或至少发生变化）
    expect(after).not.toBe(before)
  })
})

describe('回归：博客 tab 行不受浮层开合影响（enabled 不得绑 panelOpen）', () => {
  it('BlogPanel 源码中 useSwipeTabs 的 enabled 不为 panelOpen', () => {
    // 静态断言：防止有人把 enabled 改回 panelOpen（那会让默认收起的浮层下 tab 行完全滑不动）
    const src = readFileSync(resolve(process.cwd(), 'src/aurora/panels/blog/BlogPanel.tsx'), 'utf8')
    const at = src.indexOf('useSwipeTabs({')
    expect(at).toBeGreaterThan(-1)
    const call = src.slice(at, at + 900)
    expect(call).not.toMatch(/enabled:\s*panelOpen/)
    // 且必须显式常驻启用
    expect(call).toMatch(/enabled:\s*true/)
    // 吸附基准不得直接用浮层内容体（它在收起时不存在）
    expect(call).toMatch(/measureRef:\s*blogMeasureRef/)
    // 位移目标必须是**常驻**的 tab 轨道（浮层收起时也要看得见跟手）
    expect(call).toMatch(/targetRef:\s*blogTrackRef/)
  })
})

/* ================================================================== *
 * 第三轮：整排 tab 跟手 —— 「按住 tab 方框左或右可以滑动」必须看得见
 * ================================================================== *
 * 用户第三次追问「在 tab 栏本身内横滑的效果还是没有显示出来」。CDP 实测根因：
 * 按住方块拖 150px，方块只挪 **0.7px**（progress 被内容区宽 1358px 稀释后 ×6px），
 * 且松手要拖够 435px（内容区宽 × 32%）才切换。
 *
 * 下面这组断言锁死「所见即所得」：
 *   1. 跟手期间**轨道**位移必须够大（≥ 30px / 150px 拖拽）—— 0.7px 那种回归会被拦下；
 *   2. 内容层位移必须仍被钳在 32px 内（超过 40px 内边距就会裁首字）；
 *   3. 松手后内联位移必须清空（归位交回 CSS 过渡）且 tab 真的切换。
 */

/** 合成「按住 tab 方块横滑 dist」并返回**跟手态**快照（松手前读取） */
function dragAndSample(
  bar: HTMLElement,
  track: HTMLElement,
  content: HTMLElement | null,
  root: HTMLElement | null,
  dist: number,
) {
  const target = bar.querySelector('button') ?? bar
  fireEvent(target, pointer('pointerdown', 600))
  for (let i = 1; i <= 18; i++) fireEvent(document, pointer('pointermove', 600 - (dist * i) / 18))

  const px = (transform: string) => {
    const m = /translate3d\((-?[\d.]+)px/.exec(transform || '')
    return m ? Number(m[1]) : 0
  }
  const mid = {
    swiping: bar.hasAttribute('data-swiping'),
    trackShift: px(track.style.transform),
    contentShift: content ? px(content.style.transform) : 0,
    progress: Number(root?.style.getPropertyValue('--swipe-progress') || 0),
  }

  fireEvent(document, pointer('pointerup', 600 - dist))
  return mid
}

interface StripPanelCase {
  name: string
  render: () => ReturnType<typeof render>
  bar: string
  track: string
  content: string | null
  /** 承载 --swipe-progress 的面板根 */
  root: string
  activeOf: (c: HTMLElement) => string | undefined
}

const STRIP_PANELS: StripPanelCase[] = [
  {
    name: '设置页',
    render: () => render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    ),
    bar: '.aurora-settings__nav-tabs',
    track: '.aurora-settings__nav-track',
    content: '.aurora-settings__swipe-layer',
    root: '.aurora-settings',
    activeOf: (c) => c.querySelector('.aurora-settings__nav-tab--active')?.textContent?.trim(),
  },
  {
    name: '白板',
    render: () => render(
      <RealProviders>
        <CanvasSidebarPanel view="canvas" engine={null} nav={() => {}} toast={() => {}} />
      </RealProviders>,
    ),
    bar: '.aurora-csp__tabs',
    track: '.aurora-csp__tabs-track',
    content: '.aurora-csp__body',
    root: '.aurora-csp',
    activeOf: (c) => c.querySelector('.aurora-csp__tab--active')?.textContent?.trim(),
  },
]

describe('第三轮：整排 tab 跟手（按住方块必须看得见地动）', () => {
  for (const p of STRIP_PANELS) {
    /** 渲染 + 取四个元素 */
    const setup = () => {
      const { container } = p.render()
      const bar = container.querySelector(p.bar) as HTMLElement
      const track = container.querySelector(p.track) as HTMLElement
      expect(bar, `${p.name} 缺 tab 栏`).toBeTruthy()
      expect(track, `${p.name} 缺轨道（位移没有承载者）`).toBeTruthy()
      return {
        container,
        bar,
        track,
        content: container.querySelector(p.content) as HTMLElement | null,
        root: container.querySelector(p.root) as HTMLElement | null,
      }
    }

    it(`${p.name}：跟手期间轨道位移 ≥ 30px（0.7px 的「人眼认为没动」回归会被拦下）`, () => {
      const { bar, track, content, root } = setup()
      const mid = dragAndSample(bar, track, content, root, 150)

      expect(mid.swiping, `${p.name} 跟手态未出现 data-swiping`).toBe(true)
      expect(Math.abs(mid.trackShift), `${p.name} 轨道位移 ${mid.trackShift}px 太小（用户会认为没动）`)
        .toBeGreaterThanOrEqual(30)
      // 进度同步（按槽距归一化，不是被内容区宽稀释后 ×6px）
      expect(Math.abs(mid.progress), `${p.name} 进度未联动`).toBeGreaterThan(0.3)
    })

    it(`${p.name}：内容层位移仍被钳在 32px 内（超过 40px 内边距会裁首字）`, () => {
      const { bar, track, content, root } = setup()
      const mid = dragAndSample(bar, track, content, root, 500)
      expect(Math.abs(mid.contentShift), `${p.name} 内容层位移过大`).toBeLessThanOrEqual(32)
    })

    it(`${p.name}：松手后内联位移清空（归位交回 CSS 过渡）且 tab 切换`, () => {
      const { container, bar, track, content, root } = setup()
      const before = p.activeOf(container)

      dragAndSample(bar, track, content, root, 150)

      expect(track.style.transform, `${p.name} 松手后轨道仍带内联位移（会盖住 CSS 归位过渡）`).toBe('')
      if (content) expect(content.style.transform, `${p.name} 松手后内容层仍带内联位移`).toBe('')
      expect(p.activeOf(container), `${p.name} 松手未切换`).not.toBe(before)
      expect(bar.hasAttribute('data-swiping'), `${p.name} 松手后 data-swiping 未移除`).toBe(false)
    })
  }
})

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RealProviders } from '../../app/RealProviders'
import { SettingsPanel } from './SettingsPanel'
import { KbPanel } from '../kb/KbPanel'
import { CanvasSidebarPanel } from '../canvas/CanvasSidebarPanel'
import { CanvasTopbar } from '../canvas/CanvasTopbar'
import { BlogPanel } from '../blog/BlogPanel'
import type { CanvasViewId } from '../canvas/CanvasPanel'

/**
 * 顶栏功能切换 tab「按住方块左右滑」契约测试（需求 N 第四轮定案 + 第六轮连续滑动）
 *
 * 用户诉求（第三次返工后的定案口径）：
 *   「滑动只有功能 tab 栏中的功能 tab 进行滑动 …… 摁住这个功能 tab 就有一个
 *     方块的感觉，然后可以进行一个滑动 …… 内容区域不要 …… 工具 tab 栏也是
 *     不需要进行滚动的」
 * 第六轮补充：
 *   「可以直接从概况，直接滑动到最后一个导出，就不需要一个一个滑动过去」
 *   → 位移与吸附都从「单步」放开为「连续」：**拖过几格就落几格**。
 *
 * 即 **Apple 分段控件（Segmented Control）** 形态：
 *   ① 一条**常驻滑块**压在选中项上；
 *   ② 按住任一 tab 拖动 → **只有滑块**跟手滑，**tab 文字一个像素都不动**；
 *   ③ **内容区零位移**（第三轮那 22px「呼应位移」已删）；
 *   ④ 松手滑块落到**落点最近**的 tab（宽度也换成目标 tab 的宽度），可跨多格；
 *   ⑤ 栏**不滚动**（scrollLeft 恒为 0）。
 *
 * ⚠️ jsdom 无布局引擎（getBoundingClientRect 全 0），所以这里显式给轨道与 tab
 *    打上可预测几何 —— 否则量到的槽距恒为 fallback，滑块定位数学测不到。
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

/** CanvasTopbar 是**受控**组件（view 由父级传入）→ 用有状态壳承接切换，落位才可验证 */
function TopbarHarness() {
  const [view, setView] = useState<CanvasViewId>('canvas')
  return <CanvasTopbar view={view} onView={setView} canvasName="测试白板" onOpenList={() => {}} />
}

const rect = (left: number, width: number) =>
  ({ left, top: 0, right: left + width, bottom: 0, width, height: 0, x: left, y: 0, toJSON: () => ({}) }) as DOMRect

/** 打上可预测几何：奇偶 tab 宽 70 / 82（不等宽 → 能测出「滑块宽度跟着 tab 走」） */
function stubGeometry(track: HTMLElement) {
  const els = [...track.querySelectorAll<HTMLElement>('[role="tab"]')]
  track.getBoundingClientRect = () => rect(0, 0)
  const tabs: Array<{ el: HTMLElement; x: number; w: number }> = []
  let x = 0
  els.forEach((el, i) => {
    const w = i % 2 === 0 ? 70 : 82
    const left = x        // ⚠️ 必须捕获当前值：箭头函数里读 `x` 会拿到循环结束后的终值
    el.getBoundingClientRect = () => rect(left, w)
    tabs.push({ el, x: left, w })
    x += w + 2
  })
  const centers = tabs.map((t) => t.x + t.w / 2)
  return { tabs, centers }
}

/**
 * 在给定 tab 栏内合成一次「按住方块向右横滑 dist px」的真实轨迹。
 *
 * ⚠️ 方向必须与「目标 tab 在右侧」对应：**位移方向即切换方向**
 * （向右 → index + 1）。2026-09-15 用户反馈「往右滑动 tab 却去到左侧」——
 * 这条向右轨迹就是该回归的闸门：向右拖必须落到 startIdx + 1。
 */
function dragRight(bar: HTMLElement, dist: number) {
  const target = bar.querySelector('button') ?? bar
  fireEvent(target, pointer('pointerdown', 600))
  for (let i = 1; i <= 18; i++) fireEvent(document, pointer('pointermove', 600 + (dist * i) / 18))
}

const endDrag = (dist: number) => fireEvent(document, pointer('pointerup', 600 + dist))

const shiftOf = (transform: string) => {
  const m = /translate3d\((-?[\d.]+)px/.exec(transform || '')
  return m ? Number(m[1]) : 0
}

afterEach(() => cleanup())

/* ------------------------------------------------------------------ *
 * 绑定存在性：手势只挂 tab 栏，**不再挂内容区**
 * ------------------------------------------------------------------ */

describe('手势只挂 tab 栏（内容区不参与滑动）', () => {
  it('设置页：tab 栏挂了 onPointerDown + onClickCapture；内容区没挂', () => {
    const { container } = render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-settings__nav-tabs')
    const content = container.querySelector('.aurora-settings__content')
    expect(bar).toBeTruthy()
    expect(content).toBeTruthy()
    expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
    expect(typeof reactProps(bar)?.onClickCapture).toBe('function')
    // 第四轮：内容区完全不参与滑动
    expect(reactProps(content)?.onPointerDown, '内容区不应再挂手势').toBeUndefined()
  })

  it('白板：侧栏 tab 行挂了手势', () => {
    const { container } = render(
      <RealProviders>
        <CanvasSidebarPanel view="canvas" engine={null} nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-csp__tabs')
    expect(bar).toBeTruthy()
    expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
    expect(typeof reactProps(bar)?.onClickCapture).toBe('function')
    expect(reactProps(container.querySelector('.aurora-csp__body'))?.onPointerDown).toBeUndefined()
  })

  it('知识库：有 subbar 时必须挂手势（无库时停在列表页，则不强制）', () => {
    const { container } = render(
      <RealProviders>
        <KbPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-kb-subbar-tabs')
    if (bar) expect(typeof reactProps(bar)?.onPointerDown).toBe('function')
    const content = container.querySelector('.aurora-kb-content')
    if (content) expect(reactProps(content)?.onPointerDown).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ *
 * 第四轮核心：滑块跟手 / 文字不动 / 内容不动 / 落位 / 不滚
 * ------------------------------------------------------------------ */

interface ThumbCase {
  name: string
  render: () => ReturnType<typeof render>
  /** tab 栏（手势区 + 裁剪方） */
  bar: string
  /** 轨道（滑块定位坐标系） */
  track: string
  /** 滑块 */
  thumb: string
  /** 内容层（必须零位移） */
  content: string | null
  activeOf: (c: HTMLElement) => string | undefined
}

const CASES: ThumbCase[] = [
  {
    name: '设置页',
    render: () => render(
      <RealProviders>
        <SettingsPanel nav={() => {}} toast={() => {}} />
      </RealProviders>,
    ),
    bar: '.aurora-settings__nav-tabs',
    track: '.aurora-settings__nav-track',
    thumb: '.aurora-settings__nav-thumb',
    content: '.aurora-settings__content',
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
    thumb: '.aurora-csp__tabs-thumb',
    content: '.aurora-csp__body',
    activeOf: (c) => c.querySelector('.aurora-csp__tab--active')?.textContent?.trim(),
  },
  // —— 第七轮补齐的两条栏（用户点名：白板**顶部** + 博客**功能 tab**）——
  {
    name: '白板顶部视图',
    render: () => render(
      <RealProviders>
        <TopbarHarness />
      </RealProviders>,
    ),
    bar: '.aurora-ctop__switcher',
    track: '.aurora-ctop__switcher-track',
    thumb: '.aurora-ctop__switcher-thumb',
    // 顶栏没有「内容区」（白板画布在其它 DOM 分支）→ 用 null 跳过内容零位移断言
    content: null,
    activeOf: (c) => c.querySelector('.aurora-ctop__view--active')?.textContent?.trim(),
  },
  {
    name: '博客功能分组',
    render: () => render(
      <RealProviders>
        <BlogPanel />
      </RealProviders>,
    ),
    bar: '.aurora-blog__tabs',
    track: '.aurora-blog__tabs-track',
    thumb: '.aurora-blog__tabs-thumb',
    // 浮层默认收起 → 内容体不挂载；分组切换只换浮层内容，不移动任何容器
    content: null,
    activeOf: (c) => c.querySelector('.aurora-blog__tab.is-active')?.textContent?.trim(),
  },
]

describe('第四轮：分段控件滑块（按住方块必须看得见地动，其余一切不动）', () => {
  for (const p of CASES) {
    const setup = () => {
      const { container } = p.render()
      const bar = container.querySelector(p.bar) as HTMLElement
      const track = container.querySelector(p.track) as HTMLElement
      const thumb = container.querySelector(p.thumb) as HTMLElement
      expect(bar, `${p.name} 缺 tab 栏`).toBeTruthy()
      expect(track, `${p.name} 缺轨道（滑块没有定位坐标系）`).toBeTruthy()
      expect(thumb, `${p.name} 缺滑块（选中态没有承载者）`).toBeTruthy()
      const geo = stubGeometry(track)
      // 起始索引从 DOM 推（不写死：设置页默认落在「通用」= index 1，不是 0）
      const startIdx = geo.tabs.findIndex((t) => t.el.getAttribute('aria-selected') === 'true')
      expect(startIdx, `${p.name} 没有 aria-selected=true 的 tab`).toBeGreaterThanOrEqual(0)
      return {
        container,
        bar,
        track,
        thumb,
        geo,
        startIdx,
        content: container.querySelector(p.content) as HTMLElement | null,
      }
    }

    it(`${p.name}：滑块是 track 的子节点，且不参与 tab 序列（不会被当成 tab 量进去）`, () => {
      const { track, thumb, geo } = setup()
      expect(thumb.parentElement, `${p.name} 滑块必须挂在轨道内`).toBe(track)
      // 滑块带 aria-hidden，且不是 [role="tab"] → 量 tab 时必须被排除
      expect(thumb.getAttribute('aria-hidden')).toBe('true')
      expect(thumb.hasAttribute('role')).toBe(false)
      expect(geo.tabs).toHaveLength(track.querySelectorAll('[role="tab"]').length)
    })

    it(`${p.name}：跟手期间滑块位移 = 基准 + 1:1（≥30px，0.7px 那种回归会被拦下）`, () => {
      const { bar, thumb, geo, startIdx } = setup()
      const base = geo.tabs[startIdx]
      const lastCenter = geo.centers[geo.centers.length - 1]
      // 前提：150px 之后落点仍在轨道内 → 严格 1:1（越界另有专门用例）
      expect(base.x + base.w / 2 + 150, `${p.name} 用例前提：150px 未越出轨道`).toBeLessThan(lastCenter)

      dragRight(bar, 150)

      expect(bar.hasAttribute('data-swiping'), `${p.name} 跟手态未出现 data-swiping`).toBe(true)
      expect(thumb.style.transition, `${p.name} 跟手期间滑块必须零过渡`).toBe('none')
      expect(thumb.style.width, `${p.name} 滑块宽度未跟随当前 tab`).toBe(`${base.w}px`)
      // 基准 = 起始 tab 的 x；轨道内 1:1 → 位移就是 150
      const expected = base.x + 150
      expect(shiftOf(thumb.style.transform), `${p.name} 滑块位移与跟手公式不符`)
        .toBeCloseTo(expected, 5)
      expect(Math.abs(shiftOf(thumb.style.transform) - base.x), `${p.name} 滑块位移太小（用户会认为没动）`)
        .toBeGreaterThanOrEqual(30)
    })

    it(`${p.name}：跟手期间 tab 文字与内容区一个像素都不动`, () => {
      const { bar, geo, content } = setup()
      const styleBefore = geo.tabs.map((t) => t.el.getAttribute('style'))

      dragRight(bar, 150)

      // tab 元素不得被写入任何内联样式（位移写的是滑块，不是文字）
      expect(geo.tabs.map((t) => t.el.getAttribute('style')), `${p.name} 有 tab 被写入了内联样式`)
        .toEqual(styleBefore)
      expect(geo.tabs.every((t) => !t.el.style.transform), `${p.name} 有 tab 被位移了`).toBe(true)
      // 内容区零位移
      expect(content?.style.transform ?? '', `${p.name} 内容区被位移了`).toBe('')
      expect(content?.className ?? '', `${p.name} 内容区仍带 is-swiping 类`).not.toMatch(/is-swiping/)

      endDrag(150)
    })

    it(`${p.name}：栏不滚动（scrollLeft 恒为 0，横滑只切换不浏览）`, () => {
      const { bar } = setup()
      dragRight(bar, 150)
      expect(bar.scrollLeft, `${p.name} 拖动中栏被滚动了`).toBe(0)
      endDrag(150)
      expect(bar.scrollLeft, `${p.name} 松手后栏被滚动了`).toBe(0)
    })

    it(`${p.name}：松手滑块落到目标 tab（位置 + 宽度都跟着目标），且内容切换`, () => {
      const { container, bar, thumb, geo, startIdx } = setup()
      const before = p.activeOf(container)
      // 150px 在 70/82 交替的几何下跨过 2 格（落点距 startIdx+2 更近）
      const t2 = geo.tabs[startIdx + 2]

      dragRight(bar, 150)
      endDrag(150)

      expect(p.activeOf(container), `${p.name} 松手未切换`).not.toBe(before)
      expect(p.activeOf(container), `${p.name} 未按落点落到第 +2 格`).toBe(t2.el.textContent?.trim())
      // 滑块落位：x = 目标 tab 的 x，宽度 = 目标 tab 的宽度
      expect(shiftOf(thumb.style.transform), `${p.name} 滑块未落到目标 tab`).toBeCloseTo(t2.x, 5)
      expect(thumb.style.width, `${p.name} 滑块宽度未换成目标 tab 的宽度`).toBe(`${t2.w}px`)
      // 落位后交回 CSS 过渡（清空内联过渡）
      expect(thumb.style.transition, `${p.name} 松手后内联过渡未清空`).toBe('')
      expect(bar.hasAttribute('data-swiping'), `${p.name} 松手后 data-swiping 未移除`).toBe(false)
    })

    it(`${p.name}：连续滑动 —— 一次从当前 tab 拖到**最后一格**（不必逐格挪）`, () => {
      const { container, bar, thumb, geo, startIdx } = setup()
      const last = geo.tabs.length - 1
      if (startIdx === last) return   // 已在末位，无方向可去（设置页/白板默认都不是）

      const target = geo.tabs[last]
      const span = geo.centers[last] - geo.centers[startIdx]   // 直拖到末格中心的距离

      dragRight(bar, span)
      endDrag(span)

      expect(p.activeOf(container), `${p.name} 未一次拖到最后一格`).toBe(target.el.textContent?.trim())
      expect(shiftOf(thumb.style.transform), `${p.name} 滑块未落到最后一格`).toBeCloseTo(target.x, 5)
      expect(thumb.style.width).toBe(`${target.w}px`)
    })

    it(`${p.name}：未够吸附阈值 → 滑块滑回原 tab（不切换）`, () => {
      const { container, bar, thumb, geo, startIdx } = setup()
      const before = p.activeOf(container)

      // 14px：已过方向阈值（8px）但远不足半格，也不构成甩掷（<20px）
      dragRight(bar, 14)
      endDrag(14)

      expect(p.activeOf(container), `${p.name} 轻拖不应切换`).toBe(before)
      expect(shiftOf(thumb.style.transform), `${p.name} 未切换时滑块未回到原 tab`)
        .toBeCloseTo(geo.tabs[startIdx].x, 5)
    })

    it(`${p.name}：点击 tab 也能让滑块带过渡滑过去（不只手势路径）`, () => {
      const { container, bar, thumb, geo, startIdx } = setup()
      const target = geo.tabs[startIdx + 2]
      fireEvent.click(target.el)

      expect(p.activeOf(container)).toBe(target.el.textContent?.trim())
      expect(shiftOf(thumb.style.transform), `${p.name} 点击后滑块未落位`).toBeCloseTo(target.x, 5)
      expect(thumb.style.width).toBe(`${target.w}px`)
      expect(thumb.style.transition, `${p.name} 点击落位必须交回 CSS 过渡`).toBe('')
      expect(bar.scrollLeft).toBe(0)
    })
  }
})

/* ------------------------------------------------------------------ *
 * 博客功能分组：拖拽不得吞掉「同组再点 = 开合浮层」语义
 * ------------------------------------------------------------------ */

describe('博客功能分组 tab：滑块与点击语义共存', () => {
  const setupBlog = () => {
    const { container } = render(
      <RealProviders>
        <BlogPanel />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-blog__tabs') as HTMLElement
    const track = container.querySelector('.aurora-blog__tabs-track') as HTMLElement
    const thumb = container.querySelector('.aurora-blog__tabs-thumb') as HTMLElement
    expect(bar, '缺分组 tab 栏').toBeTruthy()
    expect(track, '缺分组轨道').toBeTruthy()
    expect(thumb, '缺分组滑块').toBeTruthy()
    stubGeometry(track)
    return { container, bar, track, thumb, isOpen: () => /is-open/.test(container.querySelector('.aurora-blog__panelzone')?.className ?? '') }
  }

  it('拖一下又滑回原格 → 不误开浮层（落点=原格时 hook 不回调 onIndexChange）', () => {
    const { bar, isOpen } = setupBlog()
    expect(isOpen(), '浮层初始应为收起').toBe(false)

    // 14px：过了方向阈值（8px）但远不足半格、也不构成甩掷 → 落点仍属原格
    dragRight(bar, 14)
    endDrag(14)

    expect(isOpen(), '拖回原格不应把浮层打开（那会让「拖一下」变成副作用）').toBe(false)
  })

  it('点击同组 tab → 仍能开合浮层（滑块没有吞掉点击语义）', () => {
    const { bar, isOpen } = setupBlog()
    fireEvent.click(bar.querySelector('.aurora-blog__tab')!)

    expect(isOpen(), '点击同组 tab 应开合浮层').toBe(true)
  })
})

/* ------------------------------------------------------------------ *
 * 白板顶部：空白板引导锁定态 → 手势停用（设计语义）
 * ------------------------------------------------------------------ */

describe('白板顶部视图：引导锁定态下手势停用', () => {
  const renderTopbar = (locked: boolean) => {
    const { container } = render(
      <RealProviders>
        <CanvasTopbar view="canvas" onView={() => {}} canvasName="空板" onOpenList={() => {}} locked={locked} />
      </RealProviders>,
    )
    const bar = container.querySelector('.aurora-ctop__switcher') as HTMLElement
    const track = container.querySelector('.aurora-ctop__switcher-track') as HTMLElement
    const thumb = container.querySelector('.aurora-ctop__switcher-thumb') as HTMLElement
    expect(bar, '缺顶栏 switcher').toBeTruthy()
    stubGeometry(track)
    return { container, bar, thumb }
  }

  // 真机教训（2026-09-15 CDP）：白板为空且未点「跳过，直接开始」时，
  // CanvasPanel 会给顶栏传 locked=true（只有「白板」视图可选，其余 disabled）。
  // 探针第一次跑就卡在这个态上，看起来像"手势坏了"，实际是设计使然。
  it('locked=true：拖动完全无反应（不起手、滑块不动、不切换）', () => {
    const { container, bar, thumb } = renderTopbar(true)
    const before = shiftOf(thumb.style.transform)

    dragRight(bar, 150)

    expect(bar.hasAttribute('data-swiping'), '锁定态不该起手（滑块会滑到被锁的视图上）').toBe(false)
    expect(thumb.style.transition, '锁定态不该进入跟手（跟手会置 transition: none）').not.toBe('none')
    expect(shiftOf(thumb.style.transform), '锁定态滑块不得位移').toBe(before)
    endDrag(150)
    expect(container.querySelector('.aurora-ctop__view--active')?.textContent?.trim()).toBe('白板')
  })

  it('locked=false（对照组）：同样的一次拖动必须生效 —— 证明锁定是唯一变量', () => {
    const { bar, thumb } = renderTopbar(false)
    const before = shiftOf(thumb.style.transform)

    dragRight(bar, 150)

    expect(bar.hasAttribute('data-swiping'), '解锁后必须能起手').toBe(true)
    expect(Math.abs(shiftOf(thumb.style.transform) - before), '解锁后滑块必须跟着走').toBeGreaterThanOrEqual(30)
    endDrag(150)
  })
})

/* ------------------------------------------------------------------ *
 * 回归护栏（静态断言源码，防止改回上一轮形态）
 * ------------------------------------------------------------------ */

describe('回归护栏：博客 tab 行不受浮层开合影响（enabled 不得绑 panelOpen）', () => {
  it('BlogPanel 源码中 useTabStripThumb 的 enabled 恒为 true', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/aurora/panels/blog/BlogPanel.tsx'), 'utf8')
    const at = src.indexOf('useTabStripThumb({')
    expect(at).toBeGreaterThan(-1)
    const call = src.slice(at, at + 600)
    // 浮层默认收起（useState(false)）→ 若绑 panelOpen，tab 行会完全滑不动
    expect(call).not.toMatch(/enabled:\s*panelOpen/)
    expect(call).toMatch(/enabled:\s*true/)
  })
})

describe('回归护栏：四面板都不得再引用上一轮（整排跟手）的入口', () => {
  const PANELS = [
    'src/aurora/panels/settings/SettingsPanel.tsx',
    'src/aurora/panels/kb/KbPanel.tsx',
    'src/aurora/panels/blog/BlogPanel.tsx',
    'src/aurora/panels/canvas/CanvasSidebarPanel.tsx',
  ]

  for (const rel of PANELS) {
    it(`${rel}：已迁到 useTabStripThumb，且无 createTabStripMotion / is-swiping 残留`, () => {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(src, `${rel} 未接入 useTabStripThumb`).toMatch(/useTabStripThumb\(/)
      expect(src, `${rel} 仍引用已删除的 createTabStripMotion`).not.toMatch(/createTabStripMotion/)
      expect(src, `${rel} 仍带 is-swiping（内容区应零位移）`).not.toMatch(/is-swiping/)
    })
  }
})

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
  })
})

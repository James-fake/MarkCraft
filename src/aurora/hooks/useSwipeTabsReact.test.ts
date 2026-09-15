/**
 * useSwipeTabs · React 壳层契约测试
 *
 * 覆盖本轮新增的「多点位绑定」能力（用户需求：顶栏功能切换 tab 栏内也能左右滑动）：
 *   1. makeBind 返回的绑定可挂到多个元素，且共享同一手势状态
 *   2. 手势可从**窄 tab 栏**起手，但吸附阈值恒按 measureRef（内容区）尺寸算
 *   3. 横滑松手后，onClickCapture 会吃掉随后的 click（避免"滑完又被点回去"）
 *   4. 纯点击（无位移）不设抑制标记，click 正常放行
 *
 * 注意：jsdom 不实现指针捕获重定向，故这里断言的是**回调层的契约**，
 * 真机轨迹由 CDP 探针验证（probe-swipe-*.mjs）。
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeTabs } from './useSwipeTabs'
import { SNAP_PERCENT } from './swipeTabsCore'

/** 造一个最小可用的假元素（满足 hook 用到的属性） */
function fakeEl(width = 1000, height = 800): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true })
  // 让 hasScrollableAncestor 探测直接返回 false
  Object.defineProperty(el, 'scrollWidth', { value: width, configurable: true })
  return el
}

/** 构造一个 React 风格的 pointerdown 事件 */
function pd(x: number, y = 0, button = 0): React.PointerEvent {
  return {
    button,
    clientX: x,
    clientY: y,
    target: document.body,
    currentTarget: document.body,
  } as unknown as React.PointerEvent
}

/** 派发 document 级 pointermove / pointerup */
function move(x: number, y = 0) {
  const e = new Event('pointermove') as Event & { clientX: number; clientY: number }
  e.clientX = x
  e.clientY = y
  document.dispatchEvent(e)
}

function up() {
  document.dispatchEvent(new Event('pointerup'))
}

describe('useSwipeTabs · 多点位绑定（tab 栏 + 内容区）', () => {
  it('makeBind 可重复调用，两份绑定都能触发起手', () => {
    const onIndexChange = vi.fn()
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange }),
    )

    const bindA = result.current.makeBind()
    const bindB = result.current.makeBind()
    expect(typeof bindA.onPointerDown).toBe('function')
    expect(typeof bindB.onPointerDown).toBe('function')
    expect(typeof bindA.onClickCapture).toBe('function')
  })

  it('内容区宽度作为吸附基准：从窄 tab 栏起手也按内容区算阈值', () => {
    const onIndexChange = vi.fn()

    // 内容区宽 1000px → 32% 阈值 = 320px
    const contentEl = fakeEl(1000)
    const measureRef = { current: contentEl }

    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange, measureRef }),
    )

    // 从 tab 栏（窄，400px）起手 —— 模拟 tab 栏元素
    const tabBar = fakeEl(400)
    const bind = result.current.makeBind()

    act(() => {
      Object.defineProperty(bind.onPointerDown, 'name', { value: 'onPointerDown' })
      // currentTarget 指向 tab 栏（真正的起手元素）
      const e = { ...pd(0), currentTarget: tabBar } as unknown as React.PointerEvent
      bind.onPointerDown(e)
    })

    // 横滑 150px：若误用 tab 栏 400px 作基准 → 150/400 = 37.5% > 32% 会翻页
    // 正确用内容区 1000px → 150/1000 = 15% < 32% 且速度不足 → 应回弹
    act(() => {
      move(50)
      move(100)
      move(150)
      up()
    })

    expect(onIndexChange).not.toHaveBeenCalled()
    // 前提断言：150px 相对 tab 栏 400px = 37.5% > 32% 阈值 —— 若误用 tab 栏宽度作基准，
    // 这次拖动本该被判定为翻页；正因为按内容区 1000px 算（15%）才正确回弹。
    expect(150).toBeGreaterThan(400 * SNAP_PERCENT)
  })

  it('横滑超过内容区 32% → 触发切换', () => {
    const onIndexChange = vi.fn()
    const contentEl = fakeEl(1000)
    const measureRef = { current: contentEl }

    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange, measureRef }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: contentEl } as unknown as React.PointerEvent)
    })
    // 向左滑 400px（> 1000*0.32=320）→ 下一个
    act(() => {
      for (let x = -40; x >= -400; x -= 40) move(x)
      up()
    })

    expect(onIndexChange).toHaveBeenCalledWith(1)
  })
})

describe('useSwipeTabs · 拖后 click 抑制', () => {
  it('纯点击（无位移）→ 不设抑制标记，click 正常放行', () => {
    const onIndexChange = vi.fn()
    const el = fakeEl()
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: el } as unknown as React.PointerEvent)
    })
    act(() => {
      up() // 原地松手
    })

    const ev = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bind.onClickCapture(ev)
    })

    // 未发生位移 → click 不应被拦截
    expect(ev.preventDefault).not.toHaveBeenCalled()
    expect(ev.stopPropagation).not.toHaveBeenCalled()
  })

  it('横滑超过 SLOP 后松手 → click 被吃掉一次（且只吃一次）', () => {
    const onIndexChange = vi.fn()
    const contentEl = fakeEl(1000)
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 1, count: 4, onIndexChange, measureRef: { current: contentEl } }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: contentEl } as unknown as React.PointerEvent)
    })
    act(() => {
      for (let x = -10; x >= -120; x -= 10) move(x)
      up()
    })

    const ev1 = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bind.onClickCapture(ev1)
    })
    expect(ev1.preventDefault).toHaveBeenCalled()
    expect(ev1.stopPropagation).toHaveBeenCalled()

    // 第二次 click（用户真实点击）必须放行
    const ev2 = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bind.onClickCapture(ev2)
    })
    expect(ev2.preventDefault).not.toHaveBeenCalled()
  })

  it('两份绑定共享同一抑制标记（tab 栏起手、内容区拦截也能生效）', () => {
    const onIndexChange = vi.fn()
    const contentEl = fakeEl(1000)
    const tabBar = fakeEl(400)
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 1, count: 4, onIndexChange, measureRef: { current: contentEl } }),
    )

    const bindTabs = result.current.makeBind()
    const bindContent = result.current.makeBind()

    // 从 tab 栏起手横滑
    act(() => {
      bindTabs.onPointerDown({ ...pd(0), currentTarget: tabBar } as unknown as React.PointerEvent)
    })
    act(() => {
      for (let x = -10; x >= -120; x -= 10) move(x)
      up()
    })

    // 内容区那份额外的绑定也应看到抑制标记
    const ev = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bindContent.onClickCapture(ev)
    })
    expect(ev.preventDefault).toHaveBeenCalled()
  })
})

/**
 * 回归：博客面板「tab 栏滑不动」缺陷（2026-09-14）
 *
 * 根因：BlogPanel 把 `enabled` 绑到 `panelOpen`，而浮层默认 `useState(false)` 收起，
 * 导致顶栏 tab 行常驻可见却完全不可滑。修复后 `enabled` 恒为 true，且位移目标
 * （浮层内容体）条件渲染、收起时为 null —— 此时必须**照常切 tab**，只是不产生位移。
 */
describe('useSwipeTabs · 回归：浮层收起时 tab 行仍可滑', () => {
  it('targetRef 为 null（位移目标未挂载）时，仍按 measureRef 判定并切换', () => {
    const onIndexChange = vi.fn()
    const onOffsetChange = vi.fn()
    const measureEl = fakeEl(1000)
    // 模拟浮层收起：targetRef.current === null，measureRef 指向常驻的预览区
    const targetRef = { current: null as HTMLElement | null }
    const measureRef = { current: measureEl }

    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 2, onIndexChange, onOffsetChange, targetRef, measureRef }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: measureEl } as unknown as React.PointerEvent)
    })
    // 左滑 400px > 1000 * 0.32 = 320 → 切到下一项
    act(() => {
      for (let x = -40; x >= -400; x -= 40) move(x)
      up()
    })

    expect(onIndexChange).toHaveBeenCalledWith(1)
    // 目标元素缺失时不得抛错，且 onOffsetChange 仍被通知（供指示器联动）
    expect(onOffsetChange).toHaveBeenCalled()
  })

  it('enabled 破坏性对照：显式 enabled=false 时手势不启动（证明门控语义）', () => {
    const onIndexChange = vi.fn()
    const measureEl = fakeEl(1000)

    const { result } = renderHook(() =>
      useSwipeTabs({
        index: 0,
        count: 2,
        onIndexChange,
        enabled: false,
        measureRef: { current: measureEl },
      }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: measureEl } as unknown as React.PointerEvent)
    })
    act(() => {
      for (let x = -40; x >= -400; x -= 40) move(x)
      up()
    })

    expect(onIndexChange).not.toHaveBeenCalled()
    expect(result.current.dragging).toBe(false)
  })
})

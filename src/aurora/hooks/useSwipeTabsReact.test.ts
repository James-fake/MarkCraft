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

/**
 * 派发 document 级 pointermove。
 *
 * `buttons` 默认 **1（主键按下）** —— 真实拖动轨迹就是如此，而 hook 现在用它区分
 * 「这次按压的延续」与「不按键的悬停划动」（见 useSwipeTabs 方向判定处的准入闸）。
 */
function move(x: number, y = 0, buttons = 1) {
  const e = new Event('pointermove') as Event & { clientX: number; clientY: number; buttons: number }
  e.clientX = x
  e.clientY = y
  e.buttons = buttons
  document.dispatchEvent(e)
}

/** 不按键的悬停平移（buttons=0）：真实鼠标从一格划到另一格时的形状 */
function hover(x: number, y = 0) {
  move(x, y, 0)
}

function up() {
  document.dispatchEvent(new Event('pointerup'))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

  it('内容区宽度作为吸附基准：从窄 tab 栏起手也按内容区算阈值', async () => {
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

    // 向右**慢速**拖 150px（每步间隔 300ms → 末段速度 ≈ 0.17 px/ms < 0.3），
    // 使判定只能走「位移比例」路径（甩掷路径必须不参与，否则测不到阈值来源）：
    // 若误用 tab 栏 400px 作基准 → 150/400 = 37.5% > 32% 会翻页；
    // 正确用内容区 1000px → 150/1000 = 15% < 32% 且速度不足 → 应回弹。
    await act(async () => {
      for (const x of [50, 100, 150]) {
        move(x)
        await sleep(300)
      }
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
    // 向右滑 400px（> 1000*0.32=320）→ 下一个（位移方向即目标方向）
    act(() => {
      for (let x = 40; x <= 400; x += 40) move(x)
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
 * 回归：知识库「首次点『笔记』Tab 停在概览，再点一次才进」（2026-09-22 第七轮报障）
 *
 * 根因：`endGesture` 曾用「有没有位移」判定要不要吃掉紧随的 click
 * （`Math.abs(offset) > DIRECTION_SLOP`）。真实鼠标点击天然带几像素漂移，
 * 而 `DIRECTION_SLOP = 8` 很低 ⇒「按下 → 漂移十几 px → 松开」会被当成横滑手势
 * 并进入跟手，但落点仍离起手 tab 最近 ⇒ `decision.passed === false`（**没换 tab**）。
 * 旧判据照样置抑制标 ⇒ 那一下 click 被吞 ⇒ `onClick` 从未执行。
 *
 * 正确判据只能是「**这次手势真的换了 tab**」：没换 tab 时，那次 click 就是用户的
 * 真实点击（它落在起手 tab 上，切过去正是用户所要的）⇒ 必须放行。
 */
describe('useSwipeTabs · 回归：漂移点击不得被吞', () => {
  it('带漂移（>SLOP）但未换 tab 的点击 → 不吃 click，放行给 onClick', () => {
    const onIndexChange = vi.fn()
    const measureEl = fakeEl(1000)
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange, measureRef: { current: measureEl } }),
    )

    const bind = result.current.makeBind()
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: measureEl } as unknown as React.PointerEvent)
    })
    // 漂移 12px > DIRECTION_SLOP(8) → 会被识别为横滑手势（缺陷前提）
    act(() => {
      move(6)
      move(12)
    })
    // 前提断言：手势**确实启动了跟手**（若非如此，本用例就测不到那个缺陷）
    expect(result.current.dragging).toBe(true)

    act(() => {
      up()
    })

    // 落点 12px 远不足以换 tab（阈值 1000×0.32 = 320px，甩掷也够不到 20px 底线）
    expect(onIndexChange).not.toHaveBeenCalled()

    // 那次 click 就是用户的真实点击 → 必须放行
    const ev = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bind.onClickCapture(ev)
    })
    expect(ev.preventDefault).not.toHaveBeenCalled()
    expect(ev.stopPropagation).not.toHaveBeenCalled()
  })

  it('上一次 click 未送达本容器 → 陈旧抑制标被下一次 pointerdown 清零', () => {
    const onIndexChange = vi.fn()
    const contentEl = fakeEl(1000)
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 1, count: 4, onIndexChange, measureRef: { current: contentEl } }),
    )

    const bind = result.current.makeBind()
    // 一次真换 tab 的横滑 → 置抑制标
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: contentEl } as unknown as React.PointerEvent)
    })
    act(() => {
      for (let x = -10; x >= -120; x -= 10) move(x)
      up()
    })
    expect(onIndexChange).toHaveBeenCalled()

    // 假设那次 click 落在栏外（本容器收不到）→ 标记残留。
    // 用户下一次真实点击：pointerdown 必须先把它清零，否则会被陈旧标记吃掉。
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: contentEl } as unknown as React.PointerEvent)
    })
    act(() => {
      up() // 原地松手，无位移
    })

    const ev = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
    act(() => {
      bind.onClickCapture(ev)
    })
    expect(ev.preventDefault).not.toHaveBeenCalled()
    expect(ev.stopPropagation).not.toHaveBeenCalled()
  })
})

/**
 * 回归：同区域的**第二个**缺陷（2026-09-22 真机 trace 定案）
 *
 * 一次**从未激活**的「抖动点击」（按下 → 位移 ≤ SLOP → 松手）会在 `gestureRef`
 * 里留下「起手点 + 未定轴向」；此后**任何一次不按键的悬停移动**都会被当成那次
 * 按压的延续 ⇒ 用陈旧的 `startX` 算出巨大 `dx` ⇒ 凭空激活手势、滑块乱跳、
 * 松手按错误落点换 tab，并把用户那一下真实点击吞掉。
 *
 * 实测 trace（知识库 tab 栏，悬停划动 71px）：
 *   down x=436(抖动点击) → click 放行 → act startX=436 dx=71 ← 悬停竟激活
 *   → down x=507 却 DOWN-ABORT-active（起点没刷新）→ end offset=83 → 换到了错误的 tab
 */
describe('useSwipeTabs · 回归：非激活按压后的悬停不得激活手势', () => {
  it('抖动点击（从未激活）之后，不按键的悬停横移不得激活手势、不得换 tab', () => {
    const onIndexChange = vi.fn()
    const measureEl = fakeEl(1000)
    const { result } = renderHook(() =>
      useSwipeTabs({ index: 0, count: 4, onIndexChange, measureRef: { current: measureEl } }),
    )

    const bind = result.current.makeBind()
    // ① 一次抖动点击：按下 → 位移 2px（≤ SLOP=8，从未激活）→ 松手
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: measureEl } as unknown as React.PointerEvent)
    })
    act(() => {
      move(2)
      up()
    })
    expect(onIndexChange).not.toHaveBeenCalled()
    expect(result.current.dragging).toBe(false)

    // ② 之后**不按键**横移 400px（模拟把鼠标从概览划向右侧）
    act(() => {
      hover(400)
    })
    // 旧实现：陈旧 startX=0 ⇒ dx=400 ⇒ 凭空激活 ⇒ dragging=true
    expect(result.current.dragging).toBe(false)

    act(() => {
      up()
    })
    // 旧实现：offset=400 > 1000×32% ⇒ 判定换 tab
    expect(onIndexChange).not.toHaveBeenCalled()

    // ③ 对照：真正**按住**横移仍必须照常生效（防修过头）
    act(() => {
      bind.onPointerDown({ ...pd(0), currentTarget: measureEl } as unknown as React.PointerEvent)
    })
    act(() => {
      for (let x = 40; x <= 400; x += 40) move(x)
      up()
    })
    expect(onIndexChange).toHaveBeenCalledWith(1)
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
    // 右滑 400px > 1000 * 0.32 = 320 → 切到下一项（位移方向即目标方向）
    act(() => {
      for (let x = 40; x <= 400; x += 40) move(x)
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

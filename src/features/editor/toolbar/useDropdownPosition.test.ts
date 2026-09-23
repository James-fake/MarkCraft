import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useDropdownPosition from './useDropdownPosition'

/**
 * `useDropdownPosition` 的几何回归锁。
 *
 * 需求（2026-09-24）：高亮 / 下划线两个**调色板**要「水平居中于按钮、挂在正下方」。
 * 这里锁的不是魔法数字，而是**性质**：
 *   · `align:'center'` ⇒ 面板水平中线 === 锚点水平中线（夹取到视口内的场景除外）
 *   · 面板整体落在视口内且不压住锚点
 *   · `align:'left'`（默认）⇒ **逐像素保持历史行为**（另两个下拉：标题 / 列表在用）
 *
 * 🚨 jsdom 不做布局：`getBoundingClientRect()` 恒返回全 0、`offsetWidth/Height` 恒 0
 * ⇒ 必须打桩，否则「居中了」的断言其实是在验 0 === 0。
 */

const VW = 1440
const VH = 900
/** 调色板实测尺寸：8 列 × 20px + 7 间隙 × 7px + 内边距 16px = 225；高 = 分区行 + 2 行色块。 */
const PANEL_W = 225
const PANEL_H = 98
/** 展开后的 split button（主按钮 28 + 箭头 12 − 叠边 3） */
const ANCHOR = { left: 504, top: 83, width: 37, height: 28 }

interface Rect { left: number; top: number; width: number; height: number }

function stubRect(el: HTMLElement, r: Rect) {
  el.getBoundingClientRect = (() => ({
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    right: r.left + r.width,
    bottom: r.top + r.height,
    x: r.left,
    y: r.top,
    toJSON: () => ({}),
  })) as () => DOMRect
}

function stubSize(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, 'offsetWidth', { value: w, configurable: true })
  Object.defineProperty(el, 'offsetHeight', { value: h, configurable: true })
}

function setViewport(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true })
}

/**
 * 造一对锚点/面板元素与**稳定**的 ref 对象。
 *
 * ⚠️ ref 必须是同一个对象跨渲染复用（`useRef` 的真实形态）：内联 `{ current: el }` 会让
 * effect 依赖每轮都变，正是下面「自激」用例专门验证的场景。
 */
function makePair(anchorRect: Rect = ANCHOR, panelW = PANEL_W, panelH = PANEL_H) {
  const anchor = document.createElement('div')
  const panel = document.createElement('div')
  document.body.append(anchor, panel)
  stubRect(anchor, anchorRect)
  stubRect(panel, { left: 0, top: 0, width: panelW, height: panelH })
  stubSize(panel, panelW, panelH)
  return { anchor, panel, btnRef: { current: anchor }, panelRef: { current: panel } }
}

afterEach(() => {
  document.body.innerHTML = ''
  setViewport(VW, VH)
})

describe('useDropdownPosition · 默认 align:left（标题 / 列表下拉的历史行为，不得改变）', () => {
  it('面板左边缘对齐锚点左边缘，垂直贴在锚点下方 gap=4', () => {
    setViewport(VW, VH)
    const { btnRef } = makePair()

    const { result } = renderHook(() => useDropdownPosition(true, btnRef))

    expect(result.current.left).toBe(ANCHOR.left)
    expect(result.current.top).toBe(ANCHOR.top + ANCHOR.height + 4)
  })

  it('未给 panelRef ⇒ 用估算宽度 180（右对齐判断也基于它，行为与改动前一致）', () => {
    setViewport(VW, VH)
    const { btnRef } = makePair({ left: 1400, top: 83, width: 37, height: 28 })

    const { result } = renderHook(() => useDropdownPosition(true, btnRef))

    // right - EST_WIDTH = 1437 - 180 = 1257
    expect(result.current.left).toBe(1257)
  })

  it('关闭时不定位（返回 0,0）', () => {
    const { btnRef } = makePair()
    const { result } = renderHook(() => useDropdownPosition(false, btnRef))
    expect(result.current).toEqual({ top: 0, left: 0 })
  })
})

describe('useDropdownPosition · align:center（高亮 / 下划线调色板）', () => {
  it('🚨 面板水平中线 === 锚点水平中线（这就是「居中在按钮正下方」）', () => {
    setViewport(VW, VH)
    const { btnRef, panelRef } = makePair()

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    const anchorCenter = ANCHOR.left + ANCHOR.width / 2 // 522.5
    const panelCenter = result.current.left + PANEL_W / 2
    expect(Math.abs(panelCenter - anchorCenter)).toBeLessThan(0.01)
    // 具体落点：522.5 - 112.5 = 410
    expect(result.current.left).toBe(410)
  })

  it('面板整体在锚点下方（不压住按钮），间距 = gap', () => {
    setViewport(VW, VH)
    const { btnRef, panelRef } = makePair()

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    expect(result.current.top).toBe(ANCHOR.top + ANCHOR.height + 4)
    expect(result.current.top).toBeGreaterThanOrEqual(ANCHOR.top + ANCHOR.height)
  })

  it('🚨 用**分数**宽度居中：offsetWidth 的取整会留下 ~0.17px 残差', () => {
    setViewport(VW, VH)
    const anchor = document.createElement('div')
    const panel = document.createElement('div')
    document.body.append(anchor, panel)
    stubRect(anchor, ANCHOR)
    // 真机面板实测宽 226.33（含边框），而 offsetWidth 会取整成 226
    stubRect(panel, { left: 0, top: 0, width: 226.3333, height: 93.3333 })
    stubSize(panel, 226, 93)

    const { result } = renderHook(() =>
      useDropdownPosition(true, { current: anchor }, { align: 'center', panelRef: { current: panel } }),
    )

    const anchorCx = ANCHOR.left + ANCHOR.width / 2
    expect(Math.abs(result.current.left + 226.3333 / 2 - anchorCx)).toBeLessThan(0.01)
  })

  it('🚨 不给 panelRef 会用估算宽度 180 ⇒ 整体左偏 22.5px（故面板 ref 是必需的）', () => {
    setViewport(VW, VH)
    const { btnRef } = makePair()

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center' }))

    // 522.5 - 180/2 = 432.5，与实测宽度下的 410 相差 22.5
    expect(result.current.left).toBe(432.5)
    expect(result.current.left).not.toBe(410)
  })

  it('锚点贴近右边缘 ⇒ 夹进视口，面板右边缘不越界', () => {
    setViewport(VW, VH)
    // 居中本应 1418.5 - 112.5 = 1306，但视口只容到 1440-225-8 = 1207
    const { btnRef, panelRef } = makePair({ left: 1400, top: 83, width: 37, height: 28 })

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    expect(result.current.left).toBe(VW - PANEL_W - 8)
    expect(result.current.left + PANEL_W).toBeLessThanOrEqual(VW)
  })

  it('锚点贴近左边缘 ⇒ 夹到视口留白 8px，而不是负坐标', () => {
    setViewport(VW, VH)
    const { btnRef, panelRef } = makePair({ left: 0, top: 83, width: 37, height: 28 })

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    expect(result.current.left).toBe(8)
  })

  it('下方空间不足但上方够 ⇒ 翻到锚点上方（面板整体不压住锚点）', () => {
    setViewport(VW, 200)
    // 锚点 150..178：下方 182+98=280 越界 → 上方 150-98-4=48，能完整放下
    const { btnRef, panelRef } = makePair({ left: 504, top: 150, width: 37, height: 28 })

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    expect(result.current.top).toBe(150 - PANEL_H - 4)
    expect(result.current.top + PANEL_H).toBeLessThanOrEqual(150)
  })

  it('上下都放不下 ⇒ 夹到视口留白 8px，不产生负坐标（宁可重叠也不越界）', () => {
    setViewport(VW, 200)
    const { btnRef, panelRef } = makePair()

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    // 83 - 98 - 4 = -19 → 夹到 8
    expect(result.current.top).toBe(8)
    expect(result.current.top).toBeGreaterThanOrEqual(0)
  })

  it('窄视口（面板比可用宽度还宽）时不产生负坐标', () => {
    setViewport(240, VH)
    const { btnRef, panelRef } = makePair({ left: 100, top: 83, width: 37, height: 28 })

    const { result } = renderHook(() => useDropdownPosition(true, btnRef, { align: 'center', panelRef }))

    expect(result.current.left).toBe(8)
  })

  it('🚨 即使调用方每轮都传**新的** ref 对象，也不自激成死循环（值相等则跳过回写）', () => {
    setViewport(VW, VH)
    const anchor = document.createElement('div')
    const panel = document.createElement('div')
    document.body.append(anchor, panel)
    stubRect(anchor, ANCHOR)
    stubRect(panel, { left: 0, top: 0, width: PANEL_W, height: PANEL_H })
    stubSize(panel, PANEL_W, PANEL_H)

    const { result } = renderHook(() =>
      // 内联 ref：每次渲染都是新对象（旧实现会在此抛「Maximum update depth exceeded」）
      useDropdownPosition(true, { current: anchor }, { align: 'center', panelRef: { current: panel } }),
    )

    expect(result.current.left).toBe(410)
  })
})

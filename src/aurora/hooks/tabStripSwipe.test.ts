/**
 * tabStripSwipe · 「分段控件滑块」纯逻辑层单测（需求 N 第四轮）
 * ---------------------------------------------------------------------------
 * 形态定案（经 AskUserQuestion 与用户确认）：**Apple 分段控件（Segmented Control）**
 *   - 一条**常驻滑块**盖在选中项上；
 *   - 按住 tab 拖动 → **只有滑块**跟手滑，tab 文字一个像素都不动；
 *   - 松手 → 滑块滑到最近的 tab（拖过一半就切）；
 *   - 内容区零位移、栏不滚动。
 *
 * 与第三轮（整排轨道跟手）的本质区别：位移承载者从「整排轨道」换成「一条独立滑块」，
 * 所以滑块位置 = **基准定位**（随选中项变化，量 tab 几何）+ **手势位移**（跟手），
 * 两者必须合成到**同一个 transform**（否则松手瞬间「基准跳变 + 位移清零」会被拆成两段动画）。
 *
 * 本文件锁死四条「所见即所得」不变量：
 *   1. 位移：一个槽距内**严格 1:1**（用户按住的滑块必须跟着手指走），越界才阻尼；
 *   2. 阈值：**半个「该方向的真实中心距」**（拖过一半就切），与看得见的位移一致；
 *   3. 宽度：滑块宽度恒等于**当前所压那个 tab** 的宽度（tab 宽窄不一时不能塌）；
 *   4. 落位：松手/点击/首帧/resize 三种时机各自的动画策略（带过渡 / 瞬时）。
 */
import { describe, it, expect } from 'vitest'
import type React from 'react'
import {
  FALLBACK_SLOT,
  TAB_SELECTOR,
  createTabStripThumb,
  measureTabBox,
  measureTabCenters,
  tabElements,
} from './tabStripSwipe'
import { STRIP_MAX_RATIO, averageSlot, decideSnap, mapStripOffset } from './swipeTabsCore'

/* ------------------------------------------------------------------ *
 * mapStripOffset · 滑块跟手位移映射（核心公式）
 * ------------------------------------------------------------------ */

describe('mapStripOffset · 滑块跟手位移（1:1 跟手 + 越界橡胶）', () => {
  const LIMIT = 75

  it('槽距（一个 limit）内严格 1:1 —— 所见即所得，这是主反馈的全部意义', () => {
    expect(mapStripOffset(0, LIMIT)).toBe(0)
    expect(mapStripOffset(10, LIMIT)).toBe(10)
    expect(mapStripOffset(-30, LIMIT)).toBe(-30)
    expect(mapStripOffset(LIMIT, LIMIT)).toBe(LIMIT)
    expect(mapStripOffset(-LIMIT, LIMIT)).toBe(-LIMIT)
  })

  it('越界后阻尼（0.18 增益），而非硬停 —— 让「拖不动了」可被手掌感知', () => {
    // 150px 拖拽、槽距 75 → 75 + 75 × 0.18 = 88.5
    expect(mapStripOffset(150, LIMIT)).toBeCloseTo(88.5, 5)
    expect(mapStripOffset(-150, LIMIT)).toBeCloseTo(-88.5, 5)
  })

  it('硬顶 limit × 1.25 —— 滑块不得被拖出凹槽太远（出框会压到别处/漏白）', () => {
    const cap = LIMIT * STRIP_MAX_RATIO
    expect(mapStripOffset(100000, LIMIT)).toBeCloseTo(cap, 5)
    expect(mapStripOffset(-100000, LIMIT)).toBeCloseTo(-cap, 5)
  })

  it('保号：位移方向与手势方向一致（不吞符号，否则左右拖同向）', () => {
    expect(mapStripOffset(-500, LIMIT)).toBeLessThan(0)
    expect(mapStripOffset(500, LIMIT)).toBeGreaterThan(0)
  })

  it('量不到几何（limit ≤ 0）时原样返回，不做假动作', () => {
    expect(mapStripOffset(150, 0)).toBe(150)
    expect(mapStripOffset(-150, -1)).toBe(-150)
  })
})

/* ------------------------------------------------------------------ *
 * averageSlot · 槽距量取
 * ------------------------------------------------------------------ */

describe('averageSlot · 平均槽距', () => {
  it('首末中心距 /（n-1）—— 用平均而非逐对相邻距，避免反向拖动时限幅突跳', () => {
    expect(averageSlot([439, 511, 583])).toBe(72)
    // 方块宽不等（70/82）时，平均来自首末，与方向无关
    expect(averageSlot([0, 72, 156, 228])).toBeCloseTo(76, 5)
  })

  it('tab 少于 2 个 → 返回 fallback（量不出槽距）', () => {
    expect(averageSlot([], 72)).toBe(72)
    expect(averageSlot([100], 72)).toBe(72)
  })

  it('几何退化（跨度 0 或负）→ 返回 fallback，不返回 0 免得下游除零', () => {
    expect(averageSlot([50, 50, 50], 72)).toBe(72)
    expect(averageSlot([50, 40], 72)).toBe(72)
  })
})

/* ------------------------------------------------------------------ *
 * decideSnap · 阈值覆盖
 * ------------------------------------------------------------------ */

describe('decideSnap · thresholdPx 覆盖（半个槽距）', () => {
  const base = { elapsed: 1000, size: 1358, index: 1, count: 5, endVelocity: 0 }

  it('给 thresholdPx 时按它判，不再看 size × 32%', () => {
    // 拖 40px：size × 32% = 434px 判不过，但半个槽距（37.5px）应判过
    expect(decideSnap({ ...base, offset: -40 }).passed).toBe(false)
    expect(decideSnap({ ...base, offset: -40, thresholdPx: 37.5 }).passed).toBe(true)
    expect(decideSnap({ ...base, offset: -40, thresholdPx: 37.5 }).targetIndex).toBe(2)
  })

  it('未达阈值仍不切换（避免误触/手抖翻页）', () => {
    expect(decideSnap({ ...base, offset: -20, thresholdPx: 37.5 }).passed).toBe(false)
  })

  it('边界方向护栏仍生效（首 tab 往右、末 tab 往左都不通过）', () => {
    expect(decideSnap({ ...base, index: 0, offset: 60, thresholdPx: 37.5 }).passed).toBe(false)
    expect(decideSnap({ ...base, index: 4, offset: -60, thresholdPx: 37.5 }).passed).toBe(false)
  })
})

/* ------------------------------------------------------------------ *
 * DOM 量取（用真 DOM 元素 + 打桩 getBoundingClientRect）
 * ------------------------------------------------------------------ */

const rect = (left: number, width: number) =>
  ({ left, top: 0, right: left + width, bottom: 0, width, height: 0, x: left, y: 0, toJSON: () => ({}) }) as DOMRect

/**
 * 造「轨道 + N 个 tab + 滑块」的最小 DOM。
 *
 * 用真 `document.createElement`（而非纯对象）—— 因为量取走的是
 * `track.querySelectorAll('[role="tab"]')`，必须验证「滑块不会被当成 tab 量进去」。
 */
function makeTrack(boxes: Array<[number, number]>, trackLeft = 0) {
  const track = document.createElement('div')
  const thumb = document.createElement('span')
  thumb.setAttribute('aria-hidden', 'true')
  track.appendChild(thumb)

  const tabs = boxes.map(([left, width]) => {
    const el = document.createElement('button')
    el.setAttribute('role', 'tab')
    el.getBoundingClientRect = () => rect(trackLeft + left, width)
    track.appendChild(el)
    return el
  })
  track.getBoundingClientRect = () => rect(trackLeft, 0)
  return { track, thumb, tabs }
}

const ref = <T,>(v: T | null) => ({ current: v } as React.RefObject<T>)

const num = (transform: string) => {
  const m = /translate3d\((-?[\d.]+)px/.exec(transform || '')
  return m ? Number(m[1]) : 0
}

describe('measureTabBox / measureTabCenters · 轨道 padding box 坐标系', () => {
  it('返回 tab 的 x 与宽，坐标原点与轨道对齐（滑块 left:0 才能直接对上）', () => {
    const { track } = makeTrack([[0, 70], [72, 70], [144, 82]])
    expect(measureTabBox(track, 1)).toEqual({ x: 72, w: 70 })
    expect(measureTabBox(track, 2)).toEqual({ x: 144, w: 82 })
  })

  it('轨道整体偏移不影响结果（差值抵消常量）—— 跟手期间无需先清位移再量', () => {
    const { track } = makeTrack([[0, 70], [72, 70]], 404)
    expect(measureTabBox(track, 1)).toEqual({ x: 72, w: 70 })
    expect(measureTabCenters(track)).toEqual([35, 107])
  })

  it('滑块（aria-hidden，无 role）不会被当成 tab 量进去', () => {
    const { track } = makeTrack([[0, 70], [72, 70], [144, 70]])
    expect(tabElements(track, TAB_SELECTOR)).toHaveLength(3)
    expect(measureTabCenters(track)).toEqual([35, 107, 179])
  })

  it('越界 / 轨道为 null → null 与空数组（下游退回 fallback，不抛错）', () => {
    const { track } = makeTrack([[0, 70]])
    expect(measureTabBox(track, 5)).toBeNull()
    expect(measureTabBox(null, 0)).toBeNull()
    expect(measureTabCenters(null)).toEqual([])
  })
})

/* ------------------------------------------------------------------ *
 * createTabStripThumb · 组装（位移 / 宽度 / 阈值 / 落位）
 * ------------------------------------------------------------------ */

function fixture(boxes: Array<[number, number]> = [[0, 70], [72, 82], [156, 70]], index = 0) {
  const { track, thumb, tabs } = makeTrack(boxes)
  let cur = index
  return {
    track,
    thumb,
    tabs,
    getIndex: () => cur,
    setIndex: (i: number) => { cur = i },
    make: () => createTabStripThumb({
      trackRef: ref(track),
      thumbRef: ref(thumb),
      getIndex: () => cur,
    }),
  }
}

describe('createTabStripThumb · 滑块跟手（所见即所得）', () => {
  it('首次位移量基准：宽度 = 当前 tab 宽，位置 = 基准 + 1:1 位移', () => {
    const f = fixture()
    f.make().handleOffset(-40)
    expect(f.thumb.style.width).toBe('70px')
    expect(f.thumb.style.transition).toBe('none')   // 跟手期间必须零过渡
    expect(num(f.thumb.style.transform)).toBe(-40)  // base.x = 0 + (-40)
  })

  it('一次手势内只量一次几何（不在每帧 getBoundingClientRect → 不触发同步布局）', () => {
    const f = fixture()
    let measureCount = 0
    for (const t of f.tabs) {
      const orig = t.getBoundingClientRect
      t.getBoundingClientRect = () => { measureCount++; return orig.call(t) }
    }
    const m = f.make()
    for (let i = 1; i <= 30; i++) m.handleOffset(-i * 5)
    // 基准盒 1 次 + 中心位 1 批（每个 tab 各 1 次），此后全程缓存
    expect(measureCount).toBe(f.tabs.length + 1)
  })

  it('越界橡胶：拖 150px 时位移 = 一个槽距 + 阻尼（不是硬停，也不是无限跟）', () => {
    const f = fixture()   // 中心 35 / 113 → 槽距 78
    f.make().handleOffset(-150)
    expect(num(f.thumb.style.transform)).toBeCloseTo(-(78 + (150 - 78) * 0.18), 5)
  })

  it('起点不在 0 时位移带基准（滑块压在哪个 tab 上就从哪个 tab 起滑）', () => {
    const f = fixture([[0, 70], [72, 82], [156, 70]], 1)
    f.make().handleOffset(-30)
    expect(f.thumb.style.width).toBe('82px')       // 宽度取起始 tab
    expect(num(f.thumb.style.transform)).toBe(72 - 30)
  })

  it('snapThresholdPx = 该方向真实中心距的一半（拖过一半就切）', () => {
    const f = fixture([[0, 70], [72, 70], [144, 70]], 0)   // 中心 35 / 107 / 179 → 每格 72
    const m = f.make()
    m.handleOffset(-40)
    expect(m.snapThresholdPx()).toBe(36)
  })

  it('阈值按**方向**取相邻格，而不是平均槽距（方块不等宽时两者不同）', () => {
    // 中心 35 / 113 / 179 / 251 → 前向格 66、后向格 78、均值 72
    const f = fixture([[0, 70], [72, 82], [138, 82], [210, 82]], 1)
    const m = f.make()

    m.handleOffset(-40)                       // 向左 = 下一个（中心距 66）
    expect(m.snapThresholdPx()).toBe(33)

    m.handleOffset(40)                        // 向右 = 上一个（中心距 78）
    expect(m.snapThresholdPx()).toBe(39)
  })

  it('边界方向无相邻 tab → 退回平均槽距（越界仍有可感的橡胶阻尼）', () => {
    const f = fixture([[0, 70], [72, 70], [144, 70]], 2)   // 末位
    const m = f.make()
    m.handleOffset(-40)
    expect(m.snapThresholdPx()).toBe(36)      // 平均槽距 72 的一半
  })
})

describe('createTabStripThumb · 落位（三种时机各自的动画策略）', () => {
  it('place(index, true)：清空内联过渡交回 CSS（点击 / 松手吸附要看得见滑动）', () => {
    const f = fixture()
    f.make().place(2, true)
    expect(f.thumb.style.transition).toBe('')
    expect(f.thumb.style.width).toBe('70px')
    expect(num(f.thumb.style.transform)).toBe(156)
  })

  it('place(index, false)：瞬时落位，且**不得留下内联 transition:none 残留**', () => {
    const f = fixture()
    f.make().place(1, false)
    // 残留的 none 会一直压着 CSS 过渡 → 之后点击/松手落位全变瞬移（真机踩到过）
    expect(f.thumb.style.transition, '内联 transition:none 残留').toBe('')
    expect(f.thumb.style.width).toBe('82px')
    expect(num(f.thumb.style.transform)).toBe(72)
  })

  it('place 清掉基准缓存：下一次手势按**当前**索引重新量（换组/切 tab 后不沿用旧滑块位）', () => {
    const f = fixture()
    const m = f.make()
    m.handleOffset(-40)          // 缓存 base@index0
    f.setIndex(1)
    m.place(1, false)
    m.handleOffset(-10)          // 必须按 index1 重新量（x = 72）
    expect(num(f.thumb.style.transform)).toBe(62)
  })

  it('滑块未挂载 / 轨道缺失时不抛错（浮层收起、首帧），阈值退回兜底', () => {
    const m = createTabStripThumb({ trackRef: ref(null), thumbRef: ref(null), getIndex: () => 0 })
    expect(() => { m.handleOffset(30); m.place(0, true) }).not.toThrow()
    expect(m.snapThresholdPx()).toBe(FALLBACK_SLOT / 2)
  })
})

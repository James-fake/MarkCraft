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
 *   1. 位移：落点在**轨道内**严格 1:1（连续滑动 —— 跨几格都跟手），拖出两端才阻尼；
 *   2. 吸附：**落点最近的中心位即目标**（可一次跨多格），甩掷时至少推进一格；
 *   3. 宽度：滑块宽度恒等于**起手那个 tab** 的宽度（tab 宽窄不一时不能塌）；
 *   4. 落位：松手/点击/首帧/resize 三种时机各自的动画策略（带过渡 / 瞬时）。
 *
 * 第六轮（用户原话：「可以直接从概况，直接滑动到最后一个导出，就不需要
 * 一个一个滑动过去」）把第 1、2 条从「单步」放开成「连续」——
 * 旧的「一格限幅 + ±1 单步」物理上拖不到后面的 tab。
 */
import { describe, it, expect } from 'vitest'
import type React from 'react'
import {
  TAB_SELECTOR,
  createTabStripThumb,
  measureTabBox,
  measureTabCenters,
  tabElements,
} from './tabStripSwipe'
import {
  DIRECTION_SLOP,
  FLICK_MIN_DISTANCE,
  FLICK_VELOCITY,
  OVERSCROLL_MAX,
  decideSnap,
} from './swipeTabsCore'

/* ------------------------------------------------------------------ *
 * decideSnap · 通用层默认策略（单步 ±1）
 *
 * ⚠️ 这里测的是 `swipeTabsCore` 的**默认**吸附判定，服务于内容区翻页路径。
 * strip（分段控件滑块）路径已在第六轮改用 `createTabStripThumb.decideSnap`
 * ——「落点最近中心位即目标」，可一次跨多格（见本文件下半部分）。
 * ------------------------------------------------------------------ */

describe('decideSnap · thresholdPx 覆盖（半个槽距）', () => {
  const base = { elapsed: 1000, size: 1358, index: 1, count: 5, endVelocity: 0 }

  it('给 thresholdPx 时按它判，不再看 size × 32%', () => {
    // 拖 40px：size × 32% = 434px 判不过，但半个槽距（37.5px）应判过
    expect(decideSnap({ ...base, offset: -40 }).passed).toBe(false)
    expect(decideSnap({ ...base, offset: -40, thresholdPx: 37.5 }).passed).toBe(true)
    // 向左滑 = 上一个方向 → 目标 index - 1（**方向与位移同号**，滑块跟手到哪就选中哪）
    expect(decideSnap({ ...base, offset: -40, thresholdPx: 37.5 }).targetIndex).toBe(0)
  })

  it('未达阈值仍不切换（避免误触/手抖翻页）', () => {
    expect(decideSnap({ ...base, offset: -20, thresholdPx: 37.5 }).passed).toBe(false)
  })

  it('边界方向护栏仍生效（首 tab 往左、末 tab 往右都不通过）', () => {
    expect(decideSnap({ ...base, index: 0, offset: -60, thresholdPx: 37.5 }).passed).toBe(false)
    expect(decideSnap({ ...base, index: 4, offset: 60, thresholdPx: 37.5 }).passed).toBe(false)
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
    f.make().handleOffset(40)                       // 落点仍在轨道内 → 严格 1:1
    expect(f.thumb.style.width).toBe('70px')
    expect(f.thumb.style.transition).toBe('none')   // 跟手期间必须零过渡
    expect(num(f.thumb.style.transform)).toBe(40)   // base.x = 0 + 40
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

  it('轨道内跟手 1:1 —— 跨格不打折（连续滑动核心；旧「一格限幅」在第二格起就几乎不动）', () => {
    const f = fixture()   // 中心 35 / 113 / 191（末中心 191）
    const m = f.make()
    m.handleOffset(150)   // 落点 185 < 191 → 仍在轨道内
    expect(num(f.thumb.style.transform)).toBe(150)
  })

  it('一路拖到末格中心仍 1:1（位移恰好等于首末中心距）', () => {
    const f = fixture()
    f.make().handleOffset(156)      // 35 + 156 = 191 = 末中心
    expect(num(f.thumb.style.transform)).toBe(156)
  })

  it('拖出轨道端点才阻尼，且增量封顶 OVERSCROLL_MAX（不会一路拖出轨道）', () => {
    const f = fixture()   // 首格 base.x=0；末格 base.x=156
    const m = f.make()
    m.handleOffset(-150)                       // 落点 -115 < 首中心 35 → 越界
    expect(num(f.thumb.style.transform)).toBeCloseTo(-OVERSCROLL_MAX, 5)

    f.setIndex(2)
    m.place(2, false)
    m.handleOffset(100)                        // 末格向右 → 越界
    expect(num(f.thumb.style.transform)).toBeCloseTo(156 + OVERSCROLL_MAX, 5)
  })

  it('起点不在 0 时位移带基准（滑块压在哪个 tab 上就从哪个 tab 起滑）', () => {
    const f = fixture([[0, 70], [72, 82], [156, 70]], 1)
    f.make().handleOffset(-30)
    expect(f.thumb.style.width).toBe('82px')       // 宽度取起始 tab
    expect(num(f.thumb.style.transform)).toBe(72 - 30)
  })

  it('跟手期间宽度恒取**起手那个 tab**（跨格拖动中不换宽 → 不抖动）', () => {
    const f = fixture([[0, 70], [72, 82], [156, 70]], 0)
    const m = f.make()
    m.handleOffset(140)                            // 已跨到第二格之上
    expect(f.thumb.style.width).toBe('70px')
  })
})

/* ------------------------------------------------------------------ *
 * createTabStripThumb · 松手吸附（落点最近中心位，可跨多格）
 * ------------------------------------------------------------------ */

describe('createTabStripThumb · 连续滑动吸附（需求 N 第六轮）', () => {
  /** 三格轨道：中心 35 / 113 / 191 */
  const input = (m: ReturnType<typeof createTabStripThumb>, offset: number, extra: Partial<{
    index: number; count: number; endVelocity: number
  }> = {}) => m.decideSnap({
    offset,
    elapsed: 500,
    size: 1358,
    index: 0,
    count: 3,
    endVelocity: 0,
    ...extra,
  })

  it('**一次跨多格**：从第一格拖到第三格 → 目标直接是 2（不再一格一格挪）', () => {
    const f = fixture()
    const m = f.make()
    const r = input(m, 150)          // 落点 185 → 最近中心 191 = index 2
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(2)
  })

  it('拖过一半才切：40px（半格 39）→ 切；30px → 回弹', () => {
    const f = fixture()
    const m = f.make()
    expect(input(m, 40).targetIndex).toBe(1)       // 落点 75，距 113 更近
    expect(input(m, 30).passed).toBe(false)        // 落点 65，距 35 更近
  })

  it('拖到轨道外仍夹在两端（首格往左、末格往右都不通过）', () => {
    const f = fixture()
    const m = f.make()
    expect(input(m, -100).passed).toBe(false)                       // 首格往左
    expect(input(m, -100).targetIndex).toBe(0)
    expect(input(m, 10000).targetIndex).toBe(2)                     // 末格（夹住）
    expect(input(m, 10000, { index: 2 }).passed).toBe(false)        // 已在末格 → 不切换
  })

  it('位移低于方向阈值 → 不切换（手抖不翻页）', () => {
    const f = fixture()
    const m = f.make()
    expect(input(m, DIRECTION_SLOP - 1).passed).toBe(false)
  })

  it('甩掷兜底：落点仍在起点格内，但末段速度够快 → 至少推进一格', () => {
    const f = fixture()
    const m = f.make()
    // 25px 只到格内（< 半格），但 0.5 px/ms > 0.3 且 > 20px → 应切一格
    const r = input(m, 25, { endVelocity: FLICK_VELOCITY + 0.2 })
    expect(r.passed).toBe(true)
    expect(r.targetIndex).toBe(1)
    expect(FLICK_MIN_DISTANCE).toBeLessThan(25)
  })

  it('几何量不到（无 tab）→ 不切换、不抛错', () => {
    const m = createTabStripThumb({ trackRef: ref(null), thumbRef: ref(null), getIndex: () => 0 })
    const r = input(m, 300)
    expect(r.passed).toBe(false)
    expect(r.targetIndex).toBe(0)
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

  it('滑块未挂载 / 轨道缺失时不抛错（浮层收起、首帧）', () => {
    const m = createTabStripThumb({ trackRef: ref(null), thumbRef: ref(null), getIndex: () => 0 })
    expect(() => { m.handleOffset(30); m.place(0, true) }).not.toThrow()
    // 几何量不到 → 不切换（不猜目标），也不崩
    expect(m.decideSnap({ offset: 300, elapsed: 400, size: 800, index: 0, count: 3 }).passed).toBe(false)
  })
})

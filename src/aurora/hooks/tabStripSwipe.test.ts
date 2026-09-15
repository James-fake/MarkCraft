/**
 * tabStripSwipe · 「整排 tab 跟手」共享层单测
 * ---------------------------------------------------------------------------
 * 事故背景（用户三次追问「按住 tab 方框左右滑的效果没显示出来」）：
 * 第二轮手势已能识别，但视觉上等于没动 —— CDP 实测按住方块拖 150px，
 * 方块只挪 0.7px（progress 被内容区宽 1358px 稀释后 × 6px），
 * 松手阈值却是内容区宽 × 32% = 435px。
 *
 * 本文件锁死两条「所见即所得」不变量：
 *   1. 位移：一个槽距内 **严格 1:1**（用户按住的方块必须跟着手指走），越界才阻尼；
 *   2. 阈值：**半个槽距**（拖过一半就切），与看得见的位移一致。
 * 外加几何量取（槽距）与进度归一化的边界行为。
 */
import { describe, it, expect } from 'vitest'
import {
  CONTENT_FOLLOW_CLAMP,
  FALLBACK_SLOT,
  createTabStripMotion,
  measureTabCenters,
} from './tabStripSwipe'
import { STRIP_MAX_RATIO, averageSlot, decideSnap, mapStripOffset } from './swipeTabsCore'

/* ------------------------------------------------------------------ *
 * mapStripOffset · 整排跟手位移映射
 * ------------------------------------------------------------------ */

describe('mapStripOffset · 整排关手位移（1:1 跟手 + 越界橡胶）', () => {
  const LIMIT = 75

  it('槽距（一个 limit）内严格 1:1 —— 所见即所得，这是主反馈的全部意义', () => {
    expect(mapStripOffset(0, LIMIT)).toBe(0)
    expect(mapStripOffset(10, LIMIT)).toBe(10)
    expect(mapStripOffset(-30, LIMIT)).toBe(-30)
    expect(mapStripOffset(LIMIT, LIMIT)).toBe(LIMIT)
    expect(mapStripOffset(-LIMIT, LIMIT)).toBe(-LIMIT)
  })

  it('越界后阻尼（0.18 增益），而非硬停 —— 让「拖不动了」可被手掌感知', () => {
    // 150px 拖拽、槽距 75 → 75 + 75 × 0.18 = 88.5（CDP 实测同值）
    expect(mapStripOffset(150, LIMIT)).toBeCloseTo(88.5, 5)
    expect(mapStripOffset(-150, LIMIT)).toBeCloseTo(-88.5, 5)
  })

  it('硬顶 limit × 1.25 —— 桌面端不预渲染相邻页，无限平移会整排出框漏白', () => {
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
    // 中心：439 / 511 / 583 → 跨度 144，n-1 = 2 → 72
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
 * measureTabCenters · DOM 量取
 * ------------------------------------------------------------------ */

/** 造一个只带 getBoundingClientRect 的假元素 */
const fakeRect = (left: number, width: number) =>
  ({ getBoundingClientRect: () => ({ left, width }) } as unknown as HTMLElement)

const fakeTrack = (children: HTMLElement[], left = 0) =>
  ({ getBoundingClientRect: () => ({ left }), children } as unknown as HTMLElement)

describe('measureTabCenters · 从轨道子元素量 tab 中心', () => {
  it('返回各子元素中心相对轨道左缘的 x', () => {
    const track = fakeTrack([fakeRect(0, 70), fakeRect(72, 70), fakeRect(144, 82)])
    expect(measureTabCenters(track)).toEqual([35, 107, 185])
  })

  it('轨道自身被位移时中心距不变（差值抵消常量偏移）—— 跟手期间无需清位移再量', () => {
    const a = fakeTrack([fakeRect(0, 70), fakeRect(72, 70), fakeRect(144, 70)], 404)
    const b = fakeTrack([fakeRect(-88, 70), fakeRect(-16, 70), fakeRect(56, 70)], 404)
    expect(averageSlot(measureTabCenters(a), 72)).toBe(72)
    expect(averageSlot(measureTabCenters(b), 72)).toBe(72)
  })

  it('轨道为 null → 空数组（下游退回 fallback，不抛错）', () => {
    expect(measureTabCenters(null)).toEqual([])
  })
})

/* ------------------------------------------------------------------ *
 * createTabStripMotion · 面板侧组装
 * ------------------------------------------------------------------ */

/** 造一块面板的最小 DOM：轨道（3 个 tab，槽距 75）+ 面板根 + 内容层 */
function makeFixture() {
  const track = fakeTrack([fakeRect(0, 70), fakeRect(75, 70), fakeRect(150, 70)])
  const root = document.createElement('div')
  const content = document.createElement('div')
  return {
    trackRef: { current: track },
    rootRef: { current: root },
    contentRef: { current: content },
    root,
    content,
  }
}

describe('createTabStripMotion · 组装（位移 / 阈值 / 进度 / 归位）', () => {
  it('visualMapper 用实测槽距做限幅（1:1 + 越界阻尼）', () => {
    const f = makeFixture()
    const m = createTabStripMotion(f)
    expect(m.visualMapper(40)).toBe(40)          // 槽距内 1:1
    expect(m.visualMapper(150)).toBeCloseTo(75 + (150 - 75) * 0.18, 5)
  })

  it('snapThresholdPx = 半个槽距（「拖过一半就切」与视觉一致）', () => {
    const f = makeFixture()
    const m = createTabStripMotion(f)
    expect(m.snapThresholdPx()).toBe(37.5)
  })

  it('量不到轨道几何时退回兜底槽距（不把 0 传给下游 → 不出现「一碰就翻页」）', () => {
    const m = createTabStripMotion({
      trackRef: { current: null },
      rootRef: { current: document.createElement('div') },
    })
    expect(m.snapThresholdPx()).toBe(FALLBACK_SLOT / 2)
    expect(m.visualMapper(10)).toBe(10)
  })

  it('handleOffset：内容层跟手位移（钳制）+ 进度按槽距归一化到 [-1,1]', () => {
    const f = makeFixture()
    const m = createTabStripMotion(f)

    // 钳制以内 1:1
    m.handleOffset(15)
    expect(f.content.style.transform).toBe('translate3d(15px, 0, 0)')
    // 内容层钳制：超过 CONTENT_FOLLOW_CLAMP 后强递减，远离 40px 内边距
    m.handleOffset(300)
    const shifted = Math.abs(Number(/translate3d\((-?[\d.]+)px/.exec(f.content.style.transform)![1]))
    expect(shifted).toBeLessThan(40)
    expect(shifted).toBeGreaterThan(CONTENT_FOLLOW_CLAMP)
    // 进度：位移 75px（一个槽距）= 满格；再拖因橡胶仅略超 1 并被 clamp
    m.handleOffset(75)
    expect(Number(f.root.style.getPropertyValue('--swipe-progress'))).toBe(1)
    m.handleOffset(-75)
    expect(Number(f.root.style.getPropertyValue('--swipe-progress'))).toBe(-1)
    m.handleOffset(-100000)
    expect(Number(f.root.style.getPropertyValue('--swipe-progress'))).toBe(-1)
  })

  it('handleOffset：位移很小时进度同步很小（progress 与位移同源，不会先亮后动）', () => {
    const f = makeFixture()
    createTabStripMotion(f).handleOffset(7.5)
    expect(Number(f.root.style.getPropertyValue('--swipe-progress'))).toBeCloseTo(0.1, 5)
  })

  it('begin 让内容层零过渡（否则跟手位移滞后于指针）', () => {
    const f = makeFixture()
    createTabStripMotion(f).begin()
    expect(f.content.style.transition).toBe('none')
  })

  it('reset 清掉内联位移/过渡与进度（归位动画交回 CSS 过渡），并重新量槽距', () => {
    const f = makeFixture()
    const m = createTabStripMotion(f)
    m.handleOffset(40)
    m.begin()
    m.reset()
    expect(f.content.style.transform).toBe('')
    expect(f.content.style.transition).toBe('')
    expect(f.root.style.getPropertyValue('--swipe-progress')).toBe('0')
  })

  it('缺内容层（浮层未挂载）时不抛错，仅跳过位移', () => {
    const f = makeFixture()
    const m = createTabStripMotion({ trackRef: f.trackRef, rootRef: f.rootRef })
    expect(() => { m.begin(); m.handleOffset(30); m.reset() }).not.toThrow()
    expect(Number(f.root.style.getPropertyValue('--swipe-progress'))).toBe(0)
  })
})

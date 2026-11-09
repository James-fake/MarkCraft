import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSerializeScheduler, type SerializeScheduler } from './serializeScheduler'

/**
 * 阶段 2 回归锁：WYSIWYG 序列化防抖的「不丢字」契约。
 *
 * 上线前每键击都全量序列化（阶段 0 实测占输入延迟 87-95%）；改成 150ms 防抖后，
 * 必须在任何需要立即拿到 markdown 的时机 flush，否则就会丢掉最后一段输入。
 * 这些用例把 flush 语义锁死。
 */
const DELAY = 150

function setup() {
  const serialize = vi.fn((_reason: string) => {})
  let dirty = false
  const timerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
  const scheduler: SerializeScheduler = createSerializeScheduler({
    delayMs: DELAY,
    isDirty: () => dirty,
    serialize,
    timerRef,
  })
  return {
    scheduler,
    serialize,
    timerRef,
    type: () => { dirty = true; scheduler.schedule() },
    markClean: () => { dirty = false },
  }
}

describe('serializeScheduler · 防抖合并', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('连续 10 次输入只序列化 1 次', () => {
    const { type, serialize } = setup()
    for (let i = 0; i < 10; i++) {
      type()
      vi.advanceTimersByTime(20) // 每 20ms 敲一个字，都未到 150ms 窗口
    }
    expect(serialize).not.toHaveBeenCalled()
    vi.advanceTimersByTime(DELAY)
    expect(serialize).toHaveBeenCalledTimes(1)
    expect(serialize).toHaveBeenCalledWith('debounce')
  })

  it('停顿超过窗口后再次输入 → 各自序列化一次', () => {
    const { type, serialize } = setup()
    type()
    vi.advanceTimersByTime(DELAY)
    type()
    vi.advanceTimersByTime(DELAY)
    expect(serialize).toHaveBeenCalledTimes(2)
  })
})

describe('serializeScheduler · flush 不丢字（8 个时机共用同一语义）', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each([
    'blur', 'unmount', 'beforeunload', 'before-undo', 'before-redo',
    'external', 'save', 'file-switch',
  ])('挂起输入在 %s 时立即写回（带原因）', (reason) => {
    const { type, serialize, scheduler, timerRef } = setup()
    type()
    scheduler.flush(reason)
    expect(serialize).toHaveBeenCalledTimes(1)
    expect(serialize).toHaveBeenCalledWith(reason)
    expect(scheduler.hasPending()).toBe(false)
    expect(timerRef.current).toBeNull()
    // flush 后原 timer 不能再触发第二次序列化
    vi.advanceTimersByTime(DELAY * 3)
    expect(serialize).toHaveBeenCalledTimes(1)
  })

  it('无脏数据时 flush 跳过序列化（切模式/预览不该白跑一次全量转换）', () => {
    const { scheduler, serialize } = setup()
    scheduler.flush('external')
    expect(serialize).not.toHaveBeenCalled()
  })

  it('flush 后再 flush 不重复写回（幂等）', () => {
    const { type, serialize, scheduler, markClean } = setup()
    type()
    scheduler.flush('blur')
    // 真实链路里 serializeNow 会把 dirty 置回 false
    markClean()
    scheduler.flush('unmount')
    expect(serialize).toHaveBeenCalledTimes(1)
  })

  it('dispose 取消挂起但不写回（组件已卸载，不能再 setState）', () => {
    const { type, serialize, scheduler, timerRef } = setup()
    type()
    scheduler.dispose()
    vi.advanceTimersByTime(DELAY * 3)
    expect(serialize).not.toHaveBeenCalled()
    expect(timerRef.current).toBeNull()
    expect(scheduler.hasPending()).toBe(false)
  })

  it('外部直接 clearTimeout（useTiptapContentSync 切文件分支）后状态一致', () => {
    const { type, serialize, scheduler, timerRef } = setup()
    type()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    expect(scheduler.hasPending()).toBe(false)
    vi.advanceTimersByTime(DELAY * 3)
    expect(serialize).not.toHaveBeenCalled()
  })

  it('防抖到期时若脏数据已被 flush 消费，不再重复序列化', () => {
    const { type, serialize, scheduler, markClean } = setup()
    type()
    scheduler.flush('blur')
    markClean()
    vi.advanceTimersByTime(DELAY * 3)
    expect(serialize).toHaveBeenCalledTimes(1)
  })
})

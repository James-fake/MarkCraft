// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePresence, usePresenceValue, POPOVER_EXIT_MS, OVERLAY_EXIT_MS } from './usePresence'

/**
 * 浮层生命周期相位机契约（动效审计 P0 对称性收口）
 * ------------------------------------------------------------
 * 事故背景（用户报障）：「点击列表显示的动画很好，但是列表**收回**的动画就没有」。
 * 根因：浮层族写成 `{open && createPortal(...)}` —— 关闭即瞬时卸载，退场 0ms 硬切。
 *
 * 本文件的断言锁死相位机语义（浮层族共用的唯一实现）：
 *  1. 初始状态不误入 exiting（否则首帧白播一次退场）；
 *  2. open→false 时元素**仍在 DOM**（mounted）且 exiting=true —— 退场真的在播；
 *  3. exitMs 之后才真正卸载（closed）；
 *  4. **可中断**：退场中途重新打开立即回 open，不跳变（面板浮层 hover 重新召回依赖此语义）；
 *  5. 常量与 CSS token 逐字对齐（改一处必须改另一处，靠本断言强绑）。
 */

afterEach(() => {
  vi.useRealTimers()
})

describe('usePresence — 布尔门控浮层', () => {
  it('初始 closed：既不 mounted 也不 exiting（首帧不白播退场）', () => {
    const { result } = renderHook(() => usePresence(false, POPOVER_EXIT_MS))
    expect(result.current.mounted).toBe(false)
    expect(result.current.exiting).toBe(false)
  })

  it('初始 open：mounted 且非 exiting', () => {
    const { result } = renderHook(() => usePresence(true, POPOVER_EXIT_MS))
    expect(result.current.mounted).toBe(true)
    expect(result.current.exiting).toBe(false)
  })

  it('open → false：先进入 exiting（仍在 DOM），exitMs 后才卸载', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ open }) => usePresence(open, POPOVER_EXIT_MS), {
      initialProps: { open: true },
    })

    rerender({ open: false })
    // 关键：不是瞬时卸载 —— 元素还在，且标记退场
    expect(result.current.mounted).toBe(true)
    expect(result.current.exiting).toBe(true)

    act(() => {
      vi.advanceTimersByTime(POPOVER_EXIT_MS - 1)
    })
    expect(result.current.mounted).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.mounted).toBe(false)
    expect(result.current.exiting).toBe(false)
  })

  it('可中断：退场中途重新打开 → 立即回 open，不跳变、不重播', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ open }) => usePresence(open, POPOVER_EXIT_MS), {
      initialProps: { open: true },
    })

    rerender({ open: false })
    expect(result.current.exiting).toBe(true)

    // 退场窗口内重新打开（面板浮层 hover 重新召回的场景）
    act(() => {
      vi.advanceTimersByTime(40)
    })
    rerender({ open: true })
    expect(result.current.mounted).toBe(true)
    expect(result.current.exiting).toBe(false)

    // 退场定时器已被清理：走过原窗口后依然 mounted
    act(() => {
      vi.advanceTimersByTime(POPOVER_EXIT_MS * 2)
    })
    expect(result.current.mounted).toBe(true)
  })

  it('从未打开过时反复置 false 不会进入 exiting', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ open }) => usePresence(open, POPOVER_EXIT_MS), {
      initialProps: { open: false },
    })
    rerender({ open: false })
    expect(result.current.exiting).toBe(false)
    expect(result.current.mounted).toBe(false)
  })
})

describe('usePresenceValue — 对象门控浮层（退场期间保留坐标）', () => {
  it('值置 null 后：退场窗口内仍能拿到最后一份非空载荷', () => {
    vi.useFakeTimers()
    const payload = { x: 120, y: 64 }
    const { result, rerender } = renderHook(
      ({ value }) => usePresenceValue(value, POPOVER_EXIT_MS),
      { initialProps: { value: payload as typeof payload | null } },
    )

    rerender({ value: null })
    // 坐标不丢 —— 否则退场无从渲染（菜单必须「从哪弹出来就缩回哪去」）
    expect(result.current.mounted).toBe(true)
    expect(result.current.exiting).toBe(true)
    expect(result.current.value).toEqual(payload)

    act(() => {
      vi.advanceTimersByTime(POPOVER_EXIT_MS)
    })
    expect(result.current.mounted).toBe(false)
    expect(result.current.value).toBeNull()
  })

  it('退场中途换了新的非空值（菜单在别处重新打开）→ 立即 open 并采用新值', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => usePresenceValue(value, POPOVER_EXIT_MS),
      { initialProps: { value: { x: 10, y: 10 } as { x: number; y: number } | null } },
    )

    rerender({ value: null })
    expect(result.current.exiting).toBe(true)

    rerender({ value: { x: 300, y: 200 } })
    expect(result.current.exiting).toBe(false)
    expect(result.current.value).toEqual({ x: 300, y: 200 })
  })

  it('初始为 null：不 mounted、不 exiting', () => {
    const { result } = renderHook(() => usePresenceValue<string>(null, POPOVER_EXIT_MS))
    expect(result.current.mounted).toBe(false)
    expect(result.current.exiting).toBe(false)
    expect(result.current.value).toBeNull()
  })
})

describe('退场时长常量与 CSS token 对齐', () => {
  it('POPOVER_EXIT_MS = --mc-dur-micro = 100ms（浮层：下拉/菜单/滚轮/Dock 气泡）', () => {
    expect(POPOVER_EXIT_MS).toBe(100)
  })

  it('OVERLAY_EXIT_MS = --mc-dur-fast = 180ms（面板悬浮侧栏）', () => {
    expect(OVERLAY_EXIT_MS).toBe(180)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTiptapContentSync } from './useTiptapContentSync'

/**
 * 回归：编辑器内容同步不得因「无关重渲染」而回滚用户输入 / 丢弃防抖保存。
 *
 * 事故背景（2026-10-04 代码审查 C1）：effect 依赖数组含 `undoRedo`，而 UndoRedoProvider
 * 的 context value 每次渲染都是新对象、且每次 pushHistory 后 ~50ms 强制重渲染 —— 于是
 * 每敲一个字 effect 都会重跑：清掉挂起的防抖 onChange（丢自动保存）并 setContent(旧值)（回滚）。
 */
describe('useTiptapContentSync', () => {
  const makeEditor = () => ({
    commands: { setContent: vi.fn(), setTextSelection: vi.fn() },
  })

  it('undoRedo 身份变化（provider 重渲染）时不得回滚内容、不得清掉挂起的防抖保存', () => {
    const editor = makeEditor()
    const lastEmittedMd: { current: string | null } = { current: null }
    const isInternalUpdate = { current: false }
    const debounceTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const o1 = { initHistory: vi.fn() }
    const o2 = { initHistory: vi.fn() }

    const { rerender } = renderHook(
      ({ value, undoRedo }: { value: string; undoRedo: unknown }) =>
        useTiptapContentSync({
          editor: editor as never,
          value,
          fileId: 'f1',
          lastEmittedMd,
          isInternalUpdate,
          undoRedo: undoRedo as never,
          debounceTimerRef,
        }),
      { initialProps: { value: 'A', undoRedo: o1 } },
    )

    // 首次挂载：写入初始内容
    expect(editor.commands.setContent).toHaveBeenCalledTimes(1)
    editor.commands.setContent.mockClear()

    // 模拟一次按键：onUpdate 设 lastEmittedMd=B，并调度 300ms 后的防抖 onChange
    lastEmittedMd.current = 'B'
    const pending = setTimeout(() => { /* onChange(B) 会在此触发 */ }, 300)
    debounceTimerRef.current = pending

    // ~50ms 后 provider 强制重渲染 → 新 undoRedo 对象；父级 value 仍是旧值 'A'
    rerender({ value: 'A', undoRedo: o2 })

    // 修复后：effect 不应重跑 —— 不 setContent（不回滚）、防抖计时器仍在
    expect(editor.commands.setContent).not.toHaveBeenCalled()
    expect(debounceTimerRef.current).toBe(pending)

    clearTimeout(pending)
  })

  it('切换文件时仍会清掉挂起的防抖保存（防跨文件写入）', () => {
    const editor = makeEditor()
    const lastEmittedMd: { current: string | null } = { current: null }
    const isInternalUpdate = { current: false }
    const debounceTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const undoRedo = { initHistory: vi.fn() }

    const { rerender } = renderHook(
      ({ value, fileId }: { value: string; fileId: string }) =>
        useTiptapContentSync({
          editor: editor as never,
          value,
          fileId,
          lastEmittedMd,
          isInternalUpdate,
          undoRedo: undoRedo as never,
          debounceTimerRef,
        }),
      { initialProps: { value: 'A', fileId: 'f1' } },
    )

    lastEmittedMd.current = 'A2'
    const pending = setTimeout(() => {}, 300)
    debounceTimerRef.current = pending

    rerender({ value: 'B', fileId: 'f2' }) // 切文件

    expect(debounceTimerRef.current).toBe(null)
    clearTimeout(pending)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTiptapLint } from './useTiptapLint'
import type { LintIssue } from '@utils/lintTypes'

/**
 * 阶段 1 回归锁：一次 lint 计算，两处应用。
 * 此前 onUpdate 里既有 scheduleLintCheck（500ms 防抖 → React state），
 * 又同步跑一遍 lintMarkdown + ed.commands.setLintIssues（装饰）—— 每键击算两次全量 lint。
 */
describe('useTiptapLint · 合并计算路径', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('连续调度 3 次：只计算一次，React state 与装饰回调都拿到同一批 issues', () => {
    vi.useFakeTimers()
    const issues: LintIssue[] = [
      { line: 0, column: 0, length: 3, message: '示例', severity: 'warning', rule: 'test' },
    ] as LintIssue[]
    const lintMarkdown = vi.fn(() => issues)
    const onIssues = vi.fn()
    const t = {} as never

    const { result } = renderHook(() => useTiptapLint({ lintMarkdown, t, onIssues }))

    act(() => {
      result.current.scheduleLintCheck('a')
      result.current.scheduleLintCheck('ab')
      result.current.scheduleLintCheck('abc')
    })
    expect(lintMarkdown).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(lintMarkdown).toHaveBeenCalledTimes(1)
    expect(lintMarkdown).toHaveBeenCalledWith('abc', t)
    expect(onIssues).toHaveBeenCalledTimes(1)
    expect(onIssues).toHaveBeenCalledWith(issues)
    expect(result.current.lintIssues).toBe(issues)
  })

  it('cleanupLintTimer 取消挂起的检查（卸载不留定时器）', () => {
    vi.useFakeTimers()
    const lintMarkdown = vi.fn(() => [])
    const onIssues = vi.fn()
    const { result } = renderHook(() => useTiptapLint({ lintMarkdown, t: {} as never, onIssues }))

    act(() => {
      result.current.scheduleLintCheck('text')
      result.current.cleanupLintTimer()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(lintMarkdown).not.toHaveBeenCalled()
    expect(onIssues).not.toHaveBeenCalled()
  })

  it('onIssues 可选（不传时只更新 React state，不抛错）', () => {
    vi.useFakeTimers()
    const lintMarkdown = vi.fn(() => [])
    const { result } = renderHook(() => useTiptapLint({ lintMarkdown, t: {} as never }))
    act(() => {
      result.current.scheduleLintCheck('text')
      vi.advanceTimersByTime(500)
    })
    expect(lintMarkdown).toHaveBeenCalledTimes(1)
    expect(result.current.lintIssues).toEqual([])
  })
})

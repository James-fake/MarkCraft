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
  const makeEditor = (isFocused = false) => ({
    isFocused,
    commands: { setContent: vi.fn(), setTextSelection: vi.fn() },
  })

  it('undoRedo 身份变化（provider 重渲染）时不得回滚内容、不得清掉挂起的防抖保存', () => {
    const editor = makeEditor()
    const lastEmittedMd: { current: string | null } = { current: null }
    const isInternalUpdate = { current: false }
    const debounceTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    // ⚠️ 必须是稳定引用（真实用法是 useRef）：若每次渲染新建对象，effect 会因依赖变化而重跑，
    //    那正是本用例要防的「无关重渲染导致回滚」。
    const recentEmits = { current: new Set<string>() }
    const o1 = { initHistory: vi.fn() }
    const o2 = { initHistory: vi.fn() }

    const { rerender } = renderHook(
      ({ value, undoRedo }: { value: string; undoRedo: unknown }) =>
        useTiptapContentSync({
          editor: editor as never,
          value,
          fileId: 'f1',
          lastEmittedMd,
          recentEmits,
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
          recentEmits: { current: new Set<string>() },
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

  /**
   * 回归（2026-10-10 真实事故）：日记里打字会丢字，且**光标自动回到开头**。
   *
   * 成因：Vault 重载时 loadVault 会为同一批文件**重新生成节点 id** → 日记的 fileId prop 变化 →
   * 被判成「切换文件」→ setContent(父级滞后/外部内容)（丢字）+ setTextSelection(0)（光标跳回开头）。
   * 修法：fileIdChanged 分支加聚焦守卫 —— 用户正在编辑时不重置。
   */
  it('同一文件因重载换新 id：聚焦中不得回灌内容、不得重置光标', () => {
    const editor = makeEditor(true) // 用户正在编辑
    const lastEmittedMd: { current: string | null } = { current: '工作日记' }
    const recentEmits = { current: new Set<string>(['工作日记']) }
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
          recentEmits,
          isInternalUpdate,
          undoRedo: undoRedo as never,
          debounceTimerRef,
        }),
      { initialProps: { value: '工作日记', fileId: 'f1' } },
    )
    editor.commands.setContent.mockClear()
    editor.commands.setTextSelection.mockClear()
    undoRedo.initHistory.mockClear()

    // Vault 重载：同一篇日记换了新 id，且父级 value 变成「磁盘上的外部内容」
    rerender({ value: '外部改写', fileId: 'f2' })

    expect(editor.commands.setContent, '聚焦中不得回灌，否则丢字').not.toHaveBeenCalled()
    expect(editor.commands.setTextSelection, '聚焦中不得重置光标').not.toHaveBeenCalled()
    // 但撤销历史必须挂到新 id 上，否则撤销会串到上一个文件
    expect(undoRedo.initHistory).toHaveBeenCalledWith('f2', '工作日记')
  })

  it('对照：用户真的切到另一个文件（已失焦）时，仍会加载新文件内容', () => {
    const editor = makeEditor(false) // 点文件树后编辑器已失焦
    const lastEmittedMd: { current: string | null } = { current: '上一篇内容' }
    const recentEmits = { current: new Set<string>(['上一篇内容']) }
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
          recentEmits,
          isInternalUpdate,
          undoRedo: undoRedo as never,
          debounceTimerRef,
        }),
      { initialProps: { value: '上一篇内容', fileId: 'f1' } },
    )
    editor.commands.setContent.mockClear()

    rerender({ value: '下一篇内容', fileId: 'f2' })

    expect(editor.commands.setContent, '真正切文件时必须加载新内容').toHaveBeenCalledTimes(1)
  })
})

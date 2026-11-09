import { useState, useRef, useCallback } from 'react'
import type { LintIssue } from '@utils/lintTypes'
import type { Translations } from '@src/types/translations'

export interface UseTiptapLintParams {
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  t: Translations
  /**
   * lint 计算完成后的统一应用回调（阶段 1）。
   * React state（popover/状态栏）由本 hook 自己更新；调用方用它把同一批 issues
   * 送进 ProseMirror 装饰（`ed.commands.setLintIssues`）—— 那是内联高亮的唯一路径。
   * 两者共用一次 lintMarkdown 计算，避免每键击算两遍。
   */
  onIssues?: (issues: LintIssue[]) => void
}

export interface UseTiptapLintReturn {
  lintIssues: LintIssue[]
  showLintPopover: boolean
  lintAnchorRef: React.RefObject<HTMLDivElement | null>
  lintCloseTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  setShowLintPopover: (show: boolean) => void
  /** Schedule a debounced lint check (call in onUpdate) */
  scheduleLintCheck: (md: string) => void
  /** Clear pending lint timer (call on unmount) */
  cleanupLintTimer: () => void
}

export function useTiptapLint({ lintMarkdown, t, onIssues }: UseTiptapLintParams): UseTiptapLintReturn {
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([])
  const [showLintPopover, setShowLintPopover] = useState(false)
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lintAnchorRef = useRef<HTMLDivElement>(null)
  const lintCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 用 ref 读回调：避免内联箭头函数每次 render 换身份导致 scheduleLintCheck 被重建
  const onIssuesRef = useRef(onIssues)
  onIssuesRef.current = onIssues

  const scheduleLintCheck = useCallback((md: string) => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    lintTimerRef.current = setTimeout(() => {
      const issues = lintMarkdown(md, t)
      setLintIssues(issues)          // React 侧：popover / 状态栏
      onIssuesRef.current?.(issues)  // 编辑器侧：ProseMirror 装饰（内联高亮）
    }, 500)
  }, [lintMarkdown, t])

  const cleanupLintTimer = useCallback(() => {
    if (lintTimerRef.current) {
      clearTimeout(lintTimerRef.current)
      lintTimerRef.current = null
    }
  }, [])

  return {
    lintIssues,
    showLintPopover,
    lintAnchorRef,
    lintCloseTimerRef,
    setShowLintPopover,
    scheduleLintCheck,
    cleanupLintTimer,
  }
}

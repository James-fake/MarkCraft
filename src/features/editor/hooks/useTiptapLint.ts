import { useState, useRef, useCallback } from 'react'
import type { LintIssue } from '../../shared/utils/lintTypes'
import type { Translations } from '@src/types/translations'

export interface UseTiptapLintParams {
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  t: Translations
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

export function useTiptapLint({ lintMarkdown, t }: UseTiptapLintParams): UseTiptapLintReturn {
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([])
  const [showLintPopover, setShowLintPopover] = useState(false)
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lintAnchorRef = useRef<HTMLDivElement>(null)
  const lintCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleLintCheck = useCallback((md: string) => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    lintTimerRef.current = setTimeout(() => {
      const issues = lintMarkdown(md, t)
      setLintIssues(issues)
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

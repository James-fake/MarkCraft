import { useState, useRef, useCallback, useEffect } from 'react'
import type { LintIssue } from '@utils/lintTypes'
import type { Translations } from '@src/types/translations'
import { scrollToLine } from '../editorHelpers'

export interface UseSourceLintParams {
  value: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  pushUndo: (newValue: string, groupKey?: string) => void
  onChange: (value: string) => void
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  t: Translations
}

export function useSourceLint({
  value,
  textareaRef,
  scrollContainerRef,
  pushUndo,
  onChange,
  lintMarkdown,
  t,
}: UseSourceLintParams) {
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

  const handleJumpToIssue = useCallback((issue: LintIssue) => {
    if (!textareaRef.current || !scrollContainerRef.current) return
    scrollToLine(textareaRef.current, scrollContainerRef.current, issue.line, issue.startCol)
  }, [textareaRef, scrollContainerRef])

  const handleFixIssue = useCallback((newContent: string) => {
    pushUndo(newContent, 'lint-fix')
    onChange(newContent)
  }, [onChange, pushUndo])

  // Lint effect — runs on value change
  useEffect(() => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    lintTimerRef.current = setTimeout(() => {
      const issues = lintMarkdown(value, t)
      setLintIssues(issues)
    }, 500)
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    }
  }, [value, lintMarkdown, t])

  return {
    lintIssues,
    setLintIssues,
    lintTimerRef,
    lintAnchorRef,
    lintCloseTimerRef,
    showLintPopover,
    setShowLintPopover,
    scheduleLintCheck,
    handleJumpToIssue,
    handleFixIssue,
    cleanupLintTimer,
  }
}

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { LintIssue } from './markdownLinter'
import { fixIssue } from './markdownLinter'
import { useLanguage } from '../../stores/LanguageStore'

interface LintPopoverProps {
  issues: LintIssue[]
  content: string
  onJumpToIssue: (issue: LintIssue) => void
  onFixIssue: (newContent: string) => void
  anchorEl: HTMLElement | null
  visible: boolean
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const LintPopover: React.FC<LintPopoverProps> = ({ issues, content, onJumpToIssue, onFixIssue, anchorEl, visible, onClose, onMouseEnter, onMouseLeave }) => {
  const { t } = useLanguage()
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [fixingKey, setFixingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !anchorEl || !popoverRef.current) return

    const anchorRect = anchorEl.getBoundingClientRect()
    const popover = popoverRef.current
    const popoverRect = popover.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    let top = anchorRect.bottom + 4
    let left = anchorRect.left

    if (top + popoverRect.height > viewportHeight - 8) {
      top = anchorRect.top - popoverRect.height - 4
    }

    if (left + popoverRect.width > viewportWidth - 8) {
      left = viewportWidth - popoverRect.width - 8
    }

    if (left < 8) left = 8

    setPosition({ top, left })
  }, [visible, anchorEl, issues])

  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, anchorEl, onClose])

  const handleClick = useCallback((issue: LintIssue) => {
    onJumpToIssue(issue)
    onClose()
  }, [onJumpToIssue, onClose])

  const handleFix = useCallback((e: React.MouseEvent, issue: LintIssue, key: string) => {
    e.stopPropagation()
    setFixingKey(key)
    setTimeout(() => {
      const newContent = fixIssue(content, issue)
      if (newContent !== null) {
        onFixIssue(newContent)
      }
      setFixingKey(null)
    }, 150)
  }, [content, onFixIssue])

  const canFix = useCallback((issue: LintIssue): boolean => {
    const fixableTypes = [
      'unclosedCodeBlock',
      'incompleteLink',
      'missingSpaceAfterHash',
      'unclosedInlineCode',
      'incompleteImage',
      'missingImageAlt',
      'mixedHorizontalRule',
      'missingSpaceAfterListMarker',
      'missingSpaceAfterOrderedList',
      'mixedIndentation',
    ]
    return fixableTypes.includes(issue.issueType)
  }, [])

  if (!visible) return null

  const sortedIssues = [...issues].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
    return a.line - b.line
  })
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  return (
    <div
      ref={popoverRef}
      className="lint-popover"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="lint-popover-header">
        <span className="lint-popover-title">{t.lint.issueList}</span>
        <span className="lint-popover-count">
          {errorCount > 0 && <span style={{ color: '#ef4444' }}>❌ {errorCount}</span>}
          {errorCount > 0 && warningCount > 0 && <span style={{ margin: '0 4px' }}> </span>}
          {warningCount > 0 && <span style={{ color: '#f59e0b' }}>⚠️ {warningCount}</span>}
        </span>
      </div>
      <div className="lint-popover-list">
        {sortedIssues.map((issue, idx) => {
          const key = `${issue.line}-${issue.startCol}-${idx}`
          const fixable = canFix(issue)
          return (
            <div
              key={key}
              className="lint-popover-item"
              onClick={() => handleClick(issue)}
              title={issue.suggestion ? `💡 ${issue.suggestion}` : undefined}
            >
              <span className="lint-popover-item-icon">
                {issue.severity === 'error' ? '🔴' : '🟡'}
              </span>
              <span className="lint-popover-item-line">L{issue.line + 1}</span>
              <span className="lint-popover-item-message">{issue.message}</span>
              {fixable && (
                <button
                  className={`lint-popover-fix-btn ${fixingKey === key ? 'lint-popover-fix-btn-fixing' : ''}`}
                  onClick={(e) => handleFix(e, issue, key)}
                  title={t.lint.autoFix}
                  tabIndex={0}
                >
                  {fixingKey === key ? '✓' : '✨'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LintPopover

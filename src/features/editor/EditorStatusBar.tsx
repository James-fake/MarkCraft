import { RefObject } from 'react'
import type { LintIssue } from '@utils/lintTypes'
import type { Translations } from '../../types/translations'
import { DocumentStats } from './stats'
import { WordCountMode } from './hooks/useEditorState'

interface EditorStatusBarProps {
  stats: DocumentStats
  currentWordCount: number
  wordCountMode: WordCountMode
  lintIssues: LintIssue[]
  lintAnchorRef: RefObject<HTMLDivElement | null>
  lintCloseTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  onToggleWordCountMode: () => void
  setShowLintPopover: (show: boolean) => void
  t: Translations
}

export default function EditorStatusBar({
  stats,
  currentWordCount,
  wordCountMode,
  lintIssues,
  lintAnchorRef,
  lintCloseTimerRef,
  onToggleWordCountMode,
  setShowLintPopover,
  t,
}: EditorStatusBarProps) {
  return (
    <div
      className="h-8 px-4 flex items-center justify-between relative"
      style={{ backgroundColor: 'var(--editor-bg)', color: 'var(--editor-text)' }}
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: '1px', background: 'var(--button-primary)' }}
      />
      <div className="flex items-center gap-3">
        <div
          style={{
            width: '4px',
            height: '4px',
            transform: 'rotate(45deg)',
            backgroundColor: 'var(--button-primary)',
            marginRight: '8px',
            flexShrink: 0
          }}
        />
        <div className="flex items-center gap-1">
          <span style={{ opacity: 0.5, fontSize: '11px' }}>{t.editor.wordCount}</span>
          <span style={{ fontWeight: 600, fontSize: '11px' }}>{currentWordCount}</span>
          <button
            onClick={onToggleWordCountMode}
            className="transition-colors"
            style={{
              borderRadius: '4px',
              padding: '2px 8px',
              background: 'var(--mc-accent-soft)',
              border: '1px solid var(--mc-accent-soft)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--editor-text)',
              cursor: 'pointer'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--mc-accent-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--mc-accent-soft)' }}
            title={wordCountMode === 'text' ? t.editor.switchToStandard : t.editor.switchToText}
          >
            {wordCountMode === 'text' ? t.editor.textMode : t.editor.standardMode}
          </button>
        </div>
        <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--editor-border)', flexShrink: 0 }} />
        <div className="flex items-center gap-1">
          <span style={{ opacity: 0.5, fontSize: '11px' }}>{t.editor.charCount}</span>
          <span style={{ fontWeight: 600, fontSize: '11px' }}>{stats.charCount}</span>
        </div>
        <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--editor-border)', flexShrink: 0 }} />
        <div className="flex items-center gap-1">
          <span style={{ opacity: 0.5, fontSize: '11px' }}>{t.editor.lineCount}</span>
          <span style={{ fontWeight: 600, fontSize: '11px' }}>{stats.lineCount}</span>
        </div>
        {stats.readingTimeMinutes > 0 && (
          <>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--editor-border)', flexShrink: 0 }} />
            <div className="flex items-center gap-1">
              <span style={{ opacity: 0.5, fontSize: '11px' }}>{t.editor.readingTime}</span>
              <span style={{ fontWeight: 600, fontSize: '11px' }}>{stats.readingTimeMinutes}{t.editor.readingTimeUnit}</span>
            </div>
          </>
        )}
        {lintIssues.length > 0 && (
          <>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--editor-border)', flexShrink: 0 }} />
            <div
              ref={lintAnchorRef as React.LegacyRef<HTMLDivElement>}
              className="flex items-center gap-1 cursor-pointer lint-status-area"
              onMouseEnter={() => {
                if (lintCloseTimerRef.current) {
                  clearTimeout(lintCloseTimerRef.current)
                  lintCloseTimerRef.current = null
                }
                setShowLintPopover(true)
              }}
              onMouseLeave={() => {
                lintCloseTimerRef.current = setTimeout(() => {
                  setShowLintPopover(false)
                }, 300)
              }}
            >
              {lintIssues.filter(i => i.severity === 'error').length > 0 && (
                <span className="flex items-center gap-1" style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                  {lintIssues.filter(i => i.severity === 'error').length}
                </span>
              )}
              {lintIssues.filter(i => i.severity === 'warning').length > 0 && (
                <span className="flex items-center gap-1" style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                  {lintIssues.filter(i => i.severity === 'warning').length}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

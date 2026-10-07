import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import type { Translations } from '@src/types/translations'

interface SearchReplaceBarProps {
  editor: Editor
  searchMode: 'search' | 'replace'
  searchTerm: string
  replaceTerm: string
  onClose: () => void
  onSearchTermChange: (value: string) => void
  onReplaceTermChange: (value: string) => void
  t: Translations
}

const SearchReplaceBar: React.FC<SearchReplaceBarProps> = ({
  editor,
  searchMode,
  searchTerm,
  replaceTerm,
  onClose,
  onSearchTermChange,
  onReplaceTermChange,
  t,
}) => {
  const [searchInSelection, setSearchInSelection] = useState(false)
  const selectionRange = useRef<{ from: number; to: number } | null>(null)

  const toggleSearchInSelection = useCallback(() => {
    if (!searchInSelection) {
      // Turning on: capture current selection
      const { from, to } = editor.state.selection
      if (from !== to) {
        selectionRange.current = { from, to }
        setSearchInSelection(true)
      }
    } else {
      setSearchInSelection(false)
      selectionRange.current = null
    }
  }, [searchInSelection, editor])

  // Reset search-in-selection when search closes
  useEffect(() => {
    return () => {
      selectionRange.current = null
    }
  }, [])

  const handleSearchTermChange = useCallback((value: string) => {
    onSearchTermChange(value)
    if (searchInSelection && selectionRange.current) {
      editor.commands.setSearchTerm(value, false, selectionRange.current)
    } else {
      editor.commands.setSearchTerm(value)
    }
  }, [onSearchTermChange, editor, searchInSelection])

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'var(--toolbar-bg)',
      borderBottom: '1px solid var(--editor-border)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <button
        onClick={onClose}
        style={{ color: 'var(--mc-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        aria-label={t.searchReplace.closeSearch}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchTermChange(e.target.value)}
        placeholder={t.searchReplace.searchPlaceholder}
        style={{
          flex: 1,
          backgroundColor: 'var(--mc-bg-panel)',
          color: 'var(--editor-text)',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '13px',
          border: '1px solid var(--editor-border)',
          outline: 'none',
        }}
        autoFocus
      />
      <button
        onClick={toggleSearchInSelection}
        style={{
          color: searchInSelection ? 'var(--button-primary)' : 'var(--mc-text-secondary)',
          background: searchInSelection ? 'var(--mc-accent-soft)' : 'none',
          border: searchInSelection ? '1px solid var(--button-primary)' : '1px solid transparent',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          fontSize: '14px',
          lineHeight: 1,
          transition: 'all 0.15s',
        }}
        title={t.searchReplace.searchInSelection || 'Search in Selection'}
      >
        ≡
      </button>
      <button
        onClick={() => editor.commands.prevSearchMatch()}
        style={{ color: 'var(--mc-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        title={t.searchReplace.previous}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={() => editor.commands.nextSearchMatch()}
        style={{ color: 'var(--mc-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        title={t.searchReplace.next}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {searchMode === 'replace' && (
        <>
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => onReplaceTermChange(e.target.value)}
            placeholder={t.searchReplace.replacePlaceholder}
            style={{
              width: '120px',
              backgroundColor: 'var(--mc-bg-panel)',
              color: 'var(--editor-text)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              border: '1px solid var(--editor-border)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => editor.commands.replaceCurrentMatch(replaceTerm)}
            style={{ padding: '4px 10px', backgroundColor: 'var(--button-primary)', color: '#fff', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            {t.searchReplace.replace}
          </button>
          <button
            onClick={() => editor.commands.replaceAllMatches(replaceTerm)}
            style={{ padding: '4px 10px', backgroundColor: 'var(--button-success)', color: '#fff', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            {t.searchReplace.replaceAll}
          </button>
        </>
      )}
    </div>
  )
}

export default SearchReplaceBar

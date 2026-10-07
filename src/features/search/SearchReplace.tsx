import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../stores/LanguageStore'

interface SearchReplaceProps {
  content: string
  onContentChange: (content: string) => void
  onClose: () => void
  mode: 'search' | 'replace'
  initialSearch?: string
}

interface MatchResult {
  index: number
  lineNumber: number
  text: string
  context: string
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SEARCH_HISTORY_KEY = 'markcraft_search_history'
const SEARCH_HISTORY_MAX = 20

function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
  } catch {}
}

function SearchReplace({ content, onContentChange, onClose, mode, initialSearch }: SearchReplaceProps) {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState(initialSearch || '')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadSearchHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [searchInSelection, setSearchInSelection] = useState(false)
  const [regexError, setRegexError] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const selectionRangeRef = useRef<{ start: number; end: number } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'search') {
      searchInputRef.current?.focus()
    } else {
      searchInputRef.current?.focus()
    }

    // Detect if there's a selection when the search bar opens
    const textarea = document.querySelector('.editor-area') as HTMLTextAreaElement
    if (textarea) {
      const selStart = textarea.selectionStart
      const selEnd = textarea.selectionEnd
      if (selStart !== selEnd) {
        selectionRangeRef.current = { start: selStart, end: selEnd }
        setHasSelection(true)
        setSearchInSelection(true)
      }
    }
  }, [mode])

  const findMatches = useCallback((term: string): MatchResult[] => {
    if (!term.trim()) return []

    // H5: Protect against large file search — use string search for large content
    const MAX_SEARCH_CONTENT = 500000
    const isTrunc = content.length > MAX_SEARCH_CONTENT
    setIsTruncated(isTrunc)

    let searchContent: string
    let searchOffset = 0

    if (searchInSelection && selectionRangeRef.current) {
      const { start, end } = selectionRangeRef.current
      searchContent = content.substring(start, end)
      searchOffset = start
    } else {
      searchContent = isTrunc ? content.substring(0, MAX_SEARCH_CONTENT) : content
      searchOffset = 0
    }

    // Build regex pattern based on search modes
    let pattern: string
    if (useRegex) {
      pattern = term
    } else {
      pattern = escapeRegExp(term)
    }

    if (wholeWord) {
      pattern = `\\b${pattern}\\b`
    }

    let searchRegex: RegExp
    try {
      searchRegex = new RegExp(pattern, 'gi')
      setRegexError(false)
    } catch {
      setRegexError(true)
      return []
    }

    const results: MatchResult[] = []
    const lines = searchContent.split('\n')
    let charOffset = 0

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      let match

      while ((match = searchRegex.exec(line)) !== null) {
        const startIndex = match.index
        const endIndex = startIndex + match[0].length

        const contextStart = Math.max(0, startIndex - 15)
        const contextEnd = Math.min(line.length, endIndex + 15)
        const context = (contextStart > 0 ? '...' : '') +
                       line.substring(contextStart, contextEnd) +
                       (contextEnd < line.length ? '...' : '')

        results.push({
          index: searchOffset + charOffset + startIndex,
          lineNumber: lineIndex + 1,
          text: match[0],
          context
        })
      }

      charOffset += line.length + 1
    }

    return results
  }, [content, useRegex, wholeWord, searchInSelection])

  // V5-M7: Remove currentMatchIndex from dependency to avoid unnecessary re-computation
  useEffect(() => {
    const newMatches = findMatches(searchTerm)
    setMatches(newMatches)
    setCurrentMatchIndex(prev => {
      if (newMatches.length === 0) return -1
      if (prev >= newMatches.length) return newMatches.length - 1
      return 0
    })
  }, [searchTerm, findMatches])

  useEffect(() => {
    if (currentMatchIndex >= 0 && matches[currentMatchIndex]) {
      highlightAndScroll(matches[currentMatchIndex])
    }
  }, [currentMatchIndex, matches])

  const highlightAndScroll = (match: MatchResult) => {
    const textarea = document.querySelector('.editor-area') as HTMLTextAreaElement
    if (!textarea) return

    const start = match.index
    const end = start + match.text.length

    textarea.focus()
    textarea.setSelectionRange(start, end)

    const lineHeight = 24
    const lineNumber = match.lineNumber - 1
    const scrollTop = Math.max(0, lineNumber * lineHeight - textarea.clientHeight / 2)
    textarea.scrollTo({ top: scrollTop, behavior: 'smooth' })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const newMatches = findMatches(searchTerm)
    setMatches(newMatches)
    setCurrentMatchIndex(newMatches.length > 0 ? 0 : -1)

    if (searchTerm.trim() && !searchHistory.includes(searchTerm)) {
      const newHistory = [searchTerm, ...searchHistory].slice(0, SEARCH_HISTORY_MAX)
      setSearchHistory(newHistory)
      saveSearchHistory(newHistory)
    }
  }

  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return

    let newIndex: number
    if (direction === 'next') {
      newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0
    } else {
      newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1
    }

    setCurrentMatchIndex(newIndex)
  }

  const handleReplace = () => {
    if (currentMatchIndex < 0 || !searchTerm) return

    const match = matches[currentMatchIndex]
    const matchLength = match.text.length
    // V6-M5: Re-verify the match position before replacing to handle content changes
    const actualText = content.substring(match.index, match.index + matchLength)
    if (actualText !== match.text) {
      // Match position is stale, refresh matches and abort
      const newMatches = findMatches(searchTerm)
      setMatches(newMatches)
      setCurrentMatchIndex(newMatches.length > 0 ? 0 : -1)
      return
    }

    const newContent = content.substring(0, match.index) +
                       replaceTerm +
                       content.substring(match.index + matchLength)

    onContentChange(newContent)
    setNotification({ type: 'success', message: t.searchReplace.replaceSuccess })
    setTimeout(() => setNotification(null), 2000)

    setTimeout(() => {
      const newMatches = findMatches(searchTerm)
      setMatches(newMatches)
      if (currentMatchIndex < newMatches.length) {
        setCurrentMatchIndex(currentMatchIndex)
      } else if (newMatches.length > 0) {
        setCurrentMatchIndex(newMatches.length - 1)
      } else {
        setCurrentMatchIndex(-1)
      }
    }, 0)
  }

  const handleReplaceAll = () => {
    if (!searchTerm) return

    // Build regex pattern based on search modes
    let pattern: string
    if (useRegex) {
      pattern = searchTerm
    } else {
      pattern = escapeRegExp(searchTerm)
    }

    if (wholeWord) {
      pattern = `\\b${pattern}\\b`
    }

    let searchRegex: RegExp
    try {
      searchRegex = new RegExp(pattern, 'gi')
    } catch {
      return
    }

    // H5: Use string-based replace for large files to avoid ReDoS
    const MAX_REPLACE_CONTENT = 500000
    let newContent: string
    let replaceCount: number

    if (searchInSelection && selectionRangeRef.current) {
      const { start, end } = selectionRangeRef.current
      const selectedContent = content.substring(start, end)
      const replacedContent = selectedContent.replace(searchRegex, replaceTerm)
      replaceCount = (selectedContent.match(searchRegex) || []).length
      newContent = content.substring(0, start) + replacedContent + content.substring(end)
    } else if (content.length > MAX_REPLACE_CONTENT && !useRegex) {
      // String-based search and replace for large files
      replaceCount = 0
      let pos = 0
      const lowerContent = content.toLowerCase()
      const lowerSearch = searchTerm.toLowerCase()
      const parts: string[] = []
      let lastIdx = 0

      while ((pos = lowerContent.indexOf(lowerSearch, pos)) !== -1) {
        parts.push(content.substring(lastIdx, pos))
        parts.push(replaceTerm)
        lastIdx = pos + searchTerm.length
        replaceCount++
        pos = lastIdx
      }
      parts.push(content.substring(lastIdx))
      newContent = parts.join('')
    } else {
      newContent = content.replace(searchRegex, replaceTerm)
      replaceCount = (content.match(searchRegex) || []).length
    }

    onContentChange(newContent)
    setNotification({ type: 'success', message: t.searchReplace.replaceAllSuccess.replace('{count}', String(replaceCount)) })
    setTimeout(() => setNotification(null), 3000)

    setMatches([])
    setCurrentMatchIndex(-1)
  }

  const selectFromHistory = (term: string) => {
    setSearchTerm(term)
    setShowHistory(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      navigateToMatch('next')
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      navigateToMatch('prev')
    }
  }

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--toolbar-bg)',
        borderBottom: '1px solid var(--editor-border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'relative',
      }}
      onKeyDown={handleKeyDown}
    >
      <button
        onClick={onClose}
        style={{
          color: 'var(--mc-text-secondary)',
          transition: 'color 0.15s ease',
          padding: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label={t.searchReplace.closeSearch}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--editor-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mc-text-secondary)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', color: 'var(--mc-text-secondary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSubmit={handleSearch}
            placeholder={t.searchReplace.searchPlaceholder}
            onClick={() => setShowHistory(true)}
            style={{
              width: '100%',
              backgroundColor: 'var(--mc-bg-panel)',
              color: 'var(--editor-text)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              border: regexError ? '1px solid #ef4444' : '1px solid var(--editor-border)',
              outline: 'none',
            }}
            onFocus={(e) => { if (!regexError) e.currentTarget.style.borderColor = 'var(--button-primary)' }}
            onBlur={(e) => { if (!regexError) e.currentTarget.style.borderColor = 'var(--editor-border)' }}
          />

          {showHistory && searchHistory.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'var(--mc-bg-panel)',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 10,
              border: '1px solid var(--editor-border)',
            }}>
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  onClick={() => selectFromHistory(term)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: 'var(--mc-text-secondary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-border)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => setUseRegex(prev => !prev)}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: useRegex ? '#fff' : 'var(--mc-text-secondary)',
              backgroundColor: useRegex ? 'var(--button-primary)' : 'transparent',
              border: '1px solid ' + (useRegex ? 'var(--button-primary)' : 'var(--editor-border)'),
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="正则表达式搜索"
            onMouseEnter={(e) => { if (!useRegex) e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)' }}
            onMouseLeave={(e) => { if (!useRegex) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            .*
          </button>
          <button
            onClick={() => setWholeWord(prev => !prev)}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: wholeWord ? '#fff' : 'var(--mc-text-secondary)',
              backgroundColor: wholeWord ? 'var(--button-primary)' : 'transparent',
              border: '1px solid ' + (wholeWord ? 'var(--button-primary)' : 'var(--editor-border)'),
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="全词匹配"
            onMouseEnter={(e) => { if (!wholeWord) e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)' }}
            onMouseLeave={(e) => { if (!wholeWord) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            W
          </button>
          <button
            onClick={() => { if (hasSelection) setSearchInSelection(prev => !prev) }}
            disabled={!hasSelection}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: searchInSelection && hasSelection ? '#fff' : 'var(--mc-text-secondary)',
              backgroundColor: searchInSelection && hasSelection ? 'var(--button-primary)' : 'transparent',
              border: '1px solid ' + (searchInSelection && hasSelection ? 'var(--button-primary)' : 'var(--editor-border)'),
              borderRadius: '4px',
              cursor: hasSelection ? 'pointer' : 'not-allowed',
              opacity: hasSelection ? 1 : 0.4,
              transition: 'all 0.15s ease',
            }}
            title={hasSelection ? '在选区中搜索' : '需要先选中文本'}
            onMouseEnter={(e) => { if (hasSelection && !searchInSelection) e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)' }}
            onMouseLeave={(e) => { if (hasSelection && !searchInSelection) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            ≡
          </button>
        </div>

        {mode === 'replace' && (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', color: 'var(--mc-text-secondary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder={t.searchReplace.replacePlaceholder}
              style={{
                width: '128px',
                backgroundColor: 'var(--mc-bg-panel)',
                color: 'var(--editor-text)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                border: '1px solid var(--editor-border)',
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--button-primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--editor-border)'}
            />
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => navigateToMatch('prev')}
          disabled={matches.length === 0}
          style={{
            padding: '6px',
            color: 'var(--mc-text-secondary)',
            background: 'none',
            border: 'none',
            borderRadius: '4px',
            cursor: matches.length === 0 ? 'not-allowed' : 'pointer',
            opacity: matches.length === 0 ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
          title={t.searchReplace.previous}
          onMouseEnter={(e) => { if (matches.length > 0) e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)' }}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        <button
          onClick={() => navigateToMatch('next')}
          disabled={matches.length === 0}
          style={{
            padding: '6px',
            color: 'var(--mc-text-secondary)',
            background: 'none',
            border: 'none',
            borderRadius: '4px',
            cursor: matches.length === 0 ? 'not-allowed' : 'pointer',
            opacity: matches.length === 0 ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
          title={t.searchReplace.next}
          onMouseEnter={(e) => { if (matches.length > 0) e.currentTarget.style.backgroundColor = 'var(--mc-bg-panel)' }}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <span style={{ color: 'var(--mc-text-secondary)', fontSize: '14px', minWidth: '40px', textAlign: 'center' }}>
          {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : ''}
        </span>

        {isTruncated && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontStyle: 'italic' }} title="Large file: only first 500KB searched">
            ⚠
          </span>
        )}

        {mode === 'replace' && (
          <>
            <button
              onClick={handleReplace}
              disabled={currentMatchIndex < 0 || !searchTerm}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--button-primary)',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                cursor: currentMatchIndex < 0 || !searchTerm ? 'not-allowed' : 'pointer',
                opacity: currentMatchIndex < 0 || !searchTerm ? 0.5 : 1,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { if (currentMatchIndex >= 0 && searchTerm) e.currentTarget.style.backgroundColor = 'var(--button-primary-hover)' }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-primary)'}
            >
              {t.searchReplace.replace}
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={matches.length === 0 || !searchTerm}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--button-success)',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                cursor: matches.length === 0 || !searchTerm ? 'not-allowed' : 'pointer',
                opacity: matches.length === 0 || !searchTerm ? 0.5 : 1,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { if (matches.length > 0 && searchTerm) e.currentTarget.style.backgroundColor = 'var(--button-success-hover)' }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-success)'}
            >
              {t.searchReplace.replaceAll}
            </button>
          </>
        )}
      </div>

      {notification && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          zIndex: 20,
          backgroundColor: notification.type === 'success' ? 'var(--button-success)' : '#ef4444',
          color: '#fff',
        }}>
          {notification.message}
        </div>
      )}
    </div>
  )
}

export default SearchReplace

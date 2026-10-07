import { useState, useCallback, useEffect } from 'react'

export type SearchMode = 'search' | 'replace' | null

export function useSourceSearch(): {
  searchMode: SearchMode
  setSearchMode: (mode: SearchMode) => void
  openSearch: (mode: SearchMode) => void
  closeSearch: () => void
} {
  const [searchMode, setSearchMode] = useState<SearchMode>(null)

  const openSearch = useCallback((mode: SearchMode) => {
    setSearchMode(mode)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchMode(null)
  }, [])

  // Global keyboard shortcuts (Ctrl+F, Ctrl+Shift+H)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey

      if (isCtrlOrCmd && event.key === 'f') {
        event.preventDefault()
        setSearchMode('search')
      }

      if (isCtrlOrCmd && event.shiftKey && event.key === 'H') {
        event.preventDefault()
        setSearchMode('replace')
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  return {
    searchMode,
    setSearchMode,
    openSearch,
    closeSearch,
  }
}

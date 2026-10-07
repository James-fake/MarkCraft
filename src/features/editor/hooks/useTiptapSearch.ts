import { useState, useCallback } from 'react'

export type SearchMode = 'search' | 'replace' | null

export interface UseTiptapSearchReturn {
  searchMode: SearchMode
  searchTerm: string
  replaceTerm: string
  openSearch: (mode: SearchMode) => void
  closeSearch: () => void
  setSearchTerm: (term: string) => void
  setReplaceTerm: (term: string) => void
}

export function useTiptapSearch(): UseTiptapSearchReturn {
  const [searchMode, setSearchMode] = useState<SearchMode>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')

  const openSearch = useCallback((mode: SearchMode) => {
    setSearchMode(mode)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchMode(null)
    setSearchTerm('')
    setReplaceTerm('')
  }, [])

  return {
    searchMode,
    searchTerm,
    replaceTerm,
    openSearch,
    closeSearch,
    setSearchTerm,
    setReplaceTerm,
  }
}

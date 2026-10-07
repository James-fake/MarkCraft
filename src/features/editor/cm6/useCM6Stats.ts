import { useState, useCallback, useMemo } from 'react'
import { calculateStats, type DocumentStats } from '../stats'

export type WordCountMode = 'text' | 'standard'

interface UseCM6StatsParams {
  value: string
}

export function useCM6Stats({ value }: UseCM6StatsParams) {
  const [wordCountMode, setWordCountMode] = useState<WordCountMode>('text')

  // 统计
  const stats = useMemo<DocumentStats>(() => calculateStats(value), [value])
  const currentWordCount = wordCountMode === 'text' ? stats.wordCountTextMode : stats.wordCountStandardMode

  const toggleWordCountMode = useCallback(() => {
    setWordCountMode(prev => prev === 'text' ? 'standard' : 'text')
  }, [])

  return {
    wordCountMode,
    stats,
    currentWordCount,
    toggleWordCountMode,
  }
}

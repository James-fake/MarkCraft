import { useState, useCallback, useMemo } from 'react'
import { calculateStats, type DocumentStats } from '../stats'
import type { WordCountMode } from '../editorTypes'

// 类型单一来源：editorTypes；此处 re-export 保持既有导入路径可用
export type { WordCountMode } from '../editorTypes'

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

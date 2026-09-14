import { useState, useCallback, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { toggleFocusMode, toggleTypewriterMode } from './focusModeExtension'

interface UseCM6FileOpsParams {
  viewRef: React.MutableRefObject<EditorView | null>
  value: string
  focusMode: boolean
  typewriterMode: boolean
  isInternalUpdate: React.MutableRefObject<boolean>
}

export function useCM6FileOps({
  viewRef,
  value,
  focusMode,
  typewriterMode,
  isInternalUpdate,
}: UseCM6FileOpsParams) {
  const [searchMode, setSearchMode] = useState<'search' | 'replace' | null>(null)

  // 外部 value 变更同步
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (value !== currentDoc) {
      isInternalUpdate.current = true
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      })
      isInternalUpdate.current = false
    }
  }, [value])

  // 专注模式/打字机模式切换
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [
        toggleFocusMode.of(focusMode),
        toggleTypewriterMode.of(typewriterMode),
      ],
    })
  }, [focusMode, typewriterMode])

  // 全局快捷键
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

  const handleFormatApplied = useCallback(() => {
    viewRef.current?.focus()
  }, [])

  return {
    searchMode,
    setSearchMode,
    handleFormatApplied,
  }
}

import { useRef, useCallback, useState, useMemo, useEffect, ForwardedRef } from 'react'
import { calculateStats, DocumentStats } from '../stats'
import type { LintIssue } from '@utils/lintTypes'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import type { Translations } from '@src/types/translations'
import { insertFootnote } from '../footnote'
import { useUndoRedo } from '@stores/UndoRedoStore'
import { useLanguage } from '@stores/LanguageStore'
import { useSourceSearch } from './useSourceSearch'
import { useSourceLint } from './useSourceLint'
import { useSourceFileOps } from './useSourceFileOps'

export type WordCountMode = 'text' | 'standard'
export type SearchMode = 'search' | 'replace' | null

interface UseEditorStateParams {
  value: string
  onChange: (value: string) => void
  fileId?: string | null
  onScroll?: (scrollPosition: number, element: HTMLElement) => void
  focusMode: boolean
  typewriterMode: boolean
  ref: ForwardedRef<HTMLTextAreaElement>
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  imageStore: ImageStoreAPI
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function useEditorState({
  value,
  onChange,
  fileId,
  onScroll,
  focusMode,
  typewriterMode,
  ref,
  lintMarkdown,
  imageStore,
}: UseEditorStateParams) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isInitialRender = useRef(true)
  const isUndoRedoRef = useRef(false)
  const typewriterScrollingRef = useRef(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [wordCountMode, setWordCountMode] = useState<WordCountMode>('text')
  const [largeImageConfirm, setLargeImageConfirm] = useState<{ file: File; onConfirm: () => void } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [currentLineNumber, setCurrentLineNumber] = useState(0)

  const undoRedo = useUndoRedo()
  const { t } = useLanguage()

  // Sub-hooks
  const sourceSearch = useSourceSearch()
  const sourceFileOps = useSourceFileOps()

  // Initial focus
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }, [])

  // Ref forwarding
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(textareaRef.current)
    } else if (ref) {
      ref.current = textareaRef.current
    }
  }, [ref])

  // Undo/Redo state subscription
  useEffect(() => {
    if (!fileId) return
    const updateState = () => {
      if (!fileId) return
      const state = undoRedo.getState(fileId)
      setCanUndo(state.canUndo)
      setCanRedo(state.canRedo)
    }
    updateState()
    const unsub = undoRedo.subscribeState(updateState)
    return unsub
  }, [fileId, undoRedo])

  // Init history —— 仅在 fileId 变化时初始化；value 经 ref 读取（补 value 会导致每次击键重初始化历史）
  const initValueRef = useRef(value)
  initValueRef.current = value
  useEffect(() => {
    if (!fileId) return
    undoRedo.initHistory(fileId, initValueRef.current)
  }, [fileId, undoRedo])

  const updateCurrentLine = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursorPos)
    const line = textBefore.split('\n').length
    setCurrentLineNumber(line)
  }, [])

  // Update current line on value change
  useEffect(() => {
    updateCurrentLine()
  }, [value, updateCurrentLine])

  const scrollToCursorCenter = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !typewriterMode) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = textarea.value.substring(0, cursorPos)
    const linesBeforeCursor = textBeforeCursor.split('\n').length
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24
    const cursorY = (linesBeforeCursor - 1) * lineHeight
    const containerHeight = textarea.clientHeight
    const targetScroll = cursorY - containerHeight / 2 + lineHeight / 2

    typewriterScrollingRef.current = true
    textarea.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    })
    setTimeout(() => {
      typewriterScrollingRef.current = false
    }, 300)
  }, [typewriterMode])

  const pushUndo = useCallback((newValue: string, groupKey?: string) => {
    if (isUndoRedoRef.current || !fileId) return
    const textarea = textareaRef.current
    const cursorStart = textarea ? textarea.selectionStart : 0
    const cursorEnd = textarea ? textarea.selectionEnd : 0
    undoRedo.pushHistory(fileId, newValue, cursorStart, cursorEnd, groupKey)
  }, [fileId, undoRedo])

  // Lint sub-hook (needs pushUndo)
  const sourceLint = useSourceLint({
    value,
    textareaRef,
    scrollContainerRef,
    pushUndo,
    onChange,
    lintMarkdown,
    t,
  })

  const handleUndo = useCallback(() => {
    if (!fileId) return
    const entry = undoRedo.undo(fileId)
    if (!entry) return
    isUndoRedoRef.current = true
    onChange(entry.content)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = entry.cursorStart
        textareaRef.current.selectionEnd = entry.cursorEnd
      }
      isUndoRedoRef.current = false
    })
  }, [fileId, undoRedo, onChange])

  const handleRedo = useCallback(() => {
    if (!fileId) return
    const entry = undoRedo.redo(fileId)
    if (!entry) return
    isUndoRedoRef.current = true
    onChange(entry.content)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = entry.cursorStart
        textareaRef.current.selectionEnd = entry.cursorEnd
      }
      isUndoRedoRef.current = false
    })
  }, [fileId, undoRedo, onChange])

  const handleInsertFootnote = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, value: currentValue } = textarea
    const result = insertFootnote(currentValue, selectionStart)

    pushUndo(result.newText, 'footnote')
    onChange(result.newText)

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = result.defCursorPos
        textareaRef.current.selectionEnd = result.defCursorPos
      }
    })
  }, [onChange, pushUndo])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isInitialRender.current) {
      return
    }
    const scrollPosition = e.currentTarget.scrollTop
    setScrollTop(scrollPosition)
    if (onScroll) {
      onScroll(scrollPosition, e.currentTarget)
    }
  }, [onScroll])

  // isInitialRender flag
  useEffect(() => {
    if (isInitialRender.current) {
      setTimeout(() => {
        isInitialRender.current = false
      }, 100)
    }
  }, [])

  // Stats
  const stats = useMemo<DocumentStats>(() => {
    return calculateStats(value)
  }, [value])

  const toggleWordCountMode = useCallback(() => {
    setWordCountMode(prev => prev === 'text' ? 'standard' : 'text')
  }, [])

  const handleFormatApplied = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Render markdown for editor (syntax highlighting overlay)
  const renderMarkdownForEditor = useMemo(() => {
    const lines = value.split('\n')
    let html = ''
    let imageIndex = 0
    const showLineHighlight = focusMode || typewriterMode

    const lineIssueMap = new Map<number, 'error' | 'warning'>()
    for (const issue of sourceLint.lintIssues) {
      const existing = lineIssueMap.get(issue.line)
      if (existing === 'error') continue
      if (issue.severity === 'error' || !existing) {
        lineIssueMap.set(issue.line, issue.severity)
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const issueSeverity = lineIssueMap.get(i)
      const isCurrentLine = showLineHighlight && (i + 1) === currentLineNumber
      const isFocusDimmed = focusMode && !isCurrentLine

      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
      let lastIndex = 0
      let newHtml = ''
      let imgIdx = imageIndex

      let match
      while ((match = imageRegex.exec(line)) !== null) {
        const [fullMatch, altText, url] = match
        const beforeText = line.substring(lastIndex, match.index)
        lastIndex = match.index + fullMatch.length

        let imgSrc = url
        if (imageStore.isImagePlaceholder(url)) {
          const placeholderId = imageStore.getPlaceholderId(url)
          if (placeholderId) {
            const base64Data = imageStore.getBase64Image(placeholderId)
            if (base64Data) {
              imgSrc = base64Data
            }
          }
        }

        newHtml += escapeHtml(beforeText)
        newHtml += `<span class="editor-image-wrapper" data-image-index="${imgIdx}"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(altText)}" class="editor-inline-image" /></span>`
        imgIdx++
      }
      imageIndex = imgIdx

      newHtml += escapeHtml(line.substring(lastIndex))

      let lineClass = ''
      let lineStyle = ''
      if (isCurrentLine) {
        lineClass = focusMode ? 'focus-current-line' : 'typewriter-cursor-line'
      }
      if (isFocusDimmed) {
        lineStyle = ' style="opacity:0.35"'
      }

      if (issueSeverity) {
        html += `<span class="lint-line-marker${lineClass ? ' ' + lineClass : ''}" data-severity="${issueSeverity}"${lineStyle}>${newHtml}</span>`
      } else if (lineClass || lineStyle) {
        html += `<span class="${lineClass}"${lineStyle}>${newHtml}</span>`
      } else {
        html += newHtml
      }
      html += (i < lines.length - 1 ? '\n' : '')
    }

    return html
  }, [value, sourceLint.lintIssues, focusMode, typewriterMode, currentLineNumber, imageStore])

  const currentWordCount = wordCountMode === 'text' ? stats.wordCountTextMode : stats.wordCountStandardMode

  return {
    // Refs
    textareaRef,
    scrollContainerRef,
    lintTimerRef: sourceLint.lintTimerRef,
    lintAnchorRef: sourceLint.lintAnchorRef,
    lintCloseTimerRef: sourceLint.lintCloseTimerRef,
    isUndoRedoRef,
    typewriterScrollingRef,

    // State
    error,
    setError,
    success,
    setSuccess,
    wordCountMode,
    searchMode: sourceSearch.searchMode,
    setSearchMode: sourceSearch.setSearchMode,
    lintIssues: sourceLint.lintIssues,
    showSaveAsModal: sourceFileOps.showSaveAsModal,
    setShowSaveAsModal: sourceFileOps.setShowSaveAsModal,
    showOptimizeModal: sourceFileOps.showOptimizeModal,
    setShowOptimizeModal: sourceFileOps.setShowOptimizeModal,
    showFrontMatter: sourceFileOps.showFrontMatter,
    setShowFrontMatter: sourceFileOps.setShowFrontMatter,
    largeImageConfirm,
    setLargeImageConfirm,
    isDragging,
    setIsDragging,
    scrollTop,
    showLintPopover: sourceLint.showLintPopover,
    setShowLintPopover: sourceLint.setShowLintPopover,
    canUndo,
    canRedo,
    currentLineNumber,

    // Core callbacks
    pushUndo,
    handleUndo,
    handleRedo,
    handleInsertFootnote,
    handleScroll,
    handleJumpToIssue: sourceLint.handleJumpToIssue,
    handleFixIssue: sourceLint.handleFixIssue,
    toggleWordCountMode,
    handleFormatApplied,
    scrollToCursorCenter,
    updateCurrentLine,

    // Computed
    stats,
    currentWordCount,
    renderMarkdownForEditor,

    // Language
    t,
  }
}

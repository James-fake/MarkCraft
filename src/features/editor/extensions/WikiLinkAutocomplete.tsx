import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { EditorView } from '@tiptap/pm/view'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useLanguage } from '@stores/LanguageStore'
import { formatDate } from '../../fileManager/DailyNoteService'
import type { FileNode } from '@src/types/fileManager'

interface WikiLinkAutocompleteProps {
  editor: Editor | null
}

interface PopupState {
  visible: boolean
  query: string
  cursorPos: number
  from: number
}

/** Heading mode state: which file and its name */
interface HeadingMode {
  fileId: string
  fileName: string
}

function stripMdExtension(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

const WikiLinkAutocomplete: React.FC<WikiLinkAutocompleteProps> = ({ editor }) => {
  const { t } = useLanguage()
  const [popupState, setPopupState] = useState<PopupState>({
    visible: false,
    query: '',
    cursorPos: 0,
    from: 0,
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [results, setResults] = useState<FileNode[]>([])
  const [headingMode, setHeadingMode] = useState<HeadingMode | null>(null)
  const [headingResults, setHeadingResults] = useState<string[]>([])
  const { searchFiles, getFileHeadings, resolveTarget, getFilePath } = useLinkIndex()
  const { rootFolder } = useFileManager()

  /**
   * 文件 id → 修改日期（补全列表里显示，便于区分同名笔记）。
   *
   * ⚠️ 不能直接用 `searchFiles` 返回的 FileNode —— 那里 `updatedAt` 是硬编码的 0
   *    （链接索引里只有名字与链接关系，没有时间戳），显示出来会全变成 1970 年。
   *    真实时间戳只存在于文件树（FileManager）里，故在此单独建索引。
   */
  const updatedStampById = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (node: FileNode) => {
      if (node.type === 'file' && node.updatedAt) {
        map.set(node.id, formatDate(new Date(node.updatedAt)))
      }
      node.children?.forEach(walk)
    }
    if (rootFolder) walk(rootFolder)
    return map
  }, [rootFolder])
  const containerRef = useRef<HTMLDivElement>(null)

  // Refs to avoid stale closures in the keydown handler
  const resultsRef = useRef(results)
  resultsRef.current = results
  const headingResultsRef = useRef(headingResults)
  headingResultsRef.current = headingResults
  const headingModeRef = useRef(headingMode)
  headingModeRef.current = headingMode
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex
  const popupStateRef = useRef(popupState)
  popupStateRef.current = popupState

  // C2: Generate date suggestions when query matches date pattern
  const dateSuggestions = useMemo(() => {
    if (!popupState.visible || headingMode) return []
    const q = popupState.query.trim()
    const dateMatch = q.match(/^(\d{4})-?(\d{0,2})-?(\d{0,2})$/)
    if (!dateMatch) return []
    const year = parseInt(dateMatch[1])
    if (year < 2000 || year > 2100) return []
    const month = dateMatch[2] ? parseInt(dateMatch[2]) : null
    const day = dateMatch[3] ? parseInt(dateMatch[3]) : null

    const suggestions: { dateStr: string; label: string }[] = []
    const baseDate = month ? new Date(year, month - 1, day || 1) : new Date()
    if (isNaN(baseDate.getTime())) return []
    const weekDays = [
      t.diary.weekday.sun, t.diary.weekday.mon, t.diary.weekday.tue,
      t.diary.weekday.wed, t.diary.weekday.thu, t.diary.weekday.fri, t.diary.weekday.sat,
    ]
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + i)
      if (d.getFullYear() === year) {
        const dateStr = formatDate(d)
        suggestions.push({ dateStr, label: t.editorWidgets.dateWeekday.replace('{date}', dateStr).replace('{wd}', weekDays[d.getDay()]) })
      }
    }
    return suggestions
  }, [popupState.visible, popupState.query, headingMode, t])

  const dateSuggestionsRef = useRef(dateSuggestions)
  dateSuggestionsRef.current = dateSuggestions

  // Current item count (files + date suggestions, or headings)
  const itemCount = headingMode ? headingResults.length : results.length + dateSuggestions.length

  // Detect [[... at cursor position
  const checkCursor = useCallback(() => {
    if (!editor) return

    const { selection } = editor.state
    if (!selection.empty) {
      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
      return
    }

    const $pos = selection.$head
    const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset)

    // Match [[ with optional filename, then optional separator (# or |), then optional text after separator
    const match = textBefore.match(/\[\[([^\]#|]*?)([#|]?)([^\]]*?)$/)
    if (!match) {
      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
      return
    }

    const fileNameQuery = match[1]
    const separator = match[2] // '#', '|', or ''
    const afterSeparator = match[3]
    const bracketStart = $pos.pos - match[0].length
    const cursorPos = $pos.pos

    // Feature B3: Alias mode — when '|' is present, hide popup
    if (separator === '|') {
      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
      return
    }

    // Get screen coordinates for positioning
    try {
      const rect = editor.view.coordsAtPos(cursorPos)
      setCoords({ left: rect.left, top: rect.bottom + 4 })
    } catch {
      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
      return
    }

    // Feature B2: Heading mode — when '#' is present
    if (separator === '#') {
      const resolvedId = resolveTarget(fileNameQuery)
      if (resolvedId) {
        const headings = getFileHeadings(resolvedId)
        setHeadingMode({ fileId: resolvedId, fileName: fileNameQuery })
        setHeadingResults(headings)
        setPopupState({
          visible: true,
          query: afterSeparator,
          cursorPos,
          from: bracketStart,
        })
        setSelectedIndex(0)
      } else {
        setHeadingMode(null)
        setHeadingResults([])
        setPopupState(prev => ({ ...prev, visible: false }))
      }
      return
    }

    // Normal file mode
    setHeadingMode(null)
    setPopupState({
      visible: true,
      query: fileNameQuery,
      cursorPos,
      from: bracketStart,
    })
    setSelectedIndex(0)
  }, [editor, getFileHeadings, resolveTarget])

  // Listen to editor events
  useEffect(() => {
    if (!editor) return

    editor.on('update', checkCursor)
    editor.on('selectionUpdate', checkCursor)

    return () => {
      editor.off('update', checkCursor)
      editor.off('selectionUpdate', checkCursor)
    }
  }, [editor, checkCursor])

  // Search files when query changes (file mode only)
  useEffect(() => {
    if (!popupState.visible || headingMode) {
      if (!headingMode) setResults([])
      return
    }
    const found = searchFiles(popupState.query)
    setResults(found)
    setSelectedIndex(0)
  }, [popupState.visible, popupState.query, searchFiles, headingMode])

  // Filter headings when heading mode query changes
  useEffect(() => {
    if (!popupState.visible || !headingMode) {
      setHeadingResults([])
      return
    }
    // Re-fetch headings and filter by afterSeparator query
    const headings = getFileHeadings(headingMode.fileId)
    const query = popupState.query.toLowerCase()
    const filtered = query
      ? headings.filter(h => h.toLowerCase().includes(query))
      : headings
    setHeadingResults(filtered)
    setSelectedIndex(0)
  }, [popupState.visible, popupState.query, headingMode, getFileHeadings])

  // Insert selected file as wiki link (file mode)
  const insertWikiLink = useCallback(
    (file: FileNode) => {
      if (!editor) return

      const fileName = stripMdExtension(file.name)
      const { from, cursorPos } = popupStateRef.current

      editor.chain().focus().command(({ tr, state }) => {
        // Delete from [[ to cursor
        tr.delete(from, cursorPos)
        // Insert the file name text
        tr.insertText(fileName, from)
        // Apply wikiLink mark
        const markType = state.schema.marks.wikiLink
        if (markType) {
          tr.addMark(from, from + fileName.length, markType.create({ target: fileName }))
        }
        return true
      }).run()

      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
    },
    [editor]
  )

  // Insert heading link (heading mode): inserts [[fileName#heading]]
  const insertHeadingLink = useCallback(
    (heading: string) => {
      if (!editor) return
      const mode = headingModeRef.current
      if (!mode) return

      const fullTarget = `${mode.fileName}#${heading}`
      const { from, cursorPos } = popupStateRef.current

      editor.chain().focus().command(({ tr, state }) => {
        tr.delete(from, cursorPos)
        tr.insertText(fullTarget, from)
        const markType = state.schema.marks.wikiLink
        if (markType) {
          tr.addMark(from, from + fullTarget.length, markType.create({ target: fullTarget }))
        }
        return true
      }).run()

      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
    },
    [editor]
  )

  // Keep refs current
  const insertWikiLinkRef = useRef(insertWikiLink)
  insertWikiLinkRef.current = insertWikiLink
  const insertHeadingLinkRef = useRef(insertHeadingLink)
  insertHeadingLinkRef.current = insertHeadingLink

  // C2: Insert date link as wiki link
  const insertDateLink = useCallback(
    (dateStr: string) => {
      if (!editor) return

      const { from, cursorPos } = popupStateRef.current

      editor.chain().focus().command(({ tr, state }) => {
        tr.delete(from, cursorPos)
        tr.insertText(dateStr, from)
        const markType = state.schema.marks.wikiLink
        if (markType) {
          tr.addMark(from, from + dateStr.length, markType.create({ target: dateStr }))
        }
        return true
      }).run()

      setPopupState(prev => ({ ...prev, visible: false }))
      setHeadingMode(null)
    },
    [editor]
  )

  const insertDateLinkRef = useRef(insertDateLink)
  insertDateLinkRef.current = insertDateLink

  // Keyboard handling for the popup (React onKeyDown on the portal div)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!popupState.visible || itemCount === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => (prev + 1) % itemCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount)
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (headingMode) {
            insertHeadingLink(headingResults[selectedIndex])
          } else if (selectedIndex < dateSuggestions.length) {
            insertDateLink(dateSuggestions[selectedIndex].dateStr)
          } else {
            insertWikiLink(results[selectedIndex - dateSuggestions.length])
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          setPopupState(prev => ({ ...prev, visible: false }))
          setHeadingMode(null)
          break
      }
    },
    [popupState.visible, itemCount, headingMode, headingResults, results, selectedIndex, insertWikiLink, insertHeadingLink, dateSuggestions, insertDateLink]
  )

  // Intercept key events from the editor using a stable override pattern
  const originalHandlerRef = useRef<((view: EditorView, event: KeyboardEvent) => boolean | void) | undefined>(undefined)
  const isOverriddenRef = useRef(false)

  // 提取复杂表达式为变量，供 effect deps 静态检查（语义与 visible && itemCount>0 完全一致）
  const popupActive = popupState.visible && itemCount > 0

  useEffect(() => {
    if (!editor) return

    // When popup is visible and has results, install the keydown override
    if (popupActive) {
      if (!isOverriddenRef.current) {
        originalHandlerRef.current = editor.view.props.handleKeyDown
        isOverriddenRef.current = true
      }

      const wrappedHandler = (view: EditorView, event: KeyboardEvent) => {
        const currentVisible = popupStateRef.current.visible
        const inHeading = headingModeRef.current !== null
        const currentHeadingResults = headingResultsRef.current
        const currentFileResults = resultsRef.current
        const currentDateSuggestions = dateSuggestionsRef.current
        const currentSelected = selectedIndexRef.current
        const currentCount = inHeading ? currentHeadingResults.length : currentFileResults.length + currentDateSuggestions.length

        if (currentVisible && currentCount > 0) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            event.stopPropagation()
            if (event.key === 'ArrowDown') {
              setSelectedIndex(prev => (prev + 1) % currentCount)
            } else {
              setSelectedIndex(prev => (prev - 1 + currentCount) % currentCount)
            }
            return true
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            if (inHeading) {
              insertHeadingLinkRef.current(currentHeadingResults[currentSelected])
            } else if (currentSelected < currentDateSuggestions.length) {
              insertDateLinkRef.current(currentDateSuggestions[currentSelected].dateStr)
            } else {
              insertWikiLinkRef.current(currentFileResults[currentSelected - currentDateSuggestions.length])
            }
            return true
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setPopupState(prev => ({ ...prev, visible: false }))
            setHeadingMode(null)
            return true
          }
        }

        if (originalHandlerRef.current) return originalHandlerRef.current(view, event)
        return false
      }

      try {
        editor.view.setProps({ handleKeyDown: wrappedHandler })
      } catch {
        // editor may have been destroyed
      }
    } else if (isOverriddenRef.current) {
      try {
        editor.view.setProps({ handleKeyDown: originalHandlerRef.current })
      } catch {
        // editor may have been destroyed
      }
      isOverriddenRef.current = false
      originalHandlerRef.current = undefined
    }
  }, [editor, popupActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editor && isOverriddenRef.current) {
        try {
          editor.view.setProps({ handleKeyDown: originalHandlerRef.current })
        } catch {
          // editor may have been destroyed
        }
        isOverriddenRef.current = false
        originalHandlerRef.current = undefined
      }
    }
  }, [editor])

  if (!popupState.visible || itemCount === 0) return null

  // Feature B1: Get first heading for a file
  const getFirstHeading = (fileId: string): string | null => {
    const headings = getFileHeadings(fileId)
    return headings.length > 0 ? headings[0] : null
  }

  // 单源基底：本组件经 createPortal 挂到 body，逃出 #aurora-root 的 --editor-* 重映射作用域，
  // 故必须复用 .aurora-dropdown（材质/边框/圆角/阴影/z-index:1000/padding 全部由它提供），
  // 内部一律只引用全局 --mc-* token，禁止再写旧 slate 变量或裸色值。
  return createPortal(
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="aurora-dropdown"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        maxHeight: 300,
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      {headingMode ? (
        // Feature B2: Heading mode rendering
        <>
          <div style={{
            padding: '6px 12px',
            fontSize: 'var(--mc-font-xs)',
            color: 'var(--mc-text-tertiary)',
            borderBottom: '1px solid var(--mc-border-subtle)',
            marginBottom: 4,
          }}>
            {t.editorWidgets.headingPrefix.replace('{name}', headingMode.fileName)}
          </div>
          {headingResults.map((heading, index) => (
            <div
              key={heading}
              onClick={() => insertHeadingLink(heading)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`aurora-dropdown__item${index === selectedIndex ? ' aurora-dropdown__item--highlighted' : ''}`}
              style={{
                height: 'auto',
                padding: '6px 12px',
                gap: 8,
                borderRadius: 'var(--mc-radius-sm)',
                borderLeft:
                  index === selectedIndex
                    ? '3px solid var(--mc-accent)'
                    : '3px solid transparent',
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>📑</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 'var(--mc-font-base)',
                  color: 'var(--mc-text-primary)',
                }}
              >
                {heading}
              </span>
            </div>
          ))}
        </>
      ) : (
        // File mode rendering (with C2: date suggestions, B1: first heading subtitle, A2: path info)
        <>
          {/* Date suggestions */}
          {dateSuggestions.map((ds, index) => (
            <div
              key={`date-${ds.dateStr}`}
              onClick={() => insertDateLink(ds.dateStr)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`aurora-dropdown__item${index === selectedIndex ? ' aurora-dropdown__item--highlighted' : ''}`}
              style={{
                height: 'auto',
                padding: '6px 12px',
                gap: 8,
                borderRadius: 'var(--mc-radius-sm)',
                borderLeft:
                  index === selectedIndex
                    ? '3px solid var(--mc-accent)'
                    : '3px solid transparent',
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>📅</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--mc-font-base)',
                    color: 'var(--mc-text-primary)',
                  }}
                >
                  {ds.dateStr}
                </span>
                <span
                  style={{
                    fontSize: 'var(--mc-font-xs)',
                    color: 'var(--mc-accent-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ds.label}
                </span>
              </div>
            </div>
          ))}
          {/* File results */}
          {results.map((file, index) => {
          const adjustedIndex = dateSuggestions.length + index
          const firstHeading = getFirstHeading(file.id)
          const filePath = getFilePath(file.id)
          // Check if there are duplicate names — if path differs from just the filename, show path
          const fileNameWithoutExt = stripMdExtension(file.name)
          const hasDuplicateName = results.some(
            other => other.id !== file.id && stripMdExtension(other.name) === fileNameWithoutExt
          )
          const stamp = updatedStampById.get(file.id)
          // 第二行文案：重名时以路径为主（警告色，好分辨）；否则「首标题 · 路径」
          const secondaryParts: string[] = []
          if (hasDuplicateName && filePath) {
            secondaryParts.push(filePath)
          } else {
            if (firstHeading) secondaryParts.push(firstHeading)
            if (filePath) secondaryParts.push(filePath)
          }
          const secondaryText = secondaryParts.join(' · ') || file.id
          return (
            <div
              key={file.id}
              onClick={() => insertWikiLink(file)}
              onMouseEnter={() => setSelectedIndex(adjustedIndex)}
              className={`aurora-dropdown__item${adjustedIndex === selectedIndex ? ' aurora-dropdown__item--highlighted' : ''}`}
              style={{
                height: 'auto',
                padding: '6px 12px',
                gap: 8,
                borderRadius: 'var(--mc-radius-sm)',
                borderLeft:
                  adjustedIndex === selectedIndex
                    ? '3px solid var(--mc-accent)'
                    : '3px solid transparent',
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--mc-font-base)',
                    color: 'var(--mc-text-primary)',
                  }}
                >
                  {stripMdExtension(file.name)}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--mc-font-xs)',
                      color:
                        hasDuplicateName && filePath
                          ? 'var(--mc-warning)'
                          : 'var(--mc-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {secondaryText}
                  </span>
                  {stamp ? (
                    <span
                      style={{
                        fontSize: 'var(--mc-font-xs)',
                        color: 'var(--mc-text-tertiary)',
                        opacity: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      {stamp}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        </>
      )}
    </div>,
    document.body
  )
}

export default WikiLinkAutocomplete

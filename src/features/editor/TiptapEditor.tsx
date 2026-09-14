import { useEditor, EditorContent } from '@tiptap/react'
import { djb2Hash } from '../../utils/hash'
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState, useMemo } from 'react'
import { htmlToMarkdown } from './markdownConvert'
import { useLanguage } from '../../stores/LanguageStore'
import { useUndoRedo } from '../../stores/UndoRedoStore'
import { useSettings } from '../../stores/SettingsStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useFileManager } from '../../stores/FileStore'
import TableBubbleMenu from './TableBubbleMenu'
import TableContextMenu from './extensions/TableContextMenu'
import EditorContextMenu from './EditorContextMenu'
import { EditorUIContext, EditorCoreContext, EditorModalsContext, EditorInsertContext } from './EditorUIContext'
import { EditorWysiwygToolbarSlot, EditorScrollSlot, EditorStatusBarSlot, EditorModalsSlot } from './EditorSlots'
import { calculateStats } from './stats'
import type { WordCountMode } from './hooks/useEditorState'
import { useTiptapSearch } from './hooks/useTiptapSearch'
import { useTiptapLint } from './hooks/useTiptapLint'
import { useTiptapFileOps } from './hooks/useTiptapFileOps'
import { useTiptapExtensions } from './hooks/useTiptapExtensions'
import { useTiptapImageHandler } from './hooks/useTiptapImageHandler'
import { useTiptapUndoRedo } from './hooks/useTiptapUndoRedo'
import { useTiptapContentSync } from './hooks/useTiptapContentSync'
import SearchReplaceBar from './components/SearchReplaceBar'
import { lintMarkdown } from '../lint/markdownLinter'
import type { LintIssue } from '../shared/utils/lintTypes'
import { imageStore } from '../shared/storage/imageStore'
import type { Editor as TiptapEditorType } from '@tiptap/react'
import WikiLinkAutocomplete from './extensions/WikiLinkAutocomplete'
import WikiLinkHoverPreview from './extensions/WikiLinkHoverPreview'
import { setWikiLinkClickHandler, setBrokenLinkClickHandler } from './extensions/WikiLink'
import { setBlockReferenceClickHandler } from './extensions/BlockReference'
import { saveEditorScroll } from '../../services/scrollPositionManager'
import { smoothScrollTo } from '../../utils/smoothScroll'

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  onPushUndo?: (value: string, groupKey?: string) => void
  onUndoRedoStateChange?: (canUndo: boolean, canRedo: boolean) => void
  onActiveHeadingChange?: (headingId: string | null) => void
  fileId?: string
  theme?: string
  focusMode?: boolean
  typewriterMode?: boolean
  livePreview?: boolean
  onToggleFocusMode?: () => void
  onToggleTypewriterMode?: () => void
  onToggleLivePreview?: () => void
  onOpenFile?: () => void
  onSaveAs?: () => void
  onBrokenLinkClick?: (target: string) => void
  /** 打开模板选择器（由 EditorLayout 透传，Aurora 注入） */
  onUseTemplate?: () => void
  /** 是否渲染内置 WYSIWYG 格式工具栏（Aurora 子面板可关闭，改用自身轻量工具栏） */
  showToolbar?: boolean
  /** 是否渲染内置状态栏（字数 / lint 指示），Aurora 子面板可关闭，改用自身底部条 */
  showStatusBar?: boolean
}

export interface TiptapEditorHandle {
  getEditor: () => TiptapEditorType | null
  flushContent: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
  scrollToHeading: (headingId: string) => void
  restoreScroll: (scrollTop: number) => void
  /** 编辑器内查找（编辑菜单 · 命令桥） */
  find: () => void
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(({ value, onChange, onPushUndo, onUndoRedoStateChange, onActiveHeadingChange, fileId, theme, focusMode, typewriterMode, livePreview, onToggleFocusMode, onToggleTypewriterMode, onToggleLivePreview, onOpenFile, onSaveAs, onBrokenLinkClick, onUseTemplate, showToolbar = true, showStatusBar = true }, ref) => {
  const { t } = useLanguage()
  const undoRedo = useUndoRedo()
  const { settings: appSettings } = useSettings()
  const linkIndex = useLinkIndex()
  const { openFile } = useFileManager()
  const isInternalUpdate = useRef(false)
  const lastEmittedMd = useRef<string | null>(null)
  const editorRef = useRef<TiptapEditorType | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // 真正滚动的容器（.tiptap-wrapper 有 overflow-y: auto）
  // wrapperRef 指向 .tiptap-editor-wrapper 是 flex column 容器，不滚动
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Extracted hooks for search, lint, and file operations
  const { searchMode, searchTerm, replaceTerm, openSearch, closeSearch, setSearchTerm, setReplaceTerm } = useTiptapSearch()
  const { lintIssues, showLintPopover, lintAnchorRef, lintCloseTimerRef, setShowLintPopover, scheduleLintCheck, cleanupLintTimer } = useTiptapLint({ lintMarkdown, t })
  const { showSaveAsModal, fileInputRef, handleOpenFile, handleSaveAs, handleFileChange, setShowSaveAsModal } = useTiptapFileOps({ onOpenFile, onSaveAs, fileId, undoRedo, onChange })

  const [wordCountMode, setWordCountMode] = useState<WordCountMode>('text')
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  const stats = useMemo(() => calculateStats(lastEmittedMd.current || ''), [lastEmittedMd.current])
  const currentWordCount = wordCountMode === 'text' ? stats.wordCountTextMode : stats.wordCountStandardMode
  const toggleWordCountMode = useCallback(() => {
    setWordCountMode(prev => prev === 'text' ? 'standard' : 'text')
  }, [])

  // Cache HTML snapshots for undo/redo
  const htmlSnapshotRef = useRef<Map<number, { md: string; html: string }>>(new Map())

  // Stable refs for callbacks to avoid stale closures
  const onActiveHeadingChangeRef = useRef(onActiveHeadingChange)
  onActiveHeadingChangeRef.current = onActiveHeadingChange
  const onUndoRedoStateChangeRef = useRef(onUndoRedoStateChange)
  onUndoRedoStateChangeRef.current = onUndoRedoStateChange
  const fileIdRef = useRef(fileId)
  fileIdRef.current = fileId
  const onPushUndoRef = useRef(onPushUndo)
  onPushUndoRef.current = onPushUndo
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Debounce timer for onChange
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Extracted hook for undo/redo
  const { undoFn, redoFn, isUndoRedoRef } = useTiptapUndoRedo({
    fileId, editorRef, undoRedo, onChange, htmlSnapshotRef, lastEmittedMd, isInternalUpdate,
  })

  // Stable refs for undo/redo so the extension always calls the latest version
  const undoFnRef = useRef<() => void>(() => {})
  const redoFnRef = useRef<() => void>(() => {})
  undoFnRef.current = undoFn
  redoFnRef.current = redoFn
  // 稳定 ref：供命令桥 find 触达编辑器内查找（SearchReplace 内部 openSearch）
  const openSearchRef = useRef<(mode: 'search' | 'replace') => void>(() => {})
  openSearchRef.current = openSearch

  // Extracted hook for extensions configuration
  const extensions = useTiptapExtensions({
    t, livePreview, undoFnRef, redoFnRef,
  })

  // Extracted hook for image handling (drag/drop/paste)
  const { handleDrop: imageHandleDrop, handlePaste: imageHandlePaste } = useTiptapImageHandler({ editorRef, t, useRelativeImagePath: appSettings.useRelativeImagePath })

  // Enhanced handleDrop: check for file drag from sidebar first, then fall through to image handler
  const handleDrop = useCallback((view: any, event: DragEvent, slice: any, moved: boolean) => {
    // Check for file drag from sidebar (WikiLink creation)
    const fileData = event.dataTransfer?.getData('application/markcraft-file')
    if (fileData) {
      try {
        const { fileName } = JSON.parse(fileData)
        const linkName = fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName
        const coord = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (coord) {
          const { pos } = coord
          const markType = view.state.schema.marks.wikiLink
          if (markType) {
            const tr = view.state.tr.insertText(linkName, pos)
            tr.addMark(pos, pos + linkName.length, markType.create({ target: linkName }))
            view.dispatch(tr)
          } else {
            view.dispatch(view.state.tr.insertText(`[[${linkName}]]`, pos))
          }
        }
      } catch {}
      return true
    }
    // Fall through to image handler
    return imageHandleDrop(view, event, slice, moved)
  }, [imageHandleDrop])

  const handlePaste = useCallback((view: any, event: ClipboardEvent, slice: any) => {
    if ((event as any).shiftKey) {
      (event as any).preventDefault()
      const text = (event as any).clipboardData?.getData('text/plain') || ''
      view.dispatch(view.state.tr.insertText(text))
      return true
    }

    // F3: Smart paste — detect WikiLink format and insert as WikiLink mark
    const plainText = event.clipboardData?.getData('text/plain')
    if (plainText) {
      const wikiLinkMatch = plainText.match(/^\[\[([^\]]+)\]\]$/m)
      if (wikiLinkMatch) {
        const target = wikiLinkMatch[1]
        const { from } = view.state.selection
        const markType = view.state.schema.marks.wikiLink
        if (markType) {
          event.preventDefault()
          const tr = view.state.tr.insertText(target, from)
          tr.addMark(from, from + target.length, markType.create({ target }))
          view.dispatch(tr)
          return true
        }
      }
    }

    return imageHandlePaste(view, event, slice)
  }, [imageHandlePaste])

  const editor = useEditor({
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed
    },
    extensions,
    editorProps: {
      attributes: {
        class: `tiptap-editor-content${appSettings.paragraphIndent ? ' paragraph-indent' : ''}`,
      },
      handleDrop,
      handlePaste,
      handleClick: (view, pos, event) => {
        if (event.ctrlKey || event.metaKey) {
          const node = view.state.doc.nodeAt(pos)
          if (node) {
            const linkMark = node.marks.find(m => m.type.name === 'link')
            if (linkMark?.attrs.href) {
              event.preventDefault()
              window.open(linkMark.attrs.href as string, '_blank', 'noopener')
              return true
            }
          }
        }
        return false
      },
      handleDOMEvents: {
        contextmenu(_view, event) {
          // 表格内右键：交给 TableContextMenu 处理，避免两层菜单叠加遮挡
          const targetEl = event.target as HTMLElement | null
          if (targetEl && targetEl.closest('table')) return false
          event.preventDefault()
          setCtxMenu({ visible: true, x: event.clientX, y: event.clientY })
          return true
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdate.current || isUndoRedoRef.current) return
      const html = ed.getHTML()
      const md = htmlToMarkdown(html)
      lastEmittedMd.current = md
      htmlSnapshotRef.current.set(djb2Hash(md), { md, html })
      if (htmlSnapshotRef.current.size > 50) {
        const firstKey = htmlSnapshotRef.current.keys().next().value
        if (firstKey !== undefined) htmlSnapshotRef.current.delete(firstKey)
      }
      const currentFileId = fileIdRef.current
      if (currentFileId) {
        undoRedo.pushHistory(currentFileId, md, 0, 0, 'wysiwyg-typing')
      }
      const currentOnPushUndo = onPushUndoRef.current
      if (currentOnPushUndo) currentOnPushUndo(md, 'wysiwyg-typing')
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        onChangeRef.current(md)
      }, 300)
      scheduleLintCheck(md)
      if (ed && !ed.isDestroyed) {
        const issues = lintMarkdown(md, t)
        ed.commands.setLintIssues(issues)
      }
    },
  })

  // Extracted hook for content sync
  useTiptapContentSync({
    editor, value, fileId, lastEmittedMd, isInternalUpdate, undoRedo, debounceTimerRef,
  })

  // 同步 livePreview prop 到 LivePreviewExtension 的 enabled 状态
  // extensions 始终注册，运行时通过 command 切换 enabled
  useEffect(() => {
    if (!editor) return
    if (editor.isDestroyed) return
    editor.commands.setLivePreviewEnabled(!!livePreview)
  }, [editor, livePreview])

  // Lint jump to issue
  const handleJumpToIssue = useCallback((issue: LintIssue) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const lines = (lastEmittedMd.current || value).split('\n')
    const targetLine = lines[issue.line]
    if (!targetLine) return
    const container = wrapperRef.current?.querySelector('.tiptap-editor-content')
    if (container) {
      const searchText = targetLine.trim().substring(0, 30)
      if (searchText) {
        const walker = document.createTreeWalker(container as Node, NodeFilter.SHOW_TEXT, null)
        let node: Node | null
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.includes(searchText)) {
            const element = node.parentElement
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              return
            }
          }
        }
      }
    }
  }, [value])

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    flushContent: () => {
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const html = ed.getHTML()
      const md = htmlToMarkdown(html)
      lastEmittedMd.current = md
      onChangeRef.current(md)
    },
    canUndo: () => {
      if (!fileId) return false
      return undoRedo.getState(fileId).canUndo
    },
    canRedo: () => {
      if (!fileId) return false
      return undoRedo.getState(fileId).canRedo
    },
    undo: () => undoFnRef.current(),
    redo: () => redoFnRef.current(),
    find: () => openSearchRef.current('search'),
    scrollToHeading: (headingId: string) => {
      if (!editor) return
      // 使用真正的滚动容器 .tiptap-wrapper（scrollContainerRef）
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return
      // 用 rAF 平滑滚动到标题顶部，每帧重读 heading 元素位置
      // 应对 Tiptap 内容渲染过程中位置动态变化
      smoothScrollTo(scrollContainer, () => {
        const headingEl = scrollContainer.querySelector(`[id="${headingId}"]`) as HTMLElement | null
        if (!headingEl) return scrollContainer.scrollTop
        const containerRect = scrollContainer.getBoundingClientRect()
        const headingRect = headingEl.getBoundingClientRect()
        // margin 0：标题精准对齐编辑区顶部，不露上一行
        return headingRect.top - containerRect.top + scrollContainer.scrollTop
      })
    },
    restoreScroll: (scrollTop: number) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return
      // 用 rAF 延迟 + 多帧重试，应对 Tiptap 内容/图片异步渲染
      // 导致 scrollHeight 偏小、scrollTop 被 clamp 到错误位置
      let attempts = 0
      const maxAttempts = 30 // 约 500ms
      const tryRestore = () => {
        const sc = scrollContainerRef.current
        if (!sc) return
        sc.scrollTop = scrollTop
        // 如果还没达到目标（被 clamp），继续重试
        if (Math.abs(sc.scrollTop - scrollTop) > 1 && attempts++ < maxAttempts) {
          requestAnimationFrame(tryRestore)
        }
      }
      requestAnimationFrame(tryRestore)
    },
  }), [editor, fileId, undoRedo])

  // Sync undo/redo state
  useEffect(() => {
    if (!fileId) return
    const updateState = () => {
      const state = undoRedo.getState(fileId)
      onUndoRedoStateChangeRef.current?.(state.canUndo, state.canRedo)
    }
    updateState()
    const unsub = undoRedo.subscribeState(updateState)
    return unsub
  }, [fileId, undoRedo])

  // WYSIWYG scroll → outline highlight
  useEffect(() => {
    if (!editor) return

    let scrollContainer: HTMLElement | null = null
    let raf = 0
    let attempts = 0
    let cleanup: (() => void) | null = null

    const setup = () => {
      // 真正滚动的容器是 .tiptap-wrapper（scrollContainerRef）
      scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        if (attempts++ < 60) {
          raf = requestAnimationFrame(setup)
        }
        return
      }
      const sc = scrollContainer

      let ticking = false
      const handleScroll = () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          ticking = false
          // headings 实时查询，应对内容渲染延迟
          const headings = sc.querySelectorAll('[id^="heading-"]')
          let activeId: string | null = null
          for (let i = headings.length - 1; i >= 0; i--) {
            const el = headings[i] as HTMLElement
            const rect = el.getBoundingClientRect()
            const containerRect = sc.getBoundingClientRect()
            if (rect.top <= containerRect.top + containerRect.height * 0.3) {
              activeId = el.id
              break
            }
          }
          if (!activeId && headings.length > 0) {
            const first = headings[0] as HTMLElement
            const rect = first.getBoundingClientRect()
            const containerRect = sc.getBoundingClientRect()
            if (rect.top < containerRect.bottom) {
              activeId = first.id
            }
          }
          onActiveHeadingChangeRef.current?.(activeId)
        })
        // 保存编辑器滚动位置（用于切换标签页后恢复）
        // saveEditorScroll 内部只在 scrollTop > 0 时更新，
        // 避免文件切换时 setTextSelection(0) 触发的 scroll-to-top 覆盖正确位置
        if (fileId) {
          saveEditorScroll(fileId, sc.scrollTop, sc.scrollHeight)
        }
      }

      sc.addEventListener('scroll', handleScroll, { passive: true })
      cleanup = () => {
        // 卸载前保存最终滚动位置
        if (fileId && sc) {
          saveEditorScroll(fileId, sc.scrollTop, sc.scrollHeight)
        }
        sc.removeEventListener('scroll', handleScroll)
      }
    }

    setup()
    return () => {
      cancelAnimationFrame(raf)
      cleanup?.()
    }
  }, [editor, fileId])

  // Theme sync
  useEffect(() => {
    if (!editor) return
    const isDark = theme === 'dark'
    const wrapperEl = wrapperRef.current
    if (wrapperEl) {
      if (isDark) {
        wrapperEl.setAttribute('data-theme', 'dark')
      } else {
        wrapperEl.removeAttribute('data-theme')
      }
    }
  }, [theme, editor])

  // Register WikiLink click handler for Ctrl+Click navigation
  useEffect(() => {
    const handler = (target: string, _event: MouseEvent) => {
      const result = linkIndex.resolveTargetFuzzy(target)
      if (result) {
        openFile(result.fileId)
      }
    }
    setWikiLinkClickHandler(handler)
    return () => setWikiLinkClickHandler(null)
  }, [linkIndex, openFile])

  // Register broken link click handler for Ctrl+Click on broken WikiLinks
  useEffect(() => {
    if (onBrokenLinkClick) {
      setBrokenLinkClickHandler(onBrokenLinkClick)
    } else {
      setBrokenLinkClickHandler(null)
    }
    return () => setBrokenLinkClickHandler(null)
  }, [onBrokenLinkClick])

  // Register block reference click handler: navigate to block source
  useEffect(() => {
    const handler = (blockId: string, _event: MouseEvent) => {
      // Resolve block via bridge and open source file
      import('../../services/blockReferenceBridge').then(({ resolveBlock, triggerBlockClick }) => {
        const block = resolveBlock(blockId)
        if (block) {
          openFile(block.fileId)
        } else {
          // Fallback: trigger generic click handler
          triggerBlockClick(blockId)
        }
      })
    }
    setBlockReferenceClickHandler(handler)
    return () => setBlockReferenceClickHandler(null)
  }, [openFile])

  // Update WikiLink mark attributes (broken/fuzzy/backlinkCount) when the link index changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const { state, view } = editor
    const { tr } = state
    let modified = false

    state.doc.descendants((node, pos) => {
      const wikiLinkMark = node.marks?.find(m => m.type.name === 'wikiLink')
      if (wikiLinkMark) {
        const target = wikiLinkMark.attrs.target as string
        const result = linkIndex.resolveTargetFuzzy(target)
        const isBroken = !result
        const isFuzzy = result?.fuzzy ?? false
        const backlinkCount = result ? linkIndex.getBacklinks(result.fileId).length : 0

        if (wikiLinkMark.attrs.broken !== isBroken || wikiLinkMark.attrs.fuzzy !== isFuzzy || wikiLinkMark.attrs.backlinkCount !== backlinkCount) {
          const newMark = wikiLinkMark.type.create({
            ...wikiLinkMark.attrs,
            broken: isBroken,
            fuzzy: isFuzzy,
            backlinkCount,
          })
          tr.removeMark(pos, pos + node.nodeSize, wikiLinkMark.type)
          tr.addMark(pos, pos + node.nodeSize, newMark)
          modified = true
        }
      }
    })

    if (modified && !editor.isDestroyed) {
      view.dispatch(tr)
    }
  }, [editor, linkIndex.indexVersion, linkIndex.resolveTargetFuzzy, linkIndex])

  // Flush pending debounced content on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        const currentMd = lastEmittedMd.current
        if (currentMd) onChangeRef.current(currentMd)
      }
      cleanupLintTimer()
    }
  }, [cleanupLintTimer])

  // Build sub-context values for Slot components
  const coreValue = useMemo(() => ({
    editorViewRef: { current: null },
    value,
    onChange,
    pushUndo: (newValue: string, groupKey?: string) => {
      if (fileId) undoRedo.pushHistory(fileId, newValue, 0, 0, groupKey || 'wysiwyg')
    },
    canUndo: fileId ? undoRedo.getState(fileId).canUndo : false,
    canRedo: fileId ? undoRedo.getState(fileId).canRedo : false,
    onUndo: () => undoFnRef.current(),
    onRedo: () => redoFnRef.current(),
    onFormatApplied: () => {},
    focusMode: focusMode ?? false,
    typewriterMode: typewriterMode ?? false,
    autocompleteEnabled: false,
    showPreview: false,
    onToggleFocusMode: onToggleFocusMode ?? (() => {}),
    onToggleTypewriterMode: onToggleTypewriterMode ?? (() => {}),
    onToggleAutocomplete: () => {},
    onTogglePreview: () => {},
    scrollContainerRef,
    stats,
    currentWordCount,
    wordCountMode,
    onToggleWordCountMode: toggleWordCountMode,
    t,
    tiptapEditor: editor,
    livePreview: livePreview ?? false,
    onToggleLivePreview: onToggleLivePreview ?? (() => {}),
    lintMarkdown,
    fixIssue: () => null,
    imageStore,
  }), [value, onChange, fileId, undoRedo, focusMode, typewriterMode, livePreview, onToggleFocusMode, onToggleTypewriterMode, onToggleLivePreview, editor, t, stats, currentWordCount, wordCountMode, toggleWordCountMode])

  const modalsValue = useMemo(() => ({
    onSearchReplace: () => openSearch('replace'),
    onSaveAs: handleSaveAs,
    onOptimizeImages: () => {},
    onOpenFrontMatter: () => {},
    onUploadImage: () => {},
    onOpenFile: handleOpenFile,
    onUseTemplate: onUseTemplate ?? (() => {}),
    onPrint: () => {
      const html = editor?.getHTML() || ''
      import('../export/printDocument').then(({ printDocument }) => {
        printDocument(html)
      })
    },
    searchMode,
    onCloseSearch: () => closeSearch(),
    showSaveAsModal,
    onCloseSaveAsModal: () => setShowSaveAsModal(false),
    showOptimizeModal: false,
    onCloseOptimizeModal: () => {},
    showFrontMatter: false,
    onCloseFrontMatter: () => {},
    lintIssues,
    showLintPopover,
    onCloseLintPopover: () => setShowLintPopover(false),
    onJumpToIssue: handleJumpToIssue,
    onFixIssue: (newContent: string) => {
      if (fileId) undoRedo.pushHistory(fileId, newContent, 0, 0, 'lint-fix')
      onChange(newContent)
    },
    lintAnchorEl: lintAnchorRef.current,
    lintCloseTimerRef,
    lintAnchorRef,
    setShowLintPopover: setShowLintPopover as (show: boolean) => void,
    largeImageConfirm: null,
    onDismissLargeImageConfirm: () => {},
    error: null,
    success: null,
  }), [searchMode, lintIssues, showSaveAsModal, showLintPopover, handleOpenFile, handleSaveAs, handleJumpToIssue, openSearch, closeSearch, lintAnchorRef, lintCloseTimerRef, fileId, undoRedo, onChange, setShowLintPopover])

  const insertValue = useMemo(() => ({
    onInsertFootnote: () => {},
    onInsertInlineMath: () => {},
    onInsertBlockMath: () => {},
    onInsertMathTemplate: () => {},
    onInsertMermaid: () => {},
  }), [])

  const editorUIValue = useMemo(() => ({
    ...coreValue,
    ...modalsValue,
    ...insertValue,
  }), [coreValue, modalsValue, insertValue])

  if (!editor) {
    return (
      <div className="tiptap-loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--editor-text)',
        opacity: 0.5,
        fontSize: '14px',
      }}>
        Loading editor...
      </div>
    )
  }

  return (
    <EditorCoreContext.Provider value={coreValue}>
    <EditorModalsContext.Provider value={modalsValue}>
    <EditorInsertContext.Provider value={insertValue}>
    <EditorUIContext.Provider value={editorUIValue}>
    <div ref={wrapperRef} className="tiptap-editor-wrapper" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--editor-bg)',
      position: 'relative',
      '--editor-max-width': `${appSettings.editorMaxWidth}px`,
      '--editor-font-family': appSettings.fontFamily,
      '--editor-font-size': `${appSettings.fontSize}px`,
      '--editor-line-height': String(appSettings.lineHeight),
      '--editor-code-font-family': appSettings.codeFontFamily,
    } as React.CSSProperties}>
      {showToolbar && <EditorWysiwygToolbarSlot />}
      {searchMode && (
        <SearchReplaceBar
          editor={editor}
          searchMode={searchMode}
          searchTerm={searchTerm}
          replaceTerm={replaceTerm}
          onClose={() => closeSearch()}
          onSearchTermChange={setSearchTerm}
          onReplaceTermChange={setReplaceTerm}
          t={t}
        />
      )}
      <div className="tiptap-wrapper" ref={scrollContainerRef}>
        <EditorContent editor={editor} />
      </div>
      <EditorScrollSlot />
      <TableBubbleMenu editor={editor} />
      <TableContextMenu editor={editor} />
      <EditorContextMenu
        visible={ctxMenu.visible}
        x={ctxMenu.x}
        y={ctxMenu.y}
        editor={editor}
        mode="wysiwyg"
        onClose={() => setCtxMenu({ visible: false, x: 0, y: 0 })}
      />
      {showStatusBar && <EditorStatusBarSlot />}
      <WikiLinkAutocomplete editor={editor} />
      <WikiLinkHoverPreview editor={editor} />
      <input ref={fileInputRef as React.LegacyRef<HTMLInputElement>} type="file" accept=".md,.markdown" multiple={false} onChange={handleFileChange} className="hidden" aria-hidden="true" />
      <EditorModalsSlot />
    </div>
    </EditorUIContext.Provider>
    </EditorInsertContext.Provider>
    </EditorModalsContext.Provider>
    </EditorCoreContext.Provider>
  )
})

export default TiptapEditor

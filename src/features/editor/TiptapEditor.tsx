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
// —— P5-1 拆分：拖放/粘贴编排、大纲滚动联动、链接接线、滚动命令各成 hook ——
import { useTiptapDropPaste } from './hooks/useTiptapDropPaste'
import { useTiptapOutlineScroll } from './hooks/useTiptapOutlineScroll'
import { useTiptapLinkWiring } from './hooks/useTiptapLinkWiring'
import { useTiptapScrollCommands } from './hooks/useTiptapScrollCommands'
import { useTiptapUndoRedo } from './hooks/useTiptapUndoRedo'
import { useTiptapContentSync } from './hooks/useTiptapContentSync'
import SearchReplaceBar from './components/SearchReplaceBar'
import { lintMarkdown } from '../lint/markdownLinter'
import type { LintIssue } from '@utils/lintTypes'
import { imageStore } from '@core/storage/imageStore'
import type { Editor as TiptapEditorType } from '@tiptap/react'
import WikiLinkAutocomplete from './extensions/WikiLinkAutocomplete'
import WikiLinkHoverPreview from './extensions/WikiLinkHoverPreview'

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
  // WYSIWYG 端原先缺失 front-matter / 优化图片两个模态的可见性状态（源码模式这些状态在
  // useSourceFileOps / useCM6State），导致面板永远打不开。面板渲染与内容读写由 EditorSlots
  // 统一走 ctx.value / ctx.onChange（两模式都是 markdown 源），故此处只需补可见性状态即可。
  const [showFrontMatter, setShowFrontMatter] = useState(false)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false)

  const [wordCountMode, setWordCountMode] = useState<WordCountMode>('text')
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  // stats 以 lastEmittedMd.current 的字符串值为失效依据（值在渲染期更新）；
  // 规则不认可 .current 作 dep，但该 memo 无响应式数据源可用，禁用保持语义
  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: lastEmittedMd.current 字符串值为读取型 memo 的失效依据
  const stats = useMemo(() => calculateStats(lastEmittedMd.current || ''), [lastEmittedMd.current])
  const currentWordCount = wordCountMode === 'text' ? stats.wordCountTextMode : stats.wordCountStandardMode
  const toggleWordCountMode = useCallback(() => {
    setWordCountMode(prev => prev === 'text' ? 'standard' : 'text')
  }, [])

  // Cache HTML snapshots for undo/redo
  const htmlSnapshotRef = useRef<Map<number, { md: string; html: string }>>(new Map())

  // Stable refs for callbacks to avoid stale closures
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

  // Extracted hook for drag/paste orchestration（文件拖入建 WikiLink / Shift 纯文本 / 智能粘贴 → 图片回落）
  const { handleDrop, handlePaste } = useTiptapDropPaste({ editorRef, t, useRelativeImagePath: appSettings.useRelativeImagePath })

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
              const href = linkMark.attrs.href as string
              // 协议白名单（与 CM6 openExternalSafely 一致）：仅放行 http(s)/mailto/tel，
              // 拒绝 javascript:/data: 等，避免 Ctrl/Cmd+点击执行任意脚本
              if (/^(https?|mailto|tel):/i.test(href.trim())) {
                event.preventDefault()
                window.open(href, '_blank', 'noopener')
                return true
              }
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

  // 滚动命令（P5-1：scrollToHeading / restoreScroll 迁至 useTiptapScrollCommands）
  const { scrollToHeading, restoreScroll } = useTiptapScrollCommands(scrollContainerRef)

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
    scrollToHeading,
    restoreScroll,
  }), [editor, fileId, undoRedo, scrollToHeading, restoreScroll])

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

  // WYSIWYG scroll → outline highlight（P5-1：effect 迁至 useTiptapOutlineScroll）
  useTiptapOutlineScroll(editor, scrollContainerRef, fileId, onActiveHeadingChange)

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

  // WikiLink / 块引用点击导航接线 + mark 属性同步（P5-1：4 个 effect 迁至 useTiptapLinkWiring）
  useTiptapLinkWiring(editor, linkIndex, openFile, onBrokenLinkClick)

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
    onOptimizeImages: () => setShowOptimizeModal(true),
    onOpenFrontMatter: () => setShowFrontMatter(true),
    // WYSIWYG 图片插入走 WysiwygToolbar 自己的 ImageModal（showImageModal），不消费此 CM6 文件选择器
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
    showOptimizeModal: showOptimizeModal,
    onCloseOptimizeModal: () => setShowOptimizeModal(false),
    showFrontMatter: showFrontMatter,
    onCloseFrontMatter: () => setShowFrontMatter(false),
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
  }), [searchMode, lintIssues, showSaveAsModal, showLintPopover, handleOpenFile, handleSaveAs, handleJumpToIssue, openSearch, closeSearch, lintAnchorRef, lintCloseTimerRef, fileId, undoRedo, onChange, setShowLintPopover, showFrontMatter, setShowFrontMatter, showOptimizeModal, setShowOptimizeModal, editor, onUseTemplate, setShowSaveAsModal])

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

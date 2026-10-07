import { forwardRef, useImperativeHandle, useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { useCM6State } from './cm6/useCM6State'
import { ThemeType } from '@features/themes/useTheme'
import { EditorUIContext } from './EditorUIContext'
import EditorContextMenu from './EditorContextMenu'
import { EditorToolbarSlot, EditorFocusModeToolbarSlot, EditorSearchSlot, EditorScrollSlot, EditorStatusBarSlot, EditorModalsSlot } from './EditorSlots'
import {
  cm6FormatInlineMath, cm6FormatBlockMath, cm6InsertFootnote,
  cm6InsertImage, cm6InsertMathTemplate, cm6InsertMermaidBlock,
} from './cm6/autocompleteExtension'
import { lintMarkdown, fixIssue } from '../lint/markdownLinter'
import { imageStore, registerRelativePath } from '@core/storage/imageStore'
import { findHeadingLine } from '@utils/headingIdUtils'
import { smoothScrollTo } from '../../utils/smoothScroll'
// P3-3.4 E5：富文本粘贴 → 规范 Markdown（Word/网页/Notion，turndown 已就绪，此处接线）
import { htmlToMarkdown } from './markdownConvert'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml']

export interface CodeMirrorEditorHandle {
  getView: () => EditorView | null
  focus: () => void
  scrollToHeading: (headingId: string) => void
  /** 打开编辑器内查找（编辑菜单 · 命令桥，复用应用自定义 SearchReplaceBar） */
  openSearch: () => void
}

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onScroll?: (scrollPosition: number, element: HTMLElement) => void
  showPreview?: boolean
  onTogglePreview?: () => void
  focusMode?: boolean
  typewriterMode?: boolean
  onToggleFocusMode?: () => void
  onToggleTypewriterMode?: () => void
  autocompleteEnabled?: boolean
  onToggleAutocomplete?: () => void
  fileId?: string | null
  theme?: ThemeType
  useRelativeImagePath?: boolean
  onImportFile?: () => void
  // 打印当前文件内容（由 EditorLayout 注入，使用渲染后的 HTML；缺省回退到 window.print）
  onPrint?: () => void
  /** 打开模板选择器（由 EditorLayout 透传，Aurora 注入） */
  onUseTemplate?: () => void
  // 选区变化回调（浮动格式工具栏）
  onSelectionChange?: (info: { rect: { left: number; top: number; right: number; bottom: number } } | null) => void
}

const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(function CodeMirrorEditor(
  { value, onChange, onScroll, showPreview = true, onTogglePreview, focusMode = false, typewriterMode = false, onToggleFocusMode, onToggleTypewriterMode, autocompleteEnabled = true, onToggleAutocomplete, fileId, theme = 'light', useRelativeImagePath = false, onImportFile, onPrint, onUseTemplate, onSelectionChange }: CodeMirrorEditorProps,
  ref
) {
  const state = useCM6State({
    value,
    onChange,
    fileId,
    onScroll,
    focusMode,
    typewriterMode,
    theme,
    lintMarkdown,
    fixIssue,
    imageStore,
    onSelectionChange,
  })

  // state 对象本身每渲染新建（useCM6State 返回新字面量），不能整体作 dep；
  // 此处解构出稳定引用（原生 useState setter + undo/redo 回调）供回调用作 dep。
  const { setError, setSuccess, setLargeImageConfirm, setIsDragging, pushUndo } = state

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })

  useImperativeHandle(ref, () => ({
    getView: () => state.viewRef.current,
    focus: () => state.viewRef.current?.focus(),
    scrollToHeading: (headingId: string) => {
      const view = state.viewRef.current
      if (!view) return
      const lineNumber = findHeadingLine(value, headingId)
      if (lineNumber < 1) return
      const docLine = Math.min(lineNumber, view.state.doc.lines)
      const scrollDom = view.scrollDOM
      // 用 rAF 平滑滚动到标题行顶部（margin 0），每帧重读 lineBlock.top
      // 应对 CM6 虚拟滚动下坐标动态变化
      smoothScrollTo(scrollDom, () => {
        const pos = view.state.doc.line(docLine).from
        // lineBlockAt.top 是该行在文档坐标系（即 scrollTop 坐标系）的 top
        return view.lineBlockAt(pos).top
      })
      view.focus()
    },
    openSearch: () => state.setSearchMode('search'),
  }))

  const { t } = state

  const insertImageAtCursor = useCallback((imageUrl: string, altText: string) => {
    const view = state.viewRef.current
    if (!view) return

    let displayUrl: string
    if (imageUrl.startsWith('data:')) {
      if (useRelativeImagePath) {
        // Use relative path mode: store image and create assets/ path reference
        const imageId = imageStore.storeBase64Image(imageUrl)
        const ext = imageUrl.match(/data:image\/(\w+);/)?.[1] || 'png'
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const relativePath = `assets/image_${timestamp}_${random}.${ext}`
        registerRelativePath(relativePath, imageId)
        displayUrl = relativePath
      } else {
        const imageId = imageStore.storeBase64Image(imageUrl)
        displayUrl = imageStore.createPlaceholderUrl(imageId)
      }
    } else {
      displayUrl = imageUrl
    }

    cm6InsertImage(view, displayUrl, altText)
  }, [useRelativeImagePath, state.viewRef])

  const processImageFile = useCallback((file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(t.editor.unsupportedImageFormat)
      setTimeout(() => setError(null), 5000)
      return
    }

    const isLargeFile = file.size > MAX_IMAGE_SIZE

    const doInsert = () => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = e.target?.result as string
        if (base64Data) {
          const altText = file.name.replace(/\.[^/.]+$/, '') || 'image'
          insertImageAtCursor(base64Data, altText)
          setSuccess(t.editor.imageInsertSuccess)
          setTimeout(() => setSuccess(null), 3000)
        }
      }
      reader.onerror = () => {
        setError(`${t.editor.imageReadError}`)
        setTimeout(() => setError(null), 5000)
      }
      reader.readAsDataURL(file)
    }

    if (isLargeFile) {
      setLargeImageConfirm({ file, onConfirm: doInsert })
      return
    }

    doInsert()
  }, [insertImageAtCursor, t, setError, setSuccess, setLargeImageConfirm])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [setIsDragging])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [setIsDragging])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = event.dataTransfer.files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        processImageFile(file)
        break
      }
    }
  }, [processImageFile, setIsDragging])

  useEffect(() => {
    const view = state.viewRef.current
    if (!view) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) processImageFile(file)
          return
        }
      }

      // P3-3.4 E5：富文本（HTML）粘贴 → 规范 Markdown（Word/网页/Notion）
      // 仅当剪贴板含 HTML 且能转出有效 Markdown 时拦截；纯文本粘贴不干预（走浏览器默认）
      const html = event.clipboardData?.getData('text/html')
      if (html && html.trim().length > 0) {
        const md = htmlToMarkdown(html).trim()
        if (md.length > 0) {
          event.preventDefault()
          const sel = view.state.selection.main
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: md },
            selection: { anchor: sel.from + md.length },
          })
          view.focus()
        }
      }
    }

    view.dom.addEventListener('paste', handlePaste)
    return () => view.dom.removeEventListener('paste', handlePaste)
  }, [processImageFile, state.viewRef])

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleOpenImageFile = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validExtensions = ['.md', '.markdown']
    const fileName = file.name.toLowerCase()
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

    if (!isValidExtension) {
      setError(t.editor.unsupportedFileFormat)
      setTimeout(() => setError(null), 5000)
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      pushUndo(content, 'open-file')
      onChange(content)
    }
    reader.onerror = () => {
      setError(`${t.editor.fileReadError}`)
      setTimeout(() => setError(null), 5000)
    }
    reader.readAsText(file, 'UTF-8')
    event.target.value = ''
  }, [onChange, pushUndo, setError, t])

  const handleImageFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processImageFile(file)
    event.target.value = ''
  }, [processImageFile])

  const handleInsertFootnote = useCallback(() => {
    const view = state.viewRef.current
    if (view) cm6InsertFootnote(view)
  }, [state.viewRef])

  const handleInsertInlineMath = useCallback(() => {
    const view = state.viewRef.current
    if (view) cm6FormatInlineMath(view)
  }, [state.viewRef])

  const handleInsertBlockMath = useCallback(() => {
    const view = state.viewRef.current
    if (view) cm6FormatBlockMath(view)
  }, [state.viewRef])

  const handleInsertMathTemplate = useCallback((latex: string, mode: 'inline' | 'block', _isTemplate: boolean) => {
    const view = state.viewRef.current
    if (view) cm6InsertMathTemplate(view, latex, mode)
  }, [state.viewRef])

  const handleInsertMermaid = useCallback((code: string) => {
    const view = state.viewRef.current
    if (view) cm6InsertMermaidBlock(view, code)
  }, [state.viewRef])

  const editorUIValue = useMemo(() => ({
    editorViewRef: state.viewRef,
    value,
    onChange,
    pushUndo: state.pushUndo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    onUndo: state.handleUndo,
    onRedo: state.handleRedo,
    onFormatApplied: state.handleFormatApplied,
    focusMode,
    typewriterMode,
    autocompleteEnabled,
    showPreview,
    onToggleFocusMode: onToggleFocusMode ?? (() => {}),
    onToggleTypewriterMode: onToggleTypewriterMode ?? (() => {}),
    onToggleAutocomplete: onToggleAutocomplete ?? (() => {}),
    onTogglePreview: onTogglePreview ?? (() => {}),
    onSearchReplace: () => state.setSearchMode('replace'),
    onSaveAs: () => state.setShowSaveAsModal(true),
    onOptimizeImages: () => state.setShowOptimizeModal(true),
    onOpenFrontMatter: () => state.setShowFrontMatter(true),
    onUploadImage: handleOpenImageFile,
    onOpenFile: onImportFile ?? handleOpenFile,
    onPrint: onPrint ?? (() => window.print()),
    onUseTemplate: onUseTemplate ?? (() => {}),
    onInsertFootnote: handleInsertFootnote,
    onInsertInlineMath: handleInsertInlineMath,
    onInsertBlockMath: handleInsertBlockMath,
    onInsertMathTemplate: handleInsertMathTemplate,
    onInsertMermaid: handleInsertMermaid,
    searchMode: state.searchMode,
    onCloseSearch: () => state.setSearchMode(null),
    showSaveAsModal: state.showSaveAsModal,
    onCloseSaveAsModal: () => state.setShowSaveAsModal(false),
    showOptimizeModal: state.showOptimizeModal,
    onCloseOptimizeModal: () => state.setShowOptimizeModal(false),
    showFrontMatter: state.showFrontMatter,
    onCloseFrontMatter: () => state.setShowFrontMatter(false),
    lintIssues: state.lintIssues,
    showLintPopover: state.showLintPopover,
    onCloseLintPopover: () => state.setShowLintPopover(false),
    onJumpToIssue: state.handleJumpToIssue,
    onFixIssue: (newContent: string) => { state.pushUndo(newContent, 'lint-fix'); onChange(newContent) },
    lintAnchorEl: state.lintAnchorRef.current,
    lintCloseTimerRef: state.lintCloseTimerRef,
    scrollContainerRef: state.scrollDomRef,
    stats: state.stats,
    currentWordCount: state.currentWordCount,
    wordCountMode: state.wordCountMode,
    onToggleWordCountMode: state.toggleWordCountMode,
    lintAnchorRef: state.lintAnchorRef,
    setShowLintPopover: state.setShowLintPopover,
    t,
    largeImageConfirm: state.largeImageConfirm,
    onDismissLargeImageConfirm: () => state.setLargeImageConfirm(null),
    error: state.error,
    success: state.success,
    lintMarkdown,
    fixIssue,
    imageStore,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- interop: state 为 useCM6State 每渲染新对象，补根对象将使本 UI 上下文每渲染换新引用拖垮编辑器子树；下方成员路径已枚举全部响应式输入
  }), [
    state.viewRef, value, onChange, state.pushUndo,
    state.canUndo, state.canRedo, state.handleUndo, state.handleRedo,
    state.handleFormatApplied,
    focusMode, typewriterMode, autocompleteEnabled, showPreview,
    onToggleFocusMode, onToggleTypewriterMode, onToggleAutocomplete, onTogglePreview,
    state.searchMode, state.showSaveAsModal, state.showOptimizeModal, state.showFrontMatter,
    state.lintIssues, state.showLintPopover, state.handleJumpToIssue, state.lintAnchorRef, state.lintCloseTimerRef,
    state.stats, state.currentWordCount, state.wordCountMode, state.toggleWordCountMode,
    state.setShowLintPopover, state.setSearchMode, state.setShowSaveAsModal, state.setShowOptimizeModal, state.setShowFrontMatter, state.setShowLintPopover, state.setLargeImageConfirm,
    t,
    handleOpenImageFile, handleOpenFile,
    handleInsertFootnote, handleInsertInlineMath, handleInsertBlockMath, handleInsertMathTemplate, handleInsertMermaid,
    state.error, state.success, state.largeImageConfirm,
    onPrint, onUseTemplate, onImportFile,
  ])

  return (
    <EditorUIContext.Provider value={editorUIValue}>
    <div className="h-full flex flex-col">
      {!focusMode && (
        <EditorToolbarSlot />
      )}

      {focusMode && (
        <EditorFocusModeToolbarSlot />
      )}

      {state.searchMode && (
        <EditorSearchSlot />
      )}

      {state.error && (
        <div className="px-4 py-2 bg-red-500 text-white text-sm flex items-center gap-2" role="alert" aria-live="polite">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="px-4 py-2 bg-green-500 text-white text-sm flex items-center gap-2" role="status" aria-live="polite">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {state.success}
        </div>
      )}

      <div
        className={`editor-area flex-1 w-full overflow-hidden relative ${
          state.isDragging ? 'ring-2 ring-blue-500 ring-inset' : ''
        }`}
        style={{ backgroundColor: 'var(--editor-bg)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          e.preventDefault()
          setCtxMenu({ visible: true, x: e.clientX, y: e.clientY })
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'linear-gradient(to bottom, var(--button-primary), transparent)',
            opacity: 0.3,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
        <div
          ref={state.containerRef}
          className="cm-editor-container"
          style={{ height: '100%' }}
        />
        <EditorScrollSlot />
      </div>

      <EditorStatusBarSlot />

      <input ref={fileInputRef} type="file" accept=".md,.markdown" multiple={false} onChange={handleFileChange} className="hidden" aria-hidden="true" />
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml" multiple={false} onChange={handleImageFileChange} className="hidden" aria-hidden="true" />

      <EditorModalsSlot />
      <EditorContextMenu
        visible={ctxMenu.visible}
        x={ctxMenu.x}
        y={ctxMenu.y}
        editor={null}
        mode="source"
        onClose={() => setCtxMenu({ visible: false, x: 0, y: 0 })}
      />
    </div>
    </EditorUIContext.Provider>
  )
})

export default CodeMirrorEditor
export type { CodeMirrorEditorProps }
// 注意：不要从这里导出 useCM6State，会导致 HMR 不兼容
// （"useCM6State" export is incompatible）
// 如果需要导入 useCM6State，请直接从 './cm6/useCM6State' 导入

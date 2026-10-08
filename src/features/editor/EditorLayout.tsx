import { useState, useCallback, useRef, useEffect, lazy, Suspense, forwardRef, useImperativeHandle } from 'react'
import ErrorBoundary from '@components/ui/ErrorBoundary'
import { EditorView } from '@codemirror/view'
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands'
import { useLanguage } from '../../stores/LanguageStore'
import { useUndoRedo } from '../../stores/UndoRedoStore'
import { useSettings } from '../../stores/SettingsStore'
import { useFileManager } from '../../stores/FileStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import TiptapEditor, { TiptapEditorHandle } from './TiptapEditor'
import CodeMirrorEditor, { CodeMirrorEditorHandle } from './CodeMirrorEditor'
import Preview from '../preview/Preview'
import FootnoteSidebar from './components/FootnoteSidebar'
import NoteContextPanel from './components/NoteContextPanel'
import WritingAidPanel from './components/WritingAidPanel'
import DraftInsightPanel from './components/DraftInsightPanel'
import FootnoteFromClipboard from './components/FootnoteFromClipboard'
import { pasteUrlAsFootnote } from './footnoteAuto'
import LinkBreadcrumb from './components/LinkBreadcrumb'
import { navigationTracker } from './NavigationTracker'
import GoToLineDialog from './GoToLineDialog'
import { getRelativeScrollPosition, setRelativeScrollPosition } from './scrollSync'
// —— P4-4 拆分：模式工具栏（含加入知识库下拉的状态闭合块）整块迁出 ——
import { EditorModeToolbar } from './EditorModeToolbar'
import { ThemeType } from '@features/themes/useTheme'
import { getEditorScrollCM, getEditorScroll, getPreviewScroll, hasSavedScrollPosition } from '../../services/scrollPositionManager'

const LazyOutline = lazy(() => import('../outline/Outline'))

interface EditorLayoutProps {
  localContent: string
  onChange: (value: string) => void
  renderedHtml: string
  theme: ThemeType
  language: 'zh' | 'en'
  onToggleTheme: () => void
  onToggleLanguage: () => void
  editorMode: 'source' | 'wysiwyg'
  onSwitchEditorMode: (mode: 'source' | 'wysiwyg') => void
  effectiveShowPreview: boolean
  effectiveShowSource: boolean
  effectiveShowOutline: boolean
  showSource: boolean
  showPreview: boolean
  focusMode: boolean
  typewriterMode: boolean
  autocompleteEnabled: boolean
  livePreview: boolean
  onTogglePreview: () => void
  onToggleSource: () => void
  onToggleFocusMode: () => void
  onToggleTypewriterMode: () => void
  onToggleAutocomplete: () => void
  onToggleLivePreview: () => void
  onContentChange: (markdown: string) => void
  onDeleteImage: (index: number) => void
  activeFileId: string | undefined
  gridColumns: string
  showModeToolbar: boolean
  onImportFile?: () => void
  onBrokenLinkClick?: (target: string) => void
  onOpenDailyNote?: () => void
  isDiary?: boolean
  onBackToDiary?: () => void
  onOpenVersionHistory?: () => void
  isVersionHistoryOpen?: boolean
  // 打印当前文件内容（由 App 注入，使用渲染后的 HTML；缺省回退到 window.print）
  onPrint?: () => void
  /** 打开模板选择器（Aurora 编辑器注入；未提供则更多菜单不显示「使用模板」） */
  onUseTemplate?: () => void
}

/** 命令面板「跳转到行号」经命令桥触达编辑器内部 GoToLineDialog 的命令句柄。 */
export interface EditorLayoutHandle {
  /** 打开编辑器内置的「跳转到行号」对话框 */
  openGoToLine: () => void
  /** 撤销（编辑菜单 · 命令桥） */
  undo: () => void
  /** 重做（编辑菜单 · 命令桥） */
  redo: () => void
  /** 编辑器内查找（编辑菜单 · 命令桥） */
  find: () => void
  /** 删除选区（编辑菜单 · 命令桥） */
  deleteSelection: () => void
  /** 打开「另存为」弹层（文件菜单 · 命令桥） */
  openSaveAs: () => void
}

export const EditorLayout = forwardRef<EditorLayoutHandle, EditorLayoutProps>(function EditorLayout({
  localContent,
  onChange,
  renderedHtml,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  editorMode,
  onSwitchEditorMode,
  effectiveShowPreview,
  effectiveShowSource,
  effectiveShowOutline,
  showSource,
  showPreview,
  focusMode,
  typewriterMode,
  autocompleteEnabled,
  livePreview,
  onTogglePreview,
  onToggleSource,
  onToggleFocusMode,
  onToggleTypewriterMode,
  onToggleAutocomplete,
  onToggleLivePreview,
  onContentChange,
  onDeleteImage,
  activeFileId,
  gridColumns,
  showModeToolbar,
  onImportFile,
  onBrokenLinkClick,
  onOpenDailyNote,
  isDiary,
  onBackToDiary,
  onOpenVersionHistory,
  isVersionHistoryOpen,
  onPrint,
  onUseTemplate,
}: EditorLayoutProps, ref) {
  const { t } = useLanguage()
  const undoRedo = useUndoRedo()
  const { settings: appSettings } = useSettings()
  const { openFile, tabs } = useFileManager()
  const editorRef = useRef<CodeMirrorEditorHandle>(null)
  const tiptapRef = useRef<TiptapEditorHandle>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null)

  const [tiptapActiveHeading, setTiptapActiveHeading] = useState<string | null>(null)
  const [highlightedHeading, setHighlightedHeading] = useState<string | null>(null)
  const [scrollActiveHeading, setScrollActiveHeading] = useState<string | null>(null)
  const [activeFootnoteId, setActiveFootnoteId] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [goToLineVisible, setGoToLineVisible] = useState(false)
  const scrollActiveHeadingRef = useRef<string | null>(null)
  scrollActiveHeadingRef.current = scrollActiveHeading

  // P2-6 将 URL 转为脚注（本地，不上云）
  const handleAddFootnote = useCallback((url: string) => {
    const res = pasteUrlAsFootnote(localContent, url)
    onChange(res.content)
  }, [localContent, onChange])

  // P1-1：反链索引实时同步 —— 编辑内容变化时（防抖 600ms）增量更新 LinkIndexStore，
  // 使右栏反链面板 / 迷你图谱随输入实时刷新（此前 updateFileIndex 无调用方，
  // 索引仅 rootFolder 变更时全量重建，编辑态面板为静态快照）。
  const { updateFileIndex } = useLinkIndex()
  const indexSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!activeFileId) return
    const fileName = tabs.find(tab => tab.fileId === activeFileId)?.name || ''
    if (indexSyncTimerRef.current) clearTimeout(indexSyncTimerRef.current)
    indexSyncTimerRef.current = setTimeout(() => {
      updateFileIndex(activeFileId, localContent, fileName)
      indexSyncTimerRef.current = null
    }, 600)
    return () => {
      if (indexSyncTimerRef.current) clearTimeout(indexSyncTimerRef.current)
    }
  }, [activeFileId, localContent, tabs, updateFileIndex])

  // 恢复滚动位置提示
  const [showScrollRestoreHint, setShowScrollRestoreHint] = useState(false)

  // Track navigation history when active file changes
  useEffect(() => {
    if (activeFileId) {
      navigationTracker.push(activeFileId)
    }
  }, [activeFileId])

  // 检查是否有保存的滚动位置，显示恢复提示
  useEffect(() => {
    setShowScrollRestoreHint(false)
    if (!activeFileId) return
    const hasSaved = hasSavedScrollPosition(activeFileId)
    if (hasSaved) {
      const showTimer = setTimeout(() => {
        setShowScrollRestoreHint(true)
      }, 300)
      const hideTimer = setTimeout(() => {
        setShowScrollRestoreHint(false)
      }, 10300)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [activeFileId])

  // 同步 outline 显示状态到 CSS 变量，供 fixed 定位的滚动按钮避开 outline 面板
  useEffect(() => {
    document.documentElement.style.setProperty('--outline-width', effectiveShowOutline ? '200px' : '0px')
    return () => {
      document.documentElement.style.removeProperty('--outline-width')
    }
  }, [effectiveShowOutline])

  // 用户点击恢复按钮
  const handleRestoreScroll = useCallback(() => {
    setShowScrollRestoreHint(false)
    if (!activeFileId) return

    // 恢复编辑器滚动位置
    if (editorMode === 'source') {
      const view = editorRef.current?.getView()
      if (view) {
        // 获取保存的行号
        const savedLineNum = getEditorScrollCM(activeFileId)
        if (savedLineNum > 0) {
          // 获取该行的起始位置
          const line = view.state.doc.line(Math.min(savedLineNum, view.state.doc.lines))
          // 用 scrollIntoView 把目标行精确滚动到视口顶部
          view.dispatch({
            effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 0 }),
          })
        }
      }
    } else {
      // WYSIWYG 模式：恢复保存的 scrollTop
      // 不传 scrollHeight，用绝对 scrollTop 恢复，避免按比例换算导致精度损失
      // （图片异步加载会让恢复时的 scrollHeight 偏小，比例换算会严重偏小）
      const target = getEditorScroll(activeFileId)
      if (target > 0) {
        tiptapRef.current?.restoreScroll(target)
      }
    }

    // 恢复预览区滚动位置
    if (previewRef.current) {
      const target = getPreviewScroll(activeFileId, previewRef.current.scrollHeight)
      if (target > 0) {
        previewRef.current.scrollTop = target
      }
    }
  }, [activeFileId, editorMode])

  // Ctrl+G keyboard shortcut for Go To Line
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        setGoToLineVisible(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 命令面板「跳转到行号」经命令桥调用：打开编辑器内置 GoToLineDialog
  useImperativeHandle(ref, () => ({
    openGoToLine: () => setGoToLineVisible(true),
    // —— 批次① P0-A：编辑菜单命令（撤销/重做/查找/删除选区）跨源码/所见即所得双内核统一出口 ——
    undo: () => {
      if (editorMode === 'source') {
        const view = editorRef.current?.getView()
        if (view) cmUndo(view)
      } else {
        tiptapRef.current?.undo()
      }
    },
    redo: () => {
      if (editorMode === 'source') {
        const view = editorRef.current?.getView()
        if (view) cmRedo(view)
      } else {
        tiptapRef.current?.redo()
      }
    },
    find: () => {
      if (editorMode === 'source') {
        editorRef.current?.openSearch()
      } else {
        tiptapRef.current?.find()
      }
    },
    deleteSelection: () => {
      if (editorMode === 'source') {
        const view = editorRef.current?.getView()
        if (view) view.dispatch(view.state.replaceSelection(''))
      } else {
        tiptapRef.current?.getEditor()?.commands.deleteSelection()
      }
    },
    // 「另存为」弹层由各编辑器内核自持（CM6 的 useCM6State / Tiptap 的 useTiptapFileOps），
    // 故此处按当前内核转发到对应句柄。
    openSaveAs: () => {
      if (editorMode === 'source') {
        editorRef.current?.openSaveAs()
      } else {
        tiptapRef.current?.openSaveAs()
      }
    },
  }), [editorMode])

  // Go to line callback
  const handleGoToLine = useCallback((line: number) => {
    if (editorMode === 'source') {
      // Source mode: scroll CM6 to line
      const view = editorRef.current?.getView()
      if (view) {
        const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines))
        view.dispatch({
          effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
        })
        view.focus()
      }
    } else {
      // WYSIWYG mode: scroll to heading at that line
      const lines = localContent.split('\n')
      for (let i = Math.min(line - 1, lines.length - 1); i >= 0; i--) {
        const headingMatch = lines[i].match(/^(#{1,6})\s/)
        if (headingMatch) {
          const headingId = `heading-${lines.slice(0, i).join('\n').length}`
          tiptapRef.current?.scrollToHeading(headingId)
          return
        }
      }
      // If no heading found, try direct heading ID pattern
      tiptapRef.current?.scrollToHeading(`heading-${line}`)
    }
  }, [editorMode, localContent])

  useEffect(() => {
    if (effectiveShowPreview && editorMode === 'wysiwyg') {
      tiptapRef.current?.flushContent()
    }
  }, [effectiveShowPreview, editorMode])

  const handleSwitchEditorMode = useCallback((newMode: 'source' | 'wysiwyg') => {
    if (editorMode === 'wysiwyg') {
      tiptapRef.current?.flushContent()
    }
    if (activeFileId) {
      undoRedo.pushHistory(activeFileId, localContent, 0, 0, `mode-switch-${newMode}`)
    }
    setTransitioning(true)
    setTimeout(() => {
      onSwitchEditorMode(newMode)
      setTransitioning(false)
    }, 150)
  }, [activeFileId, localContent, undoRedo, onSwitchEditorMode, editorMode])

  const handleEditorScroll = useCallback((_: number, editorElement: HTMLElement) => {
    if (scrollSourceRef.current === 'preview') return

    scrollSourceRef.current = 'editor'
    const relativePosition = getRelativeScrollPosition(editorElement)
    if (previewRef.current) {
      setRelativeScrollPosition(previewRef.current, relativePosition, false)
    }
    Promise.resolve().then(() => { scrollSourceRef.current = null })
  }, [])

  const handlePreviewScroll = useCallback((_: number, previewElement: HTMLElement) => {
    if (scrollSourceRef.current === 'editor') return

    scrollSourceRef.current = 'preview'
    const relativePosition = getRelativeScrollPosition(previewElement)
    const scrollDom = editorRef.current?.getView()?.scrollDOM
    if (scrollDom) {
      setRelativeScrollPosition(scrollDom, relativePosition, false)
    }
    Promise.resolve().then(() => { scrollSourceRef.current = null })
  }, [])

  const headingDetectRafRef = useRef<number | null>(null)

  const handlePreviewScrollWithDetection = useCallback((scrollTop: number, previewElement: HTMLElement) => {
    if (scrollSourceRef.current !== 'editor') {
      handlePreviewScroll(scrollTop, previewElement)
    }

    if (headingDetectRafRef.current === null) {
      headingDetectRafRef.current = requestAnimationFrame(() => {
        headingDetectRafRef.current = null
        const headings = document.querySelectorAll('.heading-link') as NodeListOf<HTMLElement>
        let visibleHeading: string | null = null

        for (const heading of headings) {
          const relativeTop = heading.offsetTop - previewElement.scrollTop
          if (relativeTop <= previewElement.clientHeight * 0.3 && relativeTop + heading.clientHeight >= 0) {
            visibleHeading = heading.id
            break
          }
        }

        if (visibleHeading && visibleHeading !== scrollActiveHeadingRef.current) {
          setScrollActiveHeading(visibleHeading)
        }
      })
    }
  }, [handlePreviewScroll])

  const handleOutlineClick = useCallback((headingId: string) => {
    if (editorMode === 'wysiwyg') {
      tiptapRef.current?.scrollToHeading(headingId)
      setTiptapActiveHeading(headingId)
      return
    }

    // 源码模式：优先用 CodeMirror 编辑器跳转（无论 preview 是否显示都能精准定位）
    editorRef.current?.scrollToHeading(headingId)

    // 如果 preview 同时显示，也同步滚动 preview 并高亮标题
    if (effectiveShowPreview && previewRef.current) {
      const element = document.getElementById(headingId)
      if (element) {
        const prevHighlighted = document.querySelector('.heading-highlight')
        if (prevHighlighted) {
          prevHighlighted.classList.remove('heading-highlight')
        }

        const previewContainer = previewRef.current
        const elementRect = element.getBoundingClientRect()
        const containerRect = previewContainer.getBoundingClientRect()

        const scrollTop = elementRect.top - containerRect.top + previewContainer.scrollTop - 20

        previewContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })

        element.classList.add('heading-highlight')
        setHighlightedHeading(headingId)

        setTimeout(() => {
          element.classList.remove('heading-highlight')
          setHighlightedHeading(prev => prev === headingId ? null : prev)
        }, 3000)
      }
    }
  }, [editorMode, effectiveShowPreview])

  const handleFootnoteClick = useCallback((footnoteId: string, _line: number) => {
    if (!previewRef.current) return

    const refElement = document.getElementById(`footnote-ref-${footnoteId}`)
    const defElement = document.getElementById(`footnote-${footnoteId}`)
    const targetElement = refElement || defElement

    if (targetElement && previewRef.current) {
      const prevHighlighted = document.querySelector('.footnote-highlight')
      if (prevHighlighted) {
        prevHighlighted.classList.remove('footnote-highlight')
      }

      const previewContainer = previewRef.current
      const elementRect = targetElement.getBoundingClientRect()
      const containerRect = previewContainer.getBoundingClientRect()

      const scrollTop = elementRect.top - containerRect.top + previewContainer.scrollTop - 40

      previewContainer.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })

      targetElement.classList.add('footnote-highlight')
      setActiveFootnoteId(footnoteId)

      setTimeout(() => {
        targetElement.classList.remove('footnote-highlight')
        setActiveFootnoteId(prev => prev === footnoteId ? null : prev)
      }, 3000)
    }
  }, [])

  return (
    <>
      {showModeToolbar && (
        <EditorModeToolbar
          editorMode={editorMode}
          showSource={showSource}
          showPreview={showPreview}
          focusMode={focusMode}
          isDiary={isDiary}
          language={language}
          theme={theme}
          activeFileId={activeFileId}
          onToggleSource={onToggleSource}
          onTogglePreview={onTogglePreview}
          onSwitchEditorMode={handleSwitchEditorMode}
          onOpenDailyNote={onOpenDailyNote}
          onBackToDiary={onBackToDiary}
          onOpenVersionHistory={onOpenVersionHistory}
          isVersionHistoryOpen={isVersionHistoryOpen}
          onToggleTheme={onToggleTheme}
          onToggleLanguage={onToggleLanguage}
        />
      )}
      <div className="flex-1 overflow-hidden min-h-0" style={{ display: 'grid', gridTemplateColumns: gridColumns, opacity: transitioning ? 0 : 1, transition: 'opacity 0.15s' }}>
      {editorMode === 'wysiwyg' ? (
        <div
          className={`min-h-0 overflow-hidden ${focusMode ? 'focus-editor-container' : ''}`}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <LinkBreadcrumb activeFileId={activeFileId ?? null} onOpenFile={openFile} />
          <ErrorBoundary name="WYSIWYG" errorTitle={t.errorBoundary.wysiwygError} retryText={t.errorBoundary.retry}>
            <TiptapEditor value={localContent} onChange={onChange} theme={theme} fileId={activeFileId ?? undefined} onActiveHeadingChange={setTiptapActiveHeading} ref={tiptapRef} focusMode={focusMode} typewriterMode={typewriterMode} livePreview={livePreview} onToggleFocusMode={onToggleFocusMode} onToggleTypewriterMode={onToggleTypewriterMode} onToggleLivePreview={onToggleLivePreview} onOpenFile={onImportFile} onBrokenLinkClick={onBrokenLinkClick} onUseTemplate={onUseTemplate} />
          </ErrorBoundary>
        </div>
      ) : (
        <>
          {effectiveShowSource && (
            <div
              className={`border-r min-h-0 overflow-hidden ${focusMode ? 'focus-editor-container' : ''}`}
              style={{
                borderColor: effectiveShowPreview ? 'var(--editor-border)' : 'transparent'
              }}
            >
              <ErrorBoundary name="Source" errorTitle={t.errorBoundary.sourceError} retryText={t.errorBoundary.retry}>
                <CodeMirrorEditor value={localContent} onChange={onChange} ref={editorRef} onScroll={handleEditorScroll} showPreview={effectiveShowPreview} onTogglePreview={onTogglePreview} focusMode={focusMode} typewriterMode={typewriterMode} onToggleFocusMode={onToggleFocusMode} onToggleTypewriterMode={onToggleTypewriterMode} autocompleteEnabled={autocompleteEnabled} onToggleAutocomplete={onToggleAutocomplete} fileId={activeFileId} theme={theme} useRelativeImagePath={appSettings.useRelativeImagePath} onImportFile={onImportFile} onPrint={onPrint} onUseTemplate={onUseTemplate} />
              </ErrorBoundary>
            </div>
          )}

          {effectiveShowPreview && (
            <div className="min-h-0 overflow-hidden">
              <ErrorBoundary name="Preview" errorTitle={t.errorBoundary.previewError} retryText={t.errorBoundary.retry}>
                <Preview
                  content={renderedHtml}
                  theme={theme}
                  ref={previewRef}
                  onScroll={handlePreviewScrollWithDetection}
                  onContentChange={onContentChange}
                  onDeleteImage={onDeleteImage}
                  fileId={activeFileId ?? undefined}
                />
              </ErrorBoundary>
            </div>
          )}
        </>
      )}

      {effectiveShowOutline && (
        <div
          className="border-l flex flex-col min-h-0 overflow-hidden"
          style={{ borderColor: 'var(--mc-border-subtle)' }}
        >
          <ErrorBoundary name="Outline" errorTitle={t.errorBoundary.outlineError} retryText={t.errorBoundary.retry}>
            <div className="flex-1 overflow-hidden flex flex-col">
              <Suspense fallback={null}>
                <LazyOutline
                  content={localContent}
                  onHeadingClick={handleOutlineClick}
                  activeHeadingId={editorMode === 'wysiwyg' ? tiptapActiveHeading : (highlightedHeading || scrollActiveHeading)}
                />
              </Suspense>
            </div>
            <FootnoteSidebar
              content={localContent}
              onFootnoteClick={handleFootnoteClick}
              activeFootnoteId={activeFootnoteId}
            />
            <NoteContextPanel
              activeFileId={activeFileId ?? undefined}
              onOpenNote={openFile}
            />
            <WritingAidPanel content={localContent} />
            <DraftInsightPanel content={localContent} />
            <FootnoteFromClipboard onAddFootnote={handleAddFootnote} />
          </ErrorBoundary>
        </div>
      )}
    </div>
    {/* 恢复滚动位置提示
        ⚠️ 单源基底：复用 .aurora-toast-container（层级带 Toast = 9990）+ .aurora-toast（材质/圆角/阴影/字色）。
        此前是自持皮肤浮层（紫色渐变底 + #fff 文字 + 自绘白色按钮 + z-index 99999），
        既绕过 token 体系、又写死越带魔数 —— 属 portal 审计扫不到的盲区（它是 fixed 内联 div，非 createPortal）。 */}
    {showScrollRestoreHint && (
      <div className="aurora-toast-container" style={{ bottom: 60 }}>
        <div className="aurora-toast aurora-toast--info">
          <span className="aurora-toast__icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </span>
          <span className="aurora-toast__msg">
            {language === 'zh' ? '检测到上次浏览位置，是否恢复？' : 'Restore last read position?'}
          </span>
          <button
            className="aurora-btn aurora-btn--sm aurora-btn--primary"
            onClick={handleRestoreScroll}
          >
            {language === 'zh' ? '恢复位置' : 'Restore'}
          </button>
          <button
            className="aurora-btn aurora-btn--sm aurora-btn--ghost"
            onClick={() => setShowScrollRestoreHint(false)}
          >
            {language === 'zh' ? '忽略' : 'Dismiss'}
          </button>
        </div>
      </div>
    )}
    <GoToLineDialog
      visible={goToLineVisible}
      onClose={() => setGoToLineVisible(false)}
      currentLine={1}
      totalLines={localContent.split('\n').length}
      onGoToLine={handleGoToLine}
    />
    </>
  )
})

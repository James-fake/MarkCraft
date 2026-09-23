import { useState, useCallback, useRef, useEffect, lazy, Suspense, forwardRef, useImperativeHandle } from 'react'
import ErrorBoundary from '@components/ui/ErrorBoundary'
import { Icon } from '../../components/ui'
import { EditorView } from '@codemirror/view'
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands'
import { useLanguage } from '../../stores/LanguageStore'
import { useUndoRedo } from '../../stores/UndoRedoStore'
import { useSettings } from '../../stores/SettingsStore'
import { useFileManager } from '../../stores/FileStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useKbStore } from '../../stores/useKbStore'
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
import { HistoryIcon } from './HistoryIcon'
import { getRelativeScrollPosition, setRelativeScrollPosition } from './scrollSync'
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
  onOpenImportDialog?: () => void
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
  onOpenImportDialog,
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
  const { kbList, activeKb, addFile, loadActiveKb } = useKbStore()
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

  // 「加入知识库」下拉菜单
  const [showKbPicker, setShowKbPicker] = useState(false)
  const [kbPickerStatus, setKbPickerStatus] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null)
  const kbPickerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!showKbPicker) return
    const handleClick = (e: MouseEvent) => {
      if (kbPickerRef.current && !kbPickerRef.current.contains(e.target as Node)) {
        setShowKbPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showKbPicker])

  // 状态提示自动消失
  useEffect(() => {
    if (!kbPickerStatus) return
    const timer = setTimeout(() => setKbPickerStatus(null), 2500)
    return () => clearTimeout(timer)
  }, [kbPickerStatus])

  // 加入知识库处理
  const handleAddToKb = useCallback(async (kbId: string, kbName: string) => {
    if (!activeFileId) {
      setKbPickerStatus({ type: 'error', msg: language === 'zh' ? '请先打开一个文件' : 'Open a file first' })
      return
    }
    // 检查是否已在当前库
    const kb = activeKb
    if (kb && kb.id === kbId && kb.fileIds.includes(activeFileId)) {
      setKbPickerStatus({ type: 'info', msg: language === 'zh' ? `该文件已在「${kbName}」中` : `Already in ${kbName}` })
      setShowKbPicker(false)
      return
    }
    try {
      await addFile(kbId, activeFileId)
      setKbPickerStatus({ type: 'success', msg: language === 'zh' ? `已加入「${kbName}」` : `Added to ${kbName}` })
    } catch (err) {
      console.error('[EditorLayout] 加入知识库失败:', err)
      setKbPickerStatus({ type: 'error', msg: language === 'zh' ? '加入失败，请重试' : 'Failed, try again' })
    }
    setShowKbPicker(false)
  }, [activeFileId, activeKb, addFile, language])

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

  // 切换下拉菜单时重新加载 activeKb（避免过期判断）
  const handleToggleKbPicker = useCallback(() => {
    if (!showKbPicker && activeKb) {
      void loadActiveKb(activeKb.id)
    }
    setShowKbPicker(prev => !prev)
  }, [showKbPicker, activeKb, loadActiveKb])

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px 12px',
          backgroundColor: 'var(--editor-bg)',
          borderBottom: '1px solid var(--editor-border)',
        }}>
          {(() => {
            const isWysiwyg = editorMode === 'wysiwyg'
            // 源码/预览按钮高亮：当前处于源码模式且对应面板已显示
            const sourceActive = !isWysiwyg && showSource
            const previewActive = !isWysiwyg && showPreview
            const wysiwygActive = isWysiwyg

            const baseBtnStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 400,
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: 'var(--editor-text)',
              opacity: 0.6,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }

            const activeStyle = (active: boolean): React.CSSProperties => active ? {
              fontWeight: 600,
              border: '1px solid var(--button-primary, #3b82f6)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--button-primary, #3b82f6)',
              opacity: 1,
            } : {}

            const renderBtn = (
              key: string,
              label: string,
              iconName: string,
              active: boolean,
              disabled: boolean,
              onClick: () => void,
            ) => {
              const style = { ...baseBtnStyle, ...activeStyle(active) }
              if (disabled) style.opacity = 0.3
              return (
                <button
                  key={key}
                  onClick={disabled ? undefined : onClick}
                  disabled={disabled}
                  style={style}
                  onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.opacity = '0.6' }}
                >
                  <Icon name={iconName} size={14} />
                  {label}
                </button>
              )
            }

            return (
              <>
                {renderBtn('source', t.editorMode.source, 'code', sourceActive, false, () => {
                  // WYSIWYG 模式下点击源码：先切回源码模式，再显示源码面板
                  if (isWysiwyg) {
                    handleSwitchEditorMode('source')
                    onToggleSource()
                  } else {
                    onToggleSource()
                  }
                })}
                {renderBtn('wysiwyg', t.editorMode.wysiwyg, 'eye', wysiwygActive, false, () => {
                  handleSwitchEditorMode(isWysiwyg ? 'source' : 'wysiwyg')
                })}
                {renderBtn('preview', t.editorMode.split, 'split', previewActive, false, () => {
                  // WYSIWYG 模式下点击预览：先切回源码模式，再显示预览面板
                  if (isWysiwyg) {
                    handleSwitchEditorMode('source')
                    onTogglePreview()
                  } else {
                    onTogglePreview()
                  }
                })}
                <div style={{ flex: 1 }} />
                {isDiary && onBackToDiary && renderBtn('backToDiary', language === 'zh' ? '返回日记' : 'Back to Diary', 'arrowLeft', false, false, onBackToDiary)}
                {onOpenDailyNote && renderBtn('dailyNote', language === 'zh' ? '今日笔记' : 'Daily Note', 'calendar', false, false, onOpenDailyNote)}
                {/* 加入知识库按钮 + 下拉选择菜单 */}
                <div ref={kbPickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={handleToggleKbPicker}
                    className="flex items-center gap-1 transition-all"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 400,
                      border: showKbPicker
                        ? '1px solid var(--button-primary, #3b82f6)'
                        : '1px solid transparent',
                      backgroundColor: showKbPicker
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'transparent',
                      color: showKbPicker
                        ? 'var(--button-primary, #3b82f6)'
                        : 'var(--editor-text)',
                      opacity: showKbPicker ? 1 : 0.6,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!showKbPicker) { e.currentTarget.style.opacity = '0.9' } }}
                    onMouseLeave={(e) => { if (!showKbPicker) { e.currentTarget.style.opacity = '0.6' } }}
                    title={language === 'zh' ? '将当前文档加入知识库' : 'Add to Knowledge Base'}
                  >
                    <Icon name="library" size={14} />
                    {language === 'zh' ? '加入知识库' : 'Add to KB'}
                  </button>
                  {showKbPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        minWidth: '220px',
                        backgroundColor: 'var(--editor-bg, #fff)',
                        border: '1px solid var(--editor-border, #e5e7eb)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--editor-text)',
                          opacity: 0.6,
                          borderBottom: '1px solid var(--editor-border, #e5e7eb)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {language === 'zh' ? '选择知识库' : 'Select KB'}
                      </div>
                      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {kbList.length === 0 ? (
                          <div
                            style={{
                              padding: '12px 10px',
                              fontSize: '12px',
                              color: 'var(--editor-text)',
                              opacity: 0.5,
                              textAlign: 'center',
                            }}
                          >
                            {language === 'zh' ? '暂无知识库，请先创建' : 'No KB yet, create one first'}
                          </div>
                        ) : (
                          kbList.map(kb => {
                            // 检查文件是否已在该库（基于 activeKb 判断仅限当前激活库，其他库需点击后判断）
                            const isCurrentActive = activeKb?.id === kb.id
                            const isAlreadyIn = isCurrentActive && activeFileId && activeKb?.fileIds.includes(activeFileId)
                            return (
                              <button
                                key={kb.id}
                                onClick={() => handleAddToKb(kb.id, kb.name)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  color: 'var(--editor-text)',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {kb.name}
                                </span>
                                {isAlreadyIn && (
                                  <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: 8, flexShrink: 0 }}>
                                    {language === 'zh' ? '已加入' : 'Added'}
                                  </span>
                                )}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {!focusMode && onOpenVersionHistory && (
                  <button
                    onClick={onOpenVersionHistory}
                    className="flex items-center gap-1 transition-all"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 400,
                      border: isVersionHistoryOpen
                        ? '1px solid var(--button-primary, #3b82f6)'
                        : '1px solid transparent',
                      backgroundColor: isVersionHistoryOpen ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: 'var(--editor-text)',
                      opacity: isVersionHistoryOpen ? 1 : 0.85,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isVersionHistoryOpen) e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { if (!isVersionHistoryOpen) e.currentTarget.style.opacity = '0.85' }}
                    title={language === 'zh' ? '版本历史' : 'Version History'}
                    aria-label={language === 'zh' ? '版本历史' : 'Version History'}
                  >
                    <HistoryIcon size={14} />
                    {language === 'zh' ? '版本历史' : 'History'}
                  </button>
                )}
                {/* 操作状态提示 */}
                {kbPickerStatus && (
                  <div
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: kbPickerStatus.type === 'success'
                        ? '#16a34a'
                        : kbPickerStatus.type === 'error'
                          ? '#dc2626'
                          : 'var(--editor-text)',
                      backgroundColor: kbPickerStatus.type === 'success'
                        ? 'rgba(22, 163, 74, 0.1)'
                        : kbPickerStatus.type === 'error'
                          ? 'rgba(220, 38, 38, 0.1)'
                          : 'rgba(128, 128, 128, 0.1)',
                    }}
                  >
                    {kbPickerStatus.msg}
                  </div>
                )}
                <button
                  onClick={onToggleTheme}
                  className="flex items-center justify-center transition-colors duration-200"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.6' }}
                  aria-label={theme === 'dark' ? t.previewExtra.switchToLight : t.previewExtra.switchToDark}
                  title={theme === 'dark' ? t.previewExtra.switchToLight : t.previewExtra.switchToDark}
                >
                  {theme === 'dark' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={onToggleLanguage}
                  className="flex items-center justify-center transition-colors duration-200"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--editor-text)',
                    opacity: 0.6,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.6' }}
                  title={language === 'zh' ? t.app.switchToEnDesc : t.app.switchToZhDesc}
                >
                  {language === 'zh' ? 'EN' : '中'}
                </button>
              </>
            )
          })()}
        </div>
      )}
      <div className="flex-1 overflow-hidden min-h-0" style={{ display: 'grid', gridTemplateColumns: gridColumns, opacity: transitioning ? 0 : 1, transition: 'opacity 0.15s' }}>
      {editorMode === 'wysiwyg' ? (
        <div
          className={`min-h-0 overflow-hidden ${focusMode ? 'focus-editor-container' : ''}`}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <LinkBreadcrumb activeFileId={activeFileId ?? null} onOpenFile={openFile} />
          <ErrorBoundary name="WYSIWYG" errorTitle={t.errorBoundary.wysiwygError} retryText={t.errorBoundary.retry}>
            <TiptapEditor value={localContent} onChange={onChange} theme={theme} fileId={activeFileId ?? undefined} onActiveHeadingChange={setTiptapActiveHeading} ref={tiptapRef} focusMode={focusMode} typewriterMode={typewriterMode} livePreview={livePreview} onToggleFocusMode={onToggleFocusMode} onToggleTypewriterMode={onToggleTypewriterMode} onToggleLivePreview={onToggleLivePreview} onOpenFile={onOpenImportDialog} onBrokenLinkClick={onBrokenLinkClick} onUseTemplate={onUseTemplate} />
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
                <CodeMirrorEditor value={localContent} onChange={onChange} ref={editorRef} onScroll={handleEditorScroll} showPreview={effectiveShowPreview} onTogglePreview={onTogglePreview} focusMode={focusMode} typewriterMode={typewriterMode} onToggleFocusMode={onToggleFocusMode} onToggleTypewriterMode={onToggleTypewriterMode} autocompleteEnabled={autocompleteEnabled} onToggleAutocomplete={onToggleAutocomplete} fileId={activeFileId} theme={theme} useRelativeImagePath={appSettings.useRelativeImagePath} onOpenImportDialog={onOpenImportDialog} onPrint={onPrint} onUseTemplate={onUseTemplate} />
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
    {/* 恢复滚动位置提示 */}
    {showScrollRestoreHint && (
      <div style={{
        position: 'fixed',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderRadius: 10,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.5)',
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
        <span>{language === 'zh' ? '检测到上次浏览位置，是否恢复？' : 'Restore last read position?'}</span>
        <button
          onClick={handleRestoreScroll}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#fff',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'zh' ? '恢复位置' : 'Restore'}
        </button>
        <button
          onClick={() => setShowScrollRestoreHint(false)}
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.3)',
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {language === 'zh' ? '忽略' : 'Dismiss'}
        </button>
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

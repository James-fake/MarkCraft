import { useEditor, EditorContent } from '@tiptap/react'
import { djb2Hash } from '../../utils/hash'
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState, useMemo } from 'react'
import { htmlToMarkdown } from './markdownConvert'
import { markdownOffsetToPmPos } from './tiptapMarkdownOffset'
import { useLanguage } from '../../stores/LanguageStore'
import { useUndoRedo } from '../../stores/UndoRedoStore'
import { useSettings } from '../../stores/SettingsStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { useFileManager } from '../../stores/FileStore'
import TableBubbleMenu from './TableBubbleMenu'
import TableContextMenu from './extensions/TableContextMenu'
import EditorContextMenu from './EditorContextMenu'
import { EditorUIContext, EditorCoreContext, EditorModalsContext, EditorInsertContext } from './EditorUIContext'
import { EditorWysiwygToolbarSlot, EditorFocusModeToolbarSlot, EditorScrollSlot, EditorStatusBarSlot, EditorModalsSlot } from './EditorSlots'
import { calculateStats } from './stats'
import type { WordCountMode } from './editorTypes'
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
import { recordKeyStroke } from './perfProbe'
import { createSerializeScheduler, type SerializeScheduler } from './serializeScheduler'
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
  onBrokenLinkClick?: (target: string, event: MouseEvent) => void
  /** 打开模板选择器（由 EditorLayout 透传，Aurora 注入） */
  onUseTemplate?: () => void
  /** 是否渲染内置 WYSIWYG 格式工具栏（Aurora 子面板可关闭，改用自身轻量工具栏） */
  showToolbar?: boolean
  /** 是否渲染内置状态栏（字数 / lint 指示），Aurora 子面板可关闭，改用自身底部条 */
  showStatusBar?: boolean
  /** 空编辑区占位符；不传沿用全局默认，传空串 '' 关闭（如日记区） */
  placeholder?: string
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
  /** 打开「另存为」弹层（文件菜单 · 命令桥） */
  openSaveAs: () => void
  /**
   * 把光标定位到最终 markdown 文本的指定偏移（模板 {{cursor}} 落点）。
   * fullMd 必须是当前编辑器内的完整 markdown（与 offset 同一坐标系）。
   * 解析失败回退到文档末尾。
   */
  focusMarkdownOffset: (mdOffset: number, fullMd: string) => void
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(({ value, onChange, onPushUndo, onUndoRedoStateChange, onActiveHeadingChange, fileId, theme, focusMode, typewriterMode, livePreview, onToggleFocusMode, onToggleTypewriterMode, onToggleLivePreview, onOpenFile, onSaveAs, onBrokenLinkClick, onUseTemplate, showToolbar = true, showStatusBar = true, placeholder }, ref) => {
  const { t } = useLanguage()
  const undoRedo = useUndoRedo()
  const { settings: appSettings } = useSettings()
  const linkIndex = useLinkIndex()
  const { openFile } = useFileManager()
  const isInternalUpdate = useRef(false)
  const lastEmittedMd = useRef<string | null>(null)
  /**
   * 本编辑器**发出过**的 md 值（有界，最多 30 个）。
   * onChange 有 300ms 防抖 → 父级 value 永远可能落后于 lastEmittedMd；
   * 用这个集合把「父级回传自己的旧值」与「真正的外部改动」区分开，避免回灌丢字。
   */
  const recentEmitsRef = useRef<Set<string>>(new Set())
  const editorRef = useRef<TiptapEditorType | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // 真正滚动的容器（.tiptap-wrapper 有 overflow-y: auto）
  // wrapperRef 指向 .tiptap-editor-wrapper 是 flex column 容器，不滚动
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Extracted hooks for search, lint, and file operations
  const { searchMode, searchTerm, replaceTerm, openSearch, closeSearch, setSearchTerm, setReplaceTerm } = useTiptapSearch()
  // 阶段 1：一次 lint 计算，两处应用（React state 由 hook 内部更新，这里补 ProseMirror 装饰）。
  // 此前 onUpdate 里还同步跑过一遍 lintMarkdown + setLintIssues —— 重复计算且绕过防抖。
  const { lintIssues, showLintPopover, lintAnchorRef, lintCloseTimerRef, setShowLintPopover, scheduleLintCheck, cleanupLintTimer } = useTiptapLint({
    lintMarkdown,
    t,
    onIssues: (issues) => {
      const ed = editorRef.current
      if (ed && !ed.isDestroyed) ed.commands.setLintIssues(issues)
    },
  })
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

  // Debounce timer for 序列化（阶段 2 之前是 onChange 的 300ms 防抖）
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 连续输入的序列化防抖窗口。比原先 onChange 的 300ms 更小 —— 丢字窗口反而收窄一半。 */
  const SERIALIZE_DEBOUNCE_MS = 150
  /** 有未序列化到 markdown 的编辑（onUpdate 即时置位，不等防抖） */
  const dirtyRef = useRef(false)
  /** 最近一次光标位置（flush 时给 pushHistory 用，O(1) 读取） */
  const selectionRef = useRef<{ from: number; to: number }>({ from: 0, to: 0 })
  const undoRedoRef = useRef(undoRedo)
  undoRedoRef.current = undoRedo
  const perfProbeRef = useRef(import.meta.env.DEV)
  perfProbeRef.current = import.meta.env.DEV

  /**
   * 把当前编辑器内容序列化为 markdown 并一次性完成所有副作用。
   * 阶段 2 前这些副作用散在「每键击」的 onUpdate 里；现在统一由防抖或 flush 点驱动。
   * 全部依赖通过 ref 读取 → 函数身份稳定，不随 Provider 重渲染而重建。
   */
  const serializeNow = useCallback((reason: string = 'debounce') => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    const perf = perfProbeRef.current
    const t0 = perf ? performance.now() : 0
    const html = ed.getHTML()
    const t1 = perf ? performance.now() : 0
    const md = htmlToMarkdown(html)
    const t2 = perf ? performance.now() : 0
    dirtyRef.current = false
    lastEmittedMd.current = md
    recentEmitsRef.current.add(md)
    if (recentEmitsRef.current.size > 30) {
      const first = recentEmitsRef.current.values().next().value
      if (first !== undefined) recentEmitsRef.current.delete(first)
    }
    htmlSnapshotRef.current.set(djb2Hash(md), { md, html })
    if (htmlSnapshotRef.current.size > 50) {
      const firstKey = htmlSnapshotRef.current.keys().next().value
      if (firstKey !== undefined) htmlSnapshotRef.current.delete(firstKey)
    }
    const currentFileId = fileIdRef.current
    if (currentFileId) {
      const { from, to } = selectionRef.current
      undoRedoRef.current.pushHistory(currentFileId, md, from, to, 'wysiwyg-typing')
    }
    const t3 = perf ? performance.now() : 0
    const currentOnPushUndo = onPushUndoRef.current
    if (currentOnPushUndo) currentOnPushUndo(md, 'wysiwyg-typing')
    onChangeRef.current(md)
    scheduleLintCheckRef.current(md)
    if (perf) {
      recordKeyStroke({
        getHtmlMs: t1 - t0,
        toMdMs: t2 - t1,
        lintMs: 0,
        pushMs: t3 - t2,
        serialized: true,
      })
    }
    // flush 原因保留在参数上（perfProbe 已提供观测，避免每次 blur 都打日志）
    void reason
  }, [])
  const scheduleLintCheckRef = useRef(scheduleLintCheck)
  scheduleLintCheckRef.current = scheduleLintCheck
  // 调度策略抽到 serializeScheduler（纯模块、可单测），这里只负责接线
  const schedulerRef = useRef<SerializeScheduler | null>(null)
  if (!schedulerRef.current) {
    schedulerRef.current = createSerializeScheduler({
      delayMs: SERIALIZE_DEBOUNCE_MS,
      isDirty: () => dirtyRef.current,
      serialize: serializeNow,
      timerRef: debounceTimerRef,
    })
  }
  const flushRef = useRef<(reason: string) => void>(() => {})
  flushRef.current = (reason: string) => schedulerRef.current?.flush(reason)

  // Extracted hook for undo/redo
  const { undoFn, redoFn, isUndoRedoRef } = useTiptapUndoRedo({
    fileId, editorRef, undoRedo, onChange, htmlSnapshotRef, lastEmittedMd, isInternalUpdate,
  })

  // Stable refs for undo/redo so the extension always calls the latest version
  const undoFnRef = useRef<() => void>(() => {})
  const redoFnRef = useRef<() => void>(() => {})
  // flush 点 #5：撤销/重做前必须把挂起编辑入栈，否则历史里没有最新内容 ——
  // 用户刚敲完就 Ctrl+Z 会直接回退到上一个 150ms 窗口（丢字）。
  // 包在这里可覆盖全部调用路径（扩展快捷键 + handle.undo/redo）。
  undoFnRef.current = () => {
    flushRef.current('before-undo')
    undoFn()
  }
  redoFnRef.current = () => {
    flushRef.current('before-redo')
    redoFn()
  }
  // 稳定 ref：供命令桥 find 触达编辑器内查找（SearchReplace 内部 openSearch）
  const openSearchRef = useRef<(mode: 'search' | 'replace') => void>(() => {})
  openSearchRef.current = openSearch

  // Extracted hook for extensions configuration
  const extensions = useTiptapExtensions({
    t, livePreview, undoFnRef, redoFnRef, placeholder,
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
      // —— 阶段 2：每键击只做 O(1) 标记与调度，不再全量序列化 ——
      // 原先这里每键击都 getHTML + htmlToMarkdown（阶段 0 实测占输入延迟 87-95%），
      // 而连续输入时前 N-1 次的结果只有最后一次会被父级消费。
      dirtyRef.current = true
      const { from, to } = ed.state.selection
      selectionRef.current = { from, to }
      schedulerRef.current?.schedule()
    },
    onBlur: () => {
      // flush 点 #3：失焦（点文件树 / 切面板 / 切窗口）先把挂起的编辑写回。
      // 用户点文件树必然先 blur → 这一个点也顺带覆盖了「切文件丢最后一段」的场景。
      flushRef.current('blur')
    },
  })

  // Extracted hook for content sync
  useTiptapContentSync({
    editor, value, fileId, lastEmittedMd, recentEmits: recentEmitsRef, isInternalUpdate, undoRedo, debounceTimerRef,
  })

  // 同步 livePreview prop 到 LivePreviewExtension 的 enabled 状态
  // extensions 始终注册，运行时通过 command 切换 enabled
  useEffect(() => {
    if (!editor) return
    if (editor.isDestroyed) return
    editor.commands.setLivePreviewEnabled(!!livePreview)
  }, [editor, livePreview])

  // 同步 focusMode / typewriterMode 到 FocusModeExtension（P0：与源码模式对齐）
  useEffect(() => {
    if (!editor) return
    if (editor.isDestroyed) return
    editor.commands.setFocusModeEnabled(!!focusMode)
    editor.commands.setTypewriterModeEnabled(!!typewriterMode)
  }, [editor, focusMode, typewriterMode])

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
    // flush 点 #6/#7：切编辑模式、切预览/导出前，父级已通过这里把内容同步出去。
    // 阶段 2 后统一走 serializeNow（清防抖 + 一次序列化 + 所有副作用），不再重复实现。
    flushContent: () => flushRef.current('external'),
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
    // flush 点 #4：另存为/导出读的是父级 value，先把挂起输入写回，否则导出旧内容
    openSaveAs: () => { flushRef.current('save-as'); setShowSaveAsModal(true) },
    focusMarkdownOffset: (mdOffset: number, fullMd: string) => {
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return
      const pos = markdownOffsetToPmPos(ed, fullMd, mdOffset)
      // 解析失败（-1）回退到文档末尾
      const target = pos === -1 ? ed.state.doc.content.size : pos
      ed.chain().focus().setTextSelection(target).run()
    },
    scrollToHeading,
    restoreScroll,
  }), [editor, fileId, undoRedo, scrollToHeading, restoreScroll, setShowSaveAsModal])

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

  // flush 点 #2（卸载）与 #8（关窗口）：把挂起的编辑真正序列化写回，
  // 而不是像旧实现那样 `onChange(lastEmittedMd.current)` —— 阶段 2 后那是**上一次**flush 的值，
  // 直接写回会丢掉最后一段输入。
  useEffect(() => {
    const flushPending = () => {
      flushRef.current('beforeunload')
    }
    window.addEventListener('beforeunload', flushPending)
    return () => {
      window.removeEventListener('beforeunload', flushPending)
      flushRef.current('unmount')
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      schedulerRef.current?.dispose()
      cleanupLintTimer()
    }
  }, [cleanupLintTimer, serializeNow])

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
      {/* 专注模式：隐藏主工具栏，改用浮动退出条（与源码模式一致） */}
      {showToolbar && !focusMode && <EditorWysiwygToolbarSlot />}
      {focusMode && <EditorFocusModeToolbarSlot />}
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
      {showStatusBar && !focusMode && <EditorStatusBarSlot />}
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

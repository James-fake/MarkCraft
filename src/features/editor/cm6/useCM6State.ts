import { useRef, useCallback, useState, useEffect } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap } from '@codemirror/commands'
import { highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view'
import { foldGutter, foldService, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { useLanguage } from '@stores/LanguageStore'
import { ThemeType } from '@stores/ThemeStore'
import { useSettings } from '@stores/SettingsStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { useTagIndex } from '@stores/TagIndexStore'
import { findNode } from '@services/fileService'
import type { Translations } from '@src/types/translations'
import type { LintIssue } from '@utils/lintTypes'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import { markdownHighlight } from './markdownHighlight'
import { createAutocompleteExtension } from './autocompleteExtension'
import { createKeymapExtension } from './useCM6Shortcuts'
import { createMathPreviewExtension } from './mathPreviewExtension'
import { createLintExtension } from './lintExtension'
import { createInputHandlers, createKeyHandlers, createAutoPairHandler, createQuotePairHandler } from './inputHandlers'
import { createImagePreviewExtension } from './imagePreviewExtension'
import { rainbowBrackets } from './rainbowBrackets'
import { spellCheckExtension } from '../extensions/SpellCheckExtension'
import { saveEditorScrollCM } from '@services/scrollPositionManager'
import { smartPunctuation } from '../extensions/SmartPunctuation'
import { createFocusModeExtension, createTypewriterModeExtension, focusModeTheme, focusModeState, typewriterModeState } from './focusModeExtension'
import { createWikiLinkHoverTooltip } from './wikiLinkHoverTooltip'
import type { NoteHoverData } from '../components/NoteHoverCard'
import { useCM6UndoRedo, createUndoRedoKeymap } from './useCM6UndoRedo'
import { useCM6Stats } from './useCM6Stats'
import { useCM6FileOps } from './useCM6FileOps'
import { getCodeTheme } from '../../themes/CodeThemeManager'

export type { WordCountMode } from './useCM6Stats'

// Custom fold service for Markdown fenced code blocks
const markdownCodeFold = foldService.of((state, from, _to) => {
  const line = state.doc.lineAt(from)
  if (!line.text.trimStart().startsWith('```')) return null

  // Find closing ```
  for (let i = line.number + 1; i <= state.doc.lines; i++) {
    const l = state.doc.line(i)
    if (l.text.trimStart().startsWith('```')) {
      return { from: line.to, to: l.from }
    }
  }
  return null
})

// CM6 暗色主题扩展 (fallback, used when codeTheme is 'default' and app is in dark mode)
const cm6DarkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
  },
  '.cm-content': {
    caretColor: 'var(--editor-text)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--editor-text)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.4) !important',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
    borderRight: '1px solid var(--editor-border)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    outline: '1px solid rgba(255, 255, 255, 0.3)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(255, 200, 0, 0.3)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    borderBottom: '1px solid var(--editor-border)',
  },
  '.cm-panels input, .cm-panels button': {
    color: 'var(--editor-text)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    border: '1px solid var(--editor-border)',
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: 'var(--editor-text)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: 'var(--editor-text)',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'linear-gradient(45deg, rgba(239,68,68,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(239,68,68,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'linear-gradient(45deg, rgba(245,158,11,0.4) 50%, transparent 50%), linear-gradient(-45deg, rgba(245,158,11,0.4) 50%, transparent 50%)',
    backgroundSize: '4px 4px',
    backgroundPosition: 'bottom',
    backgroundRepeat: 'repeat-x',
    paddingBottom: '2px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--mc-bg-panel)',
    color: 'var(--editor-text)',
    border: '1px solid var(--editor-border)',
  },
}, { dark: true })

interface UseCM6StateParams {
  value: string
  onChange: (value: string) => void
  fileId?: string | null
  onScroll?: (scrollPosition: number, element: HTMLElement) => void
  focusMode: boolean
  typewriterMode: boolean
  theme: ThemeType
  placeholder?: string
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  fixIssue: (content: string, issue: LintIssue) => string | null
  imageStore: ImageStoreAPI
  // 选区变化回调（浮动格式工具栏用）：传入视口坐标矩形，选区坍缩时为 null
  onSelectionChange?: (info: { rect: { left: number; top: number; right: number; bottom: number } } | null) => void
}

export function useCM6State({
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
}: UseCM6StateParams) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // 稳定的 scroll DOM ref，供 ScrollButtons 等外部消费者使用
  // 在 view 创建后通过 effect 同步赋值，避免 useMemo 中构造临时 ref 导致引用失效
  const scrollDomRef = useRef<HTMLElement | null>(null)
  const isInternalUpdate = useRef(false)
  const isUndoRedoRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll
  const fileIdRef = useRef(fileId)
  fileIdRef.current = fileId
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange

  const { t } = useLanguage()
  const { settings: appSettings } = useSettings()

  // P1-1：源码模式 WikiLink/嵌入悬浮预览 —— 在 Provider 内解析数据，
  // 由 hoverTooltip 注入纯展示层（NoteHoverCardView）渲染
  const { resolveTargetFuzzy, getBacklinks, getOutgoingLinks } = useLinkIndex()
  const { getFileContent, rootFolder, openFile } = useFileManager()
  const { getTagsForFile } = useTagIndex()
  const resolveHoverData = useCallback((target: string): NoteHoverData => {
    const r = resolveTargetFuzzy(target.split('#')[0].trim())
    if (!r) {
      return { title: target, summary: '', backlinkCount: 0, outgoingCount: 0, tags: [], broken: true, fuzzy: false, fileId: '' }
    }
    const fileId = r.fileId
    const content = getFileContent(fileId) || ''
    const fileNode = findNode(rootFolder, fileId)
    return {
      title: fileNode?.name ? fileNode.name.replace(/\.md$/, '') : target,
      summary: content.trim().slice(0, 240),
      backlinkCount: getBacklinks(fileId).length,
      outgoingCount: getOutgoingLinks(fileId).length,
      tags: getTagsForFile(fileId),
      broken: false,
      fuzzy: r.fuzzy,
      fileId,
    }
  }, [resolveTargetFuzzy, getFileContent, getBacklinks, getOutgoingLinks, getTagsForFile, rootFolder])

  // hover 扩展闭包只捕获「读取最新 ref」的包装，避免 createState 只在初始化时创建一次导致过期闭包
  const resolveHoverDataRef = useRef(resolveHoverData)
  resolveHoverDataRef.current = resolveHoverData
  const openFileRef = useRef(openFile)
  openFileRef.current = openFile

  // Sub-hooks
  const { canUndo, canRedo, pushUndo, handleUndo, handleRedo } = useCM6UndoRedo({
    fileId,
    value,
    viewRef,
    isUndoRedoRef,
    onChange,
  })

  const { wordCountMode, stats, currentWordCount, toggleWordCountMode } = useCM6Stats({ value })

  const { searchMode, setSearchMode, handleFormatApplied } = useCM6FileOps({
    viewRef,
    value,
    focusMode,
    typewriterMode,
    isInternalUpdate,
  })

  // UI states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSaveAsModal, setShowSaveAsModal] = useState(false)
  const [showOptimizeModal, setShowOptimizeModal] = useState(false)
  const [showFrontMatter, setShowFrontMatter] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [largeImageConfirm, setLargeImageConfirm] = useState<{ file: File; onConfirm: () => void } | null>(null)
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([])
  const [showLintPopover, setShowLintPopover] = useState(false)
  const lintAnchorRef = useRef<HTMLDivElement>(null)
  const lintCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lint 检查
  useEffect(() => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    lintTimerRef.current = setTimeout(() => {
      const issues = lintMarkdown(value, t)
      setLintIssues(issues)
    }, 500)
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current)
    }
  }, [value, t])

  // Lint 跳转到问题位置
  const handleJumpToIssue = useCallback((issue: LintIssue) => {
    const view = viewRef.current
    if (!view) return
    const line = view.state.doc.line(Math.min(issue.line + 1, view.state.doc.lines))
    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    })
    view.focus()
  }, [])

  // 创建 CM6 EditorState
  const createState = useCallback((doc: string): EditorState => {
    return EditorState.create({
      doc,
      extensions: [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(defaultHighlightStyle),
        markdownHighlight,
        lineNumbers(),
        foldGutter(),
        markdownCodeFold,
        indentOnInput(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSelectionMatches(),
        closeBrackets(),
        ...rainbowBrackets(),
        // 不使用 CM6 的 history()，改用 UndoRedoStore 保持跨模式一致性
        // Ctrl+Z/Y 通过 createUndoRedoKeymap 桥接到 UndoRedoStore
        keymap.of([...defaultKeymap, ...searchKeymap]),
        createUndoRedoKeymap(),
        createKeymapExtension(),
        createAutocompleteExtension(),
        // P1-1：源码模式 [[note]] / ![[note]] 悬浮预览（对标 WYSIWYG WikiLinkHoverPreview）
        createWikiLinkHoverTooltip({
          resolveData: (target) => resolveHoverDataRef.current(target),
          openFile: (fileId) => openFileRef.current(fileId),
        }),
        createMathPreviewExtension(),
        createLintExtension(lintMarkdown, fixIssue),
        cmPlaceholder(t?.editor?.placeholder || ''),
        // 输入处理器（标题自动空格、粗体自动闭合、链接自动补全、代码围栏补全）
        createInputHandlers(appSettings.codeBlockDefaultLang, appSettings.autoPairMarkdown),
        // 自动配对（括号、引号）
        createAutoPairHandler(appSettings.autoPairBrackets),
        createQuotePairHandler(appSettings.autoPairQuotes),
        // DOM 事件处理器（Enter/Backspace/智能退格/图片标记删除）
        createKeyHandlers(),
        // 图片内联预览
        createImagePreviewExtension(imageStore),
        // Ctrl+Click 打开链接
        EditorView.domEventHandlers({
          click: (event, view) => {
            if (!(event.ctrlKey || event.metaKey)) return false
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos === null) return false

            const line = view.state.doc.lineAt(pos)
            const lineText = line.text
            // Match markdown link: [text](url)
            const linkRegex = /\[(?:[^\]]*)\]\(([^)]+)\)/g
            let match
            while ((match = linkRegex.exec(lineText)) !== null) {
              const start = match.index + 1
              const end = match.index + match[0].length
              if (pos - line.from >= start && pos - line.from <= end) {
                const url = match[1]
                window.open(url, '_blank', 'noopener')
                return true
              }
            }
            // Also check bare URLs
            const urlRegex = /https?:\/\/[^\s)>]+/g
            while ((match = urlRegex.exec(lineText)) !== null) {
              const start = match.index
              const end = start + match[0].length
              if (pos - line.from >= start && pos - line.from <= end) {
                window.open(match[0], '_blank', 'noopener')
                return true
              }
            }
            return false
          },
        }),
        // 拼写检查（跟随设置，默认关闭；英文词典对中文用户价值≈0）
        ...(appSettings.spellCheck ? [spellCheckExtension()] : []),
        // 智能标点
        smartPunctuation(),
        // 专注模式 + 打字机模式
        focusModeState,
        typewriterModeState,
        createFocusModeExtension(),
        createTypewriterModeExtension(),
        focusModeTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isInternalUpdate.current && !isUndoRedoRef.current) {
            const newValue = update.state.doc.toString()
            pushUndo(newValue, 'typing')
            onChangeRef.current(newValue)
          }
          // 监听 viewport 变化（滚动时触发），保存滚动位置
          // 注意：滚动位置保存逻辑已移至原生 scroll 事件中处理（见下方 handleScroll）
          if (update.viewportChanged) {
            // 由原生 scroll 事件统一处理
          }
        }),
        // 选区变化上报（浮动格式工具栏）：仅当选区真正改变时触发
        EditorView.updateListener.of((update) => {
          const cb = onSelectionChangeRef.current
          if (!cb || !update.selectionSet) return
          const sel = update.state.selection.main
          if (sel.empty) {
            cb(null)
            return
          }
          const c = update.view.coordsAtPos(sel.from)
          if (!c) return
          cb({ rect: { left: c.left, top: c.top, right: c.right, bottom: c.bottom } })
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: `${appSettings.fontSize}px`,
            fontFamily: appSettings.codeFontFamily,
          },
          '.cm-content': {
            fontFamily: appSettings.codeFontFamily,
            lineHeight: focusMode ? '32px' : '22.75px',
            letterSpacing: focusMode ? '0.02em' : 'normal',
            paddingBottom: focusMode ? '50vh' : '40px',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--editor-bg)',
            color: 'var(--editor-text)',
            border: 'none',
            opacity: '0.6',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
          },
          '.cm-activeLine': {
            backgroundColor: focusMode ? 'rgba(59, 130, 246, 0.06)' : 'rgba(0, 0, 0, 0.02)',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(59, 130, 246, 0.2) !important',
          },
          '&.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--editor-text)',
          },
          '.cm-foldGutter': {
            opacity: '0.5',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
        }),
        EditorView.baseTheme({
          '&light': { color: '#333' },
          '&dark': { color: '#d4d4d4' },
        }),
        // 代码主题：如果设置了非默认代码主题，使用该主题；否则根据应用主题选择暗色回退
        ...(appSettings.codeTheme !== 'default'
          ? [getCodeTheme(appSettings.codeTheme).theme]
          : theme === 'dark' ? [cm6DarkTheme] : []),
      ],
    })
  }, [focusMode, pushUndo, t, theme, appSettings.fontSize, appSettings.codeFontFamily, appSettings.codeBlockDefaultLang, appSettings.codeTheme, appSettings.autoPairBrackets, appSettings.autoPairQuotes, appSettings.autoPairMarkdown, appSettings.spellCheck])

  // 初始化 EditorView
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const state = createState(value)
      const view = new EditorView({
        state,
        parent: containerRef.current,
      })
      viewRef.current = view

      // 使用原生 scroll 事件实现滚动同步（比 CM6 viewportChanged 更及时、更丝滑）
      const scrollDom = view.scrollDOM
      // 同步到稳定的 scrollDomRef 供外部使用（如 ScrollButtons）
      scrollDomRef.current = scrollDom
      let snapTimer: ReturnType<typeof setTimeout> | null = null

      // 找到 scrollDOM 可视区域顶部对应的文档位置
      const getTopVisiblePos = (): number | null => {
        const scrollRect = scrollDom.getBoundingClientRect()
        // 用 scrollDOM 可视区域顶部稍下一点的位置（避免边界问题）
        return view.posAtCoords({ x: scrollRect.left + 10, y: scrollRect.top + 2 })
      }

      const handleScroll = () => {
        onScrollRef.current?.(scrollDom.scrollTop, scrollDom)

        // 滚动停止后保存当前行号（用于切换标签页时恢复滚动位置）
        // 注意：不再做 snap 吸附，避免打断 ScrollButtons 的 smooth 滚动
        if (snapTimer) clearTimeout(snapTimer)
        snapTimer = setTimeout(() => {
          const currentFileId = fileIdRef.current
          if (!currentFileId) return

          const doc = view.state.doc
          const totalLines = doc.lines
          if (totalLines <= 0) return

          // 找到当前 scrollDOM 可视区域顶部对应的行
          const topPos = getTopVisiblePos()
          if (topPos === null) return

          const currentLine = doc.lineAt(topPos)
          saveEditorScrollCM(currentFileId, currentLine.number)
        }, 150)
      }
      scrollDom.addEventListener('scroll', handleScroll, { passive: true })

      // 初始聚焦
      setTimeout(() => view.focus(), 100)

      return () => {
        // 不在 cleanup 时保存，因为此时 DOM 已被重置，scrollTop=0 会覆盖之前保存的正确值
        // 滚动位置只在用户主动滚动时通过原生 scroll 事件保存
        if (snapTimer) clearTimeout(snapTimer)
        scrollDom.removeEventListener('scroll', handleScroll)
        view.destroy()
        viewRef.current = null
        scrollDomRef.current = null
      }
    } catch (err) {
      console.error('CM6 EditorView creation failed:', err)
      // Show error message in the container
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="padding:20px;color:#ef4444;font-family:monospace;font-size:13px;">
          <div style="font-weight:600;margin-bottom:8px;">Source Editor Error</div>
          <div>${err instanceof Error ? err.message : String(err)}</div>
          ${err instanceof Error && err.stack ? `<details><summary style="cursor:pointer;color:#999;font-size:11px;">Stack</summary><pre style="font-size:10px;color:#aaa;margin-top:4px;">${err.stack}</pre></details>` : ''}
        </div>`
      }
    }
  }, []) // 仅初始化一次

  return {
    // Refs
    containerRef,
    viewRef,
    scrollDomRef,
    isUndoRedoRef,

    // State
    canUndo,
    canRedo,
    wordCountMode,
    searchMode,
    setSearchMode,
    error,
    setError,
    success,
    setSuccess,
    showSaveAsModal,
    setShowSaveAsModal,
    showOptimizeModal,
    setShowOptimizeModal,
    showFrontMatter,
    setShowFrontMatter,
    isDragging,
    setIsDragging,
    largeImageConfirm,
    setLargeImageConfirm,

    // Core callbacks
    pushUndo,
    handleUndo,
    handleRedo,
    handleFormatApplied,
    toggleWordCountMode,

    // Computed
    stats,
    currentWordCount,

    // Language
    t,

    // Lint
    lintIssues,
    showLintPopover,
    setShowLintPopover,
    lintAnchorRef,
    lintCloseTimerRef,
    handleJumpToIssue,
  }
}

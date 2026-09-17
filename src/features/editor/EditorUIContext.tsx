import { createContext, useContext } from 'react'
import type { EditorView } from '@codemirror/view'
import type { Editor } from '@tiptap/react'
import type { LintIssue } from '@utils/lintTypes'
import type { ImageStoreAPI } from '@core/storage/imageStoreTypes'
import type { WordCountMode } from './hooks/useEditorState'
import type { DocumentStats } from './stats'
import type { Translations } from '../../types/translations'

// ---------------------------------------------------------------------------
// Sub-context: Core editor state and operations
// ---------------------------------------------------------------------------
export interface EditorCoreContextValue {
  // Editor view reference (CodeMirror EditorView)
  editorViewRef: React.RefObject<EditorView | null>

  // Core editor state
  value: string
  onChange: (value: string) => void
  pushUndo: (newValue: string, groupKey?: string) => void

  // Undo / Redo
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void

  // Format
  onFormatApplied: () => void

  // Toggle modes
  focusMode: boolean
  typewriterMode: boolean
  autocompleteEnabled: boolean
  showPreview: boolean
  onToggleFocusMode: () => void
  onToggleTypewriterMode: () => void
  onToggleAutocomplete: () => void
  onTogglePreview: () => void

  // Scroll
  scrollContainerRef: React.RefObject<HTMLElement | null>

  // Stats
  stats: DocumentStats
  currentWordCount: number
  wordCountMode: WordCountMode
  onToggleWordCountMode: () => void

  // Translations
  t: Translations

  // TiptapEditor-specific (optional, only available in WYSIWYG mode)
  tiptapEditor?: Editor | null
  livePreview?: boolean
  onToggleLivePreview?: () => void

  // Dependency injection
  lintMarkdown: (content: string, t?: Translations) => LintIssue[]
  fixIssue: (content: string, issue: LintIssue) => string | null
  imageStore: ImageStoreAPI
}

export const EditorCoreContext = createContext<EditorCoreContextValue | null>(null)

export function useEditorCore(): EditorCoreContextValue {
  const ctx = useContext(EditorCoreContext)
  if (!ctx) {
    throw new Error('useEditorCore must be used within an EditorCoreContext.Provider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Sub-context: Modal and popover state
// ---------------------------------------------------------------------------
export interface EditorModalsContextValue {
  // Actions that open modals
  onSearchReplace: () => void
  onSaveAs: () => void
  onOptimizeImages: () => void
  onOpenFrontMatter: () => void
  onUploadImage: () => void
  onOpenFile: () => void
  onPrint: () => void
  /** 打开模板选择器（Aurora 注入，经 EditorLayout 透传） */
  onUseTemplate?: () => void

  // Search
  searchMode: 'search' | 'replace' | null
  onCloseSearch: () => void

  // Modals
  showSaveAsModal: boolean
  onCloseSaveAsModal: () => void
  showOptimizeModal: boolean
  onCloseOptimizeModal: () => void
  showFrontMatter: boolean
  onCloseFrontMatter: () => void

  // Lint
  lintIssues: LintIssue[]
  showLintPopover: boolean
  onCloseLintPopover: () => void
  onJumpToIssue: (issue: LintIssue) => void
  onFixIssue: (newContent: string) => void
  lintAnchorEl: HTMLElement | null
  lintCloseTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  lintAnchorRef: React.RefObject<HTMLDivElement | null>
  setShowLintPopover: (show: boolean) => void

  // Large image confirm
  largeImageConfirm: { file: File; onConfirm: () => void } | null
  onDismissLargeImageConfirm: () => void

  // Error / Success messages
  error: string | null
  success: string | null
}

export const EditorModalsContext = createContext<EditorModalsContextValue | null>(null)

export function useEditorModals(): EditorModalsContextValue {
  const ctx = useContext(EditorModalsContext)
  if (!ctx) {
    throw new Error('useEditorModals must be used within an EditorModalsContext.Provider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Sub-context: Insert helpers
// ---------------------------------------------------------------------------
export interface EditorInsertContextValue {
  onInsertFootnote: () => void
  onInsertInlineMath: () => void
  onInsertBlockMath: () => void
  onInsertMathTemplate: (template: string, mode: 'inline' | 'block', isTemplate: boolean) => void
  onInsertMermaid: (code: string) => void
}

export const EditorInsertContext = createContext<EditorInsertContextValue | null>(null)

export function useEditorInsert(): EditorInsertContextValue {
  const ctx = useContext(EditorInsertContext)
  if (!ctx) {
    throw new Error('useEditorInsert must be used within an EditorInsertContext.Provider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Legacy combined context — backward compatible
// ---------------------------------------------------------------------------
export interface EditorUIContextValue extends EditorCoreContextValue, EditorModalsContextValue, EditorInsertContextValue {}

export const EditorUIContext = createContext<EditorUIContextValue | null>(null)

export function useEditorUI(): EditorUIContextValue {
  const ctx = useContext(EditorUIContext)
  if (!ctx) {
    throw new Error('useEditorUI must be used within an EditorUIContext.Provider')
  }
  return ctx
}

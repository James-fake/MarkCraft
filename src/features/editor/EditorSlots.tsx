import React, { lazy, Suspense } from 'react'
import { useEditorUI } from './EditorUIContext'
import MarkdownToolbar from './toolbar/MarkdownToolbar'
import WysiwygToolbar from './toolbar/WysiwygToolbar'
import OptimizeImagesModal from './OptimizeImagesModal'
import ScrollButtons from '@components/ui/ScrollButtons'
import FrontMatterPanel from './FrontMatterPanel'
import LintPopover from '../lint/LintPopover'
import FocusModeToolbar from './FocusModeToolbar'
import EditorStatusBar from './EditorStatusBar'
import LargeImageConfirmDialog from './LargeImageConfirmDialog'
import { extractTitle, sanitizeFileName } from '../../utils/titleUtils'

const LazySearchReplace = lazy(() => import('../search/SearchReplace'))
const LazySaveAsModal = lazy(() => import('../export/SaveAsModal'))

// ---------------------------------------------------------------------------
// EditorToolbarSlot — renders MarkdownToolbar (source mode)
// ---------------------------------------------------------------------------
const EditorToolbarSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return (
    <MarkdownToolbar
      editorViewRef={ctx.editorViewRef}
      onFormatApplied={ctx.onFormatApplied}
      value={ctx.value}
      onChange={ctx.onChange}
      canUndo={ctx.canUndo}
      canRedo={ctx.canRedo}
      onUndo={ctx.onUndo}
      onRedo={ctx.onRedo}
      onUploadImage={ctx.onUploadImage}
      onSearchReplace={ctx.onSearchReplace}
      focusMode={ctx.focusMode}
      typewriterMode={ctx.typewriterMode}
      onToggleFocusMode={ctx.onToggleFocusMode}
      onToggleTypewriterMode={ctx.onToggleTypewriterMode}
      autocompleteEnabled={ctx.autocompleteEnabled}
      onToggleAutocomplete={ctx.onToggleAutocomplete}
      onInsertFootnote={ctx.onInsertFootnote}
      onInsertInlineMath={ctx.onInsertInlineMath}
      onInsertBlockMath={ctx.onInsertBlockMath}
      onInsertMathTemplate={ctx.onInsertMathTemplate}
      onInsertMermaid={ctx.onInsertMermaid}
      onOpenFile={ctx.onOpenFile}
      onSaveAs={ctx.onSaveAs}
      onTogglePreview={ctx.onTogglePreview}
      showPreview={ctx.showPreview}
      onOptimizeImages={ctx.onOptimizeImages}
      onOpenFrontMatter={ctx.onOpenFrontMatter}
      onPushUndo={ctx.pushUndo}
      onPrint={ctx.onPrint}
      onUseTemplate={ctx.onUseTemplate}
    />
  )
}
export const EditorToolbarSlot = React.memo(EditorToolbarSlotInner)

// ---------------------------------------------------------------------------
// EditorFocusModeToolbarSlot — renders FocusModeToolbar
// ---------------------------------------------------------------------------
const EditorFocusModeToolbarSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return (
    <FocusModeToolbar
      typewriterMode={ctx.typewriterMode}
      onToggleTypewriterMode={ctx.onToggleTypewriterMode}
      onToggleFocusMode={ctx.onToggleFocusMode}
      t={ctx.t}
    />
  )
}
export const EditorFocusModeToolbarSlot = React.memo(EditorFocusModeToolbarSlotInner)

// ---------------------------------------------------------------------------
// EditorSearchSlot — renders SearchReplace (returns null if no searchMode)
// ---------------------------------------------------------------------------
const EditorSearchSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  if (!ctx.searchMode) return null
  return (
    <Suspense fallback={null}>
      <LazySearchReplace
        content={ctx.value}
        onContentChange={(newContent) => {
          ctx.pushUndo(newContent, 'search-replace')
          ctx.onChange(newContent)
        }}
        onClose={ctx.onCloseSearch}
        mode={ctx.searchMode}
      />
    </Suspense>
  )
}
export const EditorSearchSlot = React.memo(EditorSearchSlotInner)

// ---------------------------------------------------------------------------
// EditorScrollSlot — renders ScrollButtons
// ---------------------------------------------------------------------------
const EditorScrollSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return <ScrollButtons scrollContainerRef={ctx.scrollContainerRef} scrollToTopLabel={ctx.t.scrollButtons.scrollToTop} scrollToBottomLabel={ctx.t.scrollButtons.scrollToBottom} />
}
export const EditorScrollSlot = React.memo(EditorScrollSlotInner)

// ---------------------------------------------------------------------------
// EditorStatusBarSlot — renders EditorStatusBar
// ---------------------------------------------------------------------------
const EditorStatusBarSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return (
    <EditorStatusBar
      stats={ctx.stats}
      currentWordCount={ctx.currentWordCount}
      wordCountMode={ctx.wordCountMode}
      lintIssues={ctx.lintIssues}
      lintAnchorRef={ctx.lintAnchorRef}
      lintCloseTimerRef={ctx.lintCloseTimerRef}
      onToggleWordCountMode={ctx.onToggleWordCountMode}
      setShowLintPopover={ctx.setShowLintPopover}
      t={ctx.t}
    />
  )
}
export const EditorStatusBarSlot = React.memo(EditorStatusBarSlotInner)

// ---------------------------------------------------------------------------
// EditorModalsSlot — renders SaveAsModal, OptimizeImagesModal,
//   FrontMatterPanel, LintPopover, LargeImageConfirmDialog
// ---------------------------------------------------------------------------
const EditorModalsSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return (
    <>
      <Suspense fallback={null}>
        <LazySaveAsModal
          isOpen={ctx.showSaveAsModal}
          onClose={ctx.onCloseSaveAsModal}
          content={ctx.value}
          defaultFileName={sanitizeFileName(extractTitle(ctx.value)) || 'Untitled'}
          onSuccess={() => {}}
          onError={() => {}}
        />
      </Suspense>

      <OptimizeImagesModal
        isOpen={ctx.showOptimizeModal}
        onClose={ctx.onCloseOptimizeModal}
        content={ctx.value}
        onContentChange={(newContent) => {
          ctx.pushUndo(newContent, 'optimize-images')
          ctx.onChange(newContent)
        }}
        onSuccess={() => {}}
        onError={() => {}}
      />

      <FrontMatterPanel
        isOpen={ctx.showFrontMatter}
        onClose={ctx.onCloseFrontMatter}
        content={ctx.value}
        onContentChange={(newContent) => {
          ctx.pushUndo(newContent, 'front-matter')
          ctx.onChange(newContent)
        }}
      />

      <LintPopover
        issues={ctx.lintIssues}
        content={ctx.value}
        onJumpToIssue={ctx.onJumpToIssue}
        onFixIssue={ctx.onFixIssue}
        anchorEl={ctx.lintAnchorEl}
        visible={ctx.showLintPopover}
        onClose={ctx.onCloseLintPopover}
        onMouseEnter={() => {
          if (ctx.lintCloseTimerRef.current) {
            clearTimeout(ctx.lintCloseTimerRef.current)
            ctx.lintCloseTimerRef.current = null
          }
        }}
        onMouseLeave={() => {
          ctx.lintCloseTimerRef.current = setTimeout(() => {
            ctx.onCloseLintPopover()
          }, 300)
        }}
      />

      {ctx.largeImageConfirm && (
        <LargeImageConfirmDialog
          largeImageConfirm={ctx.largeImageConfirm}
          onDismiss={ctx.onDismissLargeImageConfirm}
          t={ctx.t}
        />
      )}
    </>
  )
}
export const EditorModalsSlot = React.memo(EditorModalsSlotInner)

// ---------------------------------------------------------------------------
// EditorWysiwygToolbarSlot — renders WysiwygToolbar (needs tiptapEditor)
// ---------------------------------------------------------------------------
const EditorWysiwygToolbarSlotInner: React.FC = () => {
  const ctx = useEditorUI()
  return (
    <WysiwygToolbar
      editor={ctx.tiptapEditor ?? null}
      canUndo={ctx.canUndo}
      canRedo={ctx.canRedo}
      onUndo={ctx.onUndo}
      onRedo={ctx.onRedo}
      onSearchReplace={ctx.onSearchReplace}
      livePreview={ctx.livePreview}
      onToggleLivePreview={ctx.onToggleLivePreview}
      onOpenFile={ctx.onOpenFile}
      onSaveAs={ctx.onSaveAs}
      onOpenFrontMatter={ctx.onOpenFrontMatter}
      onOptimizeImages={ctx.onOptimizeImages}
      onPrint={ctx.onPrint}
      onUseTemplate={ctx.onUseTemplate}
    />
  )
}
export const EditorWysiwygToolbarSlot = React.memo(EditorWysiwygToolbarSlotInner)

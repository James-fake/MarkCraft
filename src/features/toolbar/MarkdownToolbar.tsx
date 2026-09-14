import type { Translations } from '../../types/translations'
import { useState, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { Separator } from './groups/shared'
import UndoRedoGroup from './groups/UndoRedoGroup'
import FormatGroup from './groups/FormatGroup'
import SourceHeadingDropdown from './groups/SourceHeadingDropdown'
import ListGroup from './groups/ListGroup'
import BlockGroup from './groups/BlockGroup'
import InsertGroup from './groups/InsertGroup'
import MoreDropdown from './groups/MoreDropdown'
import { buildSharedMoreItems } from './groups/sharedMoreItems'
import MindmapPopover from './MindmapPopover'
import EmojiPicker from '../shared/ui/EmojiPicker'
import { useLanguage } from '../../stores/LanguageStore'
import { useBookmark } from '../../stores/BookmarkStore'
import { useFileManager } from '../../stores/FileStore'
import { useLinkIndex } from '../../stores/LinkIndexStore'
import { getRecentFiles } from '../fileManager/recentFilesManager'
import { buildRecentWikilink, buildReferenceTemplate, buildRelatedTemplate, buildBackindexTemplate, buildTodayWikilink, buildBacklinksList } from './groups/linkTemplates'
import { cm6InsertTemplate } from '../editor/cm6/autocompleteExtension'
import { findNode } from '../../services/fileService'
import { getShortcut } from '../shared/utils/ShortcutManager'

function formatShortcut(key: string): string {
  return key
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
}

interface MarkdownToolbarProps {
  editorViewRef: React.RefObject<EditorView | null>
  onFormatApplied: () => void
  value: string
  onChange: (value: string) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onUploadImage?: () => void
  onSearchReplace?: () => void
  focusMode?: boolean
  typewriterMode?: boolean
  onToggleFocusMode?: () => void
  onToggleTypewriterMode?: () => void
  autocompleteEnabled?: boolean
  onToggleAutocomplete?: () => void
  onInsertFootnote?: () => void
  onInsertInlineMath?: () => void
  onInsertBlockMath?: () => void
  onInsertMathTemplate?: (template: string, mode: 'inline' | 'block', isTemplate: boolean) => void
  onInsertMermaid?: (code: string) => void
  onOpenFile?: () => void
  onSaveAs?: () => void
  onTogglePreview?: () => void
  showPreview?: boolean
  onOptimizeImages?: () => void
  onOpenFrontMatter?: () => void
  onPushUndo?: (newValue: string, groupKey?: string) => void
  /** 打开模板选择器（由 EditorLayout 透传，Aurora 注入） */
  onUseTemplate?: () => void
  // 打印当前文件内容（由 App 注入，使用渲染后的 HTML；缺省回退到 window.print）
  onPrint?: () => void
}

const groupProps = (props: MarkdownToolbarProps, t: Translations) => ({
  t,
  editorViewRef: props.editorViewRef,
  value: props.value,
  onChange: props.onChange,
  onFormatApplied: props.onFormatApplied,
  onPushUndo: props.onPushUndo,
})

export default function MarkdownToolbar(props: MarkdownToolbarProps) {
  const { t, language } = useLanguage()
  const { addBookmark, removeBookmark, isBookmarked, bookmarks } = useBookmark()
  const { tabs, activeTabId, rootFolder } = useFileManager()
  const linkIndex = useLinkIndex()
  const gp = groupProps(props, t)

  // 从当前激活的标签页获取文件 ID 和名称
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const activeFileId = activeTab?.fileId
  const activeFileNode = activeFileId ? findNode(rootFolder, activeFileId) : null
  const activeFileName = activeFileNode?.name || activeTab?.name || ''
  const [mindmapOpen, setMindmapOpen] = useState(false)
  const [mindmapAnchor, setMindmapAnchor] = useState<HTMLElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  const handleEmojiSelect = useCallback((emoji: string) => {
    const view = props.editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: emoji },
      selection: { anchor: from + emoji.length },
    })
    view.focus()
  }, [props.editorViewRef])

  const moreItems = [
    ...buildSharedMoreItems({
      t,
      onInsertInlineMath: props.onInsertInlineMath,
      onInsertBlockMath: props.onInsertBlockMath,
      onOpenMindmap: () => {
        setMindmapAnchor(moreBtnRef.current)
        setMindmapOpen(true)
      },
      onInsertFootnote: props.onInsertFootnote,
      // 知识链接组（由 Slash 命令迁移；统一走 cm6InsertTemplate 共享模板）
      onInsertWikilink: () => {
        const view = props.editorViewRef.current
        if (view) cm6InsertTemplate(view, buildRecentWikilink(getRecentFiles().map(r => r.fileName)))
      },
      onInsertLinkTemplate: () => {
        const view = props.editorViewRef.current
        if (view) cm6InsertTemplate(view, buildReferenceTemplate())
      },
      onInsertRelated: () => {
        const view = props.editorViewRef.current
        if (view) cm6InsertTemplate(view, buildRelatedTemplate())
      },
      onInsertBackindex: () => {
        const view = props.editorViewRef.current
        if (view) cm6InsertTemplate(view, buildBackindexTemplate(activeFileName))
      },
      onInsertToday: () => {
        const view = props.editorViewRef.current
        if (view) cm6InsertTemplate(view, buildTodayWikilink())
      },
      onInsertBacklinks: () => {
        const view = props.editorViewRef.current
        if (!view) return
        const names = activeFileId ? linkIndex.getBacklinks(activeFileId).map(bl => bl.sourceFileName) : []
        cm6InsertTemplate(view, buildBacklinksList(names))
      },
      onOpenFrontMatter: props.onOpenFrontMatter,
      onOptimizeImages: props.onOptimizeImages,
      onOpenFile: props.onOpenFile,
      onSaveAs: props.onSaveAs,
      onPrint: props.onPrint ?? (() => window.print()),
      onToggleAutocomplete: props.onToggleAutocomplete,
      autocompleteEnabled: props.autocompleteEnabled,
      onUseTemplate: props.onUseTemplate,
    }),
  ]

  return (
    <div
      className="format-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'var(--editor-bg)',
        padding: '6px 12px',
        gap: '1px',
        userSelect: 'none',
        justifyContent: props.showPreview ? 'flex-start' : 'center',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Brand line */}
      <div style={{
        width: '3px',
        height: '20px',
        borderRadius: '2px',
        background: 'var(--button-primary)',
        marginRight: '6px',
        flexShrink: 0,
      }} />
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'var(--button-primary)',
      }} />

      {/* ── Undo / Redo ── */}
      <UndoRedoGroup
        t={t}
        canUndo={props.canUndo ?? false}
        canRedo={props.canRedo ?? false}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
      />

      <Separator />

      {/* ── Text formatting (6 buttons) ── */}
      <FormatGroup {...gp} />

      <Separator />

      {/* ── Heading dropdown ── */}
      <SourceHeadingDropdown {...gp} />

      {/* ── List dropdown ── */}
      <ListGroup {...gp} />

      <Separator />

      {/* ── Block elements ── */}
      <BlockGroup {...gp} />

      <Separator />

      {/* ── Insert (link) ── */}
      <InsertGroup {...gp} />

      <Separator />

      {/* ── Search ── */}
      <button
        onClick={props.onSearchReplace}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          color: 'var(--editor-text)',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          padding: 0,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        title={`${t.toolbar.searchReplace || '搜索替换'} (${formatShortcut(getShortcut('edit.find'))})`}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      <Separator />

      {/* ── Bookmark toggle ── */}
      {(() => {
        const fileId = activeFileId
        const fileName = activeFileName
        const alreadyBookmarked = fileId ? isBookmarked(fileId) : false
        const existingBookmarkId = fileId
          ? bookmarks.find(b => b.fileId === fileId && !b.headingText)?.id
          : undefined
        const handleToggleBookmark = () => {
          if (!fileId) return
          if (alreadyBookmarked && existingBookmarkId) {
            removeBookmark(existingBookmarkId)
          } else {
            addBookmark({
              type: 'file',
              fileId,
              fileName,
              groupName: '默认',
            })
          }
        }
        return (
          <button
            onClick={handleToggleBookmark}
            disabled={!fileId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: alreadyBookmarked ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              color: alreadyBookmarked ? '#f59e0b' : 'var(--editor-text)',
              cursor: fileId ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s',
              padding: 0,
              flexShrink: 0,
              opacity: fileId ? 1 : 0.4,
            }}
            onMouseEnter={(e) => { if (fileId) e.currentTarget.style.backgroundColor = alreadyBookmarked ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = alreadyBookmarked ? 'rgba(245, 158, 11, 0.12)' : 'transparent' }}
            title={alreadyBookmarked
              ? (language === 'zh' ? '移除书签' : 'Remove Bookmark')
              : (language === 'zh' ? '添加书签' : 'Add Bookmark')}
          >
            <svg style={{ width: '16px', height: '16px' }} fill={alreadyBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        )
      })()}

      {/* ── Emoji Picker ── */}
      <button
        ref={emojiBtnRef}
        onClick={() => setEmojiOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: emojiOpen ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          color: 'var(--editor-text)',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          padding: 0,
          flexShrink: 0,
          fontSize: '16px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = emojiOpen ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
        title={t.toolbar.emoji || 'Emoji'}
      >
        😊
      </button>

      {/* ── More dropdown ── */}
      <MoreDropdown items={moreItems} buttonRef={moreBtnRef} />

      {/* ── Emoji Picker Popover ── */}
      {emojiOpen && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setEmojiOpen(false)}
          anchorEl={emojiBtnRef.current}
        />
      )}

      {/* ── Mindmap Popover ── */}
      <MindmapPopover
        t={t}
        language={language}
        isOpen={mindmapOpen}
        onClose={() => { setMindmapOpen(false); setMindmapAnchor(null) }}
        anchorEl={mindmapAnchor}
        onInsert={(template: string) => {
          const codeMatch = template.match(/```mermaid\n([\s\S]*?)```/)
          const code = codeMatch ? codeMatch[1].trim() : 'mindmap\n  root((中心主题))'
          props.onInsertMermaid?.(code)
          setMindmapOpen(false)
          setMindmapAnchor(null)
        }}
      />
    </div>
  )
}

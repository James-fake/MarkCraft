import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import WysiwygToolbarButton from '@features/editor/toolbar/WysiwygToolbarButton'
import MathPopover from '@features/editor/toolbar/MathPopover'
import WysiwygHeadingDropdown from '@features/editor/toolbar/WysiwygHeadingDropdown'
import ListDropdown from '@features/editor/toolbar/ListDropdown'
import LinkModal from '@features/editor/toolbar/LinkModal'
import ImageModal from '@features/editor/toolbar/ImageModal'
import TableGridSelector from '@features/editor/toolbar/TableGridSelector'
import MoreDropdown from '@features/editor/toolbar/groups/MoreDropdown'
import { buildSharedMoreItems } from '@features/editor/toolbar/groups/sharedMoreItems'
import MindmapPopover from '@features/editor/toolbar/MindmapPopover'
import EmojiPicker from '@features/editor/toolbar/EmojiPicker'
import { useLanguage } from '@stores/LanguageStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import { getRecentFiles } from '@core/files/recentFiles'
import { buildRecentWikilink, buildRelatedTemplate, buildRelatedListText, mergeRelatedNotes, buildBackindexTemplate, buildTodayWikilink, buildBacklinksList, buildReferenceList } from '@features/editor/toolbar/groups/linkTemplates'
import { extractFootnotes } from '@features/editor/footnote'
import { getShortcutLabel } from '@features/editor/toolbar/ShortcutManager'
import { UnderlineColorButton, HighlightColorButton } from '@features/editor/toolbar/WysiwygColorButtons'
import { insertMathWithMerge } from '@features/editor/toolbar/mathBlockInsert'

interface WysiwygToolbarProps {
  editor: Editor | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSearchReplace?: () => void
  livePreview?: boolean
  onToggleLivePreview?: () => void
  onOpenFile?: () => void
  onSaveAs?: () => void
  onOpenFrontMatter?: () => void
  onOptimizeImages?: () => void
  onPrint?: () => void
  /** 打开模板选择器（由 EditorLayout 透传，Aurora 注入） */
  onUseTemplate?: () => void
}

function Separator() {
  return (
    <div style={{
      width: '1px',
      height: '20px',
      borderRadius: '1px',
      backgroundColor: 'var(--editor-border)',
      margin: '0 4px',
      flexShrink: 0,
    }} />
  )
}

/**
 * WYSIWYG 工具栏（P4-3 拆分）：高亮/下划线 split-button 调色板抽至
 * WysiwygColorButtons.tsx（状态/refs/外部点击/位置/持久化全自包含），
 * 数学公式插入的 ProseMirror 定位合并逻辑抽至 mathBlockInsert.ts；
 * 本文件保留按钮排布、More 菜单组装与各浮层/模态的挂载编排。
 */
export default function WysiwygToolbar({
  editor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSearchReplace,
  livePreview,
  onToggleLivePreview,
  onOpenFile,
  onSaveAs,
  onOpenFrontMatter,
  onOptimizeImages,
  onPrint,
  onUseTemplate,
}: WysiwygToolbarProps) {
  const { t, language } = useLanguage()
  const linkIndex = useLinkIndex()
  const { tabs, activeTabId } = useFileManager()
  // 知识链接插入需要当前文件上下文（与 Slash 命令迁移前行为一致）
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const activeFileId = activeTab?.fileId
  const activeFileName = activeTab?.name || ''
  const getBacklinks = useCallback((fileId: string) => linkIndex.getBacklinks(fileId), [linkIndex])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showTableGrid, setShowTableGrid] = useState(false)
  const [mathPopoverMode, setMathPopoverMode] = useState<'inline' | 'block' | null>(null)
  const [mathPopoverAnchor, setMathPopoverAnchor] = useState<HTMLElement | null>(null)
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [diagramAnchor, setDiagramAnchor] = useState<HTMLElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  const handleEmojiSelect = useCallback((emoji: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(emoji).run()
  }, [editor])

  // Only re-render when formatting state actually changes (rAF throttled)
  const [, setEditorTick] = useState(0)
  useEffect(() => {
    if (!editor) return

    let rafId: number | null = null

    const handler = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        setEditorTick(n => n + 1)
        rafId = null
      })
    }

    // 具名引用：匿名箭头注册 + 用另一个函数 off 会导致移除失败、监听泄漏
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean; storedMarksSet: boolean } }) => {
      if (transaction.docChanged || transaction.storedMarksSet) {
        handler()
      }
    }

    editor.on('selectionUpdate', handler)
    editor.on('transaction', onTransaction)

    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', onTransaction)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [editor])

  if (!editor) return null

  const moreItems = [
    ...buildSharedMoreItems({
      t,
      onInsertInlineMath: () => {
        setMathPopoverAnchor(moreBtnRef.current)
        setMathPopoverMode(mathPopoverMode === 'inline' ? null : 'inline')
      },
      onInsertBlockMath: () => {
        setMathPopoverAnchor(moreBtnRef.current)
        setMathPopoverMode(mathPopoverMode === 'block' ? null : 'block')
      },
      onOpenMindmap: () => {
        setDiagramAnchor(moreBtnRef.current)
        setDiagramOpen(true)
      },
      onInsertFootnote: () => editor.chain().focus().insertFootnote().run(),
      // 知识链接组（由 Slash 命令迁移）
      onInsertWikilink: () => editor.chain().focus().insertContent(buildRecentWikilink(getRecentFiles().map(r => r.fileName))).run(),
      onInsertLinkTemplate: () => {
        const nodeEntries: { id: string; content: string }[] = []
        editor.state.doc.descendants((n) => {
          if (n.type.name === 'footnoteReference' && n.attrs.id) {
            nodeEntries.push({ id: n.attrs.id as string, content: (n.attrs.content as string) || '' })
          }
        })
        const textEntries = extractFootnotes(editor.getText()).map((f) => ({ id: f.id, content: f.fullContent }))
        editor.chain().focus().insertContent(buildReferenceList([...nodeEntries, ...textEntries], editor.getText())).run()
      },
      onInsertRelated: () => {
        // B1：有当前笔记时基于全局链接索引（反链 ∪ 出链，排除自己）插入实时相关笔记
        if (activeFileId) {
          const back = getBacklinks(activeFileId).map((r) => ({ title: r.sourceFileName, fileId: r.sourceFileId }))
          const out = linkIndex.getOutgoingLinks(activeFileId)
            .map((r) => linkIndex.resolveTarget(r.target))
            .filter((id): id is string => Boolean(id))
            .map((id) => ({ title: linkIndex.fileIndex.get(id)?.fileName ?? id, fileId: id }))
          const merged = mergeRelatedNotes(back, out, activeFileId)
          editor.chain().focus().insertContent(buildRelatedListText(merged.map((m) => m.title))).run()
          return
        }
        // 无激活笔记时退回扫描正文双链
        editor.chain().focus().insertContent(buildRelatedTemplate(editor.getText(), activeFileName)).run()
      },
      onInsertBackindex: () => editor.chain().focus().insertContent(buildBackindexTemplate(activeFileName)).run(),
      onInsertToday: () => editor.chain().focus().insertContent(buildTodayWikilink()).run(),
      onInsertBacklinks: () => {
        const names = activeFileId ? getBacklinks(activeFileId).map(bl => bl.sourceFileName) : []
        editor.chain().focus().insertContent(buildBacklinksList(names)).run()
      },
      onOpenFrontMatter,
      onOptimizeImages,
      onOpenFile,
      onSaveAs,
      onPrint,
      onUseTemplate,
    }),
    // 所见即所得独有：Live Preview
    {
      label: t.settings.livePreview || 'Live Preview',
      icon: (
        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      action: () => onToggleLivePreview?.(),
      type: 'toggle' as const,
      checked: livePreview,
    },
  ]

  return (
    <div
      className="wysiwyg-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: '1px',
        // 与源码模式工具栏（MarkdownToolbar 的 `6px 12px`）保持一致
        padding: '6px 12px',
        backgroundColor: 'var(--editor-bg)',
        borderBottom: '1px solid var(--editor-border)',
        position: 'relative',
        userSelect: 'none',
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
      <WysiwygToolbarButton
        onClick={onUndo}
        title={`${t.toolbar.undo} (${getShortcutLabel('edit.undo')})`}
        disabled={!canUndo}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={onRedo}
        title={`${t.toolbar.redo} (${getShortcutLabel('edit.redo')})`}
        disabled={!canRedo}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
        </svg>
      </WysiwygToolbarButton>

      <Separator />

      {/* ── Text formatting (6 buttons) ── */}
      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        title={`${t.toolbar.bold} (${getShortcutLabel('format.bold')})`}
        active={editor.isActive('bold')}
      >
        <span style={{ fontSize: '14px', fontWeight: 800 }}>B</span>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title={`${t.toolbar.italic} (${getShortcutLabel('format.italic')})`}
        active={editor.isActive('italic')}
      >
        <span style={{ fontSize: '14px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>I</span>
      </WysiwygToolbarButton>

      <UnderlineColorButton editor={editor} />

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title={`${t.toolbar.strikethrough} (${getShortcutLabel('format.strike')})`}
        active={editor.isActive('strike')}
      >
        <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>S</span>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        title={`${t.toolbar.inlineCode} (${getShortcutLabel('format.code')})`}
        active={editor.isActive('code')}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 4l4 4-4 4M7 4L3 8l4 4" />
        </svg>
      </WysiwygToolbarButton>

      <HighlightColorButton editor={editor} />

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        title={t.toolbar.subscript || '下标'}
        active={editor.isActive('subscript')}
      >
        {/* 与源码模式 FormatGroup 的下标图标同尺寸（12px） */}
        <span style={{ fontSize: '12px', fontFamily: 'Georgia, serif' }}>X<sub style={{ fontSize: '8px' }}>↓</sub></span>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        title={t.toolbar.superscript || '上标'}
        active={editor.isActive('superscript')}
      >
        {/* 与源码模式 FormatGroup 的上标图标同尺寸（12px） */}
        <span style={{ fontSize: '12px', fontFamily: 'Georgia, serif' }}>X<sup style={{ fontSize: '8px' }}>↑</sup></span>
      </WysiwygToolbarButton>

      <Separator />

      {/* ── Heading ── */}
      <WysiwygHeadingDropdown editor={editor} t={t} />

      {/* ── List ── */}
      <ListDropdown editor={editor} t={t} />

      <Separator />

      {/* ── Block elements ── */}
      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title={t.toolbar.blockquote}
        active={editor.isActive('blockquote')}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t.toolbar.horizontalLine}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().insertContent({ type: 'toc' }).run()}
        title={t.toolbar.toc || '目录 [TOC]'}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title={t.toolbar.codeBlock}
        active={editor.isActive('codeBlock')}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </WysiwygToolbarButton>

      <Separator />

      {/* ── Insert (link, image, table) ── */}
      <WysiwygToolbarButton
        onClick={() => setShowLinkModal(true)}
        title={`${t.toolbar.link} (${getShortcutLabel('format.link')})`}
        active={editor.isActive('link')}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => setShowImageModal(true)}
        title={t.toolbar.uploadImage}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => setShowTableGrid(true)}
        title={t.toolbar.insertTable}
      >
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </WysiwygToolbarButton>

      <Separator />

      {/* ── Search ── */}
      {onSearchReplace && (
        <WysiwygToolbarButton
          onClick={onSearchReplace}
          active={false}
          title={`${t.searchReplace.searchPlaceholder} (${getShortcutLabel('edit.find')})`}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </WysiwygToolbarButton>
      )}

      <Separator />

      {/* ── Emoji Picker ── */}
      <WysiwygToolbarButton
        onClick={() => setEmojiOpen(prev => !prev)}
        active={emojiOpen}
        title={t.toolbar.emoji || 'Emoji'}
        buttonRef={emojiBtnRef}
      >
        😊
      </WysiwygToolbarButton>

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

      {/* ── Math Popover (triggered from More menu) ── */}
      <MathPopover
        t={t}
        isOpen={mathPopoverMode !== null}
        onClose={() => { setMathPopoverMode(null); setMathPopoverAnchor(null) }}
        mode={mathPopoverMode || 'inline'}
        anchorPosition={null}
        anchorEl={mathPopoverAnchor}
        onInsert={(latex, _isTemplate) => insertMathWithMerge(editor, latex, mathPopoverMode === 'inline' ? 'inline' : 'block')}
      />

      {/* ── Modals ── */}
      {showLinkModal && <LinkModal editor={editor} onClose={() => setShowLinkModal(false)} />}
      {showImageModal && <ImageModal editor={editor} onClose={() => setShowImageModal(false)} />}
      {showTableGrid && <TableGridSelector editor={editor} onClose={() => setShowTableGrid(false)} />}

      {/* ── Mindmap Popover ── */}
      <MindmapPopover
        t={t}
        language={language}
        isOpen={diagramOpen}
        onClose={() => { setDiagramOpen(false); setDiagramAnchor(null) }}
        anchorEl={diagramAnchor}
        onInsert={(template: string) => {
          const codeMatch = template.match(/```mermaid\n([\s\S]*?)```/)
          const code = codeMatch ? codeMatch[1].trim() : 'mindmap\n  root((中心主题))'
          editor.chain().focus().insertMermaidBlock(code).run()
          setDiagramOpen(false)
          setDiagramAnchor(null)
        }}
      />
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { createPortal } from 'react-dom'
import WysiwygToolbarButton from '@features/editor/toolbar/WysiwygToolbarButton'
import useDropdownPosition from '@features/editor/toolbar/useDropdownPosition'
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
import { buildRecentWikilink, buildReferenceTemplate, buildRelatedTemplate, buildBackindexTemplate, buildTodayWikilink, buildBacklinksList } from '@features/editor/toolbar/groups/linkTemplates'
import { getShortcutLabel } from '@features/editor/toolbar/ShortcutManager'
import { HIGHLIGHT_UI_COLORS, HIGHLIGHT_COLOR_OPTIONS, isHighlightColor, type HighlightColor } from '@features/editor/extensions/HighlightMark'
import { useSettings } from '@stores/SettingsStore'

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
  const [highlightDropdownOpen, setHighlightDropdownOpen] = useState(false)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  // split button：主按钮应用「上次颜色」，右侧小箭头开调色板。锚点 = 整个包裹层（主按钮 + 箭头）。
  const highlightWrapRef = useRef<HTMLDivElement>(null)
  const highlightMenuRef = useRef<HTMLDivElement>(null)
  // 下拉面板经 createPortal 挂到 body（position:fixed）—— 若留在工具栏内会因
  // 容器 overflow:hidden 被裁掉，表现为「点高亮按钮没任何反应」（面板其实挂载了但不可见）。
  const highlightPos = useDropdownPosition(highlightDropdownOpen, highlightWrapRef)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  // 「记住上次颜色」：单一数据源 = SettingsStore.lastHighlightColor（持久化到 markcraft_settings）
  const { settings, updateSetting } = useSettings()
  const lastColor: HighlightColor = isHighlightColor(settings.lastHighlightColor) ? settings.lastHighlightColor : 'yellow'

  // Close highlight dropdown on outside click (must also exclude the panel itself,
  // otherwise clicking a color swatch unmounts the panel before its onClick fires)
  useEffect(() => {
    if (!highlightDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        highlightWrapRef.current && !highlightWrapRef.current.contains(e.target as Node) &&
        highlightMenuRef.current && !highlightMenuRef.current.contains(e.target as Node)
      ) {
        setHighlightDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [highlightDropdownOpen])

  const handleEmojiSelect = useCallback((emoji: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(emoji).run()
  }, [editor])

  /** 主按钮：对选区应用/切换「上次颜色」（选区当前已是该色则取消） */
  const applyLastHighlightColor = useCallback(() => {
    if (!editor) return
    const currentColor = editor.getAttributes('highlight').color
    if (currentColor === lastColor) {
      editor.chain().focus().unsetHighlight().run()
    } else {
      editor.chain().focus().unsetHighlight().setHighlight({ color: lastColor }).run()
    }
  }, [editor, lastColor])

  /** 调色板选色：应用该色并写回「上次颜色」（同一色再点 = 取消高亮） */
  const applyHighlightColor = useCallback((color: HighlightColor) => {
    if (!editor) return
    const currentColor = editor.getAttributes('highlight').color
    if (currentColor === color) {
      editor.chain().focus().unsetHighlight().run()
    } else {
      editor.chain().focus().unsetHighlight().setHighlight({ color }).run()
    }
    updateSetting('lastHighlightColor', color)
    setHighlightDropdownOpen(false)
  }, [editor, updateSetting])

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

    editor.on('selectionUpdate', handler)
    editor.on('transaction', ({ transaction }) => {
      if (transaction.docChanged || transaction.storedMarksSet) {
        handler()
      }
    })

    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', handler)
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
      onInsertLinkTemplate: () => editor.chain().focus().insertContent(buildReferenceTemplate()).run(),
      onInsertRelated: () => editor.chain().focus().insertContent(buildRelatedTemplate()).run(),
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
      label: 'Live Preview',
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
        padding: '6px 10px',
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

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title={`${t.toolbar.underline} (${getShortcutLabel('format.underline') || (navigator.platform.includes('Mac') ? '⌘U' : 'Ctrl+U')})`}
        active={editor.isActive('underline')}
      >
        <span style={{ fontSize: '14px', textDecoration: 'underline' }}>U</span>
      </WysiwygToolbarButton>

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

      <div ref={highlightWrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* 主按钮：对选区应用/切换「上次颜色」 */}
        <WysiwygToolbarButton
          onClick={applyLastHighlightColor}
          title={`${t.toolbar.highlight} · ${lastColor} (${getShortcutLabel('format.highlight')})`}
          active={editor.isActive('highlight')}
        >
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {/* 「上次颜色」指示条：主按钮会用什么颜色，一眼可见 */}
            <span
              data-hl-last={lastColor}
              style={{
                position: 'absolute',
                left: '0px',
                right: '0px',
                bottom: '-4px',
                height: '3px',
                borderRadius: '2px',
                backgroundColor: HIGHLIGHT_UI_COLORS[lastColor] || HIGHLIGHT_UI_COLORS.yellow,
                pointerEvents: 'none',
              }}
            />
          </span>
        </WysiwygToolbarButton>
        {/* 调色板开关（小箭头）：点开 16 色网格 */}
        <button
          type="button"
          onClick={() => setHighlightDropdownOpen(v => !v)}
          title="选择高亮颜色"
          aria-label="选择高亮颜色"
          aria-haspopup="true"
          aria-expanded={highlightDropdownOpen}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '12px',
            height: '28px',
            padding: 0,
            marginLeft: '-3px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.65,
          }}
        >
          <svg style={{ width: '8px', height: '8px' }} viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
            <path d="M0 0l5 6 5-6z" />
          </svg>
        </button>
        {highlightDropdownOpen && createPortal(
          <div ref={highlightMenuRef} style={{
            position: 'fixed',
            top: `${highlightPos.top}px`,
            left: `${highlightPos.left}px`,
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 20px)',
            gap: '7px',
            padding: '8px',
            backgroundColor: 'var(--editor-bg)',
            border: '1px solid var(--editor-border)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}>
            {HIGHLIGHT_COLOR_OPTIONS.map(color => (
              <div
                key={color}
                onClick={() => applyHighlightColor(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: HIGHLIGHT_UI_COLORS[color],
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  border: editor.isActive('highlight', { color }) ? '2px solid var(--button-primary)' : '2px solid var(--editor-border)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                title={color}
              />
            ))}
          </div>,
          document.body,
        )}
      </div>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        title={t.toolbar.subscript || '下标'}
        active={editor.isActive('subscript')}
      >
        <span style={{ fontSize: '14px', fontFamily: 'Georgia, serif' }}>X<sub style={{ fontSize: '10px' }}>↓</sub></span>
      </WysiwygToolbarButton>

      <WysiwygToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        title={t.toolbar.superscript || '上标'}
        active={editor.isActive('superscript')}
      >
        <span style={{ fontSize: '14px', fontFamily: 'Georgia, serif' }}>X<sup style={{ fontSize: '10px' }}>↑</sup></span>
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
        onInsert={(latex, _isTemplate) => {
          if (mathPopoverMode === 'inline') {
            editor.chain().focus().insertMathInlineNode(latex).run()
          } else {
            const { state } = editor
            const { $head } = state.selection
            let targetPos: number | null = null
            let targetNode: ProseMirrorNode | null = null

            // 情况1：光标在 mathBlock 内部
            for (let d = $head.depth; d > 0; d--) {
              const node = $head.node(d)
              if (node.type.name === 'mathBlock') {
                targetPos = $head.before(d)
                targetNode = node
                break
              }
            }

            // 情况2：光标紧挨在 mathBlock 后面（前一个兄弟节点是 mathBlock）
            if (!targetNode) {
              const blockStart = $head.before($head.depth)
              if (blockStart > 0) {
                const $blockStart = state.doc.resolve(blockStart)
                const index = $blockStart.index()
                if (index > 0) {
                  const prevSibling = $blockStart.parent.child(index - 1)
                  if (prevSibling.type.name === 'mathBlock') {
                    targetPos = blockStart - prevSibling.nodeSize
                    targetNode = prevSibling
                  }
                }
              }
            }

            if (targetNode && targetPos !== null) {
              // 追加到已有的 mathBlock
              const currentLatex = (targetNode.attrs.latex as string) || ''
              const newLatex = currentLatex ? currentLatex + ' ' + latex : latex
              editor.chain()
                .focus()
                .command(({ tr }) => {
                  tr.setNodeMarkup(targetPos!, undefined, {
                    ...targetNode.attrs,
                    latex: newLatex,
                  })
                  return true
                })
                .run()
              // 将光标移到公式块后面
              editor.commands.setTextSelection(targetPos + targetNode.nodeSize)
            } else {
              // 创建新的 mathBlock
              editor.chain().focus().insertMathBlock(latex).run()
              const { $head: $h } = editor.state.selection
              for (let d = $h.depth; d > 0; d--) {
                if ($h.node(d).type.name === 'mathBlock') {
                  editor.commands.setTextSelection($h.after(d))
                  break
                }
              }
            }
          }
        }}
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

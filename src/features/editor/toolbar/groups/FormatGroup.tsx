import type { Translations } from '@src/types/translations'
import { useCallback } from 'react'
import { ToolbarButton, GroupProps, applyFormatToCM6 } from '@features/editor/toolbar/groups/shared'
import { getShortcut } from '@features/editor/toolbar/ShortcutManager'

function formatShortcut(key: string): string {
  return key
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
}

export default function FormatGroup({ t, editorViewRef, onChange, onPushUndo }: GroupProps & { t: Translations }) {

  const applyFormat = useCallback((
    formatter: (text: string, selectionStart: number, selectionEnd: number) => {
      newText: string
      newCursorStart: number
      newCursorEnd: number
    }
  ) => {
    if (!editorViewRef.current) return
    applyFormatToCM6(editorViewRef.current, formatter, onChange, onPushUndo)
  }, [editorViewRef, onChange, onPushUndo])

  const wrapSelection = useCallback((wrapper: string) => {
    applyFormat((text, selectionStart, selectionEnd) => {
      if (selectionStart !== selectionEnd) {
        const before = text.substring(0, selectionStart)
        const selected = text.substring(selectionStart, selectionEnd)
        const after = text.substring(selectionEnd)
        const wrapped = wrapper + selected + wrapper
        return {
          newText: before + wrapped + after,
          newCursorStart: selectionStart + wrapper.length,
          newCursorEnd: selectionEnd + wrapper.length
        }
      } else {
        const before = text.substring(0, selectionStart)
        const after = text.substring(selectionEnd)
        const insertText = wrapper + wrapper
        return {
          newText: before + insertText + after,
          newCursorStart: selectionStart + wrapper.length,
          newCursorEnd: selectionEnd + wrapper.length
        }
      }
    })
  }, [applyFormat])

  const insertInlineCode = useCallback(() => {
    applyFormat((text, selectionStart, selectionEnd) => {
      if (selectionStart !== selectionEnd) {
        const before = text.substring(0, selectionStart)
        const selected = text.substring(selectionStart, selectionEnd)
        const after = text.substring(selectionEnd)
        return {
          newText: before + '`' + selected + '`' + after,
          newCursorStart: selectionStart + 1,
          newCursorEnd: selectionEnd + 1
        }
      } else {
        const before = text.substring(0, selectionStart)
        const after = text.substring(selectionEnd)
        return {
          newText: before + '``' + after,
          newCursorStart: selectionStart + 1,
          newCursorEnd: selectionEnd + 1
        }
      }
    })
  }, [applyFormat])

  return (
    <>
      <ToolbarButton
        onClick={() => wrapSelection('**')}
        title={`${t.toolbar.bold} (${formatShortcut(getShortcut('format.bold'))})`}
        ariaLabel={t.toolbarAria.bold}
      >
        <span style={{ fontSize: '14px', fontWeight: 800 }}>B</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('*')}
        title={`${t.toolbar.italic} (${formatShortcut(getShortcut('format.italic'))})`}
        ariaLabel={t.toolbarAria.italic}
      >
        <span style={{ fontSize: '14px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>I</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('__')}
        title={`${'下划线'} (${formatShortcut('Mod+u')})`}
        ariaLabel={'underline'}
      >
        <span style={{ fontSize: '14px', textDecoration: 'underline' }}>U</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('~~')}
        title={`${'删除线'} (${formatShortcut(getShortcut('format.strike'))})`}
        ariaLabel={'strikethrough'}
      >
        <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>S</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={insertInlineCode}
        title={`${t.toolbar.inlineCode} (${formatShortcut(getShortcut('format.code'))})`}
        ariaLabel={t.toolbarAria.inlineCode}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 4l4 4-4 4M7 4L3 8l4 4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('==')}
        title={`${'高亮'} (${formatShortcut(getShortcut('format.highlight'))})`}
        ariaLabel={'highlight'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('^')}
        title={t.toolbar.superscript}
        ariaLabel={t.toolbarAria.superscript}
      >
        <span style={{ fontSize: '12px', fontWeight: 700 }}>X²</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => wrapSelection('~')}
        title={t.toolbar.subscript}
        ariaLabel={t.toolbarAria.subscript}
      >
        <span style={{ fontSize: '12px', fontWeight: 700 }}>X₂</span>
      </ToolbarButton>
    </>
  )
}

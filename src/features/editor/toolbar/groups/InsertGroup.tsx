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

export default function InsertGroup({ t, editorViewRef, onChange, onPushUndo }: GroupProps & { t: Translations }) {
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

  const insertLink = useCallback(() => {
    applyFormat((text, selectionStart, selectionEnd) => {
      const before = text.substring(0, selectionStart)
      const after = text.substring(selectionEnd)
      const selected = text.substring(selectionStart, selectionEnd)
      const linkText = selected || '链接文字'
      const newText = before + '[' + linkText + '](url)' + after
      return {
        newText,
        newCursorStart: selectionStart + 1,
        newCursorEnd: selectionStart + 1 + linkText.length
      }
    })
  }, [applyFormat])

  return (
    <ToolbarButton
      onClick={insertLink}
      title={`${t.toolbar.link} (${formatShortcut(getShortcut('format.link'))})`}
      ariaLabel={t.toolbarAria.link}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </ToolbarButton>
  )
}

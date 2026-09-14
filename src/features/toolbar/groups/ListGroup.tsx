import type { Translations } from '@src/types/translations'
import { useCallback, useRef, useState } from 'react'
import { ToolbarButton, GroupProps, applyFormatToCM6 } from './shared'
import ListMenuPopover from '../ListMenuPopover'

export default function ListGroup({ t, editorViewRef, onChange, onPushUndo }: GroupProps & { t: Translations }) {
  const [showListMenu, setShowListMenu] = useState(false)
  const listMenuRef = useRef<HTMLButtonElement>(null)

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

  const insertAtLineStart = useCallback((prefix: string) => {
    applyFormat((text, selectionStart, selectionEnd) => {
      const lines = text.split('\n')
      let charCount = 0
      let startLineIndex = 0
      let endLineIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length

        if (lineStart <= selectionStart && lineEnd >= selectionStart) startLineIndex = i
        if (lineStart <= selectionEnd && lineEnd >= selectionEnd) endLineIndex = i

        charCount += lines[i].length + 1
      }

      let offset = 0
      for (let i = startLineIndex; i <= endLineIndex; i++) {
        if (lines[i].trim().startsWith(prefix)) {
          const removedLen = prefix.length
          lines[i] = lines[i].substring(removedLen)
          if (i === startLineIndex) offset = -removedLen
        } else {
          lines[i] = prefix + lines[i]
          if (i === startLineIndex) offset = prefix.length
        }
      }

      return {
        newText: lines.join('\n'),
        newCursorStart: selectionStart + offset,
        newCursorEnd: Math.max(selectionStart + offset, selectionEnd + offset)
      }
    })
  }, [applyFormat])

  const insertTaskList = useCallback(() => {
    applyFormat((text, selectionStart, selectionEnd) => {
      const lines = text.split('\n')
      let charCount = 0
      let startLineIndex = 0
      let endLineIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length

        if (lineStart <= selectionStart && lineEnd >= selectionStart) startLineIndex = i
        if (lineStart <= selectionEnd && lineEnd >= selectionEnd) endLineIndex = i

        charCount += lines[i].length + 1
      }

      let offset = 0
      for (let i = startLineIndex; i <= endLineIndex; i++) {
        const trimmed = lines[i].trimStart()
        const indent = lines[i].substring(0, lines[i].length - trimmed.length)
        if (trimmed.startsWith('- [ ] ')) {
          lines[i] = indent + trimmed.substring(6)
          if (i === startLineIndex) offset = -6
        } else if (trimmed.startsWith('- [x] ')) {
          lines[i] = indent + trimmed.substring(6)
          if (i === startLineIndex) offset = -6
        } else {
          lines[i] = indent + '- [ ] ' + trimmed
          if (i === startLineIndex) offset = 6
        }
      }

      return {
        newText: lines.join('\n'),
        newCursorStart: selectionStart + offset,
        newCursorEnd: Math.max(selectionStart + offset, selectionEnd + offset)
      }
    })
  }, [applyFormat])

  const indentLines = useCallback(() => {
    applyFormat((text, selectionStart, selectionEnd) => {
      const lines = text.split('\n')
      let charCount = 0
      let startLineIndex = 0
      let endLineIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length

        if (lineStart <= selectionStart && lineEnd >= selectionStart) startLineIndex = i
        if (lineStart <= selectionEnd && lineEnd >= selectionEnd) endLineIndex = i

        charCount += lines[i].length + 1
      }

      for (let i = startLineIndex; i <= endLineIndex; i++) {
        if (lines[i].trim().length > 0) {
          lines[i] = '  ' + lines[i]
        }
      }

      const addedChars = 2 * (endLineIndex - startLineIndex + 1)
      return {
        newText: lines.join('\n'),
        newCursorStart: selectionStart + 2,
        newCursorEnd: selectionEnd + addedChars
      }
    })
  }, [applyFormat])

  const outdentLines = useCallback(() => {
    applyFormat((text, selectionStart, selectionEnd) => {
      const lines = text.split('\n')
      let charCount = 0
      let startLineIndex = 0
      let endLineIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length

        if (lineStart <= selectionStart && lineEnd >= selectionStart) startLineIndex = i
        if (lineStart <= selectionEnd && lineEnd >= selectionEnd) endLineIndex = i

        charCount += lines[i].length + 1
      }

      let removedChars = 0
      for (let i = startLineIndex; i <= endLineIndex; i++) {
        if (lines[i].startsWith('    ')) {
          lines[i] = lines[i].substring(4)
          removedChars += 4
        } else if (lines[i].startsWith('  ')) {
          lines[i] = lines[i].substring(2)
          removedChars += 2
        } else if (lines[i].startsWith('\t')) {
          lines[i] = lines[i].substring(1)
          removedChars += 1
        }
      }

      return {
        newText: lines.join('\n'),
        newCursorStart: Math.max(0, selectionStart - 2),
        newCursorEnd: Math.max(0, selectionEnd - removedChars)
      }
    })
  }, [applyFormat])

  return (
    <>
      <ToolbarButton
        onClick={() => setShowListMenu(!showListMenu)}
        title={t.toolbar.list}
        ariaLabel={t.toolbarAria.list}
        buttonRef={listMenuRef}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
        </svg>
      </ToolbarButton>

      <ListMenuPopover
        t={t}
        isOpen={showListMenu}
        onClose={() => setShowListMenu(false)}
        anchorEl={listMenuRef.current}
        onInsertUnordered={() => insertAtLineStart('- ')}
        onInsertOrdered={() => insertAtLineStart('1. ')}
        onInsertTask={insertTaskList}
        onIndent={indentLines}
        onOutdent={outdentLines}
      />
    </>
  )
}

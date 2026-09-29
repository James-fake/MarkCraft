import type { Translations } from '@src/types/translations'
import { useCallback } from 'react'
import { ToolbarButton, GroupProps, applyFormatToCM6 } from '@features/editor/toolbar/groups/shared'
import { useSettings } from '@stores/SettingsStore'

export default function BlockGroup({ t, editorViewRef, onChange, onPushUndo }: GroupProps & { t: Translations }) {
  const { settings: appSettings } = useSettings()
  // 解构原始值供 dep 使用（appSettings 对象每渲染可能换新引用，成员路径 deps 不可靠）
  const codeBlockDefaultLang = appSettings.codeBlockDefaultLang

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

      for (let i = 0; i < lines.length; i++) {
        const lineStart = charCount
        const lineEnd = charCount + lines[i].length
        if (lineStart <= selectionStart && lineEnd >= selectionStart) startLineIndex = i
        charCount += lines[i].length + 1
      }

      const line = lines[startLineIndex]
      if (line.trimStart().startsWith(prefix)) {
        // Remove prefix
        const trimmed = line.trimStart()
        const indent = line.substring(0, line.length - trimmed.length)
        lines[startLineIndex] = indent + trimmed.substring(prefix.length)
        return {
          newText: lines.join('\n'),
          newCursorStart: Math.max(0, selectionStart - prefix.length),
          newCursorEnd: Math.max(0, selectionEnd - prefix.length)
        }
      } else {
        lines[startLineIndex] = prefix + line
        return {
          newText: lines.join('\n'),
          newCursorStart: selectionStart + prefix.length,
          newCursorEnd: selectionEnd + prefix.length
        }
      }
    })
  }, [applyFormat])

  const insertCodeBlock = useCallback(() => {
    applyFormat((text, selectionStart, _selectionEnd) => {
      const before = text.substring(0, selectionStart)
      const after = text.substring(selectionStart)
      const selected = text.substring(selectionStart, _selectionEnd)
      const lang = codeBlockDefaultLang || ''
      const newText = before + '\n```' + lang + '\n' + selected + '\n```\n' + after
      return {
        newText,
        newCursorStart: selectionStart + 4 + lang.length,
        newCursorEnd: selectionStart + 4 + lang.length + selected.length
      }
    })
  }, [applyFormat, codeBlockDefaultLang])

  const insertHr = useCallback(() => {
    applyFormat((text, selectionStart, _selectionEnd) => {
      const before = text.substring(0, selectionStart)
      const after = text.substring(selectionStart)
      const newText = before + '\n---\n' + after
      return {
        newText,
        newCursorStart: selectionStart + 5,
        newCursorEnd: selectionStart + 5
      }
    })
  }, [applyFormat])

  const insertTable = useCallback(() => {
    applyFormat((text, selectionStart, _selectionEnd) => {
      const before = text.substring(0, selectionStart)
      const after = text.substring(selectionStart)
      const table =
        '\n| 列1 | 列2 | 列3 |\n' +
        '| --- | --- | --- |\n' +
        '| 内容 | 内容 | 内容 |\n' +
        '| 内容 | 内容 | 内容 |\n'
      const newText = before + table + after
      const cursor = selectionStart + 1
      return {
        newText,
        newCursorStart: cursor,
        newCursorEnd: cursor + table.length - 1
      }
    })
  }, [applyFormat])

  const insertToc = useCallback(() => {
    applyFormat((text, selectionStart, _selectionEnd) => {
      const before = text.substring(0, selectionStart)
      const after = text.substring(selectionStart)
      const newText = before + '\n[toc]\n' + after
      const cursor = selectionStart + 1
      return {
        newText,
        newCursorStart: cursor,
        newCursorEnd: cursor + 5
      }
    })
  }, [applyFormat])

  return (
    <>
      <ToolbarButton
        onClick={() => insertAtLineStart('> ')}
        title={t.toolbar.blockquote}
        ariaLabel={t.toolbarAria.blockquote}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={insertHr}
        title={t.toolbar.horizontalLine}
        ariaLabel={t.toolbarAria.horizontalLine}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={insertCodeBlock}
        title={t.toolbar.codeBlock}
        ariaLabel={t.toolbarAria.codeBlock}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={insertTable}
        title={t.toolbar.insertTable}
        ariaLabel={t.toolbar.insertTable}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h18M9 5v14M15 5v14" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={insertToc}
        title={t.toolbar.toc}
        ariaLabel={t.toolbarAria.toc}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h12M4 12h8M4 18h12M18 6l2 2 2-2M18 14l2 2 2-2" />
        </svg>
      </ToolbarButton>
    </>
  )
}

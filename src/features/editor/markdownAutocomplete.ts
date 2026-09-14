export interface AutocompleteResult {
  newText: string
  cursorStart: number
  cursorEnd: number
  groupKey: string
}

export function isInsideCodeBlock(text: string, cursorPos: number): boolean {
  const info = getCodeBlockInfo(text, cursorPos)
  return info !== null
}

/**
 * Get code block info at cursor position: language and whether cursor is inside
 */
export function getCodeBlockInfo(text: string, cursorPos: number): { language: string } | null {
  const lines = text.split('\n')
  let charCount = 0
  let inCodeBlock = false
  let codeFence = ''
  let language = ''

  for (let i = 0; i < lines.length; i++) {
    const lineStart = charCount
    const lineEnd = charCount + lines[i].length

    if (lineStart > cursorPos) break

    const trimmed = lines[i].trimStart()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const fence = trimmed.substring(0, 3)
      if (!inCodeBlock) {
        inCodeBlock = true
        codeFence = fence
        const langMatch = trimmed.match(/^```(\w*)|^~~~(\w*)/)
        language = langMatch ? (langMatch[1] || langMatch[2] || '') : ''
      } else if (fence === codeFence) {
        inCodeBlock = false
        codeFence = ''
        language = ''
      }
    }

    if (cursorPos >= lineStart && cursorPos <= lineEnd) {
      if (inCodeBlock && !trimmed.startsWith('```') && !trimmed.startsWith('~~~')) {
        return { language }
      }
      return null
    }

    charCount = lineEnd + 1
  }

  return null
}

export function handleHeadingAutoSpace(
  text: string,
  cursorPos: number,
  typedChar: string
): AutocompleteResult | null {
  if (typedChar !== '#' && typedChar !== ' ') return null

  const beforeCursor = text.substring(0, cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''

  if (typedChar === '#') {
    const headingMatch = currentLine.match(/^(#{1,6})$/)
    if (headingMatch) {
      const insertText = ' '
      const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
      return {
        newText,
        cursorStart: cursorPos + 1,
        cursorEnd: cursorPos + 1,
        groupKey: 'heading-space',
      }
    }
  }

  if (typedChar === ' ') {
    const headingMatch = currentLine.match(/^(#{1,6}) $/)
    if (!headingMatch) return null
  }

  return null
}

export function handleBoldAutoClose(
  text: string,
  cursorPos: number,
  typedChar: string
): AutocompleteResult | null {
  if (typedChar !== '*') return null

  const beforeCursor = text.substring(0, cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''

  if (currentLine.match(/^\s*\*\s$/)) return null
  if (currentLine.match(/^\s*\*\s/)) return null

  const twoBefore = text.substring(cursorPos - 2, cursorPos)
  if (twoBefore === '**') {
    const charBeforeTwo = text[cursorPos - 3]
    if (charBeforeTwo === '*') return null

    const insertText = '**'
    const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
    return {
      newText,
      cursorStart: cursorPos,
      cursorEnd: cursorPos,
      groupKey: 'bold-autoclose',
    }
  }

  return null
}

export function handleLinkAutoComplete(
  text: string,
  cursorPos: number,
  typedChar: string
): AutocompleteResult | null {
  if (typedChar !== '[') return null

  const beforeCursor = text.substring(0, cursorPos)
  if (beforeCursor.endsWith('!')) return null

  const insertText = '](url)'
  const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
  return {
    newText,
    cursorStart: cursorPos,
    cursorEnd: cursorPos,
    groupKey: 'link-autocomplete',
  }
}

export function handleCodeFenceAutoComplete(
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const beforeCursor = text.substring(0, cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''

  if (!currentLine.match(/^```/)) return null

  const afterCursor = text.substring(cursorPos)
  if (afterCursor.startsWith('\n```') || afterCursor.startsWith('\n~~~')) return null

  const lineStart = beforeCursor.lastIndexOf('\n') + 1
  const isAtLineStart = lineStart === cursorPos - currentLine.length
  if (!isAtLineStart && currentLine.length > 3) return null

  const langMatch = currentLine.match(/^```(\w*)$/)
  if (!langMatch) return null

  const insertText = '\n\n```'
  const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
  const newCursorPos = cursorPos + 1

  return {
    newText,
    cursorStart: newCursorPos,
    cursorEnd: newCursorPos,
    groupKey: 'codeblock-autocomplete',
  }
}

export function handleSmartEnterInCodeBlock(
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const info = getCodeBlockInfo(text, cursorPos)
  if (!info) return null

  const beforeCursor = text.substring(0, cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''

  // Get current line's leading whitespace (indentation)
  const indentMatch = currentLine.match(/^(\s*)/)
  const currentIndent = indentMatch ? indentMatch[1] : ''

  // Check if cursor is on the closing fence line (```) — if so, don't add indent
  const trimmedCurrent = currentLine.trim()
  if (trimmedCurrent.startsWith('```') || trimmedCurrent.startsWith('~~~')) {
    const insertText = '\n'
    const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
    return {
      newText,
      cursorStart: cursorPos + 1,
      cursorEnd: cursorPos + 1,
      groupKey: 'codeblock-enter',
    }
  }

  // Determine if we need extra indent after this line
  const extraIndent = shouldIncreaseIndent(currentLine, info.language)
  const newIndent = currentIndent + extraIndent

  const insertText = '\n' + newIndent
  const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
  const newCursorPos = cursorPos + 1 + newIndent.length

  return {
    newText,
    cursorStart: newCursorPos,
    cursorEnd: newCursorPos,
    groupKey: 'codeblock-enter',
  }
}

/**
 * Determine if the next line should be indented based on the current line content and language.
 * Returns the extra indentation string to add (e.g., "    " or "  ").
 */
function shouldIncreaseIndent(line: string, language: string): string {
  const trimmed = line.trimEnd()

  // Python: indent after lines ending with ':'
  if (isPythonLike(language)) {
    if (trimmed.endsWith(':')) {
      return '    ' // 4 spaces for Python
    }
    return ''
  }

  // C-style languages: indent after lines ending with '{'
  if (isCStyle(language)) {
    if (trimmed.endsWith('{')) {
      return '  ' // 2 spaces for C-style
    }
    return ''
  }

  // HTML/XML: indent after opening tags (not self-closing, not closing tags)
  if (isMarkupLanguage(language)) {
    const openTagMatch = trimmed.match(/<([a-zA-Z][a-zA-Z0-9-]*)[^>]*>(?!.*<\/\1>)$/)
    if (openTagMatch && !trimmed.match(/<\//) && !trimmed.match(/\/\s*>$/)) {
      return '  '
    }
    return ''
  }

  // Default: indent after '{' or ':'
  if (trimmed.endsWith('{') || trimmed.endsWith(':')) {
    return '  '
  }

  return ''
}

function isPythonLike(language: string): boolean {
  const lang = language.toLowerCase()
  return lang === 'python' || lang === 'py'
}

function isCStyle(language: string): boolean {
  const lang = language.toLowerCase()
  return ['javascript', 'js', 'typescript', 'ts', 'java', 'c', 'cpp', 'c++', 'csharp',
    'cs', 'go', 'golang', 'rust', 'rs', 'swift', 'kotlin', 'kt', 'dart', 'scala',
    'r', 'perl', 'pl', 'ruby', 'rb', 'php', 'objectivec', 'obj-c', 'objc'].includes(lang)
}

function isMarkupLanguage(language: string): boolean {
  const lang = language.toLowerCase()
  return ['html', 'xml', 'svg', 'jsx', 'tsx', 'vue', 'svelte'].includes(lang)
}

export function handleTaskToggle(
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const beforeCursor = text.substring(0, cursorPos)
  const afterCursor = text.substring(cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''
  const lineStart = beforeCursor.lastIndexOf('\n') + 1

  const uncheckedMatch = currentLine.match(/^(\s*)- \[ \] /)
  if (uncheckedMatch) {
    const indent = uncheckedMatch[1]
    const prefix = indent + '- [x] '
    const rest = currentLine.substring(indent.length + 6)
    const newLine = prefix + rest
    const newText = text.substring(0, lineStart) + newLine + afterCursor
    return {
      newText,
      cursorStart: lineStart + prefix.length,
      cursorEnd: lineStart + prefix.length,
      groupKey: 'task-toggle',
    }
  }

  const checkedMatch = currentLine.match(/^(\s*)- \[x\] /)
  if (checkedMatch) {
    const indent = checkedMatch[1]
    const prefix = indent + '- [ ] '
    const rest = currentLine.substring(indent.length + 6)
    const newLine = prefix + rest
    const newText = text.substring(0, lineStart) + newLine + afterCursor
    return {
      newText,
      cursorStart: lineStart + prefix.length,
      cursorEnd: lineStart + prefix.length,
      groupKey: 'task-toggle',
    }
  }

  return null
}

export function handleTableAutoComplete(
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const beforeCursor = text.substring(0, cursorPos)
  const afterCursor = text.substring(cursorPos)
  const currentLine = beforeCursor.split('\n').pop() || ''

  if (!currentLine.includes('|')) return null

  const trimmedLine = currentLine.trim()
  if (!trimmedLine.startsWith('|') || !trimmedLine.endsWith('|')) return null

  const cells = trimmedLine.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1)
  if (cells.length === 0) return null

  const nextLine = afterCursor.split('\n')[0] || ''
  if (nextLine.match(/^\|[\s\-:]+\|/)) return null

  const separatorCells = cells.map(() => ' --- ')
  const separatorLine = '|' + separatorCells.join('|') + '|'

  const insertText = '\n' + separatorLine
  const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos)
  const newCursorPos = cursorPos + insertText.length

  return {
    newText,
    cursorStart: newCursorPos,
    cursorEnd: newCursorPos,
    groupKey: 'table-autocomplete',
  }
}

export function handleSmartBackspace(
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  if (cursorPos < 2) return null

  const beforeCursor = text.substring(0, cursorPos)
  const afterCursor = text.substring(cursorPos)

  const formatPairs: Array<{ open: string; close: string }> = [
    { open: '**', close: '**' },
    { open: '__', close: '__' },
    { open: '~~', close: '~~' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
  ]

  for (const { open, close } of formatPairs) {
    if (beforeCursor.endsWith(open) && afterCursor.startsWith(close)) {
      const newText =
        text.substring(0, cursorPos - open.length) +
        text.substring(cursorPos + close.length)
      return {
        newText,
        cursorStart: cursorPos - open.length,
        cursorEnd: cursorPos - open.length,
        groupKey: 'smart-backspace',
      }
    }
  }

  if (
    beforeCursor.endsWith('[') &&
    afterCursor.startsWith('](url)')
  ) {
    const newText =
      text.substring(0, cursorPos - 1) +
      text.substring(cursorPos + 6)
    return {
      newText,
      cursorStart: cursorPos - 1,
      cursorEnd: cursorPos - 1,
      groupKey: 'smart-backspace',
    }
  }

  return null
}

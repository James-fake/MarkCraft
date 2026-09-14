import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Tiptap extension for smart indentation in code blocks.
 * - Enter: preserves current indentation and adds extra indent after ':' or '{'
 * - Works with CodeBlockLowlight's built-in Tab/Shift-Tab handling
 */
const CodeBlockSmartIndent = Extension.create({
  name: 'codeBlockSmartIndent',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('codeBlockSmartIndent'),
        props: {
          handleKeyDown(view, event) {
            // Only handle Enter key in code blocks
            if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) {
              return false
            }

            const { state } = view
            const { selection } = state
            const { $from } = selection

            // Check if we're inside a code block
            if ($from.parent.type.name !== 'codeBlock') {
              return false
            }

            const currentLineText = $from.parent.textContent
            const posInBlock = $from.parentOffset

            // Split the current line text at cursor position to get text before cursor
            const textBeforeCursor = currentLineText.substring(0, posInBlock)

            // Get current line's leading whitespace
            const indentMatch = textBeforeCursor.match(/^(\s*)/)
            const currentIndent = indentMatch ? indentMatch[1] : ''

            // Determine extra indent based on line content and language
            const language = ($from.parent.attrs?.language as string) || ''
            const extraIndent = shouldIncreaseIndent(textBeforeCursor, language)
            const newIndent = currentIndent + extraIndent

            // If there's no indent to preserve or add, let default behavior handle it
            if (newIndent.length === 0) {
              return false
            }

            // Insert newline with the preserved indentation
            event.preventDefault()

            const newlineWithIndent = '\n' + newIndent
            const tr = state.tr.insertText(newlineWithIndent, selection.from, selection.to)
            view.dispatch(tr)

            return true
          },
        },
      }),
    ]
  },
})

/**
 * Determine if the next line should be indented based on the current line content and language.
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
  const lang = (language || '').toLowerCase()
  return lang === 'python' || lang === 'py'
}

function isCStyle(language: string): boolean {
  const lang = (language || '').toLowerCase()
  return ['javascript', 'js', 'typescript', 'ts', 'java', 'c', 'cpp', 'c++', 'csharp',
    'cs', 'go', 'golang', 'rust', 'rs', 'swift', 'kotlin', 'kt', 'dart', 'scala',
    'r', 'perl', 'pl', 'ruby', 'rb', 'php', 'objectivec', 'obj-c', 'objc'].includes(lang)
}

function isMarkupLanguage(language: string): boolean {
  const lang = (language || '').toLowerCase()
  return ['html', 'xml', 'svg', 'jsx', 'tsx', 'vue', 'svelte'].includes(lang)
}

export default CodeBlockSmartIndent

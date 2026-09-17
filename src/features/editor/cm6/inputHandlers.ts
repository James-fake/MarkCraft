import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  handleHeadingAutoSpace,
  handleBoldAutoClose,
  handleLinkAutoComplete,
  handleCodeFenceAutoComplete,
  handleSmartEnterInCodeBlock,
  handleTableAutoComplete,
  handleSmartBackspace,
  isInsideCodeBlock,
  getCodeBlockInfo,
} from '../markdownAutocomplete'
import { findImageMarkRange } from '@utils/imageHelpers'

/**
 * CM6 输入处理器扩展
 * 迁移自 useEditorShortcuts.ts 中的键盘拦截逻辑
 */
export function createInputHandlers(codeBlockDefaultLang?: string, autoPairMarkdown: boolean = true) {
  const defaultLang = codeBlockDefaultLang || ''
  return EditorView.inputHandler.of((view, from, _to, text) => {
    const doc = view.state.doc.toString()

    // 标题自动空格：输入 # 后自动添加空格
    if (text === '#') {
      const result = handleHeadingAutoSpace(doc, from, text)
      if (result) {
        view.dispatch({
          changes: { from: 0, to: doc.length, insert: result.newText },
          selection: EditorSelection.cursor(result.cursorStart),
        })
        return true
      }
    }

    if (!autoPairMarkdown) return false

    // 粗体自动闭合：输入 ** 后自动补全闭合 **
    if (text === '*') {
      const result = handleBoldAutoClose(doc, from, text)
      if (result) {
        view.dispatch({
          changes: { from: 0, to: doc.length, insert: result.newText },
          selection: EditorSelection.cursor(result.cursorStart),
        })
        return true
      }
    }

    // 链接自动补全：输入 [ 后自动补全 ](url)
    if (text === '[') {
      const beforeCursor = doc.substring(0, from)
      if (!beforeCursor.endsWith('!')) {
        const result = handleLinkAutoComplete(doc, from, text)
        if (result) {
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: result.newText },
            selection: EditorSelection.cursor(result.cursorStart),
          })
          return true
        }
      }
    }

    // 代码围栏补全：输入 ``` 后自动补全闭合围栏
    if (text === '`') {
      const twoBefore = doc.substring(from - 2, from)
      if (twoBefore === '``') {
        const result = handleCodeFenceAutoComplete(doc, from)
        if (result) {
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: result.newText },
            selection: EditorSelection.cursor(result.cursorStart),
          })
          return true
        } else {
          // 没有匹配围栏，简单补全闭合（带默认语言）
          const langPrefix = defaultLang ? defaultLang : ''
          const insertText = langPrefix + '\n\n```'
          view.dispatch({
            changes: { from, insert: insertText },
            selection: EditorSelection.cursor(from + langPrefix.length + 1),
          })
          return true
        }
      }
    }

    return false
  })
}

/**
 * CM6 Enter/Backspace/Tab 键处理扩展
 * 包含：代码块内换行、表格自动补全、智能退格、图片标记删除、自动配对删除、代码块内Tab缩进
 */
export function createKeyHandlers() {
  return EditorView.domEventHandlers({
    keydown: (event: KeyboardEvent, view: EditorView) => {
      const { from, to } = view.state.selection.main
      const doc = view.state.doc.toString()

      // Tab 键处理：代码块内缩进
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
        if (isInsideCodeBlock(doc, from)) {
          event.preventDefault()
          const info = getCodeBlockInfo(doc, from)
          const indentStr = info && (info.language === 'python' || info.language === 'py') ? '    ' : '  '

          if (event.shiftKey) {
            // Shift+Tab: 反缩进
            const lineStart = doc.lastIndexOf('\n', from - 1) + 1
            const lineText = doc.substring(lineStart, from)
            // Remove up to indentStr length of leading whitespace
            let removeCount = 0
            for (let i = 0; i < indentStr.length && i < lineText.length; i++) {
              if (lineText[i] === ' ' || lineText[i] === '\t') {
                removeCount++
              } else {
                break
              }
            }
            if (removeCount > 0) {
              view.dispatch({
                changes: { from: lineStart, to: lineStart + removeCount },
                selection: EditorSelection.cursor(Math.max(lineStart, from - removeCount)),
              })
            }
          } else {
            // Tab: 缩进
            if (from !== to) {
              // Multi-line selection: indent all selected lines
              const fromLine = doc.lastIndexOf('\n', from - 1) + 1
              const toLineEnd = doc.indexOf('\n', to)
              const selectedText = doc.substring(fromLine, toLineEnd === -1 ? doc.length : toLineEnd)
              const indentedText = selectedText.split('\n').map((line: string) => indentStr + line).join('\n')
              view.dispatch({
                changes: { from: fromLine, to: fromLine + selectedText.length, insert: indentedText },
                selection: EditorSelection.range(fromLine + indentStr.length, fromLine + indentedText.length),
              })
            } else {
              // Single cursor: insert indent
              view.dispatch({
                changes: { from, insert: indentStr },
                selection: EditorSelection.cursor(from + indentStr.length),
              })
            }
          }
          return true
        }
      }

      // Enter 键处理
      if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // 代码块内换行
        const codeBlockResult = handleSmartEnterInCodeBlock(doc, from)
        if (codeBlockResult) {
          event.preventDefault()
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: codeBlockResult.newText },
            selection: EditorSelection.cursor(codeBlockResult.cursorStart),
          })
          return true
        }

        // 表格自动补全
        const tableResult = handleTableAutoComplete(doc, from)
        if (tableResult) {
          event.preventDefault()
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: tableResult.newText },
            selection: EditorSelection.cursor(tableResult.cursorStart),
          })
          return true
        }
      }

      // Backspace 键处理
      if (event.key === 'Backspace' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (from !== to || from === 0) return false

        // 图片标记删除
        const range = findImageMarkRange(doc, from)
        if (range) {
          event.preventDefault()
          view.dispatch({
            changes: { from: range.start, to: range.end },
            selection: EditorSelection.cursor(range.start),
          })
          return true
        }

        // 智能退格：删除格式标记对
        const result = handleSmartBackspace(doc, from)
        if (result) {
          event.preventDefault()
          view.dispatch({
            changes: { from: 0, to: doc.length, insert: result.newText },
            selection: EditorSelection.cursor(result.cursorStart),
          })
          return true
        }

        // 自动配对删除
        const charBefore = doc[from - 1]
        const charAfter = doc[from]
        const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' }
        if (pairs[charBefore] === charAfter) {
          event.preventDefault()
          view.dispatch({
            changes: { from: from - 1, to: from + 1 },
            selection: EditorSelection.cursor(from - 1),
          })
          return true
        }
      }

      return false
    },
  })
}

/**
 * 自动配对扩展（括号）
 */
export function createAutoPairHandler(enabled: boolean = true) {
  return EditorView.inputHandler.of((view, from, _to, text) => {
    if (!enabled) return false

    const pairs: Record<string, string> = {
      '(': ')',
      '{': '}',
    }

    const closing = pairs[text]
    if (!closing) return false

    const { from: selFrom, to: selTo } = view.state.selection.main
    if (selFrom !== selTo) return false

    view.dispatch({
      changes: { from, insert: text + closing },
      selection: EditorSelection.cursor(from + 1),
    })
    return true
  })
}

/**
 * 引号自动配对
 */
export function createQuotePairHandler(enabled: boolean = true) {
  return EditorView.inputHandler.of((view, from, _to, text) => {
    if (!enabled) return false
    if (text !== '"' && text !== "'") return false

    const doc = view.state.doc.toString()
    const charAfter = doc[from]
    const charBefore = from > 0 ? doc[from - 1] : ''

    // 如果后面已经是相同的引号，跳过
    if (charAfter === text && charBefore !== '\\') {
      view.dispatch({
        selection: EditorSelection.cursor(from + 1),
      })
      return true
    }

    // 自动配对
    view.dispatch({
      changes: { from, insert: text + text },
      selection: EditorSelection.cursor(from + 1),
    })
    return true
  })
}

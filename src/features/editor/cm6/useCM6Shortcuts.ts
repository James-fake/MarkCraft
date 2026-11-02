import { keymap } from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import {
  cm6FormatBold, cm6FormatItalic, cm6FormatCodeBlock,
  cm6FormatInlineMath, cm6FormatBlockMath, cm6FormatStrike, cm6InsertFootnote,
} from './autocompleteExtension'

// Tab 缩进
function handleListContinue(view: EditorView): boolean {
  const { from } = view.state.selection.main
  const doc = view.state.doc.toString()
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1
  const lineText = doc.substring(lineStart, from).trimEnd()

  // 无序列表
  const ulMatch = lineText.match(/^(\s*)([-*+])\s/)
  if (ulMatch) {
    const emptyMatch = lineText.match(/^(\s*)([-*+])\s*$/)
    if (emptyMatch) {
      // 空列表项，删除标记
      view.dispatch({
        changes: { from: lineStart, to: from, insert: '\n' },
        selection: EditorSelection.cursor(lineStart + 1),
      })
      return true
    }
    const indent = ulMatch[1]
    const marker = ulMatch[2]
    const insert = `\n${indent}${marker} `
    view.dispatch({
      changes: { from, insert },
      selection: EditorSelection.cursor(from + insert.length),
    })
    return true
  }

  // 有序列表
  const olMatch = lineText.match(/^(\s*)(\d+)\.\s/)
  if (olMatch) {
    const emptyMatch = lineText.match(/^(\s*)(\d+)\.\s*$/)
    if (emptyMatch) {
      view.dispatch({
        changes: { from: lineStart, to: from, insert: '\n' },
        selection: EditorSelection.cursor(lineStart + 1),
      })
      return true
    }
    const indent = olMatch[1]
    const num = parseInt(olMatch[2]) + 1
    const insert = `\n${indent}${num}. `
    view.dispatch({
      changes: { from, insert },
      selection: EditorSelection.cursor(from + insert.length),
    })
    return true
  }

  // 引用块
  const bqMatch = lineText.match(/^(\s*>)+\s/)
  if (bqMatch) {
    const emptyMatch = lineText.match(/^(\s*>)+\s*$/)
    if (emptyMatch) {
      view.dispatch({
        changes: { from: lineStart, to: from, insert: '\n' },
        selection: EditorSelection.cursor(lineStart + 1),
      })
      return true
    }
    const prefix = bqMatch[0]
    const insert = `\n${prefix}`
    view.dispatch({
      changes: { from, insert },
      selection: EditorSelection.cursor(from + insert.length),
    })
    return true
  }

  return false
}

// Tab 缩进
function handleTab(view: EditorView, shift: boolean): boolean {
  const { from } = view.state.selection.main
  const doc = view.state.doc.toString()

  if (shift) {
    // 反缩进
    const lineStart = doc.lastIndexOf('\n', from - 1) + 1
    const lineText = doc.substring(lineStart)
    const indentMatch = lineText.match(/^( {2,4}|\t)/)
    if (indentMatch) {
      const removeCount = indentMatch[1].length
      view.dispatch({
        changes: { from: lineStart, to: lineStart + removeCount, insert: '' },
        selection: EditorSelection.cursor(Math.max(lineStart, from - removeCount)),
      })
    }
    return true
  }

  // 缩进
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1
  view.dispatch({
    changes: { from: lineStart, insert: '  ' },
    selection: EditorSelection.cursor(from + 2),
  })
  return true
}

// 任务列表切换
function handleTaskToggle(view: EditorView): boolean {
  const { from } = view.state.selection.main
  const doc = view.state.doc.toString()
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1
  const lineEnd = doc.indexOf('\n', from)
  const lineText = doc.substring(lineStart, lineEnd === -1 ? doc.length : lineEnd)

  const uncheckedMatch = lineText.match(/^(\s*- )\[( )\](\s)/)
  if (uncheckedMatch) {
    const newText = lineText.replace('[ ]', '[x]')
    view.dispatch({
      changes: { from: lineStart, to: lineStart + lineText.length, insert: newText },
    })
    return true
  }

  const checkedMatch = lineText.match(/^(\s*- )\[x\](\s)/)
  if (checkedMatch) {
    const newText = lineText.replace('[x]', '[ ]')
    view.dispatch({
      changes: { from: lineStart, to: lineStart + lineText.length, insert: newText },
    })
    return true
  }

  return false
}

export function createKeymapExtension() {
  return keymap.of([
    // 格式化快捷键
    { key: 'Mod-b', run: (view) => cm6FormatBold(view) },
    { key: 'Mod-i', run: (view) => cm6FormatItalic(view) },
    // 删除线 = Mod+Shift+x（与 WYSIWYG 统一；Mod+Shift+s 让位给全局「另存为」）
    { key: 'Mod-Shift-x', run: (view) => cm6FormatStrike(view) },
    { key: 'Mod-Shift-k', run: (view) => cm6FormatCodeBlock(view) },
    { key: 'Mod-m', run: (view) => cm6FormatInlineMath(view) },
    { key: 'Mod-Shift-m', run: (view) => cm6FormatBlockMath(view) },
    { key: 'Mod-Shift-n', run: (view) => cm6InsertFootnote(view) },
    { key: 'Mod-Enter', run: (view) => handleTaskToggle(view) },

    // 列表续行
    { key: 'Enter', run: (view) => handleListContinue(view) },

    // Tab 缩进
    { key: 'Tab', run: (view) => handleTab(view, false) },
    { key: 'Shift-Tab', run: (view) => handleTab(view, true) },
  ])
}

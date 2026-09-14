import { describe, it, expect, afterEach } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { cm6FormatStrike, cm6FormatInlineCode, cm6InsertLink } from './autocompleteExtension'

function makeView(doc: string, from: number, to: number): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.range(from, to),
    }),
    parent: document.createElement('div'),
  })
}

const views: EditorView[] = []
afterEach(() => {
  while (views.length) views.pop()?.destroy()
})

function track(v: EditorView): EditorView {
  views.push(v)
  return v
}

describe('cm6 source-mode format helpers', () => {
  it('cm6FormatStrike wraps selection with ~~', () => {
    const view = track(makeView('hello world', 0, 5))
    cm6FormatStrike(view)
    expect(view.state.doc.toString()).toBe('~~hello~~ world')
  })

  it('cm6FormatStrike toggles off when already struck', () => {
    const view = track(makeView('~~hi~~', 0, 6))
    cm6FormatStrike(view)
    expect(view.state.doc.toString()).toBe('hi')
  })

  it('cm6FormatInlineCode wraps selection with backticks', () => {
    const view = track(makeView('use code here', 4, 8))
    cm6FormatInlineCode(view)
    expect(view.state.doc.toString()).toBe('use `code` here')
  })

  it('cm6FormatInlineCode toggles off when already inline code', () => {
    const view = track(makeView('`x`', 0, 3))
    cm6FormatInlineCode(view)
    expect(view.state.doc.toString()).toBe('x')
  })

  it('cm6InsertLink wraps selection as [text](url)', () => {
    const view = track(makeView('visit site', 6, 10))
    cm6InsertLink(view, 'https://example.com')
    expect(view.state.doc.toString()).toBe('visit [site](https://example.com)')
  })

  it('cm6InsertLink uses placeholder text when selection is collapsed', () => {
    const view = track(makeView('abc', 0, 0))
    cm6InsertLink(view, 'https://x.com')
    expect(view.state.doc.toString()).toBe('[链接文字](https://x.com)abc')
  })
})

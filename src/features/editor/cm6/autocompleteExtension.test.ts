import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import type { FileNode } from '@src/types/fileManager'
import {
  cm6FormatStrike,
  cm6FormatInlineCode,
  cm6InsertLink,
  wikiLinkCompletions,
  footnoteIdCompletions,
} from './autocompleteExtension'

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

/**
 * 回归锁（2026-10-11 用户反馈后优化）：源码模式的 WikiLink 补全**也能补章节**。
 *
 * 所见即所得（`WikiLinkAutocomplete`）早已支持 `[[文件名#` 补章节、`|` 别名与日期建议，
 * 而源码模式（`wikiLinkCompletions`）**只补文件名** —— 写 `[[笔记#章节]]` 时章节名只能手打
 * （还容易打错）。这里锁住源码模式补齐后的行为。
 */
const ROOT: FileNode = {
  id: 'root',
  name: 'root',
  type: 'folder',
  createdAt: 0,
  updatedAt: 0,
  children: [
    {
      id: 'n',
      name: '笔记.md',
      type: 'file',
      content: '# 引言\n正文\n## 方法\n### 细节\n',
      createdAt: 0,
      updatedAt: 0,
    },
  ],
}

function contextAt(doc: string): CompletionContext {
  return new CompletionContext(EditorState.create({ doc }), doc.length, false)
}

describe('源码模式 · WikiLink 补全（含 # 章节）', () => {
  beforeEach(() => {
    localStorage.setItem('markcraft-file-manager', JSON.stringify({ rootFolder: ROOT }))
  })
  afterEach(() => {
    localStorage.removeItem('markcraft-file-manager')
  })

  it('[[笔记# → 列出该笔记的章节标题，apply 出完整 [[笔记#标题]]', () => {
    const res = wikiLinkCompletions(contextAt('[[笔记#'))
    expect(res, '必须给出补全项').not.toBeNull()
    const labels = res!.options.map(o => o.label)
    expect(labels).toContain('引言')
    expect(labels).toContain('方法')
    expect(labels).toContain('细节')
    expect(res!.options[0].apply).toBe('[[笔记#引言]]')
  })

  it('章节可按关键字过滤', () => {
    const res = wikiLinkCompletions(contextAt('[[笔记#方'))
    expect(res).not.toBeNull()
    expect(res!.options.map(o => o.label)).toEqual(['方法'])
  })

  it('文件名带不带 .md 都能命中', () => {
    expect(wikiLinkCompletions(contextAt('[[笔记.md#'))).not.toBeNull()
  })

  it('目标笔记不存在 → 不弹补全（返回 null）', () => {
    expect(wikiLinkCompletions(contextAt('[[没这篇#'))).toBeNull()
  })

  it('文件名模式仍工作，且插入的是去 .md 的名字（与所见即所得一致）', () => {
    const res = wikiLinkCompletions(contextAt('[[笔'))
    expect(res).not.toBeNull()
    expect(res!.options[0].label).toBe('笔记')
    expect(res!.options[0].apply).toBe('[[笔记]]')
  })

  it('已闭合的 [[...]] 不再触发补全', () => {
    expect(wikiLinkCompletions(contextAt('[[笔记]]'))).toBeNull()
  })
})

/**
 * 回归锁（A1 源码模式脚注 id 自动补全）：输入 [^ 后列出全文已有脚注 id，
 * 一键复用已引来源；已闭合的 [^id] 不触发。
 */
describe('源码模式 · 脚注 id 补全（A1）', () => {
  it('输入未闭合的 [^ 时列出已有脚注 id', () => {
    const doc = '[^a]: 来源A\n[^1]: 来源一\n此处 [^'
    const res = footnoteIdCompletions(contextAt(doc))
    expect(res, '必须给出补全项').not.toBeNull()
    const labels = res!.options.map(o => o.label)
    expect(labels).toContain('[^a]')
    expect(labels).toContain('[^1]')
  })

  it('已闭合的 [^id] 不再触发补全', () => {
    expect(footnoteIdCompletions(contextAt('正文 [^1] 已闭合'))).toBeNull()
  })

  it('全文无脚注定义时不弹补全', () => {
    expect(footnoteIdCompletions(contextAt('只有 [^ 没有定义'))).toBeNull()
  })
})

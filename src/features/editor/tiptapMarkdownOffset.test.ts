import { describe, it, expect } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/react'
import { markdownOffsetToPmPos } from './tiptapMarkdownOffset'

/** 最小 schema：doc / paragraph / heading / text —— 足够验证偏移换算规则 */
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 } } },
    text: { inline: true },
  },
})

/** markdownOffsetToPmPos 只依赖 schema / state.doc / isDestroyed，用假对象即可测纯映射逻辑 */
function fakeEditor(fullMd: string): Editor {
  return {
    isDestroyed: false,
    schema,
    state: { doc: schema.node('doc', null, [schema.node('paragraph', null, fullMd ? [schema.text(fullMd)] : [])]) },
  } as unknown as Editor
}

describe('markdownOffsetToPmPos · {{cursor}} 偏移近似映射', () => {
  it('偏移 0 → 位置 0', () => {
    expect(markdownOffsetToPmPos(fakeEditor('Hello world'), 'Hello world', 0)).toBe(0)
  })

  it('段中间偏移：落在同一段落的对应文本位置', () => {
    // 前缀 "Hello"（无行尾空格，markdown 渲染不失真）→ 段 open(1) + 5 字符 = 6
    expect(markdownOffsetToPmPos(fakeEditor('Hello world'), 'Hello world', 5)).toBe(6)
    expect(markdownOffsetToPmPos(fakeEditor('Hello world'), 'Hello world', 7)).toBe(8)
    // ⚠️ 偏移落在行尾空格上时（如 offset 6 = "Hello "），marked 渲染会吞掉行尾空格，
    //    映射存在 ±1 字符固有模糊 —— 对「光标落点」场景可接受，不做精确断言。
  })

  it('块边界偏移（前缀以换行结尾）：落到下一块内容起点', () => {
    // 全文 "# T\n\nbody"：heading(0..2) + 段落内容从 3 开始
    const ed = {
      isDestroyed: false,
      schema,
      state: {
        doc: schema.node('doc', null, [
          schema.node('heading', { level: 1 }, [schema.text('T')]),
          schema.node('paragraph', null, [schema.text('body')]),
        ]),
      },
    } as unknown as Editor
    expect(markdownOffsetToPmPos(ed, '# T\n\nbody', 5)).toBe(3)
  })

  it('超出文档长度的偏移被夹取到合法位置', () => {
    // doc = paragraph("ab")：偏移 99 → 夹到全文末尾 → "ab" 之后 = 段 open(1)+2 字符 = 3
    expect(markdownOffsetToPmPos(fakeEditor('ab'), 'ab', 99)).toBe(3)
  })

  it('负偏移被夹取到 0', () => {
    expect(markdownOffsetToPmPos(fakeEditor('ab'), 'ab', -5)).toBe(0)
  })

  it('已销毁的编辑器返回 -1（调用方回退）', () => {
    const ed = { isDestroyed: true, schema, state: { doc: schema.nodes.doc.create() } } as unknown as Editor
    expect(markdownOffsetToPmPos(ed, 'ab', 1)).toBe(-1)
  })
})

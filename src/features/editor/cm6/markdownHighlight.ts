import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const markdownHighlightStyle = HighlightStyle.define([
  // 标题标记
  { tag: tags.heading1, fontWeight: 'bold', fontSize: '1.6em', color: '#e06c75' },
  { tag: tags.heading2, fontWeight: 'bold', fontSize: '1.4em', color: '#e06c75' },
  { tag: tags.heading3, fontWeight: 'bold', fontSize: '1.2em', color: '#d19a66' },
  { tag: tags.heading4, fontWeight: 'bold', fontSize: '1.1em', color: '#d19a66' },
  { tag: tags.heading5, fontWeight: 'bold', color: '#c678dd' },
  { tag: tags.heading6, fontWeight: 'bold', color: '#c678dd' },
  // 标题标记符号 (#)
  { tag: tags.processingInstruction, color: '#56b6c2' },
  // 强调
  { tag: tags.emphasis, fontStyle: 'italic', color: '#c678dd' },
  { tag: tags.strong, fontWeight: 'bold', color: '#e5c07b' },
  // 链接
  { tag: tags.link, color: '#61afef', textDecoration: 'underline' },
  { tag: tags.url, color: '#56b6c2' },
  // 代码
  { tag: tags.monospace, color: '#98c379', backgroundColor: 'rgba(152, 195, 121, 0.1)' },
  // 引用
  { tag: tags.quote, color: '#5c6370', fontStyle: 'italic' },
  // 列表
  { tag: tags.list, color: '#d19a66' },
  // 分隔线
  { tag: tags.contentSeparator, color: '#56b6c2' },
  // 行内代码（strikethrough 用 deletion 标签）
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#5c6370' },
  // 注释 / 元数据
  { tag: tags.meta, color: '#5c6370' },
  // 代码块语言标识
  { tag: tags.labelName, color: '#e5c07b' },
  // 属性
  { tag: tags.attributeName, color: '#d19a66' },
  { tag: tags.attributeValue, color: '#98c379' },
])

export const markdownHighlight = syntaxHighlighting(markdownHighlightStyle)

import { InputRule, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProsemirrorNode, Mark } from '@tiptap/pm/model'

// ─── InputRule 实例（用于输入时即时转换） ───

// 粗斜体：***text*** → 粗体+斜体（必须在粗体之前，优先级更高）
export const boldItalicInputRule = new InputRule({
  find: /(\*\*\*)(.+?)(\*\*\*)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const boldMark = state.schema.marks.bold
      const italicMark = state.schema.marks.italic
      if (!boldMark || !italicMark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, boldMark.create())
      tr.addMark(range.from, range.from + text.length, italicMark.create())
      return true
    }).run()
  },
})

// 粗体：**text** → 加粗
export const boldInputRule = new InputRule({
  find: /(\*\*)(.+?)(\*\*)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const mark = state.schema.marks.bold
      if (!mark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, mark.create())
      return true
    }).run()
  },
})

// 斜体：*text* → 斜体（排除 ** 的情况）
export const italicInputRule = new InputRule({
  find: /(?<!\*)(\*)(?!\*)(.+?)(?<!\*)(\*)(?!\*)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const mark = state.schema.marks.italic
      if (!mark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, mark.create())
      return true
    }).run()
  },
})

// 行内代码：`text` → 代码
export const codeInputRule = new InputRule({
  find: /(`)(.+?)(`)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const mark = state.schema.marks.code
      if (!mark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, mark.create())
      return true
    }).run()
  },
})

// 删除线：~~text~~ → 删除线
export const strikethroughInputRule = new InputRule({
  find: /(~~)(.+?)(~~)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const mark = state.schema.marks.strike
      if (!mark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, mark.create())
      return true
    }).run()
  },
})

// 高亮：==text== → 高亮标记
export const highlightInputRule = new InputRule({
  find: /(==)(.+?)(==)$/,
  handler: ({ range, match, chain }) => {
    const text = match[2]
    chain().command(({ tr, state }) => {
      const mark = state.schema.marks.highlight
      if (!mark) return false
      tr.insertText(text, range.from, range.to)
      tr.addMark(range.from, range.from + text.length, mark.create())
      return true
    }).run()
  },
})

// ─── appendTransaction 插件（用于粘贴/加载时批量转换） ───

const markdownInlineKey = new PluginKey('markdownInlineAutoConvert')
const appendTransactionKey = 'appendTransactionSource'

const BOLD_ITALIC_PATTERN = /\*\*\*(.+?)\*\*\*/g
const BOLD_PATTERN = /\*\*(.+?)\*\*/g
const ITALIC_PATTERN = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
const CODE_PATTERN = /`(.+?)`/g
const STRIKETHROUGH_PATTERN = /~~(.+?)~~/g
const HIGHLIGHT_PATTERN = /==(.+?)==/g

interface InlineMatch {
  index: number
  fullLength: number
  text: string
  markType: string
  extraMarks?: string[]  // 附加 mark 类型（如粗斜体需要 bold + italic）
}

function collectMatches(text: string): InlineMatch[] {
  const matches: InlineMatch[] = []

  // 粗斜体优先匹配（***text***），避免被 ** 截取
  BOLD_ITALIC_PATTERN.lastIndex = 0
  let m
  while ((m = BOLD_ITALIC_PATTERN.exec(text)) !== null) {
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'bold', extraMarks: ['italic'] })
  }

  BOLD_PATTERN.lastIndex = 0
  while ((m = BOLD_PATTERN.exec(text)) !== null) {
    // 跳过已被粗斜体匹配覆盖的区域
    const overlaps = matches.some(em => m!.index >= em.index && m!.index < em.index + em.fullLength)
    if (overlaps) continue
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'bold' })
  }

  ITALIC_PATTERN.lastIndex = 0
  while ((m = ITALIC_PATTERN.exec(text)) !== null) {
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'italic' })
  }

  CODE_PATTERN.lastIndex = 0
  while ((m = CODE_PATTERN.exec(text)) !== null) {
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'code' })
  }

  STRIKETHROUGH_PATTERN.lastIndex = 0
  while ((m = STRIKETHROUGH_PATTERN.exec(text)) !== null) {
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'strike' })
  }

  HIGHLIGHT_PATTERN.lastIndex = 0
  while ((m = HIGHLIGHT_PATTERN.exec(text)) !== null) {
    matches.push({ index: m.index, fullLength: m[0].length, text: m[1], markType: 'highlight' })
  }

  matches.sort((a, b) => a.index - b.index)

  const filtered: InlineMatch[] = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.index >= lastEnd) {
      filtered.push(match)
      lastEnd = match.index + match.fullLength
    }
  }

  return filtered
}

const MarkdownInlineInputRules = Extension.create({
  name: 'markdownInlineInputRules',

  addInputRules() {
    return [boldItalicInputRule, boldInputRule, italicInputRule, codeInputRule, strikethroughInputRule, highlightInputRule]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markdownInlineKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(markdownInlineKey))
            if (hasOwnChange) return null

            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(markdownInlineKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const { schema } = newState
            const tr = newState.tr
            let modified = false
            const replacements: {
              from: number
              to: number
              nodes: ProsemirrorNode[]
            }[] = []

            newState.doc.descendants((node, pos) => {
              if (!node.isText) return

              const text = node.text
              if (!text) return

              const matches = collectMatches(text)
              if (matches.length === 0) return

              const existingMarkNames = new Set(node.marks.map(m => m.type.name))
              const hasRelevantMark = matches.some(m => existingMarkNames.has(m.markType))
              if (hasRelevantMark) return

              const fragments: ProsemirrorNode[] = []
              let lastIndex = 0

              for (const match of matches) {
                if (match.index > lastIndex) {
                  fragments.push(schema.text(text.slice(lastIndex, match.index), node.marks))
                }

                const markType = schema.marks[match.markType]
                if (markType) {
                  const mark = markType.create() as Mark
                  let newMarks = [...node.marks.filter(mk => mk.type.name !== match.markType), mark]
                  // 处理附加 mark（如粗斜体需要 bold + italic）
                  if (match.extraMarks) {
                    for (const extraMarkName of match.extraMarks) {
                      const extraMarkType = schema.marks[extraMarkName]
                      if (extraMarkType && !newMarks.some(mk => mk.type.name === extraMarkName)) {
                        newMarks = [...newMarks.filter(mk => mk.type.name !== extraMarkName), extraMarkType.create() as Mark]
                      }
                    }
                  }
                  fragments.push(schema.text(match.text, newMarks))
                } else {
                  fragments.push(schema.text(text.slice(match.index, match.index + match.fullLength), node.marks))
                }

                lastIndex = match.index + match.fullLength
              }

              if (lastIndex < text.length) {
                fragments.push(schema.text(text.slice(lastIndex), node.marks))
              }

              if (fragments.length > 0) {
                replacements.push({
                  from: pos,
                  to: pos + node.nodeSize,
                  nodes: fragments,
                })
              }
            })

            for (let i = replacements.length - 1; i >= 0; i--) {
              const { from, to, nodes } = replacements[i]
              tr.replaceWith(from, to, nodes)
              modified = true
            }

            if (modified) {
              tr.setMeta(markdownInlineKey, true)
              tr.setMeta(appendTransactionKey, true)
              return tr
            }

            return null
          } catch {
            return null
          }
        },
      }),
    ]
  },
})

export default MarkdownInlineInputRules

import { InputRule, Extension } from '@tiptap/core'

/**
 * ListInputRules — 列表输入增强
 *
 * 在行首输入以下语法后立即转为列表：
 *   - 或 * + 空格 → 无序列表
 *   1. + 空格     → 有序列表
 */
const ListInputRules = Extension.create({
  name: 'listInputRules',

  addInputRules() {
    const rules: InputRule[] = []

    // ── 无序列表：- 或 * + 空格 ──
    rules.push(
      new InputRule({
        find: /^[-*]\s$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .toggleBulletList()
            .run()
        },
      })
    )

    // ── 有序列表：1. + 空格 ──
    rules.push(
      new InputRule({
        find: /^(\d+)\.\s$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .toggleOrderedList()
            .run()
        },
      })
    )

    return rules
  },
})

export default ListInputRules

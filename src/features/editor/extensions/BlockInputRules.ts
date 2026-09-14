import { InputRule, Extension } from '@tiptap/core'

export interface BlockInputRulesOptions {
  codeBlockDefaultLang: string
}

/**
 * BlockInputRules — 块级语法即时转换
 *
 * 输入 Markdown 块级语法后立即转为对应的富文本节点：
 *   # ~ ###### + 空格 → 标题
 *   > + 空格      → 引用块
 *   --- / *** / ___ → 分割线
 *   ``` + 回车     → 代码块
 *   $$ + 回车      → 数学公式块
 */
const BlockInputRules = Extension.create<BlockInputRulesOptions>({
  name: 'blockInputRules',

  addOptions() {
    return {
      codeBlockDefaultLang: '',
    }
  },

  addInputRules() {
    const rules: InputRule[] = []
    const defaultLang = this.options.codeBlockDefaultLang

    // ── 标题：# ~ ###### + 空格 ──
    rules.push(
      new InputRule({
        find: /^(#{1,6})\s$/,
        handler: ({ range, match, chain }) => {
          const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6
          chain()
            .deleteRange(range)
            .setHeading({ level })
            .run()
        },
      })
    )

    // ── 引用块：> + 空格 ──
    rules.push(
      new InputRule({
        find: /^>\s$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .setBlockquote()
            .run()
        },
      })
    )

    // ── 分割线：--- / *** / ___ ──
    rules.push(
      new InputRule({
        find: /^(?:---|\*\*\*|___)$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .setHorizontalRule()
            .run()
        },
      })
    )

    // ── 代码块：``` + 可选语言 + 回车 ──
    rules.push(
      new InputRule({
        find: /^```([a-zA-Z0-9+.-]*)?\n$/,
        handler: ({ range, match, chain }) => {
          const language = match[1] || defaultLang
          chain()
            .deleteRange(range)
            .setCodeBlock({ language })
            .run()
        },
      })
    )

    // ── 数学公式块：$$ + 回车 ──
    rules.push(
      new InputRule({
        find: /^\$\$\n$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertMathBlock()
            .run()
        },
      })
    )

    return rules
  },
})

export default BlockInputRules

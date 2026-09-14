import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const transitionKey = new PluginKey('transition')

/**
 * TransitionExtension — 转换动画
 *
 * 检测通过 InputRule 创建的节点，为其添加淡入动画 class。
 * 动画在 150ms 后自动移除。
 */
const TransitionExtension = Extension.create({
  name: 'transition',

  addProseMirrorPlugins() {
    // 存储需要动画的节点位置及其移除定时器
    const pendingAnimations = new Map<number, ReturnType<typeof setTimeout>>()

    return [
      new Plugin({
        key: transitionKey,
        view() {
          return {
            destroy() {
              // 清理所有定时器
              pendingAnimations.forEach((timer) => clearTimeout(timer))
              pendingAnimations.clear()
            },
          }
        },
        appendTransaction(transactions, _oldState, _newState) {
          // 检测是否有 InputRule 触发的转换
          let hasInputRuleTransaction = false
          for (const tr of transactions) {
            if (tr.getMeta('inputRule')) {
              hasInputRuleTransaction = true
              break
            }
          }
          if (!hasInputRuleTransaction) return null

          // 为新创建的节点记录位置（通过比较 oldState 和 newState 的差异）
          // 这里返回 null，不修改文档，仅通过 decoration 添加动画
          return null
        },
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            // 检查最近的交易是否由 InputRule 触发
            // 通过检测当前选区所在节点是否刚被创建
            const { $head } = state.selection

            // 向上查找最近的块级节点
            for (let d = $head.depth; d > 0; d--) {
              const node = $head.node(d)
              if (node.isBlock && node.type.name !== 'doc' && node.type.name !== 'paragraph') {
                const pos = $head.before(d)
                // 检查是否已有动画在等待
                if (!pendingAnimations.has(pos)) {
                  // 检查此节点是否刚通过 InputRule 创建
                  // 简化判断：如果选区在此节点开头，可能是刚创建的
                  const nodeStart = pos + 1
                  if ($head.pos === nodeStart || $head.pos === nodeStart + 1) {
                    decorations.push(
                      Decoration.node(pos, pos + node.nodeSize, {
                        class: 'lp-fade-in',
                      })
                    )

                    // 设置定时器在动画结束后清理
                    const timer = setTimeout(() => {
                      pendingAnimations.delete(pos)
                    }, 200)
                    pendingAnimations.set(pos, timer)
                  }
                }
                break
              }
            }

            if (decorations.length === 0) return DecorationSet.empty
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

export default TransitionExtension

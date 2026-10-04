import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const transitionKey = new PluginKey('transition')

/**
 * TransitionExtension — 转换动画
 *
 * 检测通过 InputRule 创建的节点，为其添加淡入动画 class。
 * 动画在 150ms 后自动移除。
 *
 * 注意：`props.decorations` 必须是 state 的纯函数（ProseMirror 会在每次
 * view 更新时反复调用），因此**不能在它里面调度定时器或修改外部可变状态**。
 * 原先的写法会在 decorations() 内 `setTimeout` 并写入 Map，导致定时器累积、
 * 以及 class 每 200ms 被重新挂上。现改为在 `view().update()` 里探测并登记，
 * decorations() 只读共享集合返回装饰。
 */
const TransitionExtension = Extension.create({
  name: 'transition',

  addProseMirrorPlugins() {
    // 已应用淡入动画的节点位置。destroy 时一并清空，避免泄漏。
    const animated = new Set<number>()
    const timers = new Map<number, ReturnType<typeof setTimeout>>()

    return [
      new Plugin({
        key: transitionKey,
        view() {
          return {
            // 在 view 更新钩子里做"刚被 InputRule 创建的节点"探测与动画登记，
            // 而不是在 decorations()（要求纯函数）。每次选区分支最多登记一次。
            update(view) {
              const { $head } = view.state.selection
              for (let d = $head.depth; d > 0; d--) {
                const node = $head.node(d)
                if (node.isBlock && node.type.name !== 'doc' && node.type.name !== 'paragraph') {
                  const pos = $head.before(d)
                  const nodeStart = pos + 1
                  // 选区在节点开头附近 → 可能是刚由 InputRule 创建的节点
                  if (($head.pos === nodeStart || $head.pos === nodeStart + 1) && !animated.has(pos)) {
                    animated.add(pos)
                    // 动画播完（~200ms）后从集合移除，下次 decorations 重算即摘掉 class；
                    // 同时防止集合随编辑无限增长。
                    const timer = setTimeout(() => {
                      animated.delete(pos)
                    }, 200)
                    timers.set(pos, timer)
                  }
                  break
                }
              }
            },
            destroy() {
              timers.forEach((t) => clearTimeout(t))
              timers.clear()
              animated.clear()
            },
          }
        },
        props: {
          // 纯函数：仅依据已登记的 animated 集合返回装饰，不再调度定时器/改外部状态
          decorations(state) {
            const { $head } = state.selection
            for (let d = $head.depth; d > 0; d--) {
              const node = $head.node(d)
              if (node.isBlock && node.type.name !== 'doc' && node.type.name !== 'paragraph') {
                const pos = $head.before(d)
                if (animated.has(pos)) {
                  return DecorationSet.create(state.doc, [
                    Decoration.node(pos, pos + node.nodeSize, { class: 'lp-fade-in' }),
                  ])
                }
                break
              }
            }
            return DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export default TransitionExtension

import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { MC_FOCUS_DIM_CLASS, centerRectInContainer, findScrollContainer } from '../focus/focusContract'

export const focusModeKey = new PluginKey('focusMode')

export interface FocusModePluginState {
  focusEnabled: boolean
  typewriterEnabled: boolean
}

/** 求选区所在「顶层块」的位置；未找到返回 null。 */
function activeTopLevelPos($head: ResolvedPos): number | null {
  for (let d = $head.depth; d > 0; d--) {
    const node = $head.node(d)
    if (node.isBlock && node.type.name !== 'doc') return $head.before(d)
  }
  return null
}

/**
 * FocusModeExtension — 所见即所得模式下的专注 / 打字机（P0 与源码模式对齐）
 *
 * 与 LivePreviewExtension 同构：扩展**始终注册**，通过 enabled 状态动态生效，
 * 运行时用 `setFocusModeEnabled` / `setTypewriterModeEnabled` 命令切换。
 *
 * - 专注（focus）：为非「选区所在顶层块」的其余顶层块加 `mc-focus-dimmed` 装饰，
 *   实现「段落/块聚焦」。顶层块为单位可避免嵌套元素透明度叠加。
 * - 打字机（typewriter）：选区变化后把活动块滚动到容器垂直中央，算法与源码模式
 *   共用 `centerRectInContainer`，保证两种模式手感一致。
 */
const FocusModeExtension = Extension.create({
  name: 'focusMode',

  addOptions() {
    return {
      focusMode: false,
      typewriterMode: false,
    }
  },

  addCommands() {
    return {
      setFocusModeEnabled:
        (enabled: boolean) =>
        ({ tr }) => {
          tr.setMeta(focusModeKey, { focusEnabled: enabled })
          return true
        },
      setTypewriterModeEnabled:
        (enabled: boolean) =>
        ({ tr }) => {
          tr.setMeta(focusModeKey, { typewriterEnabled: enabled })
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const initialFocus = this.options.focusMode
    const initialTypewriter = this.options.typewriterMode

    return [
      new Plugin({
        key: focusModeKey,
        state: {
          init: (): FocusModePluginState => ({
            focusEnabled: initialFocus,
            typewriterEnabled: initialTypewriter,
          }),
          apply(tr, prev): FocusModePluginState {
            const meta = tr.getMeta(focusModeKey) as Partial<FocusModePluginState> | undefined
            if (!meta) return prev
            return {
              focusEnabled: typeof meta.focusEnabled === 'boolean' ? meta.focusEnabled : prev.focusEnabled,
              typewriterEnabled:
                typeof meta.typewriterEnabled === 'boolean' ? meta.typewriterEnabled : prev.typewriterEnabled,
            }
          },
        },
        props: {
          decorations(state) {
            const st = focusModeKey.getState(state) as FocusModePluginState | undefined
            if (!st || !st.focusEnabled) return DecorationSet.empty

            const activePos = activeTopLevelPos(state.selection.$head)
            const decos: Decoration[] = []
            state.doc.forEach((node: ProseMirrorNode, offset: number) => {
              if (offset === activePos) return
              decos.push(Decoration.node(offset, offset + node.nodeSize, { class: MC_FOCUS_DIM_CLASS }))
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
        view() {
          return {
            update(view, prevState) {
              const st = focusModeKey.getState(view.state) as FocusModePluginState | undefined
              if (!st || !st.typewriterEnabled) return
              if (view.state.selection.eq(prevState.selection)) return

              requestAnimationFrame(() => {
                const st2 = focusModeKey.getState(view.state) as FocusModePluginState | undefined
                if (!st2 || !st2.typewriterEnabled) return
                const activePos = activeTopLevelPos(view.state.selection.$head)
                if (activePos === null) return
                const dom = view.nodeDOM(activePos) as HTMLElement | null
                if (!dom) return
                const container = findScrollContainer(dom)
                if (!container) return
                centerRectInContainer(container, dom.getBoundingClientRect())
              })
            },
          }
        },
      }),
    ]
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focusMode: {
      setFocusModeEnabled: (enabled: boolean) => ReturnType
      setTypewriterModeEnabled: (enabled: boolean) => ReturnType
    }
  }
}

export default FocusModeExtension

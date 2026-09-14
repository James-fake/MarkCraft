/**
 * P1.1 Tiptap BlockReference 扩展
 * 在 WYSIWYG 编辑器中识别并渲染 ((block-id)) 和 ((block-id|alias)) 语法
 * 支持点击跳转到块定义位置
 */
import { Mark, mergeAttributes, InputRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { triggerBlockClick } from '@services/blockReferenceBridge'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockReference: {
      setBlockReference: (blockId: string, alias?: string) => ReturnType
      unsetBlockReference: () => ReturnType
    }
  }
}

// 模块级点击回调，供 ProseMirror plugin 调用
let _onBlockRefClick: ((blockId: string, event: MouseEvent) => void) | null = null

export function setBlockReferenceClickHandler(handler: ((blockId: string, event: MouseEvent) => void) | null) {
  _onBlockRefClick = handler
}

const BlockReference = Mark.create({
  name: 'blockReference',
  inclusive: false,

  addAttributes() {
    return {
      blockId: {
        default: '',
        parseHTML: el => el.getAttribute('data-block-id') || '',
        renderHTML: attrs => {
          if (!attrs.blockId) return {}
          return { 'data-block-id': attrs.blockId }
        },
      },
      alias: {
        default: null,
        parseHTML: el => el.getAttribute('data-block-alias') || null,
        renderHTML: attrs => {
          if (!attrs.alias) return {}
          return { 'data-block-alias': attrs.alias }
        },
      },
      broken: {
        default: false,
        parseHTML: el => el.getAttribute('data-block-broken') === 'true',
        renderHTML: attrs => {
          if (!attrs.broken) return {}
          return { 'data-block-broken': 'true' }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-block-ref]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const isBroken = HTMLAttributes.broken === true || HTMLAttributes['data-block-broken'] === 'true'
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-block-ref': '',
      class: `block-ref${isBroken ? ' block-ref--broken' : ''}`,
      style: isBroken
        ? 'color: #ef4444; cursor: pointer; border-bottom: 1px dashed #ef4444; text-decoration: none;'
        : 'color: #8b5cf6; cursor: pointer; border-bottom: 1px dotted #8b5cf6; text-decoration: none; font-size: 0.9em;',
      title: `块引用: ^${HTMLAttributes.blockId || HTMLAttributes['data-block-id'] || ''}`,
    }), 0]
  },

  addCommands() {
    return {
      setBlockReference: (blockId: string, alias?: string) => ({ commands }) => {
        return commands.setMark(this.name, { blockId, alias: alias || null })
      },
      unsetBlockReference: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addInputRules() {
    return [
      // Support ((block-id)) or ((block-id|alias)) syntax
      new InputRule({
        find: /\(\(([^)|]+)(?:\|([^)]+))?\)\)$/,
        handler: ({ range, match, chain }) => {
          const blockId = match[1].trim()
          const alias = match[2]?.trim() || null
          const displayText = alias || `^${blockId}`
          const markAttrs: Record<string, any> = { blockId, alias, broken: false }

          chain().command(({ tr, state }) => {
            const markType = state.schema.marks.blockReference
            tr.insertText(displayText, range.from, range.to)
            if (markType) {
              tr.addMark(range.from, range.from + displayText.length, markType.create(markAttrs))
            }
            return true
          }).run()
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockRefClick'),
        props: {
          handleClick(view, _pos, event) {
            const target = (event.target as HTMLElement).closest('[data-block-ref]')
            if (!target) return false

            const blockId = target.getAttribute('data-block-id')
            if (!blockId) return false

            // Ctrl/Meta+Click: navigate to block
            if (event.ctrlKey || event.metaKey) {
              if (_onBlockRefClick) {
                _onBlockRefClick(blockId, event)
                return true
              }
              // Fallback to bridge click handler
              triggerBlockClick(blockId)
              return true
            }

            // Normal click: check if cursor is inside this mark
            const { from } = view.state.selection
            const $from = view.state.doc.resolve(from)
            const marksAtCursor = $from.marks()
            const blockRefMark = view.state.schema.marks.blockReference
            const cursorInMark = blockRefMark
              ? marksAtCursor.some(m => m.type === blockRefMark && m.attrs.blockId === blockId)
              : false

            // If cursor is inside mark, allow editing
            if (cursorInMark) return false

            // Navigate
            if (_onBlockRefClick) {
              _onBlockRefClick(blockId, event)
              return true
            }
            triggerBlockClick(blockId)
            return true
          },
        },
      }),
    ]
  },
})

export default BlockReference

import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CalloutView from './CalloutView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (calloutType?: string, title?: string) => ReturnType
      toggleCallout: () => ReturnType
    }
  }
}

const SUPPORTED_TYPES = [
  'note', 'tip', 'warning', 'danger', 'info', 'success',
  'question', 'bug', 'example', 'quote', 'failure',
]

function normalizeType(type: string): string {
  const lower = (type || '').toLowerCase()
  return SUPPORTED_TYPES.includes(lower) ? lower : 'info'
}

const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      calloutType: {
        default: 'info',
        parseHTML: (el) => normalizeType(el.getAttribute('data-callout-type') || 'info'),
        renderHTML: (attrs) => ({
          'data-callout-type': normalizeType(attrs.calloutType || 'info'),
        }),
      },
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-title') || '',
        renderHTML: (attrs) => ({
          'data-title': attrs.title || '',
        }),
      },
      collapsible: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-collapsible') === 'true',
        renderHTML: (attrs) => ({
          'data-collapsible': attrs.collapsible ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-callout': '' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView)
  },

  addCommands() {
    return {
      setCallout:
        (calloutType: string = 'info', title: string = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { calloutType: normalizeType(calloutType), title, collapsible: false },
            content: [{ type: 'paragraph' }],
          })
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', {
            calloutType: 'info',
            title: '',
            collapsible: false,
          })
        },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^>\s+\[!(\w+)\]([-+]?)\s*(.*)$/,
        handler: ({ range, match, chain }) => {
          const calloutType = normalizeType(match[1].toLowerCase())
          const collapsible = match[2] === '+' || match[2] === '-'
          const title = match[3] || ''
          chain()
            .command(({ tr, state }) => {
              const calloutNode = state.schema.nodes.callout.create(
                { calloutType, title, collapsible },
                [state.schema.nodes.paragraph.create()]
              )
              tr.replaceRangeWith(range.from, range.to, calloutNode)
              return true
            })
            .run()
        },
      }),
    ]
  },
})

export default CalloutNode

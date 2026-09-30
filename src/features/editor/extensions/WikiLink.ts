import { Mark, mergeAttributes, InputRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (target: string, label?: string) => ReturnType
      unsetWikiLink: () => ReturnType
    }
  }
}

// 模块级回调，供 ProseMirror plugin 调用
let _onWikiLinkClick: ((target: string, event: MouseEvent) => void) | null = null
let _onBrokenLinkClick: ((target: string) => void) | null = null

export function setWikiLinkClickHandler(handler: ((target: string, event: MouseEvent) => void) | null) {
  _onWikiLinkClick = handler
}

export function setBrokenLinkClickHandler(handler: ((target: string) => void) | null) {
  _onBrokenLinkClick = handler
}

const WikiLink = Mark.create({
  name: 'wikiLink',
  inclusive: false,

  addAttributes() {
    return {
      target: {
        default: '',
        parseHTML: el => el.getAttribute('data-wiki-target') || '',
        renderHTML: attrs => {
          if (!attrs.target) return {}
          return { 'data-wiki-target': attrs.target }
        },
      },
      label: {
        default: null,
        parseHTML: el => el.getAttribute('data-wiki-label') || null,
        renderHTML: attrs => {
          if (!attrs.label) return {}
          return { 'data-wiki-label': attrs.label }
        },
      },
      broken: {
        default: false,
        parseHTML: el => el.getAttribute('data-wiki-broken') === 'true',
        renderHTML: attrs => {
          if (!attrs.broken) return {}
          return { 'data-wiki-broken': 'true' }
        },
      },
      fuzzy: {
        default: false,
        parseHTML: el => el.getAttribute('data-wiki-fuzzy') === 'true',
        renderHTML: attrs => {
          if (!attrs.fuzzy) return {}
          return { 'data-wiki-fuzzy': 'true' }
        },
      },
      backlinkCount: {
        default: 0,
        parseHTML: el => parseInt(el.getAttribute('data-wiki-backlink-count') || '0', 10),
        renderHTML: attrs => {
          if (!attrs.backlinkCount || attrs.backlinkCount === 0) return {}
          return { 'data-wiki-backlink-count': String(attrs.backlinkCount) }
        },
      },
      relation: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-wiki-relation') || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 上游 renderHTML 签名即 Record<string, any>（@tiptap/core MarkConfig:1533），忠实镜像不收窄
        renderHTML: (attrs: Record<string, any>) => {
          if (!attrs.relation) return {}
          return { 'data-wiki-relation': attrs.relation }
        },
      },
      note: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-wiki-note') || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: 同上，上游 renderHTML 签名形态
        renderHTML: (attrs: Record<string, any>) => {
          if (!attrs.note) return {}
          return { 'data-wiki-note': attrs.note }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-wiki-link]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const isBroken = HTMLAttributes.broken === true || HTMLAttributes['data-wiki-broken'] === 'true'
    const isFuzzy = HTMLAttributes.fuzzy === true || HTMLAttributes['data-wiki-fuzzy'] === 'true'
    return ['a', mergeAttributes(HTMLAttributes, {
      'data-wiki-link': '',
      class: `wiki-link${isBroken ? ' wiki-link--broken' : ''}${isFuzzy ? ' wiki-link--fuzzy' : ''}`,
      style: isFuzzy
        ? 'color: #f59e0b; cursor: pointer; border-bottom: 1px dotted #f59e0b; text-decoration: none;'
        : isBroken
          ? 'color: #ef4444; cursor: pointer; border-bottom: 1px dashed #ef4444; text-decoration: none;'
          : 'color: var(--button-primary, #3b82f6); cursor: pointer; border-bottom: 1px dashed currentColor; text-decoration: none;',
    }), 0]
  },

  addCommands() {
    return {
      setWikiLink: (target: string, label?: string) => ({ commands }) => {
        return commands.setMark(this.name, { target, label: label || null })
      },
      unsetWikiLink: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addInputRules() {
    return [
      // Support [[target|label]] syntax, including 关系:xxx and 备注:xxx
      new InputRule({
        find: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/,
        handler: ({ range, match, chain }) => {
          const target = match[1]
          const pipeContent = match[2] || null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: mark 属性袋（markType.create 入参），同上游 Attributes 形态
          const markAttrs: Record<string, any> = { target, label: null, relation: '', note: '' }
          let displayText = target

          if (pipeContent) {
            if (pipeContent.startsWith('关系:')) {
              markAttrs.relation = pipeContent.slice(3)
              markAttrs.label = target
              displayText = target
            } else if (pipeContent.startsWith('备注:')) {
              markAttrs.note = pipeContent.slice(3)
              markAttrs.label = target
              displayText = target
            } else {
              markAttrs.label = pipeContent
              displayText = pipeContent
            }
          }

          chain().command(({ tr, state }) => {
            const markType = state.schema.marks.wikiLink
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
      // Click handler for wiki links (single-click or Ctrl+Click to navigate)
      new Plugin({
        key: new PluginKey('wikiLinkClick'),
        props: {
          handleClick(view, _pos, event) {
            const target = (event.target as HTMLElement).closest('[data-wiki-link]')
            if (!target) return false

            const wikiTarget = target.getAttribute('data-wiki-target')
            if (!wikiTarget) return false

            const isBroken = target.getAttribute('data-wiki-broken') === 'true'

            // Ctrl/Meta+Click: always navigate
            if (event.ctrlKey || event.metaKey) {
              if (isBroken && _onBrokenLinkClick) {
                _onBrokenLinkClick(wikiTarget)
                return true
              }
              if (_onWikiLinkClick) {
                _onWikiLinkClick(wikiTarget, event)
                return true
              }
              return false
            }

            // Normal click: check if cursor is already inside this wikiLink mark
            const { from } = view.state.selection
            const $from = view.state.doc.resolve(from)
            const marksAtCursor = $from.marks()
            const wikiLinkMark = view.state.schema.marks.wikiLink
            const cursorInWikiLink = wikiLinkMark
              ? marksAtCursor.some(m => m.type === wikiLinkMark && m.attrs.target === wikiTarget)
              : false

            // If cursor is already inside this mark, allow editing (don't navigate)
            if (cursorInWikiLink) return false

            // Cursor not inside this mark → navigate
            if (isBroken && _onBrokenLinkClick) {
              _onBrokenLinkClick(wikiTarget)
              return true
            }
            if (_onWikiLinkClick) {
              _onWikiLinkClick(wikiTarget, event)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

export default WikiLink

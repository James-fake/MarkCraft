import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import MediaEmbedView from './MediaEmbedView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbed: {
      insertMediaEmbed: (options: { src: string; type: 'video' | 'audio' }) => ReturnType
    }
  }
}

const mediaAutoConvertKey = new PluginKey('mediaAutoConvert')
const appendTransactionKey = 'appendTransactionSource'

const MEDIA_PATTERN = /!\[(video|audio)\]\(([^)]+)\)/g

const MediaEmbed = Node.create({
  name: 'mediaEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      type: { default: 'video' },
    }
  },

  parseHTML() {
    return [
      { tag: 'video[src]' },
      { tag: 'audio[src]' },
      { tag: 'div[data-media-embed]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { type, ...restAttrs } = HTMLAttributes
    const tag = type === 'audio' ? 'audio' : 'video'
    return [tag, mergeAttributes(restAttrs, { controls: 'true' })]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mediaAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(mediaAutoConvertKey))
            if (hasOwnChange) return null

            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(mediaAutoConvertKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const { schema, tr } = newState
            const mediaNodeType = schema.nodes.mediaEmbed
            if (!mediaNodeType) return null

            const replacements: {
              from: number
              to: number
              node: ProseMirrorNode
            }[] = []

            newState.doc.descendants((node, pos) => {
              if (!node.isText) return

              const text = node.text
              if (!text) return

              MEDIA_PATTERN.lastIndex = 0
              let m
              while ((m = MEDIA_PATTERN.exec(text)) !== null) {
                const type = m[1].toLowerCase()
                const src = m[2]
                if (!src.trim()) continue

                const mediaNode = mediaNodeType.create({ src, type })
                replacements.push({
                  from: pos + m.index,
                  to: pos + m.index + m[0].length,
                  node: mediaNode,
                })
              }
            })

            if (replacements.length === 0) return null

            replacements.sort((a, b) => b.from - a.from)

            for (const { from, to, node } of replacements) {
              tr.replaceWith(from, to, node)
            }

            tr.setMeta(mediaAutoConvertKey, true)
            tr.setMeta(appendTransactionKey, true)
            return tr
          } catch {
            return null
          }
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaEmbedView)
  },

  addCommands() {
    return {
      insertMediaEmbed:
        (options: { src: string; type: 'video' | 'audio' }) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

export default MediaEmbed

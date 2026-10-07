import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const imageAutoConvertKey = new PluginKey('imageAutoConvert')

// Shared meta key — prevents recursive appendTransaction across plugins
const appendTransactionKey = 'appendTransactionSource'

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

/**
 * ImageInputRule — 输入 ![alt](url) 后自动转为图片节点
 *
 * 使用 appendTransaction 而非 InputRule，因为图片语法可能跨越
 * 多次输入事件（先输入 ![alt]，再输入 ](url)）。
 */
const ImageInputRule = Extension.create({
  name: 'imageInputRule',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: imageAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          try {
            const hasOwnChange = transactions.some(tr => tr.getMeta(imageAutoConvertKey))
            if (hasOwnChange) return null

            const isFromOtherAppend = transactions.some(
              tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(imageAutoConvertKey)
            )
            if (isFromOtherAppend) return null

            const docChanged = transactions.some(tr => tr.docChanged)
            if (!docChanged) return null

            const { schema, tr } = newState
            const imageNodeType = schema.nodes.image
            if (!imageNodeType) return null

            const replacements: {
              from: number
              to: number
              node: ProseMirrorNode
            }[] = []

            newState.doc.descendants((node, pos) => {
              if (!node.isText) return

              const text = node.text
              if (!text) return

              IMAGE_PATTERN.lastIndex = 0
              let m
              while ((m = IMAGE_PATTERN.exec(text)) !== null) {
                const alt = m[1]
                const src = m[2]
                if (!src.trim()) continue

                const imageNode = imageNodeType.create({ src, alt })
                replacements.push({
                  from: pos + m.index,
                  to: pos + m.index + m[0].length,
                  node: imageNode,
                })
              }
            })

            if (replacements.length === 0) return null

            // Sort in reverse order to avoid position shifts
            replacements.sort((a, b) => b.from - a.from)

            for (const { from, to, node } of replacements) {
              tr.replaceWith(from, to, node)
            }

            tr.setMeta(imageAutoConvertKey, true)
            tr.setMeta(appendTransactionKey, true)
            return tr
          } catch {
            return null
          }
        },
      }),
    ]
  },
})

export default ImageInputRule

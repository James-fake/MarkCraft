import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ImageView from './ImageView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number; align?: string }) => ReturnType
      setImageAlign: (align: 'left' | 'center' | 'right') => ReturnType
      setImageSize: (width: number, height?: number) => ReturnType
    }
  }
}

const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null, parseHTML: el => el.getAttribute('width') },
      height: { default: null, parseHTML: el => el.getAttribute('height') },
      // Internal attribute name is simple 'align' (no hyphen) for ProseMirror safety.
      // Its renderHTML maps to 'data-align' on the HTML element so the round-trip
      // (save→markdown→reload→html) preserves alignment info.
      align: {
        default: 'center',
        // data-align lives on the wrapper <div>, but parseHTML receives
        // the <img> element (because parseHTML selector is 'img[src]').
        // Walk up to the nearest ancestor with data-align.
        parseHTML: el => {
          const fromSelf = el.getAttribute('data-align')
          if (fromSelf) return fromSelf
          const ancestor = el.closest('[data-align]')
          return ancestor ? ancestor.getAttribute('data-align') || 'center' : 'center'
        },
        renderHTML: attrs => {
          const val = attrs.align || 'center'
          return { 'data-align': val }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // Read align value from what the attribute-level renderHTML produced.
    const align = HTMLAttributes['data-align'] || 'center'

    // Strip 'data-align' from restAttrs so it only appears on the outer div
    const { 'data-align': _da, ...restAttrs } = HTMLAttributes

    const style = `max-width: 100%; ${restAttrs.width ? `width: ${restAttrs.width}px;` : ''} ${restAttrs.height ? `height: ${restAttrs.height}px;` : ''}`
    return [
      'div',
      { 'data-align': align, style: `text-align: ${align}; margin: 8px 0;` },
      ['img', mergeAttributes(restAttrs, { style })],
    ]
  },

  addCommands() {
    return {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number; align?: string }) => ({ commands }) => {
        return commands.insertContent({
          type: 'image',
          attrs: options,
        })
      },
      setImageAlign: (align: 'left' | 'center' | 'right') => ({ commands }) => {
        return commands.updateAttributes('image', { align })
      },
      setImageSize: (width: number, height?: number) => ({ commands }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: updateAttributes 属性袋，同上游 Attributes 形态
        const attrs: Record<string, any> = { width }
        if (height !== undefined) attrs.height = height
        return commands.updateAttributes('image', attrs)
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})

export default ImageNode

import { Extension } from '@tiptap/core'

const HeadingId = Extension.create({
  name: 'headingId',

  addProseMirrorPlugins() {
    return []
  },

  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          id: {
            default: null,
            parseHTML: (el) => el.getAttribute('id'),
            renderHTML: (attrs) => {
              if (!attrs.id) return {}
              return { id: attrs.id }
            },
          },
        },
      },
    ]
  },
})

export default HeadingId

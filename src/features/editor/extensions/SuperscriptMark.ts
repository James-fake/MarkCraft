import Superscript from '@tiptap/extension-superscript'

const SuperscriptMark = Superscript.configure({
  HTMLAttributes: { class: 'superscript' },
})

export default SuperscriptMark

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CodeBlockView from './CodeBlockView'
import { getLowlightInstance } from './CodeHighlightConfig'

/**
 * Custom CodeBlock extension that extends CodeBlockLowlight
 * with a React NodeView featuring:
 * - Language dropdown selector (P1-10)
 * - Collapse/expand toggle (P1-9)
 */
const CodeBlockWithView = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, {
      stopEvent({ event }) {
        // Allow interaction with select/input elements inside the node view
        const target = event.target as HTMLElement
        if (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
          return true
        }
        return false
      },
    })
  },
}).configure({
  lowlight: getLowlightInstance(),
  HTMLAttributes: { class: 'tiptap-code-block' },
  exitOnTripleEnter: true,
  exitOnArrowDown: true,
  enableTabIndentation: true,
  tabSize: 2,
})

export default CodeBlockWithView

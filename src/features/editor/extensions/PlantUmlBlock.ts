import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import PlantUmlBlockView from './PlantUmlBlockView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    plantUmlBlock: {
      insertPlantUmlBlock: (code?: string) => ReturnType
    }
  }
}

export const DEFAULT_PLANTUML_CODE = `@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml`

/**
 * E3：PlantUML 图表块（编辑器路径）。
 * 结构完全对齐 MermaidBlock —— atom 节点 + data-code 属性 + React NodeView，
 * 保证与既有 mermaidBlock 在序列化、往返转换上的行为一致。
 */
const PlantUmlBlock = Node.create({
  name: 'plantUmlBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-code') || '',
        renderHTML: (attrs) => ({ 'data-code': attrs.code }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="plantUmlBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'plantUmlBlock' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlantUmlBlockView, {
      stopEvent({ event }) {
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true
        return false
      },
    })
  },

  addCommands() {
    return {
      insertPlantUmlBlock:
        (code = DEFAULT_PLANTUML_CODE) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: { code } })
        },
    }
  },
})

export default PlantUmlBlock

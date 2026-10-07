import { Node, mergeAttributes } from '@tiptap/core'

const DefinitionList = Node.create({
  name: 'definitionList',
  group: 'block',
  content: 'definitionItem+',
  parseHTML() {
    return [{ tag: 'dl' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['dl', mergeAttributes(HTMLAttributes), 0]
  },
})

const DefinitionItem = Node.create({
  name: 'definitionItem',
  group: 'block',
  content: 'definitionTerm definitionDescription',
  parseHTML() {
    return [{ tag: 'di' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['di', mergeAttributes(HTMLAttributes), 0]
  },
})

const DefinitionTerm = Node.create({
  name: 'definitionTerm',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'dt' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['dt', mergeAttributes(HTMLAttributes), 0]
  },
})

const DefinitionDescription = Node.create({
  name: 'definitionDescription',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'dd' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['dd', mergeAttributes(HTMLAttributes), 0]
  },
})

export { DefinitionList, DefinitionItem, DefinitionTerm, DefinitionDescription }
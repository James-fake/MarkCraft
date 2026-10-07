import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProsemirrorNode, Schema } from '@tiptap/pm/model'

const taskListAutoConvertKey = new PluginKey('taskListAutoConvert')

// Shared meta key — prevents recursive appendTransaction across plugins
const appendTransactionKey = 'appendTransactionSource'

function buildTaskItem(
  schema: Schema,
  listItem: ProsemirrorNode,
  checked: boolean,
  prefixLength: number
): ProsemirrorNode {
  const content: ProsemirrorNode[] = []

  listItem.forEach((child, _offset, _index) => {
    if (child.type.name === 'paragraph') {
      const paraChildren: ProsemirrorNode[] = []
      let prefixRemoved = false

      child.forEach((inline) => {
        if (inline.isText && !prefixRemoved) {
          const text = inline.text || ''
          if (text.length >= prefixLength && text.slice(0, prefixLength).match(/^\[(x| )\] /)) {
            const remaining = text.slice(prefixLength)
            if (remaining) {
              const marks = inline.marks
              paraChildren.push(schema.text(remaining, marks))
            }
            prefixRemoved = true
            return
          }
        }
        paraChildren.push(inline.copy(inline.content))
      })

      const paragraphType = schema.nodes.paragraph
      if (paragraphType) {
        content.push(paragraphType.create(null, paraChildren))
      }
    } else {
      content.push(child.copy(child.content))
    }
  })

  if (content.length === 0) {
    const paragraphType = schema.nodes.paragraph
    if (paragraphType) {
      content.push(paragraphType.create())
    }
  }

  const taskItemType = schema.nodes.taskItem
  if (!taskItemType) {
    return listItem
  }
  return taskItemType.create({ checked }, content)
}

const TaskListInputRule = Extension.create({
  name: 'taskListInputRule',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: taskListAutoConvertKey,
        appendTransaction(transactions, _oldState, newState) {
          const hasOwnChange = transactions.some(tr => tr.getMeta(taskListAutoConvertKey))
          if (hasOwnChange) return null

          // Skip if another appendTransaction plugin produced changes
          const isFromOtherAppend = transactions.some(
            tr => tr.getMeta(appendTransactionKey) && !tr.getMeta(taskListAutoConvertKey)
          )
          if (isFromOtherAppend) return null

          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null

          const { schema } = newState
          const replacements: { from: number; to: number; node: ProsemirrorNode }[] = []

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'bulletList') return

            let hasTaskItems = false
            const taskItems: ProsemirrorNode[] = []

            node.forEach((listItem) => {
              const text = listItem.textContent
              const match = text.match(/^\[(x| )\] /)
              const checked = match ? match[1] === 'x' : false
              if (match) hasTaskItems = true

              taskItems.push(
                buildTaskItem(schema, listItem, checked, match ? match[0].length : 0)
              )
            })

            if (hasTaskItems) {
              const taskListType = schema.nodes.taskList
              if (!taskListType) return
              const taskList = taskListType.create(null, taskItems)
              replacements.push({ from: pos, to: pos + node.nodeSize, node: taskList })
            }
          })

          if (replacements.length === 0) return null

          const tr = newState.tr
          for (let i = replacements.length - 1; i >= 0; i--) {
            const { from, to, node } = replacements[i]
            tr.replaceWith(from, to, node)
          }
          tr.setMeta(taskListAutoConvertKey, true)
          tr.setMeta(appendTransactionKey, true)
          return tr
        },
      }),
    ]
  },
})

export default TaskListInputRule
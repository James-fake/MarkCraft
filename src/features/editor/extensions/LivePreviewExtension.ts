import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const livePreviewKey = new PluginKey('livePreview')

export interface LivePreviewState {
  activeNodePos: number | null
  enabled: boolean
}

/**
 * 将 Tiptap 表格节点转为 Markdown 表格源码
 */
function tableNodeToMarkdown(tableNode: ProseMirrorNode): string {
  const rows: string[][] = []

  tableNode.forEach((row: ProseMirrorNode) => {
    const cells: string[] = []
    row.forEach((cell: ProseMirrorNode) => {
      let cellText = ''
      cell.forEach((inline: ProseMirrorNode) => {
        if (inline.isText) cellText += inline.text
        else if (inline.type.name === 'paragraph') {
          inline.forEach((child: ProseMirrorNode) => {
            if (child.isText) cellText += child.text
          })
        }
      })
      cells.push(cellText.trim() || ' ')
    })
    rows.push(cells)
  })

  if (rows.length === 0) return ''

  const colCount = rows[0].length
  const lines: string[] = []

  // 表头
  lines.push('| ' + rows[0].join(' | ') + ' |')
  // 分隔行
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
  // 数据行
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].join(' | ') + ' |')
  }

  return lines.join('\n')
}

/**
 * LivePreviewExtension — 光标位置感知渲染
 *
 * 始终注册到编辑器，通过 enabled 状态动态控制是否添加装饰。
 * enabled 状态可通过 setLivePreviewEnabled command 切换，
 * 切换会触发 transaction，让 ProseMirror 重新计算 decorations。
 *
 * 覆盖节点：heading / blockquote / codeBlock / mathBlock /
 *           bulletList / orderedList / taskList / listItem / taskItem /
 *           table / mermaidBlock
 *
 * 性能优化：仅处理活跃节点及其兄弟节点，避免全量遍历
 */
const LivePreviewExtension = Extension.create({
  name: 'livePreview',

  addOptions() {
    return {
      enabled: false,
    }
  },

  addCommands() {
    return {
      setLivePreviewEnabled:
        (enabled: boolean) =>
        ({ tr }) => {
          tr.setMeta(livePreviewKey, { enabled })
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const initialEnabled = this.options.enabled

    // 需要特殊渲染的节点类型
    const renderableTypes = new Set([
      'heading',
      'blockquote',
      'codeBlock',
      'mathBlock',
      'mermaidBlock',
      'table',
      'bulletList',
      'orderedList',
      'taskList',
      'listItem',
      'taskItem',
    ])

    return [
      new Plugin({
        key: livePreviewKey,
        state: {
          init: () => ({
            activeNodePos: null as number | null,
            enabled: initialEnabled,
          }),
          apply(tr, prev) {
            // 处理 enabled 切换
            const meta = tr.getMeta(livePreviewKey)
            if (meta && typeof meta.enabled === 'boolean') {
              return { ...prev, enabled: meta.enabled }
            }

            // 未启用时保持空状态
            if (!prev.enabled) return { ...prev, activeNodePos: null }

            // 无选区或文档变化，保持状态
            if (!tr.selectionSet && !tr.docChanged) return prev

            const { $head } = tr.selection

            // 找到光标所在的块级节点位置
            let activeNodePos: number | null = null
            for (let d = $head.depth; d > 0; d--) {
              const node = $head.node(d)
              if (node.isBlock && node.type.name !== 'doc') {
                activeNodePos = $head.before(d)
                break
              }
            }

            return { activeNodePos, enabled: prev.enabled }
          },
        },
        props: {
          decorations(state) {
            const lpState = livePreviewKey.getState(state) as LivePreviewState | undefined
            if (!lpState || !lpState.enabled) return DecorationSet.empty

            const { activeNodePos } = lpState

            const decorations: Decoration[] = []

            // 性能优化：使用 resolve 直接定位活跃节点的父节点，仅遍历兄弟节点
            if (activeNodePos !== null) {
              try {
                const $pos = state.doc.resolve(activeNodePos)
                const depth = $pos.depth
                if (depth > 0) {
                  const parentNode = $pos.node(depth)
                  const parentPos = $pos.before(depth)

                  parentNode.forEach((node: ProseMirrorNode, offset: number) => {
                    const pos = parentPos + offset + 1
                    processNode(node, pos, activeNodePos, decorations, state)
                  })
                }
              } catch {
                // fallback：全量遍历
                state.doc.descendants((node, pos) => {
                  processNode(node, pos, activeNodePos, decorations, state)
                  return node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'taskList'
                })
              }
            } else {
              // 无活跃节点时，为所有可渲染节点添加 lp-inactive
              state.doc.descendants((node, pos) => {
                if (!node.isBlock) return false
                if (renderableTypes.has(node.type.name)) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, { class: 'lp-inactive' })
                  )
                }
                return node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'taskList'
              })
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]

    function processNode(node: ProseMirrorNode, pos: number, activeNodePos: number | null, decorations: Decoration[], state: EditorState) {
      if (!node.isBlock) return

      const isActive = pos === activeNodePos
      const className = isActive ? 'lp-active' : 'lp-inactive'

      // 标题和引用
      if (node.type.name === 'heading' || node.type.name === 'blockquote') {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        )
        return
      }

      // 代码块
      if (node.type.name === 'codeBlock') {
        const lang = (node.attrs.language as string) || ''
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: className,
            'data-language': lang,
          })
        )
        if (isActive) {
          decorations.push(
            Decoration.widget(pos + 1, () => {
              const div = document.createElement('div')
              div.className = 'lp-code-fence lp-code-fence-open'
              div.contentEditable = 'false'
              div.textContent = '```' + (lang ? lang : '')
              return div
            }, { side: -1 })
          )
          decorations.push(
            Decoration.widget(pos + node.nodeSize - 1, () => {
              const div = document.createElement('div')
              div.className = 'lp-code-fence lp-code-fence-close'
              div.contentEditable = 'false'
              div.textContent = '```'
              return div
            }, { side: 1 })
          )
        }
        return
      }

      // 数学公式块
      if (node.type.name === 'mathBlock') {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        )
        if (isActive) {
          decorations.push(
            Decoration.widget(pos + 1, () => {
              const div = document.createElement('div')
              div.className = 'lp-math-fence lp-math-fence-open'
              div.contentEditable = 'false'
              div.textContent = '$$'
              return div
            }, { side: -1 })
          )
          decorations.push(
            Decoration.widget(pos + node.nodeSize - 1, () => {
              const div = document.createElement('div')
              div.className = 'lp-math-fence lp-math-fence-close'
              div.contentEditable = 'false'
              div.textContent = '$$'
              return div
            }, { side: 1 })
          )
        }
        return
      }

      // Mermaid 图表
      if (node.type.name === 'mermaidBlock') {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        )
        return
      }

      // 表格
      if (node.type.name === 'table') {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        )
        if (isActive) {
          const markdown = tableNodeToMarkdown(node)
          if (markdown) {
            decorations.push(
              Decoration.widget(pos + 1, () => {
                const pre = document.createElement('pre')
                pre.className = 'lp-table-source'
                pre.contentEditable = 'false'
                pre.textContent = markdown
                return pre
              }, { side: -1 })
            )
          }
        }
        return
      }

      // 列表项
      if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: className })
        )

        if (isActive) {
          let prefix = ''

          if (node.type.name === 'taskItem') {
            const checked = (node.attrs.checked as boolean) || false
            prefix = checked ? '- [x] ' : '- [ ] '
          } else if (node.type.name === 'listItem') {
            // 通过 resolve 获取父列表类型
            try {
              const $itemPos = state.doc.resolve(pos + 1)
              for (let d = $itemPos.depth; d > 0; d--) {
                const ancestor = $itemPos.node(d)
                if (ancestor.type.name === 'orderedList') {
                  // 计算序号
                  let index = 1
                  const startAttr = (ancestor.attrs.start as number) || 1
                  ancestor.forEach((child: ProseMirrorNode, _offset: number, i: number) => {
                    if (child === node) index = startAttr + i
                  })
                  prefix = `${index}. `
                  break
                } else if (ancestor.type.name === 'bulletList') {
                  prefix = '- '
                  break
                }
              }
            } catch {
              prefix = '- '
            }
          }

          if (prefix) {
            decorations.push(
              Decoration.widget(pos + 1, () => {
                const span = document.createElement('span')
                span.className = 'lp-prefix lp-list-prefix'
                span.contentEditable = 'false'
                span.textContent = prefix
                return span
              }, { side: -1 })
            )
          }
        }
        return
      }
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    livePreview: {
      setLivePreviewEnabled: (enabled: boolean) => ReturnType
    }
  }
}

export default LivePreviewExtension

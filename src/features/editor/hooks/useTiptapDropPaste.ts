import { useCallback } from 'react'
import type { EditorView } from '@tiptap/pm/view'
import type { Slice } from '@tiptap/pm/model'
import { useTiptapImageHandler } from './useTiptapImageHandler'

/**
 * 编辑器 drag/paste 处理编排（P5-1 自 TiptapEditor.tsx 拆出，逻辑逐字未动）：
 * 1. 文件拖入 → 在落点插入 WikiLink（优先 mark，命令表缺失时回退字面量语法）
 * 2. Shift+粘贴 → 纯文本插入
 * 3. 智能粘贴：剪贴板内容本身就是 [[wikiLink]] 时转为 mark 插入
 * 4. 其余回落到图片拖放/粘贴处理器
 */
export function useTiptapDropPaste(args: Parameters<typeof useTiptapImageHandler>[0]) {
  const { handleDrop: imageHandleDrop, handlePaste: imageHandlePaste } = useTiptapImageHandler(args)

  // Enhanced handleDrop: check for file drag from sidebar first, then fall through to image handler
  const handleDrop = useCallback((view: EditorView, event: DragEvent, slice: Slice, moved: boolean) => {
    // Check for file drag from sidebar (WikiLink creation)
    const fileData = event.dataTransfer?.getData('application/markcraft-file')
    if (fileData) {
      try {
        const { fileName } = JSON.parse(fileData)
        const linkName = fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName
        const coord = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (coord) {
          const { pos } = coord
          const markType = view.state.schema.marks.wikiLink
          if (markType) {
            const tr = view.state.tr.insertText(linkName, pos)
            tr.addMark(pos, pos + linkName.length, markType.create({ target: linkName }))
            view.dispatch(tr)
          } else {
            view.dispatch(view.state.tr.insertText(`[[${linkName}]]`, pos))
          }
        }
      } catch {}
      return true
    }
    // Fall through to image handler
    return imageHandleDrop(view, event, slice, moved)
  }, [imageHandleDrop])

  const handlePaste = useCallback((view: EditorView, event: ClipboardEvent, slice: Slice) => {
    const shiftKey = (event as unknown as { shiftKey?: boolean }).shiftKey
    if (shiftKey) {
      event.preventDefault()
      const text = event.clipboardData?.getData('text/plain') || ''
      view.dispatch(view.state.tr.insertText(text))
      return true
    }

    // F3: Smart paste — detect WikiLink format and insert as WikiLink mark
    const plainText = event.clipboardData?.getData('text/plain')
    if (plainText) {
      // 不能用 `m` 标志：那会让 ^/$ 匹配行边界，多行剪贴板只要含一行 `[[Note]]`
      // 就整体劫持粘贴、丢弃其余文本。先 trim，再要求「整段内容就是单个 WikiLink」。
      const wikiLinkMatch = plainText.trim().match(/^\[\[([^\]]+)\]\]$/)
      if (wikiLinkMatch) {
        const target = wikiLinkMatch[1]
        const { from } = view.state.selection
        const markType = view.state.schema.marks.wikiLink
        if (markType) {
          event.preventDefault()
          const tr = view.state.tr.insertText(target, from)
          tr.addMark(from, from + target.length, markType.create({ target }))
          view.dispatch(tr)
          return true
        }
      }
    }

    return imageHandlePaste(view, event, slice)
  }, [imageHandlePaste])

  return { handleDrop, handlePaste }
}

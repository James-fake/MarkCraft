import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/react'
import { markdownToHtml } from './markdownConvert'
import { imageStore } from '@core/storage/imageStore'

/**
 * 把「最终 markdown 文本偏移」（如模板 {{cursor}} 落点）近似映射到 ProseMirror 文档位置。
 *
 * 做法：把前缀 markdown 走与编辑器**同一条** md→html→PM 解析管线
 * （markdownConvert.markdownToHtml 含方言预处理，与 useTiptapContentSync 一致），
 * 用前缀 slice 的 content.size 推断位置：
 * - 前缀以换行结尾 → 最后一个块已闭合，位置 = size（下一块内容起点）
 * - 前缀停在块中间 → 最后一个块处于打开态，位置 = size - 1（扣掉闭合 token）
 * 块边界存在 ±1 字符的固有模糊，对「光标落点」场景足够。
 *
 * @returns PM 文档位置（已夹取到 [0, doc.content.size]）；解析失败返回 -1，调用方自行回退
 */
export function markdownOffsetToPmPos(editor: Editor, fullMd: string, offset: number): number {
  const ed = editor
  if (ed.isDestroyed) return -1
  const clamped = Math.max(0, Math.min(offset, fullMd.length))
  const prefix = fullMd.slice(0, clamped)
  try {
    const div = document.createElement('div')
    div.innerHTML = markdownToHtml(prefix, imageStore)
    const slice = ProseMirrorDOMParser.fromSchema(ed.schema).parseSlice(div)
    const size = slice.content.size
    if (size === 0) return 0
    const raw = /\n$/.test(prefix) ? size : size - 1
    const docSize = ed.state.doc.content.size
    return Math.max(0, Math.min(raw, docSize))
  } catch {
    return -1
  }
}

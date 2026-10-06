import mammoth from 'mammoth'
import { textFromStorage } from '@core/storage/imageStore'
import { createTurndown } from './gfmTurndown'

/**
 * docx → Markdown。
 *
 * 管线：mammoth（docx→HTML，图片默认内联为 base64）→ GFM turndown（HTML→Markdown，含表格）
 *      → textFromStorage（`data:` 图片 → `image:<id>` 占位符）。
 *
 * 图片存储（#4 决策）：复用应用既有的 `image:` 占位符管线（与粘贴 / 拖拽图片完全一致）——
 *   - 渲染期由 `getBase64Image` 解析，正常显示；
 *   - 保存时经 `textToStorage` 内联 base64 随笔记持久化；
 *   - **导出时由 backupService 落盘为 `assets/<id>.<ext>` 并以相对路径引用**，即桌面端布局。
 * 故无需为 docx 图片另建存储层，天然与既有导出/桌面化路径对齐。
 */
export async function importDocxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  const markdown = createTurndown().turndown(value)
  return textFromStorage(markdown)
}

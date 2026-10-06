import { textFromStorage } from '@core/storage/imageStore'
import { createTurndown } from './gfmTurndown'

/**
 * HTML → Markdown（含 GFM 表格）。
 * 内联 base64 图片同样经 `textFromStorage` 转为 `image:<id>` 占位符，与 docx 导入一致。
 */
export function importHtmlToMarkdown(html: string): string {
  const markdown = createTurndown().turndown(html)
  return textFromStorage(markdown)
}

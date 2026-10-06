import { importDocxToMarkdown } from './importDocx'
import { importHtmlToMarkdown } from './importHtml'

/**
 * 受支持的导入扩展名（**单一来源**）。
 * 「打开文件」的 <input accept> 与拖拽白名单都必须从这里取，避免两处硬编码再次不一致。
 */
export const SUPPORTED_EXT = ['md', 'markdown', 'txt', 'docx', 'html', 'htm'] as const
export type SupportedExt = (typeof SUPPORTED_EXT)[number]

/** 供 <input type="file" accept> 使用的字符串 */
export const SUPPORTED_ACCEPT = SUPPORTED_EXT.map((e) => `.${e}`).join(',')

export interface ImportedFile {
  /** 去掉扩展名的文件基名（供新建文件命名与同名去重） */
  baseName: string
  /** MarkCraft 规范内容（Markdown） */
  content: string
}

/** 取小写扩展名（不含点）；无扩展名返回 '' */
export function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** 文件名是否为受支持格式 */
export function isSupportedFile(name: string): boolean {
  return (SUPPORTED_EXT as readonly string[]).includes(getExtension(name))
}

/** 去掉扩展名，得到基名 */
export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/**
 * 统一导入入口：把受支持的文件转成 Markdown 内容。
 *
 * 所有「打开文件 / 拖拽导入」路径都必须经此，保证：
 * - 支持的格式集合单一来源（SUPPORTED_EXT）；
 * - 转换逻辑（docx→mammoth、html→turndown）只此一处，后续增强不会漏改某条路径。
 *
 * 注：MarkCraft 为 Markdown-first（WYSIWYG 亦以 Markdown 为源），故导入统一产出
 * 高质量 Markdown；编辑模式只决定呈现，不改变存储。
 */
export async function importFileToMarkdown(file: File): Promise<ImportedFile> {
  const ext = getExtension(file.name)
  const baseName = stripExtension(file.name)
  switch (ext) {
    case 'md':
    case 'markdown':
    case 'txt':
      return { baseName, content: await file.text() }
    case 'docx':
      return { baseName, content: await importDocxToMarkdown(file) }
    case 'html':
    case 'htm':
      return { baseName, content: importHtmlToMarkdown(await file.text()) }
    default:
      throw new Error(`不支持的格式：.${ext}`)
  }
}

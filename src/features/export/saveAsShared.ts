import type { PdfExportOptions } from './exportUtils'
import type { SaveTarget } from '@platform'

/** P5-4 自 SaveAsModal.tsx 下沉的常量与类型（逐字未动），SaveAsModal 与子组件共用 */

export const FORMAT_OPTIONS = [
  { value: 'md', label: 'Markdown (.md)' },
  { value: 'html', label: 'HTML (.html)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'latex', label: 'LaTeX (.tex)' },
  { value: 'epub', label: 'EPUB (.epub)' },
  { value: 'rst', label: 'reStructuredText (.rst)' },
  { value: 'mediawiki', label: 'MediaWiki (.wiki)' },
  { value: 'opml', label: 'OPML (.opml)' },
  { value: 'txt', label: 'Plain Text (.txt)' },
  { value: 'png', label: 'PNG (.png)' },
  { value: 'jpeg', label: 'JPEG (.jpg)' },
]

export const MIME_TYPES: Record<string, string> = {
  md: 'text/markdown',
  html: 'text/html',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  latex: 'application/x-latex',
  epub: 'application/epub+zip',
  rst: 'text/x-rst',
  mediawiki: 'text/x-mediawiki',
  opml: 'text/x-opml+xml',
  txt: 'text/plain',
  png: 'image/png',
  jpeg: 'image/jpeg',
}

export const STYLE_SUPPORTED_FORMATS = new Set(['html', 'pdf'])

export type SaveLocationState =
  | { type: 'none' }
  /**
   * P1 起不再直接持有 `FileSystemFileHandle` / `FileSystemDirectoryHandle`：
   * 桌面环境下没有这些对象（拿到的是原生路径），故统一用平台抽象层的 `SaveTarget`
   * （语义即「能写入」，两种环境各自实现）。`target.kind` 区分文件 / 目录。
   */
  | { type: 'target'; target: SaveTarget }

export interface SaveAsModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  defaultFileName: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

/** 供类型检查：PdfExportOptions 在本模块被引用以保持与 exportUtils 的类型关联 */
export type { PdfExportOptions }

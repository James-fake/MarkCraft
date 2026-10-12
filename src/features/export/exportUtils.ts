import { platform } from '@platform'

// Re-export from split modules for backward compatibility
export { generateMarkdownBlob } from './utils/exportMarkdown'
export { generateHtmlBlob, EXPORT_CSS } from './utils/exportHtml'
export { generatePdf } from './utils/exportPdf'
export type { PdfExportOptions, PdfExportMessages } from './utils/exportPdf'
export { generateDocxBlob } from './utils/exportDocx'
export { generateLatexBlob } from './utils/exportLatex'
export { generateEpubBlob } from './utils/exportEpub'
export { generateRstBlob } from './utils/exportRst'
export { generateMediaWikiBlob } from './utils/exportMediaWiki'
export { generateOpmlBlob } from './utils/exportOpml'
export { generatePlainTextBlob } from './utils/exportPlainText'
export { getExportStylePresets, getCustomStyles, saveCustomStyle, deleteCustomStyle, getStyleCss, importCssFile } from './exportStyleManager'
export type { ExportStylePreset } from './exportStyleManager'
export { exportToImage, downloadImage } from './utils/exportImage'
export type { ExportImageOptions } from './utils/exportImage'
// 独立 leaf 模块 re-export，保留对外 API 同时打破 barrel 循环依赖
export { downloadBlob } from './utils/downloadBlob'

export function isFileSystemAccessSupported(): boolean {
  return platform.canPickFiles();
}

export const FORMAT_EXTENSIONS: Record<string, string> = {
  md: '.md',
  html: '.html',
  pdf: '.pdf',
  docx: '.docx',
  latex: '.tex',
  epub: '.epub',
  png: '.png',
  jpeg: '.jpg',
  rst: '.rst',
  mediawiki: '.wiki',
  opml: '.opml',
  txt: '.txt',
};

export const FORMAT_MIME_TYPES: Record<string, string> = {
  md: 'text/markdown',
  html: 'text/html',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  latex: 'application/x-latex',
  epub: 'application/epub+zip',
  png: 'image/png',
  jpeg: 'image/jpeg',
  rst: 'text/x-rst',
  mediawiki: 'text/x-mediawiki',
  opml: 'text/x-opml+xml',
  txt: 'text/plain',
};

import { useState, useCallback, useEffect, useRef } from 'react'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import {
  generateMarkdownBlob,
  generateHtmlBlob,
  generatePdf,
  generateDocxBlob,
  generateLatexBlob,
  generateEpubBlob,
  generateRstBlob,
  generateMediaWikiBlob,
  generateOpmlBlob,
  generatePlainTextBlob,
  exportToImage,
  downloadBlob,
  isFileSystemAccessSupported,
  FORMAT_EXTENSIONS,
  getExportStylePresets,
  getStyleCss,
  saveCustomStyle,
  deleteCustomStyle,
  importCssFile,
} from './exportUtils'
import type { PdfExportOptions } from './exportUtils'
import type { ExportStylePreset } from './exportStyleManager'
import { useLanguage } from '../../stores/LanguageStore'
import { AuroraSelect } from '@components/ui/AuroraSelect'

interface SaveAsModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  defaultFileName: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const FORMAT_OPTIONS = [
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

const MIME_TYPES: Record<string, string> = {
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

const STYLE_SUPPORTED_FORMATS = new Set(['html', 'pdf'])

type SaveLocationState =
  | { type: 'none' }
  | { type: 'file'; handle: FileSystemFileHandle; name: string }
  | { type: 'directory'; handle: FileSystemDirectoryHandle; name: string }

export default function SaveAsModal({
  isOpen,
  onClose,
  content,
  defaultFileName,
  onSuccess,
  onError,
}: SaveAsModalProps) {
  const [fileName, setFileName] = useState(defaultFileName)
  const [format, setFormat] = useState('md')
  const [imageScale, setImageScale] = useState(2)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveLocation, setSaveLocation] = useState<SaveLocationState>({ type: 'none' })
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [exportStyleId, setExportStyleId] = useState('default')
  const [stylePresets, setStylePresets] = useState<ExportStylePreset[]>([])
  const [isStyleEditorOpen, setIsStyleEditorOpen] = useState(false)
  const [editingStyle, setEditingStyle] = useState<ExportStylePreset | null>(null)
  const [pdfIncludeToc, setPdfIncludeToc] = useState(false)
  const [pdfIncludePageNumbers, setPdfIncludePageNumbers] = useState(false)
  const [pdfHeaderText, setPdfHeaderText] = useState('')
  const [pdfFooterText, setPdfFooterText] = useState('')
  const [htmlTitle, setHtmlTitle] = useState('')
  const [htmlAuthor, setHtmlAuthor] = useState('')
  const [htmlDate, setHtmlDate] = useState('')
  const [htmlIncludeToc, setHtmlIncludeToc] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const fsAccessSupported = isFileSystemAccessSupported()

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultFileName)
      setFormat('md')
      setImageScale(2)
      setError(null)
      setIsSaving(false)
      setSaveLocation({ type: 'none' })
      setExportStyleId('default')
      setPdfIncludeToc(false)
      setPdfIncludePageNumbers(false)
      setPdfHeaderText('')
      setPdfFooterText('')
      setHtmlTitle('')
      setHtmlAuthor('')
      setHtmlDate('')
      setHtmlIncludeToc(false)
      setStylePresets(getExportStylePresets())
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, defaultFileName])

  const fullFileName = `${fileName.replace(/\.(md|html|pdf|docx|tex|epub|rst|wiki|opml|txt|png|jpg|jpeg)$/i, '')}${FORMAT_EXTENSIONS[format]}`

  const locationDisplayText = (() => {
    if (!fsAccessSupported) return t.saveAs.browserDefaultLocation
    switch (saveLocation.type) {
      case 'file':
        return saveLocation.name
      case 'directory':
        return `${saveLocation.name}/`
      default:
        return t.saveAs.notSelected
    }
  })()

  const handleSelectFileLocation = useCallback(async () => {
    if (!fsAccessSupported) return

    setIsSelectingLocation(true)
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fullFileName,
        types: [{
          description: FORMAT_OPTIONS.find(f => f.value === format)?.label || 'File',
          accept: { [MIME_TYPES[format]]: [FORMAT_EXTENSIONS[format]] },
        }],
      })

      setSaveLocation({ type: 'file', handle, name: handle.name })
      const pickedName = handle.name
      const ext = FORMAT_EXTENSIONS[format]
      if (pickedName.endsWith(ext)) {
        setFileName(pickedName.slice(0, -ext.length))
      }
      setError(null)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name !== 'AbortError') {
        setError(`${t.saveAs.selectFailed}: ${err.message || t.saveAs.saveFailed}`)
      }
    } finally {
      setIsSelectingLocation(false)
    }
  }, [fsAccessSupported, fullFileName, format])

  const handleSelectDirectory = useCallback(async () => {
    if (!fsAccessSupported) return

    setIsSelectingLocation(true)
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setSaveLocation({ type: 'directory', handle: dirHandle, name: dirHandle.name })
      setError(null)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name !== 'AbortError') {
        setError(`${t.saveAs.selectFolderFailed}: ${err.message || t.saveAs.saveFailed}`)
      }
    } finally {
      setIsSelectingLocation(false)
    }
  }, [fsAccessSupported])

  const getCustomCss = useCallback((): string | undefined => {
    if (exportStyleId === 'default') return undefined
    return getStyleCss(exportStyleId)
  }, [exportStyleId])

  const getPdfOptions = useCallback((): PdfExportOptions => ({
    includeToc: pdfIncludeToc,
    includePageNumbers: pdfIncludePageNumbers,
    headerText: pdfHeaderText || undefined,
    footerText: pdfFooterText || undefined,
  }), [pdfIncludeToc, pdfIncludePageNumbers, pdfHeaderText, pdfFooterText])

  const generateBlob = useCallback(async (fmt: string, mdContent: string): Promise<Blob> => {
    const customCss = getCustomCss()
    switch (fmt) {
      case 'md': return generateMarkdownBlob(mdContent)
      case 'html': return generateHtmlBlob(mdContent, customCss, {
        title: htmlTitle,
        author: htmlAuthor,
        date: htmlDate,
        toc: htmlIncludeToc,
      })
      case 'docx': return generateDocxBlob(mdContent)
      case 'latex': return generateLatexBlob(mdContent)
      case 'epub': return generateEpubBlob(mdContent)
      case 'rst': return generateRstBlob(mdContent)
      case 'mediawiki': return generateMediaWikiBlob(mdContent)
      case 'opml': return generateOpmlBlob(mdContent)
      case 'txt': return generatePlainTextBlob(mdContent)
      case 'png': return exportToImage(mdContent, { format: 'png', scale: imageScale })
      case 'jpeg': return exportToImage(mdContent, { format: 'jpeg', scale: imageScale })
      default: return generateMarkdownBlob(mdContent)
    }
  }, [getCustomCss, imageScale, htmlTitle, htmlAuthor, htmlDate, htmlIncludeToc])

  const handleSave = useCallback(async () => {
    if (!fileName.trim()) {
      setError(t.saveAs.enterFileName)
      return
    }

    setIsSaving(true)
    setError(null)

    // M8: Sanitize file name to prevent path traversal
    const cleanFileName = fileName.replace(/[/\\:*?"<>|]/g, '_').replace(/\.\./g, '').replace(/\.(md|html|pdf|docx|tex|epub|rst|wiki|opml|txt|png|jpg|jpeg)$/i, '')
    const fullOutputName = `${cleanFileName}${FORMAT_EXTENSIONS[format]}`
    const customCss = getCustomCss()
    const pdfOptions = format === 'pdf' ? getPdfOptions() : undefined

    try {
      // 统一生成真实文件 Blob：PDF 现在也返回真实 PDF Blob（而非仅弹打印框），
      // 因此所有格式都走同一落盘/下载路径，避免 File System Access 模式下写入 0KB 占位文件。
      const blob = format === 'pdf'
        ? await generatePdf(content, fullOutputName, t.saveAs.popupBlocked, customCss, pdfOptions)
        : await generateBlob(format, content)

      if (saveLocation.type === 'file') {
        // File System Access：写入所选具体文件（先生成真实内容再落盘）
        const writable = await saveLocation.handle.createWritable()
        await writable.write(blob)
        await writable.close()
        onSuccess(t.saveAs.savedAs.replace('{name}', saveLocation.name))
        onClose()
      } else if (saveLocation.type === 'directory') {
        const fileHandle = await saveLocation.handle.getFileHandle(fullOutputName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        onSuccess(t.saveAs.savedTo.replace('{name}', `${saveLocation.name}/${fullOutputName}`))
        onClose()
      } else {
        // 浏览器模式：下载真实文件
        downloadBlob(blob, fullOutputName)
        onSuccess(t.saveAs.downloadedAs.replace('{name}', fullOutputName))
        onClose()
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsSaving(false)
        return
      }
      const msg = err instanceof Error ? err.message : t.saveAs.saveFailed
      setError(`${t.saveAs.saveFailed}: ${msg}`)
        onError(`${t.saveAs.saveFailed}: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }, [fileName, format, content, saveLocation, onSuccess, onError, onClose, generateBlob, getCustomCss, getPdfOptions])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }, [onClose, handleSave])

  const handleOpenStyleEditor = useCallback(() => {
    setEditingStyle(null)
    setIsStyleEditorOpen(true)
  }, [])

  const handleEditStyle = useCallback((style: ExportStylePreset) => {
    setEditingStyle({ ...style })
    setIsStyleEditorOpen(true)
  }, [])

  const { confirm } = useConfirm()
  const handleDeleteStyle = useCallback(async (id: string) => {
    if (await confirm({ message: t.saveAs.deleteStyleConfirm, variant: 'danger' })) {
      deleteCustomStyle(id)
      setStylePresets(getExportStylePresets())
      if (exportStyleId === id) {
        setExportStyleId('default')
      }
    }
  }, [exportStyleId])

  const handleSaveStyle = useCallback((style: ExportStylePreset) => {
    saveCustomStyle(style)
    setStylePresets(getExportStylePresets())
    setIsStyleEditorOpen(false)
    setEditingStyle(null)
  }, [])

  const handleImportCss = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.css'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const cssText = reader.result as string
          const newStyle = importCssFile(cssText, file.name.replace(/\.css$/i, ''))
          saveCustomStyle(newStyle)
          setStylePresets(getExportStylePresets())
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [])

  if (!isOpen) return null

  const showStyleSelector = STYLE_SUPPORTED_FORMATS.has(format)
  const builtInPresets = stylePresets.filter(s => s.isBuiltIn)
  const customPresets = stylePresets.filter(s => !s.isBuiltIn)

  return (
    <div
      className="save-as-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div className="save-as-modal" role="dialog" aria-modal="true" aria-label={t.saveAs.title}>
        <div className="save-as-header">
          <h3 className="save-as-title">{t.saveAs.title}</h3>
          <button
            onClick={onClose}
            className="save-as-close-btn"
            aria-label={t.saveAs.close}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="save-as-body">
          <div className="save-as-field">
            <label className="save-as-label" htmlFor="save-filename">
              {t.saveAs.fileName}
            </label>
            <input
              ref={inputRef}
              id="save-filename"
              type="text"
              value={fileName}
              onChange={(e) => { setFileName(e.target.value); setError(null) }}
              className="save-as-input"
              placeholder={t.saveAs.fileNamePlaceholder}
              autoComplete="off"
            />
          </div>

          <div className="save-as-field">
            <label className="save-as-label" htmlFor="save-format">
              {t.saveAs.saveFormat}
            </label>
            <AuroraSelect
              id="save-format"
              ariaLabel={t.saveAs.saveFormat}
              value={format}
              onChange={(v) => {
                setFormat(v)
                setSaveLocation({ type: 'none' })
              }}
              className="save-as-select"
              options={FORMAT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
            />
          </div>

          {(format === 'png' || format === 'jpeg') && (
            <div className="save-as-field">
              <label className="save-as-label" htmlFor="save-image-scale">
                {t.saveAs.imageScale || 'Resolution'}
              </label>
              <div className="save-as-scale-row">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`save-as-scale-btn ${imageScale === s ? 'save-as-scale-btn-active' : ''}`}
                    onClick={() => setImageScale(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {format === 'pdf' && (
            <div className="save-as-field">
              <label className="save-as-label">{t.saveAs.pdfOptions || 'PDF Options'}</label>
              <div className="save-as-pdf-options">
                <label className="save-as-checkbox-label">
                  <input
                    type="checkbox"
                    checked={pdfIncludeToc}
                    onChange={(e) => setPdfIncludeToc(e.target.checked)}
                  />
                  <span>{t.saveAs.includeToc || 'Include Table of Contents'}</span>
                </label>
                <label className="save-as-checkbox-label">
                  <input
                    type="checkbox"
                    checked={pdfIncludePageNumbers}
                    onChange={(e) => setPdfIncludePageNumbers(e.target.checked)}
                  />
                  <span>{t.saveAs.includePageNumbers || 'Include Page Numbers'}</span>
                </label>
                <div className="save-as-pdf-text-input">
                  <label className="save-as-sub-label" htmlFor="pdf-header-text">{t.saveAs.headerText || 'Header Text'}</label>
                  <input
                    id="pdf-header-text"
                    type="text"
                    value={pdfHeaderText}
                    onChange={(e) => setPdfHeaderText(e.target.value)}
                    className="save-as-input"
                    placeholder={t.saveAs.headerTextPlaceholder || 'Optional header text'}
                    autoComplete="off"
                  />
                </div>
                <div className="save-as-pdf-text-input">
                  <label className="save-as-sub-label" htmlFor="pdf-footer-text">{t.saveAs.footerText || 'Footer Text'}</label>
                  <input
                    id="pdf-footer-text"
                    type="text"
                    value={pdfFooterText}
                    onChange={(e) => setPdfFooterText(e.target.value)}
                    className="save-as-input"
                    placeholder={t.saveAs.footerTextPlaceholder || 'Optional footer text'}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}

          {format === 'html' && (
            <div className="save-as-field">
              <label className="save-as-label">{t.saveAs.htmlOptions || 'HTML 模板'}</label>
              <div className="save-as-pdf-options">
                <div className="save-as-pdf-text-input">
                  <label className="save-as-sub-label" htmlFor="html-title">{t.saveAs.docTitle || '标题'}</label>
                  <input
                    id="html-title"
                    type="text"
                    value={htmlTitle}
                    onChange={(e) => setHtmlTitle(e.target.value)}
                    className="save-as-input"
                    placeholder={t.saveAs.titlePlaceholder || '文档标题'}
                    autoComplete="off"
                  />
                </div>
                <div className="save-as-pdf-text-input">
                  <label className="save-as-sub-label" htmlFor="html-author">{t.saveAs.author || '作者'}</label>
                  <input
                    id="html-author"
                    type="text"
                    value={htmlAuthor}
                    onChange={(e) => setHtmlAuthor(e.target.value)}
                    className="save-as-input"
                    placeholder={t.saveAs.authorPlaceholder || '可选'}
                    autoComplete="off"
                  />
                </div>
                <div className="save-as-pdf-text-input">
                  <label className="save-as-sub-label" htmlFor="html-date">{t.saveAs.date || '日期'}</label>
                  <input
                    id="html-date"
                    type="text"
                    value={htmlDate}
                    onChange={(e) => setHtmlDate(e.target.value)}
                    className="save-as-input"
                    placeholder={t.saveAs.datePlaceholder || 'YYYY-MM-DD'}
                    autoComplete="off"
                  />
                </div>
                <label className="save-as-checkbox-label">
                  <input
                    type="checkbox"
                    checked={htmlIncludeToc}
                    onChange={(e) => setHtmlIncludeToc(e.target.checked)}
                  />
                  <span>{t.saveAs.includeToc || '包含目录'}</span>
                </label>
              </div>
            </div>
          )}

          {showStyleSelector && (
            <div className="save-as-field">
              <div className="save-as-style-header">
                <label className="save-as-label" htmlFor="save-export-style">
                  {t.saveAs.exportStyle}
                </label>
                <button
                  onClick={handleOpenStyleEditor}
                  className="save-as-manage-style-btn"
                  type="button"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t.saveAs.manageStyles}</span>
                </button>
              </div>
              <AuroraSelect
                id="save-export-style"
                ariaLabel={t.saveAs.exportStyle}
                value={exportStyleId}
                onChange={(v) => setExportStyleId(v)}
                className="save-as-select"
                options={[
                  ...builtInPresets.map(preset => ({ value: preset.id, label: preset.name, groupLabel: t.saveAs.builtInPresets })),
                  ...(customPresets.length > 0
                    ? customPresets.map(preset => ({ value: preset.id, label: preset.name, groupLabel: t.saveAs.customStyles }))
                    : []),
                ]}
              />
            </div>
          )}

          {fsAccessSupported && (
            <div className="save-as-field">
              <label className="save-as-label">
                {t.saveAs.saveLocation}
              </label>
              <div className="save-as-location-row">
                <div className="save-as-location-display" title={locationDisplayText}>
                  {saveLocation.type === 'directory' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--link-color)', opacity: 0.7 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  )}
                  {saveLocation.type === 'file' && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--link-color)', opacity: 0.7 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span className={`save-as-location-text ${saveLocation.type === 'none' ? 'save-as-location-placeholder' : ''}`}>
                    {locationDisplayText}
                  </span>
                </div>
                <div className="save-as-location-actions">
                  <button
                    onClick={handleSelectFileLocation}
                    className="save-as-location-btn"
                    disabled={isSelectingLocation || isSaving}
                    title={t.saveAs.selectFullPath}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{t.saveAs.selectFile}</span>
                  </button>
                  <button
                    onClick={handleSelectDirectory}
                    className="save-as-location-btn"
                    disabled={isSelectingLocation || isSaving}
                    title={t.saveAs.selectFolderPath}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{t.saveAs.selectFolder}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="save-as-preview-name">
            <span className="save-as-preview-label">{t.saveAs.willSaveAs}</span>
            <span className="save-as-preview-value">{fullFileName}</span>
          </div>

          {!fsAccessSupported && (
            <div className="save-as-compat-hint">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t.saveAs.browserNotSupported}</span>
            </div>
          )}

          {error && (
            <div className="save-as-error">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="save-as-footer">
          <button
            onClick={onClose}
            className="save-as-btn save-as-btn-cancel"
            disabled={isSaving}
          >
            {t.saveAs.cancel}
          </button>
          <button
            onClick={handleSave}
            className="save-as-btn save-as-btn-confirm"
            disabled={isSaving || !fileName.trim()}
          >
            {isSaving ? (
              <span className="save-as-saving">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t.saveAs.saving}
              </span>
            ) : t.saveAs.save}
          </button>
        </div>
      </div>

      {/* Style Editor Dialog */}
      {isStyleEditorOpen && (
        <StyleEditorDialog
          editingStyle={editingStyle}
          customPresets={customPresets}
          onSave={handleSaveStyle}
          onDelete={handleDeleteStyle}
          onEdit={handleEditStyle}
          onImport={handleImportCss}
          onClose={() => { setIsStyleEditorOpen(false); setEditingStyle(null) }}
        />
      )}
    </div>
  )
}

interface StyleEditorDialogProps {
  editingStyle: ExportStylePreset | null
  customPresets: ExportStylePreset[]
  onSave: (style: ExportStylePreset) => void
  onDelete: (id: string) => void
  onEdit: (style: ExportStylePreset) => void
  onImport: () => void
  onClose: () => void
}

function StyleEditorDialog({
  editingStyle,
  customPresets,
  onSave,
  onDelete,
  onEdit,
  onImport,
  onClose,
}: StyleEditorDialogProps) {
  const { t } = useLanguage()
  const [styleName, setStyleName] = useState(editingStyle?.name || '')
  const [styleCss, setStyleCss] = useState(editingStyle?.css || '')
  const isEditing = editingStyle !== null

  const handleSave = () => {
    if (!styleName.trim() || !styleCss.trim()) return
    onSave({
      id: editingStyle?.id || `custom_${Date.now()}`,
      name: styleName.trim(),
      description: '自定义样式',
      css: styleCss,
      isBuiltIn: false,
    })
  }

  return (
    <div className="save-as-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="save-as-modal save-as-style-editor-modal" role="dialog" aria-modal="true" aria-label={t.saveAs.styleEditor}>
        <div className="save-as-header">
          <h3 className="save-as-title">{isEditing ? t.saveAs.editStyle : t.saveAs.styleEditor}</h3>
          <button onClick={onClose} className="save-as-close-btn" aria-label={t.saveAs.close}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="save-as-body">
          <div className="save-as-field">
            <label className="save-as-label" htmlFor="style-name">{t.saveAs.styleName}</label>
            <input
              id="style-name"
              type="text"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              className="save-as-input"
              placeholder={t.saveAs.styleNamePlaceholder}
              autoComplete="off"
            />
          </div>

          <div className="save-as-field">
            <label className="save-as-label" htmlFor="style-css">{t.saveAs.styleCss}</label>
            <textarea
              id="style-css"
              value={styleCss}
              onChange={(e) => setStyleCss(e.target.value)}
              className="save-as-textarea"
              placeholder={t.saveAs.styleCssPlaceholder}
              rows={8}
              spellCheck={false}
            />
          </div>

          {!isEditing && customPresets.length > 0 && (
            <div className="save-as-field">
              <label className="save-as-label">{t.saveAs.customStyles}</label>
              <div className="save-as-style-list">
                {customPresets.map(style => (
                  <div key={style.id} className="save-as-style-item">
                    <span className="save-as-style-item-name">{style.name}</span>
                    <div className="save-as-style-item-actions">
                      <button onClick={() => onEdit(style)} className="save-as-style-item-btn" title={t.saveAs.editStyle}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(style.id)} className="save-as-style-item-btn save-as-style-item-btn-delete" title={t.saveAs.deleteStyle}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="save-as-footer">
          <button onClick={onImport} className="save-as-btn save-as-btn-cancel" type="button">
            {t.saveAs.importCss}
          </button>
          <div className="save-as-footer-spacer" />
          <button onClick={onClose} className="save-as-btn save-as-btn-cancel" type="button">
            {t.saveAs.cancel}
          </button>
          <button
            onClick={handleSave}
            className="save-as-btn save-as-btn-confirm"
            disabled={!styleName.trim() || !styleCss.trim()}
            type="button"
          >
            {t.saveAs.saveStyle}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback, useRef, useEffect } from 'react'
import { generateBlog, downloadBlogAsZip, generateSingleFileBlog, BlogGenerationResult } from './blogGenerator'
import { BlogConfig, DEFAULT_BLOG_CONFIG } from './templates'
import { parseFrontMatter } from '@utils/frontMatter'
import { useLanguage } from '../../stores/LanguageStore'
import BlogConfigForm from './components/BlogConfigForm'
import FilePreviewPanel from './components/FilePreviewPanel'
import GenerationResult from './components/GenerationResult'
import AlertMessage from './components/AlertMessage'

interface BlogModalProps {
  isOpen: boolean
  onClose: () => void
  files: Array<{ name: string; content: string }>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface FileInfo {
  name: string
  title: string
  date: string
  tags: string[]
  draft: boolean
}

const fsAccessSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function extractFileInfo(file: { name: string; content: string }): FileInfo {
  const { frontMatter, content } = parseFrontMatter(file.content)
  const title = frontMatter.title || (() => {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : file.name.replace(/\.md$/, '')
  })()

  return {
    name: file.name,
    title,
    date: frontMatter.date || '',
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
    draft: frontMatter.draft === true,
  }
}

export default function BlogModal({ isOpen, onClose, files, onSuccess, onError }: BlogModalProps) {
  const [config, setConfig] = useState<BlogConfig>({ ...DEFAULT_BLOG_CONFIG })
  const [result, setResult] = useState<BlogGenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  const mdFiles = files.filter(f => f.name.endsWith('.md'))
  const fileInfos = mdFiles.map(extractFileInfo)
  const publishedCount = fileInfos.filter(f => !f.draft).length

  // 经 ref 读取当前预览 URL：effect 只在打开瞬间撤销上一张预览；
  // 若直接补 previewUrl 到 deps，会在生成新 URL 后立即将其撤销（行为破坏）
  const previewUrlRef = useRef(previewUrl)
  previewUrlRef.current = previewUrl

  useEffect(() => {
    if (isOpen) {
      setConfig({ ...DEFAULT_BLOG_CONFIG })
      setResult(null)
      setIsGenerating(false)
      setIsDownloading(false)
      setError(null)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      setPreviewUrl(null)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const handleGenerate = useCallback(() => {
    setIsGenerating(true)
    setError(null)
    try {
      const genResult = generateBlog(mdFiles, {
        siteTitle: config.siteTitle,
        siteDescription: config.siteDescription,
        author: config.author,
        siteUrl: config.siteUrl,
        language: config.language,
        theme: config.theme,
      })
      setResult(genResult)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      onSuccess(t.blogModal.generateSuccess.replace('{count}', String(genResult.posts.length)).replace('{files}', String(genResult.files.length)))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.blogModal.unknownError
      setError(`${t.blogModal.generateFailed}: ${msg}`)
      onError(`${t.blogModal.generateFailed}: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }, [mdFiles, config, previewUrl, onSuccess, onError, t])

  const handleDownloadFolder = useCallback(async () => {
    if (!result) return
    setIsDownloading(true)
    setError(null)
    try {
      await downloadBlogAsZip(result)
      onSuccess(t.blogModal.downloadSuccess)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsDownloading(false)
        return
      }
      const msg = err instanceof Error ? err.message : t.blogModal.unknownError
      setError(`${t.blogModal.downloadFailed}: ${msg}`)
      onError(`${t.blogModal.downloadFailed}: ${msg}`)
    } finally {
      setIsDownloading(false)
    }
  }, [result, onSuccess, onError, t])

  const handleDownloadSingleFile = useCallback(() => {
    if (!result) return
    setIsDownloading(true)
    setError(null)
    try {
      const html = generateSingleFileBlog(
        result.posts.map(p => ({
          name: p.slug,
          content: p.rawContent,
          frontMatter: {
            title: p.title,
            date: p.date,
            tags: p.tags,
            category: p.category,
            description: p.description,
            author: p.author,
            coverImage: p.coverImage,
            draft: p.draft,
          },
        })),
        result.config
      )
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'blog.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onSuccess(t.blogModal.singleDownloadSuccess)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.blogModal.unknownError
      setError(`${t.blogModal.singleDownloadFailed}: ${msg}`)
      onError(`${t.blogModal.singleDownloadFailed}: ${msg}`)
    } finally {
      setIsDownloading(false)
    }
  }, [result, onSuccess, onError, t])

  const handlePreview = useCallback(() => {
    if (!result) return

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const html = generateSingleFileBlog(
      result.posts.map(p => ({
        name: p.slug,
        content: p.rawContent,
        frontMatter: {
          title: p.title,
          date: p.date,
          tags: p.tags,
          category: p.category,
          description: p.description,
          author: p.author,
          coverImage: p.coverImage,
          draft: p.draft,
        },
      })),
      result.config
    )
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    window.open(url, '_blank')
  }, [result, previewUrl])

  const totalSize = result
    ? result.files.reduce((sum, f) => sum + new Blob([f.content]).size, 0)
    : 0

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.blogModal.generateBlog}
        style={{
          width: 800,
          maxWidth: '90vw',
          maxHeight: '85vh',
          backgroundColor: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--editor-border)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--editor-border)',
          flexShrink: 0,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: 'var(--editor-text)',
          }}>
            {t.blogModal.generateBlog}
          </h3>
          <button
            onClick={onClose}
            aria-label={t.blogModal.close}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
          }}>
            <BlogConfigForm config={config} setConfig={setConfig} t={t} />
            <FilePreviewPanel fileInfos={fileInfos} mdFilesCount={mdFiles.length} publishedCount={publishedCount} t={t} />
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || mdFiles.length === 0}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                cursor: isGenerating || mdFiles.length === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--button-primary)',
                color: '#ffffff',
                fontFamily: "'Inter', -apple-system, sans-serif",
                opacity: isGenerating || mdFiles.length === 0 ? 0.5 : 1,
                transition: 'background-color 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--button-primary-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--button-primary)' }}
            >
              {isGenerating ? t.blogModal.generating : t.blogModal.generateBlog}
            </button>

            {result && (
              <>
                <button
                  onClick={handleDownloadFolder}
                  disabled={isDownloading}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: '1px solid var(--editor-border)',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent',
                    color: 'var(--editor-text)',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    opacity: isDownloading ? 0.5 : 1,
                    transition: 'background-color 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {isDownloading ? t.blogModal.downloading : t.blogModal.downloadFolder}
                </button>
                <button
                  onClick={handleDownloadSingleFile}
                  disabled={isDownloading}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: '1px solid var(--editor-border)',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent',
                    color: 'var(--editor-text)',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    opacity: isDownloading ? 0.5 : 1,
                    transition: 'background-color 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {t.blogModal.downloadSingle}
                </button>
              </>
            )}
          </div>

          {!fsAccessSupported && (
            <AlertMessage type="warning" message={t.blogModal.browserNotSupported} />
          )}

          {error && (
            <AlertMessage type="error" message={error} />
          )}

          {result && (
            <GenerationResult result={result} totalSize={totalSize} onPreview={handlePreview} t={t} />
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '12px 20px 16px',
          borderTop: '1px solid var(--editor-border)',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid var(--editor-border)',
              backgroundColor: 'transparent',
              color: 'var(--editor-text)',
              cursor: 'pointer',
              fontFamily: "'Inter', -apple-system, sans-serif",
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {t.blogModal.close}
          </button>
        </div>
      </div>
    </div>
  )
}

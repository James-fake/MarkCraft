// Phase 4（2026-09-18）自 features/shared/ui/ **原样迁入**（内容一字未改）。
// 定位：编辑器业务 UI（读 @stores/LanguageStore 取文案），唯一消费者是
// features/editor/EditorSlots.tsx。
// 🎯 同 FrontMatterPanel，是「环 #3 残余形态」的另一条反向边（features/shared → stores）。
import { useState, useEffect, useCallback } from 'react'
import { findAllBase64Images, extractBase64Info, saveBase64ToFile, formatFileSize, base64SizeInBytes, ImageMarkRange } from '@utils/imageHelpers'
import { getBase64Image } from '@core/storage/imageStore'
import { useLanguage } from '@stores/LanguageStore'

interface OptimizeImagesModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onContentChange: (content: string) => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

interface ImageItem {
  index: number
  range: ImageMarkRange
  size: string
  mimeType: string
  preview: string
  status: 'pending' | 'saving' | 'saved' | 'error'
  savedPath?: string
  errorMsg?: string
}

export default function OptimizeImagesModal({
  isOpen,
  onClose,
  content,
  onContentChange,
  onSuccess,
  onError,
}: OptimizeImagesModalProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [savingAll, setSavingAll] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (isOpen) {
      const base64Images = findAllBase64Images(content)

      const placeholderRegex = /!\[([^\]]*)\]\(image:([^)]+)\)/g
      const placeholderImages: ImageMarkRange[] = []
      let pMatch
      while ((pMatch = placeholderRegex.exec(content)) !== null) {
        const imageId = pMatch[2]
        const base64Data = getBase64Image(imageId)
        if (base64Data) {
          placeholderImages.push({
            start: pMatch.index,
            end: pMatch.index + pMatch[0].length,
            alt: pMatch[1],
            url: base64Data,
            isBase64: true,
            isPlaceholder: true,
          })
        }
      }

      const allImages = [...base64Images, ...placeholderImages]
      const items: ImageItem[] = allImages.map((range, index) => {
        const info = extractBase64Info(range.url)
        const size = base64SizeInBytes(range.url)
        return {
          index,
          range,
          size: formatFileSize(size),
          mimeType: info?.mimeType || 'unknown',
          preview: range.url.length > 100 ? range.url.substring(0, 100) + '...' : range.url,
          status: 'pending',
        }
      })
      setImages(items)
    }
  }, [isOpen, content])

  const handleSaveOne = useCallback(
    async (itemIndex: number) => {
      const item = images[itemIndex]
      if (!item || item.status === 'saving' || item.status === 'saved') return

      setImages((prev) =>
        prev.map((img, i) => (i === itemIndex ? { ...img, status: 'saving' as const } : img))
      )

      try {
        const result = await saveBase64ToFile(item.range.url, `image-${item.index + 1}`)
        if (result) {
          setImages((prev) =>
            prev.map((img, i) =>
              i === itemIndex
                ? { ...img, status: 'saved' as const, savedPath: result.fileName }
                : img
            )
          )
        } else {
          setImages((prev) =>
            prev.map((img, i) =>
              i === itemIndex
                ? {
                    ...img,
                    status: 'error' as const,
                    errorMsg: t.optimizeImages.browserNotSupported,
                  }
                : img
            )
          )
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : t.optimizeImages.saveFailed
        setImages((prev) =>
          prev.map((img, i) =>
            i === itemIndex
              ? { ...img, status: 'error' as const, errorMsg: errMsg }
              : img
          )
        )
      }
    },
    [images, t]
  )

  const handleSaveAll = useCallback(async () => {
    setSavingAll(true)
    for (let i = 0; i < images.length; i++) {
      if (images[i].status === 'pending' || images[i].status === 'error') {
        await handleSaveOne(i)
      }
    }
    setSavingAll(false)
  }, [images, handleSaveOne])

  const handleApplyReplacements = useCallback(() => {
    let newContent = content
    const savedImages = images.filter((img) => img.status === 'saved' && img.savedPath)

    if (savedImages.length === 0) {
      onError(t.optimizeImages.noSavedImages)
      return
    }

    const sortedImages = [...savedImages].sort((a, b) => b.range.start - a.range.start)

    for (const img of sortedImages) {
      const newMark = `![${img.range.alt}](${img.savedPath})`
      newContent = newContent.substring(0, img.range.start) + newMark + newContent.substring(img.range.end)
    }

    onContentChange(newContent)
    onSuccess(t.optimizeImages.replacedCount.replace('{count}', String(savedImages.length)))
    onClose()
  }, [content, images, onContentChange, onSuccess, onError, onClose, t])

  if (!isOpen) return null

  const hasSavedImages = images.some((img) => img.status === 'saved')
  const hasPendingImages = images.some((img) => img.status === 'pending' || img.status === 'error')
  const isFileSystemSupported = 'showSaveFilePicker' in window

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        style={{
          backgroundColor: 'var(--editor-bg)',
          color: 'var(--editor-text)',
          border: '1px solid var(--editor-border)',
        }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--editor-border)' }}
        >
          <h2 className="text-lg font-semibold">{t.optimizeImages.title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--editor-text)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 flex-1 overflow-y-auto">
          {!isFileSystemSupported && (
            <div
              className="mb-4 px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
              }}
            >
              {t.optimizeImages.browserNotSupportedMsg}
            </div>
          )}

          {images.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--editor-text)', opacity: 0.5 }}>
              {t.optimizeImages.noBase64Images}
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: 'var(--editor-border)',
                    backgroundColor: 'var(--mc-bg-panel)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{t.optimizeImages.image} {idx + 1}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--mc-accent-soft)',
                            color: 'var(--link-color)',
                          }}
                        >
                          {item.mimeType}
                        </span>
                        <span className="text-xs" style={{ opacity: 0.6 }}>
                          {item.size}
                        </span>
                      </div>
                      <div
                        className="text-xs truncate mb-1"
                        style={{ opacity: 0.5, fontFamily: 'monospace' }}
                        title={item.range.alt}
                      >
                        alt: {item.range.alt || t.optimizeImages.empty}
                      </div>
                      {item.status === 'saved' && item.savedPath && (
                        <div
                          className="text-xs mt-1"
                          style={{ color: '#10b981', fontFamily: 'monospace' }}
                        >
                          ✓ {t.optimizeImages.savedDone}: {item.savedPath}
                        </div>
                      )}
                      {item.status === 'error' && item.errorMsg && (
                        <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                          ✗ {item.errorMsg}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleSaveOne(idx)}
                          disabled={!isFileSystemSupported}
                          className="px-3 py-1 text-xs rounded transition-colors"
                          style={{
                            backgroundColor: 'var(--mc-accent-soft)',
                            color: 'var(--link-color)',
                            border: '1px solid var(--mc-accent-soft)',
                            opacity: isFileSystemSupported ? 1 : 0.5,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)'
                          }}
                        >
                          {t.optimizeImages.save}
                        </button>
                      )}
                      {item.status === 'saving' && (
                        <span className="text-xs" style={{ color: 'var(--link-color)' }}>
                          {t.optimizeImages.saving}
                        </span>
                      )}
                      {item.status === 'saved' && (
                        <span className="text-xs" style={{ color: '#10b981' }}>
                          {t.optimizeImages.savedDone}
                        </span>
                      )}
                      {item.status === 'error' && (
                        <button
                          onClick={() => handleSaveOne(idx)}
                          disabled={!isFileSystemSupported}
                          className="px-3 py-1 text-xs rounded transition-colors"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                          }}
                        >
                          {t.optimizeImages.retry}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--editor-border)' }}
        >
          <div className="text-xs" style={{ opacity: 0.5 }}>
            {images.length} {t.optimizeImages.totalImages}
          </div>
          <div className="flex items-center gap-2">
            {hasPendingImages && isFileSystemSupported && (
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                className="px-4 py-2 text-sm rounded transition-colors"
                style={{
                  backgroundColor: 'var(--mc-accent-soft)',
                  color: 'var(--link-color)',
                  border: '1px solid var(--mc-accent-soft)',
                  opacity: savingAll ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--mc-accent-soft)'
                }}
              >
                {savingAll ? t.optimizeImages.saving : t.optimizeImages.saveAll}
              </button>
            )}
            <button
              onClick={handleApplyReplacements}
              disabled={!hasSavedImages}
              className="px-4 py-2 text-sm rounded transition-colors"
              style={{
                backgroundColor: hasSavedImages ? 'rgba(16, 185, 129, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                color: hasSavedImages ? '#10b981' : 'var(--editor-text)',
                border: `1px solid ${hasSavedImages ? 'rgba(16, 185, 129, 0.3)' : 'rgba(128, 128, 128, 0.3)'}`,
                opacity: hasSavedImages ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (hasSavedImages) e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
              }}
              onMouseLeave={(e) => {
                if (hasSavedImages) e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
              }}
            >
              {t.optimizeImages.replacePaths}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded transition-colors"
              style={{
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                color: 'var(--editor-text)',
                border: '1px solid var(--editor-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)'
              }}
            >
              {t.optimizeImages.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

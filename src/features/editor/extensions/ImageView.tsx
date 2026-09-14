import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'
import { getBase64Image } from '../../shared/storage/imageStore'
import { getImageHostConfig } from '../../imageUpload/imageHostConfig'
import { notifyUploadStatus } from '../../imageUpload/uploadNotifier'
import { logger } from '@utils/logger'
import ImagePreviewModal from '../ImagePreviewModal'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'

type AlignType = 'left' | 'center' | 'right'

const CORNER_HANDLES = [
  { id: 'tl', style: { top: -5, left: -5, cursor: 'nwse-resize' as const } },
  { id: 'tr', style: { top: -5, right: -5, cursor: 'nesw-resize' as const } },
  { id: 'bl', style: { bottom: -5, left: -5, cursor: 'nesw-resize' as const } },
  { id: 'br', style: { bottom: -5, right: -5, cursor: 'nwse-resize' as const } },
] as const

export default function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, width, height, align } = node.attrs
  const containerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [aspectLocked, setAspectLocked] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const naturalSizeRef = useRef({ width: 0, height: 0 })

  const currentAlign: AlignType = align || 'center'

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    naturalSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight }
  }, [])

  // Resize handle drag – proportional resize based on horizontal delta only
  const handleResizeStart = useCallback((e: React.MouseEvent, handleId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width || containerRef.current?.offsetWidth || 300

    const isLeftHandle = handleId === 'tl' || handleId === 'bl'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startXRef.current
      const delta = isLeftHandle ? -dx : dx
      const newWidth = Math.min(2000, Math.max(50, Math.round(startWidthRef.current + delta)))
      updateAttributes({ width: newWidth, height: null })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, updateAttributes])

  const setAlign = useCallback((newAlign: AlignType) => {
    updateAttributes({ align: newAlign })
  }, [updateAttributes])

  // PicGo upload
  const handleUploadToHost = useCallback(async () => {
    if (!src || isUploading) return
    setIsUploading(true)
    try {
      const result = await uploadToPicGo(src)
      if (result) {
        updateAttributes({ src: result })
      }
    } catch (err) {
      logger.error('Upload to image host failed:', err)
    } finally {
      setIsUploading(false)
    }
  }, [src, isUploading, updateAttributes])

  const handleWidthChange = useCallback((v: string | number) => {
    if (v === '' || (typeof v === 'number' && Number.isNaN(v))) {
      updateAttributes({ width: null })
      return
    }
    const val = typeof v === 'string' ? v : String(v)
    const w = parseInt(val, 10)
    if (isNaN(w) || w < 1) return
    if (aspectLocked && naturalSizeRef.current.width && naturalSizeRef.current.height) {
      const aspectRatio = naturalSizeRef.current.width / naturalSizeRef.current.height
      updateAttributes({ width: w, height: Math.round(w / aspectRatio) })
    } else {
      updateAttributes({ width: w })
    }
  }, [aspectLocked, updateAttributes])

  const handleHeightChange = useCallback((v: string | number) => {
    if (v === '' || (typeof v === 'number' && Number.isNaN(v))) {
      updateAttributes({ height: null })
      return
    }
    const val = typeof v === 'string' ? v : String(v)
    const h = parseInt(val, 10)
    if (isNaN(h) || h < 1) return
    if (aspectLocked && naturalSizeRef.current.width && naturalSizeRef.current.height) {
      const aspectRatio = naturalSizeRef.current.width / naturalSizeRef.current.height
      updateAttributes({ height: h, width: Math.round(h * aspectRatio) })
    } else {
      updateAttributes({ height: h })
    }
  }, [aspectLocked, updateAttributes])

  const resetSize = useCallback(() => {
    updateAttributes({ width: null, height: null })
  }, [updateAttributes])

  const imgStyle: React.CSSProperties = {
    maxWidth: '100%',
    ...(width ? { width: `${width}px` } : {}),
    ...(height ? { height: `${height}px` } : {}),
    display: 'block',
  }

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: 'fit-content',
    maxWidth: '100%',
    overflow: 'visible',
  }

  const showToolbarPanel = selected || showToolbar

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: currentAlign === 'left' ? 'flex-start' : currentAlign === 'right' ? 'flex-end' : 'center',
    margin: '8px 0',
    paddingTop: showToolbarPanel ? 36 : 0,
    paddingBottom: selected ? 36 : 0,
    overflow: 'visible',
  }

  const inputStyle: React.CSSProperties = {
    width: 60,
    border: '1px solid var(--editor-border, #e5e7eb)',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    textAlign: 'center',
    color: 'var(--editor-text)',
    backgroundColor: 'var(--editor-bg, #fff)',
    outline: 'none',
  }

  const smallBtnStyle: React.CSSProperties = {
    padding: '2px 4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: 1,
    color: 'var(--editor-text)',
    borderRadius: '4px',
  }

  return (
    <NodeViewWrapper>
      <div
        data-align={currentAlign}
        style={wrapperStyle}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        <div style={containerStyle} ref={containerRef}>
          <img
            src={src}
            alt={alt || ''}
            title={title || ''}
            style={imgStyle}
            onLoad={handleImageLoad}
            className="tiptap-image"
            draggable={false}
            onDoubleClick={() => setPreviewVisible(true)}
          />

          {/* 4 Corner resize handles */}
          {(selected || isResizing) && CORNER_HANDLES.map(handle => (
            <div
              key={handle.id}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: 'var(--button-primary, #3b82f6)',
                border: '2px solid white',
                borderRadius: '50%',
                zIndex: 10,
                cursor: handle.style.cursor,
                ...Object.fromEntries(
                  Object.entries(handle.style).filter(([k]) => k !== 'cursor')
                ),
              }}
              onMouseDown={e => handleResizeStart(e, handle.id)}
            />
          ))}

          {/* Width label shown during resize */}
          {isResizing && (
            <div style={{
              position: 'absolute',
              top: '-24px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--button-primary, #3b82f6)',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 20,
            }}>
              {width ? `${Math.round(width)}px` : ''}
            </div>
          )}

          {/* Alignment & upload toolbar */}
          {showToolbarPanel && (
            <div style={{
              position: 'absolute',
              top: '-32px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '2px',
              backgroundColor: 'var(--editor-bg, #fff)',
              border: '1px solid var(--editor-border, #e5e7eb)',
              borderRadius: '6px',
              padding: '2px 4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 100,
            }}>
              {/* Align left */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setAlign('left')}
                style={{
                  padding: '4px 6px',
                  border: 'none',
                  background: currentAlign === 'left' ? 'rgba(59,130,246,0.15)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--editor-text)',
                  fontSize: '12px',
                }}
                title="Left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="4" rx="1" />
                  <rect x="3" y="10" width="12" height="4" rx="1" />
                  <rect x="3" y="17" width="18" height="4" rx="1" />
                </svg>
              </button>
              {/* Align center */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setAlign('center')}
                style={{
                  padding: '4px 6px',
                  border: 'none',
                  background: currentAlign === 'center' ? 'rgba(59,130,246,0.15)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--editor-text)',
                  fontSize: '12px',
                }}
                title="Center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="4" rx="1" />
                  <rect x="6" y="10" width="12" height="4" rx="1" />
                  <rect x="3" y="17" width="18" height="4" rx="1" />
                </svg>
              </button>
              {/* Align right */}
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setAlign('right')}
                style={{
                  padding: '4px 6px',
                  border: 'none',
                  background: currentAlign === 'right' ? 'rgba(59,130,246,0.15)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--editor-text)',
                  fontSize: '12px',
                }}
                title="Right"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="4" rx="1" />
                  <rect x="9" y="10" width="12" height="4" rx="1" />
                  <rect x="3" y="17" width="18" height="4" rx="1" />
                </svg>
              </button>

              {/* Divider */}
              <div style={{ width: '1px', backgroundColor: 'var(--editor-border, #e5e7eb)', margin: '2px 2px' }} />

              {/* Upload to image host */}
              {src && (src.startsWith('data:') || src.startsWith('image:')) && (
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={handleUploadToHost}
                  disabled={isUploading}
                  style={{
                    padding: '4px 6px',
                    border: 'none',
                    background: isUploading ? 'rgba(59,130,246,0.1)' : 'none',
                    borderRadius: '4px',
                    cursor: isUploading ? 'wait' : 'pointer',
                    color: 'var(--editor-text)',
                    fontSize: '11px',
                    opacity: isUploading ? 0.5 : 1,
                  }}
                  title="Upload to image host (PicGo)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Image property panel */}
          {selected && (
            <div style={{
              position: 'absolute',
              bottom: '-36px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              backgroundColor: 'var(--editor-bg, #fff)',
              border: '1px solid var(--editor-border, #e5e7eb)',
              borderRadius: '6px',
              padding: '4px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 100,
              whiteSpace: 'nowrap',
            }}>
              <ScrollNumberInput
                value={width || ''}
                min={1}
                onChange={handleWidthChange}
                onMouseDown={e => e.stopPropagation()}
                style={inputStyle}
                placeholder="W"
              />
              <span style={{ fontSize: '12px', color: 'var(--editor-text)', userSelect: 'none' }}>×</span>
              <ScrollNumberInput
                value={height || ''}
                min={1}
                onChange={handleHeightChange}
                onMouseDown={e => e.stopPropagation()}
                style={inputStyle}
                placeholder="H"
              />
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => setAspectLocked(v => !v)}
                title={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                style={smallBtnStyle}
              >
                {aspectLocked ? '🔗' : '🔓'}
              </button>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={resetSize}
                title="Reset size"
                style={smallBtnStyle}
              >
                ↺
              </button>
            </div>
          )}

          {/* Selected outline */}
          {selected && (
            <div style={{
              position: 'absolute',
              inset: -2,
              border: '2px solid var(--button-primary, #3b82f6)',
              borderRadius: '4px',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
      <ImagePreviewModal
        visible={previewVisible}
        src={src || ''}
        alt={alt || undefined}
        onClose={() => setPreviewVisible(false)}
      />
    </NodeViewWrapper>
  )
}

// PicGo API integration
async function uploadToPicGo(src: string): Promise<string | null> {
  // Resolve image: placeholder to base64
  let dataUrl = src
  if (src.startsWith('image:')) {
    const imageId = src.substring(6)
    const base64 = getBase64Image(imageId)
    if (!base64) return null
    dataUrl = base64
  }

  if (!dataUrl.startsWith('data:')) return null

  // Convert base64 to File
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], `image_${Date.now()}.png`, { type: blob.type })

  const config = getImageHostConfig()
  const uploadId = `upload_${Date.now()}`

  if (config.type === 'none') {
    logger.warn('Image host type is set to none')
    return null
  }

  try {
    if (config.type === 'picgo') {
      const serverUrl = config.picgoServerUrl || 'http://127.0.0.1:36677'

      notifyUploadStatus({ id: uploadId, status: 'uploading', message: '正在上传到 PicGo...' })

      const formData = new FormData()
      formData.append('list[]', file)

      const response = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        notifyUploadStatus({ id: uploadId, status: 'error', message: `PicGo 上传失败: HTTP ${response.status}` })
        return null
      }

      const result = await response.json()
      if (result.success && result.result?.length > 0) {
        const url = result.result[0]
        notifyUploadStatus({ id: uploadId, status: 'success', message: '上传成功', url })
        return url
      }

      notifyUploadStatus({ id: uploadId, status: 'error', message: 'PicGo 返回结果异常' })
      return null
    }

    if (config.type === 'custom') {
      if (!config.customApiUrl) {
        notifyUploadStatus({ id: uploadId, status: 'error', message: '自定义 API URL 未配置' })
        return null
      }

      notifyUploadStatus({ id: uploadId, status: 'uploading', message: '正在上传到自定义 API...' })

      const formData = new FormData()
      formData.append('file', file)

      const headers: Record<string, string> = { ...config.customApiHeaders }
      const response = await fetch(config.customApiUrl, {
        method: 'POST',
        body: formData,
        headers,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        notifyUploadStatus({ id: uploadId, status: 'error', message: `上传失败: HTTP ${response.status}` })
        return null
      }

      const result = await response.json()
      const urlPath = config.customResponseUrlPath || 'data.url'
      const url = urlPath.split('.').reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], result) as string | undefined

      if (url) {
        notifyUploadStatus({ id: uploadId, status: 'success', message: '上传成功', url })
        return url
      }

      notifyUploadStatus({ id: uploadId, status: 'error', message: '无法从响应中提取 URL' })
      return null
    }

    return null
  } catch {
    const serverUrl = config.picgoServerUrl || 'http://127.0.0.1:36677'
    notifyUploadStatus({ id: uploadId, status: 'error', message: `服务器不可用: ${serverUrl}` })
    logger.warn(`Image host server not available at ${serverUrl}`)
    return null
  }
}

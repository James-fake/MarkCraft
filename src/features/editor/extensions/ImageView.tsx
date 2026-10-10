import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'
import { getBase64Image, isLoadableImageSrc, resolveImageSrcForDisplay } from '@core/storage/imageStore'
import { useMemo } from 'react'
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

  /**
   * 真正喂给 <img> 的地址。
   *
   * ⚠️ 节点里的 `src` 可能是**不可直接加载**的形态（真实事故 2026-10-11：插入图片后切到源码/预览
   *    再切回所见即所得，图消失但节点与调整方框仍在 —— 即 `<img>` 拿到了加载不出来的 src）：
   *      - `image:<id>`：本项目占位符，真实数据在 imageStore 里
   *      - `assets/xxx.png`：开启「相对路径存储图片」时的形态，需经 RELATIVE_PATH_MAP 反查 id
   *    这两种都必须在**渲染时**解析成 base64 才能显示；直接塞给 <img> 只会静默失败。
   *    存储侧的 `src` 属性**不改**（保持往返一致），只影响显示。
   */
  const displaySrc = useMemo(() => resolveImageSrcForDisplay(src), [src])

  /** 解析后仍不是可加载地址 → 数据丢了；给出可见提示，避免「静默空白」无从排查 */
  const broken = !!src && !isLoadableImageSrc(displaySrc)

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

  /** 图片数据丢失时的可见占位（不再静默空白，用户/开发都能一眼看出「不是没插进去，是数据没了」） */
  const brokenStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 160,
    minHeight: 72,
    padding: '12px 16px',
    border: '1px dashed var(--editor-border, #d1d5db)',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.4,
    color: 'var(--editor-text-secondary, #6b7280)',
    background: 'var(--editor-bg-secondary, rgba(127,127,127,0.06))',
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
            src={displaySrc}
            alt={alt || ''}
            title={title || ''}
            style={imgStyle}
            onLoad={handleImageLoad}
            className="tiptap-image"
            draggable={false}
            onDoubleClick={() => setPreviewVisible(true)}
          />
          {broken && (
            <div style={brokenStyle} title={src}>
              <span>图片无法显示（原图数据已丢失）</span>
              <span style={{ fontSize: 10, opacity: 0.7, wordBreak: 'break-all' }}>{src}</span>
            </div>
          )}

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
                  background: currentAlign === 'left' ? 'var(--mc-accent-soft)' : 'none',
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
                  background: currentAlign === 'center' ? 'var(--mc-accent-soft)' : 'none',
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
                  background: currentAlign === 'right' ? 'var(--mc-accent-soft)' : 'none',
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
                    background: isUploading ? 'var(--mc-accent-soft)' : 'none',
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

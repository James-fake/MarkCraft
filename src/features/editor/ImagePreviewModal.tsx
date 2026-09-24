import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ImagePreviewModalProps {
  visible: boolean
  src: string
  alt?: string
  onClose: () => void
}

const MIN_SCALE = 0.1
const MAX_SCALE = 10
const SCALE_STEP = 0.25

export default function ImagePreviewModal({ visible, src, alt, onClose }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const translateStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset state when image changes or modal opens
  useEffect(() => {
    if (visible) {
      setScale(1)
      setTranslate({ x: 0, y: 0 })
    }
  }, [visible, src])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  // Scroll to zoom
  useEffect(() => {
    if (!visible) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
      setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((prev + delta) * 100) / 100)))
    }
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [visible])

  // Drag to pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    translateStartRef.current = { ...translate }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [scale, translate])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setTranslate({
      x: translateStartRef.current.x + dx,
      y: translateStartRef.current.y + dy,
    })
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(MAX_SCALE, Math.round((prev + SCALE_STEP) * 100) / 100))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(MIN_SCALE, Math.round((prev - SCALE_STEP) * 100) / 100))
  }, [])

  const handleReset = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImgSize({ width: img.naturalWidth, height: img.naturalHeight })
  }, [])

  // Extract filename from src
  const filename = (() => {
    try {
      if (src.startsWith('data:')) return alt || 'image'
      const url = new URL(src)
      const parts = url.pathname.split('/')
      const last = parts[parts.length - 1]
      return decodeURIComponent(last) || alt || 'image'
    } catch {
      return alt || 'image'
    }
  })()

  if (!visible) return null

  // 单源基底：遮罩复用 .aurora-modal-overlay（fixed/inset:0/居中/z-index 3000/入场动效），
  // --dim 变体把 scrim 加深到 0.85；控件与底部信息条走 .aurora-lightbox__*（见 components.css）。
  // 本组件经 portal 挂到 body ⇒ 一律不用 --editor-*，只用全局 --mc-*。
  const modal = (
    <div
      ref={containerRef}
      className="aurora-modal-overlay aurora-modal-overlay--dim"
      style={{ userSelect: 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="aurora-lightbox__btn"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          fontSize: 'var(--mc-font-xl)',
          // 容器内局部层：图元带 transform 自成堆叠上下文，控件须显式压在其上
          // （属 §14 豁免的「容器内局部层级」，非全局带）
          zIndex: 1,
        }}
        title="Close (Esc)"
      >
        ✕
      </button>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 68,
          display: 'flex',
          gap: 4,
          zIndex: 1,
        }}
      >
        {[
          { label: '+', title: 'Zoom In', onClick: handleZoomIn },
          { label: '−', title: 'Zoom Out', onClick: handleZoomOut },
          { label: '1:1', title: 'Reset', onClick: handleReset },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="aurora-lightbox__btn"
            style={{
              width: 40,
              height: 40,
              fontSize: 'var(--mc-font-lg)',
            }}
            title={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Image container */}
      <div
        className="aurora-lightbox__stage"
        style={{
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={src}
          alt={alt || ''}
          onLoad={handleImageLoad}
          draggable={false}
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform var(--mc-dur-fast) var(--mc-ease-out)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Bottom info bar */}
      <div className="aurora-lightbox__bar">
        <span>{filename}</span>
        {imgSize.width > 0 && imgSize.height > 0 && (
          <span style={{ opacity: 0.6 }}>
            {imgSize.width} × {imgSize.height}
          </span>
        )}
        <span style={{ opacity: 0.6 }}>
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

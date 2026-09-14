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

  const modal = (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          border: 'none',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s',
          zIndex: 10,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
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
          zIndex: 10,
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
            style={{
              width: 40,
              height: 40,
              border: 'none',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
            title={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Image container */}
      <div
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'hidden',
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
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Bottom info bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '10px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'rgba(255, 255, 255, 0.75)',
          fontSize: 13,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
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

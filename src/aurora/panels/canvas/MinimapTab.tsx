import { useEffect, useRef } from 'react'
import { Icon } from '../../icons'
import type { ParsedShape } from './sidebarPanelShared'

// ───────────── 小地图 ─────────────
export function MinimapTab({
  shapes, viewSig, zoom, setZoom,
}: {
  shapes: ParsedShape[]
  viewSig: string
  zoom: number
  setZoom: (v: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx2d = cv.getContext('2d')
    if (!ctx2d) return
    const W = cv.width
    const H = cv.height

    ctx2d.clearRect(0, 0, W, H)

    if (shapes.length === 0) {
      // 空白板提示
      ctx2d.fillStyle = 'rgba(255,255,255,0.35)'
      ctx2d.font = '11px system-ui'
      ctx2d.textAlign = 'center'
      ctx2d.fillText('白板为空', W / 2, H / 2)
      return
    }

    // 元素包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const s of shapes) {
      if (s.w <= 0 || s.h <= 0) continue
      minX = Math.min(minX, s.x)
      minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + s.w)
      maxY = Math.max(maxY, s.y + s.h)
    }
    if (!isFinite(minX)) return
    const worldW = (maxX - minX) || 1
    const worldH = (maxY - minY) || 1
    const scale = Math.min((W - 8) / worldW, (H - 8) / worldH) * zoom
    const offX = (W - worldW * scale) / 2 - minX * scale
    const offY = (H - worldH * scale) / 2 - minY * scale

    for (const s of shapes) {
      const x = s.x * scale + offX
      const y = s.y * scale + offY
      const w = Math.max(2, s.w * scale)
      const h = Math.max(2, s.h * scale)
      const isNote = s.type === 'note-card'
      ctx2d.fillStyle = isNote ? 'rgba(124,140,255,0.85)' : 'rgba(167,139,250,0.75)'
      ctx2d.fillRect(x, y, w, h)
    }

    // 视口框
    if (viewSig) {
      const [vx, vy, vw, vh] = viewSig.split('|').map(Number)
      if (vw > 0 && vh > 0) {
        const x = vx * scale + offX
        const y = vy * scale + offY
        const w = Math.max(2, vw * scale)
        const h = Math.max(2, vh * scale)
        ctx2d.strokeStyle = '#7C8CFF'
        ctx2d.lineWidth = 1.5
        ctx2d.strokeRect(x, y, w, h)
        ctx2d.fillStyle = 'rgba(124,140,255,0.15)'
        ctx2d.fillRect(x, y, w, h)
      }
    }
  }, [shapes, viewSig, zoom])

  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">小地图</div>
        <div className="aurora-csp__sub">{shapes.length} 元素</div>
      </div>
      <canvas ref={canvasRef} width={248} height={200} className="aurora-csp__mini" />
      <div className="aurora-csp__mini-hint">
        {shapes.length} 卡片/图形 · 缩放 {Math.round(zoom * 100)}%
      </div>
      <div className="aurora-csp__zoomrow">
        <button type="button" className="aurora-csp__zoom-btn" onClick={() => setZoom(Math.max(0.2, +(zoom - 0.1).toFixed(2)))} title="缩小" aria-label="缩小">
          <Icon.minus size={12} />
        </button>
        <input
          type="range"
          className="aurora-csp__zoom-slider"
          min={0.2}
          max={2}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
          aria-label="小地图缩放"
        />
        <button type="button" className="aurora-csp__zoom-btn" onClick={() => setZoom(Math.min(2, +(zoom + 0.1).toFixed(2)))} title="放大" aria-label="放大">
          <Icon.plus size={12} />
        </button>
        <span className="aurora-csp__zoom-val">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  )
}

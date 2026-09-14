import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'

/** Aurora 缩放控件（.aurora-zoom-controls）—— 缩小/级别/放大 + 适应 */
export interface CanvasZoomControlsProps {
  engine: CanvasEngine | null
}

export function CanvasZoomControls({ engine }: CanvasZoomControlsProps) {
  const zoom = useEngineSnapshot(engine, (e) => Math.round((e.getZoomLevel() || 1) * 100), 'session') ?? 100

  return (
    <div className="aurora-zoom-controls">
      <div className="aurora-zoom-controls__row">
        <button
          className="aurora-zoom-controls__btn"
          onClick={() => engine?.zoomToFit()}
          title="适应屏幕"
          aria-label="适应屏幕"
        >
          <Icon.frame size={14} />
        </button>
        <button className="aurora-zoom-controls__btn" onClick={() => engine?.zoomOut()} aria-label="缩小">
          <Icon.minus size={14} />
        </button>
        <span className="aurora-zoom-controls__level">{zoom}%</span>
        <button className="aurora-zoom-controls__btn" onClick={() => engine?.zoomIn()} aria-label="放大">
          <Icon.plus size={14} />
        </button>
      </div>
    </div>
  )
}

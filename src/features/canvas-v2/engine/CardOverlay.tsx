/**
 * CardOverlay — 将所有卡片浮层定位到屏幕坐标（随相机平移/缩放）。
 * 订阅引擎 shapesAtom + cameraAtom；卡片 body 在绘图工具下 pointer-events:none，
 * 让 Excalidraw 接管（箭头可绑定到卡片代理矩形）。
 *
 * 层级（关键修复）：
 * 把「选择框」作为「卡片浮层内部子元素」渲染，与卡片共用同一个 CardLayer 的堆叠上下文、
 * transform 与 z-index —— 二者是一个整体组件，不可能被彼此或它卡遮挡：
 *   - 选中/拖拽中的 CardLayer：zIndex 30（自动置顶，高于其它卡片的 1）→ 整张卡片（含选择框）在其它卡片之上
 *   - 选择框是该 CardLayer 内、卡片内容之上的子元素（zIndex 4）→ 始终在选中卡片之上
 *   - 选择框本体 pointer-events:none，仅缩放手柄可点 → 卡片主体的拖拽（move）不受影响
 * 由此彻底消除「选择框跑到下方卡片之后」与「卡片与选择框层级不一致」两类问题。
 */
import { useCallback, useRef } from 'react'
import { useValue } from './useValue'
import type { CanvasEngine } from './CanvasEngine'
import type { ShapeLike, CameraState } from './engineTypes'
import { OverlayNoteCard, OverlayGenericCard, OverlayLabelCard } from './OverlayCards'

const CARD_TYPES = new Set([
  'note-card', 'image-card', 'file-card', 'embed-card', 'group-card', 'canvas-ref', 'nested-canvas',
  'label-card',
])

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type HandleId = (typeof HANDLES)[number]

const MIN_W = 60
const MIN_H = 30

const handleCursor: Record<HandleId, string> = {
  nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
}

/**
 * 选择框 —— 作为卡片 CardLayer 的子元素渲染。
 * - inset:-3 自动包裹卡片边框盒（任意卡片类型通用），随父层 transform:scale 一起缩放。
 * - 边框宽度 / 手柄尺寸按 1/zoom 反向缩放，使屏幕视觉尺寸在任意缩放下保持恒定。
 * - 8 个手柄拖拽时换算到页面坐标，调用 engine.updateShape 写回 x/y/w/h；引擎统一负责
 *   代理矩形同步 + 绑定箭头跟随 + 撤销历史，缩放与现有选中/拖拽功能完全兼容。
 */
function CardSelectionFrame({ shape, engine, zoom }: { shape: ShapeLike; engine: CanvasEngine; zoom: number }) {
  const w = shape.props.w ?? 240
  const collapsed = shape.type === 'note-card' ? !!shape.props.collapsed : false
  const hVis = collapsed ? 44 : (shape.props.h ?? 200)

  const dragRef = useRef<{
    handle: HandleId
    startX: number
    startY: number
    ox: number
    oy: number
    ow: number
    oh: number
  } | null>(null)

  const onHandleDown = useCallback(
    (handle: HandleId) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        ox: shape.x,
        oy: shape.y,
        ow: w,
        oh: hVis,
      }
    },
    [shape.x, shape.y, w, hVis],
  )

  const onHandleMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.startX) / zoom
      const dy = (e.clientY - d.startY) / zoom
      // 折叠态笔记卡片锁定垂直尺寸，仅允许水平缩放
      const lockV = shape.type === 'note-card' && !!shape.props.collapsed
      let { ox, oy, ow, oh } = d
      if (d.handle.includes('e')) ow = Math.max(MIN_W, d.ow + dx)
      if (d.handle.includes('s') && !lockV) oh = Math.max(MIN_H, d.oh + dy)
      if (d.handle.includes('w')) {
        ow = Math.max(MIN_W, d.ow - dx)
        ox = d.ox + (d.ow - ow)
      }
      if (d.handle.includes('n') && !lockV) {
        oh = Math.max(MIN_H, d.oh - dy)
        oy = d.oy + (d.oh - oh)
      }
      engine.updateShape({ id: shape.id, x: ox, y: oy, props: { w: ow, h: oh, updatedAt: Date.now() } })
    },
    [engine, shape.id, shape.type, shape.props.collapsed, zoom],
  )

  const onHandleUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }, [])

  return (
    <div
      data-selection-frame
      style={{
        position: 'absolute',
        inset: -3,
        boxSizing: 'border-box',
        border: `${2 / zoom}px solid var(--cv-card-border-selected)`,
        borderRadius: 12,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {HANDLES.map((h) => {
        const horizontal = h.includes('w') ? '0%' : h.includes('e') ? '100%' : '50%'
        const vertical = h.includes('n') ? '0%' : h.includes('s') ? '100%' : '50%'
        return (
          <div
            key={h}
            data-resize-handle={h}
            onPointerDown={onHandleDown(h)}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            style={{
              position: 'absolute',
              left: horizontal,
              top: vertical,
              width: 12,
              height: 12,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              background: '#fff',
              border: `${2 / zoom}px solid var(--cv-card-border-selected)`,
              borderRadius: 3,
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              cursor: handleCursor[h],
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              zIndex: 50,
            }}
          />
        )
      })}
    </div>
  )
}

// 单张卡片浮层：自身订阅选中态，决定在卡片层级中的 z-index；选择框作为其子元素一并渲染。
// 用独立组件承载 useValue，确保 hooks 数量在渲染间稳定（不会在 map 里直接调用 hook）。
function CardLayer({ shape, engine, cam }: { shape: ShapeLike; engine: CanvasEngine; cam: CameraState }) {
  const isSelected = useValue(
    'isSel',
    () => engine.getSelectedShapeIds().includes(shape.id),
    [engine, shape.id],
  )
  const tool = useValue('tool', () => engine.getCurrentToolId(), [engine])
  const left = (shape.x + cam.x) * cam.z
  const top = (shape.y + cam.y) * cam.z
  const noteLike = shape.type === 'note-card'

  // 选中（含拖拽中，因 pointerdown 会先选中）的卡片置顶；其余保持 DOM 顺序
  const interactive = tool === 'select' || tool === 'hand' || tool === 'eraser'

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        transform: `scale(${cam.z})`,
        transformOrigin: '0 0',
        willChange: 'transform, left, top',
        zIndex: isSelected ? 30 : 1,
      }}
    >
      {noteLike ? (
        <OverlayNoteCard shape={shape} engine={engine} zoom={cam.z} />
      ) : shape.type === 'label-card' ? (
        <OverlayLabelCard shape={shape} engine={engine} zoom={cam.z} />
      ) : (
        <OverlayGenericCard shape={shape} engine={engine} zoom={cam.z} />
      )}
      {/* 选择框与卡片为同一整体：选中时作为卡片子元素渲染，共享本层 z-index，不被任何卡片遮挡 */}
      {isSelected && interactive && <CardSelectionFrame shape={shape} engine={engine} zoom={cam.z} />}
    </div>
  )
}

export function CardOverlay({ engine }: { engine: CanvasEngine }) {
  const shapes = useValue(
    'cards',
    () => engine.getCurrentPageShapes().filter((s) => CARD_TYPES.has(s.type)),
    [engine],
  )
  const cam = useValue('cam', () => engine.getCamera(), [engine])

  return (
    <>
      {shapes.map((shape) => (
        <CardLayer key={shape.id} shape={shape} engine={engine} cam={cam} />
      ))}
    </>
  )
}

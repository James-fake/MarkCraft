import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'

/**
 * Aurora 右键菜单（.aurora-canvas-ctxmenu，Portal 到 body）—— 新建/删除/复制/锁定
 */
export interface CanvasContextMenuProps {
  x: number
  y: number
  engine: CanvasEngine | null
  onClose: () => void
}

const ITEMS: { id: string; label: string; icon: string }[] = [
  { id: 'new-note', label: '新建便签', icon: 'file' },
  { id: 'new-rect', label: '新建矩形', icon: 'square' },
  { id: 'new-group', label: '新建分组框', icon: 'group' },
  { id: 'sep' as string, label: '', icon: '' },
  { id: 'delete', label: '删除选中', icon: 'trash' },
  { id: 'duplicate', label: '复制选中', icon: 'copy' },
  { id: 'lock', label: '锁定/解锁', icon: 'target' },
]

export function CanvasContextMenu({ x, y, engine, onClose }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const selectedCount = useEngineSnapshot(engine, (e) => e.getSelectedShapeIds().length, 'session')

  // 点击外部关闭
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [onClose])

  const act = (id: string) => {
    if (!engine) return
    switch (id) {
      case 'new-note': {
        engine.createCardFree('note-card', { text: '新便签', color: '#F59E0B' })
        break
      }
      case 'new-rect': {
        engine.createCardFree('note-card', { text: '矩形', color: '#93C5FD' })
        break
      }
      case 'new-group': {
        const cam = engine.getCamera()
        engine.createShape({
          type: 'group-card',
          x: -cam.x + 160,
          y: -cam.y + 100,
          props: { title: '分组', color: '#94A3B8', w: 340, h: 220 },
        })
        break
      }
      case 'delete': engine.deleteShapes(engine.getSelectedShapeIds()); break
      case 'duplicate': engine.duplicateShapes(engine.getSelectedShapeIds()); break
      case 'lock': {
        const ids = engine.getSelectedShapeIds()
        for (const id of ids) {
          const s = engine.getShape(id)
          if (s) engine.updateShape({ id, isLocked: !s.isLocked })
        }
        break
      }
    }
    onClose()
  }

  const menu = (
    <div
      ref={ref}
      className="aurora-canvas-ctxmenu"
      style={{ position: 'fixed', left: x, top: y, zIndex: 10001 }}
    >
      {ITEMS.map((it) => {
        if (it.id === 'sep') return <div key="sep" className="aurora-canvas-ctxmenu__sep" />
        const IconComp = Icon[it.icon as keyof typeof Icon]
        return (
          <button
            key={it.id}
            type="button"
            className="aurora-canvas-ctxmenu__item"
            onClick={() => act(it.id)}
            disabled={it.id !== 'new-note' && it.id !== 'new-rect' && it.id !== 'new-group' && selectedCount === 0}
          >
            {IconComp ? <IconComp size={14} /> : null}
            <span>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
  return createPortal(menu, document.body)
}

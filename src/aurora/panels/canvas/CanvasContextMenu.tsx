import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'
import { useLanguage } from '@stores/LanguageStore'

/**
 * Aurora 右键菜单（.aurora-canvas-ctxmenu，Portal 到 body）—— 新建/删除/复制/锁定
 */
export interface CanvasContextMenuProps {
  x: number
  y: number
  engine: CanvasEngine | null
  onClose: () => void
  /**
   * 「转为笔记」：把选中的自由便签（未绑文件的 note-card）全文落成真实笔记文件，
   * 并把新文件 id 回写绑定到卡片（编排逻辑在 CanvasPanel）。未传则隐藏该能力。
   */
  onConvertToNote?: () => void
  /**
   * 退场相位（由父级 `usePresenceValue` 驱动）：为 true 时本组件仍在 DOM 中，
   * 只播 100ms 退场动画后由父级卸载（动效审计 P0-3）。x/y 由父级在退场窗口内保留，
   * 所以菜单「从哪弹出来的，就缩回哪去」。
   */
  exiting?: boolean
}

/** 菜单项：label 走语言包键，UI 侧解析 */
type CtxMenuItem =
  | { id: 'sep'; labelKey?: undefined; icon?: undefined }
  | { id: string; labelKey: string; icon: string }

const ITEMS: CtxMenuItem[] = [
  { id: 'new-note', labelKey: 'newNote', icon: 'file' },
  { id: 'new-rect', labelKey: 'newRect', icon: 'square' },
  { id: 'new-group', labelKey: 'newGroup', icon: 'group' },
  { id: 'sep' },
  { id: 'delete', labelKey: 'delete', icon: 'trash' },
  { id: 'duplicate', labelKey: 'duplicate', icon: 'copy' },
  { id: 'to-note', labelKey: 'toNote', icon: 'fileText' },
  { id: 'lock', labelKey: 'lockToggle', icon: 'target' },
]

export function CanvasContextMenu({ x, y, engine, onClose, onConvertToNote, exiting }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()
  const cm = t.canvasCtxMenu
  const selectedCount = useEngineSnapshot(engine, (e) => e.getSelectedShapeIds().length, 'session')
  // 「转为笔记」可用性 = 选中项里存在**未绑文件**的便签（已绑文件的卡片本身就是笔记替身，无需转换）
  const convertibleCount = useEngineSnapshot(
    engine,
    (e) => {
      let n = 0
      for (const id of e.getSelectedShapeIds()) {
        const s = e.getShape(id)
        if (s && s.type === 'note-card' && !s.props.fileId) n++
      }
      return n
    },
    'session',
  ) ?? 0

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
        engine.createCardFree('note-card', { text: cm.defaultNoteText, color: '#F59E0B' })
        break
      }
      case 'new-rect': {
        engine.createCardFree('note-card', { text: cm.defaultRectText, color: '#93C5FD' })
        break
      }
      case 'new-group': {
        const cam = engine.getCamera()
        engine.createShape({
          type: 'group-card',
          x: -cam.x + 160,
          y: -cam.y + 100,
          props: { title: cm.defaultGroupTitle, color: '#94A3B8', w: 340, h: 220 },
        })
        break
      }
      case 'delete': engine.deleteShapes(engine.getSelectedShapeIds()); break
      case 'duplicate': engine.duplicateShapes(engine.getSelectedShapeIds()); break
      case 'to-note': onConvertToNote?.(); break
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
      data-exiting={exiting || undefined}
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
          disabled={
            it.id === 'to-note'
              ? convertibleCount === 0
              : it.id !== 'new-note' && it.id !== 'new-rect' && it.id !== 'new-group' && selectedCount === 0
          }
          title={it.id === 'to-note' ? cm.toNoteHint : undefined}
          >
            {IconComp ? <IconComp size={14} /> : null}
            <span>{(cm as unknown as Record<string, string>)[it.labelKey as string]}</span>
          </button>
        )
      })}
    </div>
  )
  return createPortal(menu, document.body)
}

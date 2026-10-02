import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'

/**
 * 白板键盘快捷键（P4-5 自 CanvasPanel.tsx 抽离）：
 * ⌘K 命令面板 / Ctrl+Z·⇧Z 撤销重做 / Ctrl+Y 重做 / Delete·Backspace 删除选中 / Escape 关浮层。
 *
 * capture 阶段监听：canvas 内 ⌘K 只开本地面板（stopPropagation 阻断主壳全局 ⌘K 总入口，
 * 避免双面板叠加——P3-B 归一后两面板同用 .aurora-command，叠加会渲染 58 条混合命令）。
 */
export function useCanvasHotkeys(
  paletteOpen: boolean,
  engineRef: RefObject<CanvasEngine | null>,
  togglePalette: () => void,
  onEscape: () => void,
) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        togglePalette()
        return
      }
      if (paletteOpen) return
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) engineRef.current?.redo()
        else engineRef.current?.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        engineRef.current?.redo()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = engineRef.current?.getSelectedShapeIds()
        if (ids && ids.length > 0) {
          e.preventDefault()
          engineRef.current?.deleteShapes(ids)
        }
        return
      }
      if (e.key === 'Escape') {
        onEscape()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [paletteOpen, togglePalette, onEscape, engineRef])
}

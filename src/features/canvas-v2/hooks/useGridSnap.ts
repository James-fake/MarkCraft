/**
 * useGridSnap - 网格吸附 hook（P2-8）
 *
 * 监听 shape 变化，将选中的 shape 坐标吸附到网格。
 * 仅在松开鼠标后吸附（通过 store 事件），拖拽过程不拦截。
 */
import { useEffect, useRef } from 'react'
import type { Editor } from '../engine/engineTypes'
import { snapToGrid } from '../utils/layoutUtils'

export function useGridSnap(editor: Editor | null, enabled: boolean, gridSize: number): void {
  const isAdjusting = useRef(false)

  useEffect(() => {
    if (!editor || !enabled) return

    const cleanup = editor.store.listen(() => {
      if (isAdjusting.current) return
      const shapes = editor.getSelectedShapes()
      if (shapes.length === 0) return

      const updates = []
      for (const shape of shapes) {
        const snappedX = snapToGrid(shape.x, gridSize)
        const snappedY = snapToGrid(shape.y, gridSize)
        if (snappedX !== shape.x || snappedY !== shape.y) {
          updates.push({
            id: shape.id,
            type: shape.type,
            x: snappedX,
            y: snappedY,
          })
        }
      }

      if (updates.length > 0) {
        isAdjusting.current = true
        editor.updateShapes(updates)
        requestAnimationFrame(() => { isAdjusting.current = false })
      }
    }, { source: 'user', scope: 'document' })

    return cleanup
  }, [editor, enabled, gridSize])
}

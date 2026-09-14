import type { ReactNode } from 'react'
import { MindMapView } from '@features/canvas-v2/components/views/MindMapView'
import { KanbanView } from '@features/canvas-v2/components/views/KanbanView'
import { TimelineView } from '@features/canvas-v2/components/views/TimelineView'
import { useCanvasEngine } from '@features/canvas-v2/engine/useCanvasEngine'
import type { Editor } from '@features/canvas-v2/engine/engineTypes'

/**
 * 真实引擎视图适配器（重构版）
 *
 * 3 个非自由视图（思维导图/看板/时间轴）复用真实 canvas-v2 的
 * 引擎驱动视图（接收 CanvasEngine——tldraw Editor 鸭子类型）。
 * 仅在 Aurora 外壳（顶栏/书脊）内渲染，不引入 CanvasView 自带界面。
 */
export type NonFreeView = 'mindmap' | 'kanban' | 'timeline'

export interface RealCanvasViewProps {
  view: NonFreeView
  onClose: () => void
}

export function RealCanvasView({ view, onClose }: RealCanvasViewProps) {
  const engine = useCanvasEngine()
  if (!engine) {
    return <div className="aurora-canvas__realwrap-loading">正在加载白板引擎…</div>
  }
  const editor = engine as unknown as Editor
  let content: ReactNode
  switch (view) {
    case 'mindmap':
      content = <MindMapView editor={editor} rootCardId={null} />
      break
    case 'kanban':
      content = <KanbanView editor={editor} />
      break
    case 'timeline':
      content = <TimelineView editor={editor} />
      break
  }
  return (
    <div
      className="aurora-canvas__subview-scrim"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="aurora-canvas__subview-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}

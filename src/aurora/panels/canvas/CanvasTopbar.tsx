import { Icon } from '../../icons'
import type { CanvasViewId } from './CanvasPanel'

/**
 * Aurora 白板顶栏（.aurora-ctop）—— 视图切换（居中）+ 白板名/列表 + 导出
 */
export interface CanvasTopbarProps {
  view: CanvasViewId
  onView: (v: CanvasViewId) => void
  canvasName: string
  onOpenList: () => void
  /** 导出当前白板（JSON+PNG，由 CanvasPanel 提供真实逻辑） */
  onExport?: () => void
  /** 首启锁定态：禁用思维导图/看板/时间轴切换（仅保留白板视图） */
  locked?: boolean
}

const VIEWS: { id: CanvasViewId; label: string; icon: string }[] = [
  { id: 'canvas', label: '白板', icon: 'canvas' },
  { id: 'mindmap', label: '思维导图', icon: 'mindmap' },
  { id: 'kanban', label: '看板', icon: 'kanban' },
  { id: 'timeline', label: '时间轴', icon: 'timeline' },
]

export function CanvasTopbar({ view, onView, canvasName, onOpenList, onExport, locked }: CanvasTopbarProps) {
  return (
    <div className="aurora-ctop">
      <div className="aurora-ctop__left">
        <button type="button" className="aurora-ctop__name" onClick={onOpenList} title="白板列表">
          <Icon.file size={14} />
          <span>{canvasName || '未命名白板'}</span>
          <Icon.chevronDown size={12} />
        </button>
      </div>

      <div className="aurora-ctop__switcher" role="tablist" aria-label="视图切换">
        {VIEWS.map((v) => {
          const IconComp = Icon[v.icon as keyof typeof Icon]
          const disabled = !!locked && v.id !== 'canvas'
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              aria-disabled={disabled}
              disabled={disabled}
              className={`aurora-ctop__view ${view === v.id ? 'aurora-ctop__view--active' : ''}${disabled ? ' aurora-ctop__view--disabled' : ''}`}
              onClick={() => { if (disabled) return; onView(v.id) }}
            >
              {IconComp ? <IconComp size={15} className="aurora-ctop__view-icon" /> : null}
              <span>{v.label}</span>
            </button>
          )
        })}
      </div>

      <div className="aurora-ctop__right">
        {onExport && (
          <button type="button" className="aurora-ctop__export" onClick={onExport} title="导出当前白板（PNG+JSON）" aria-label="导出当前白板">
            <Icon.download size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

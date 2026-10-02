import { Icon } from '../../icons'
import { TYPE_ICON, type ParsedShape } from './inspectorPanelShared'

// ───────────── 图层 ─────────────
export function LayersTab({
  shapes,
  selectedIds,
  onPick,
  onToggleLock,
  filePathById,
}: {
  shapes: ParsedShape[]
  selectedIds: string[]
  onPick: (id: string) => void
  onToggleLock: (id: string) => void
  filePathById: Map<string, string>
}) {
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">图层（{shapes.length}）</div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">白板暂无元素</div>
      ) : (
        <div className="aurora-cip__layers">
          {[...shapes].reverse().map((s) => {
            const IconComp = Icon[TYPE_ICON[s.type] ?? 'shapes']
            const active = selectedIds.includes(s.id)
            return (
              <div
                key={s.id}
                className={`aurora-cip__layer ${active ? 'aurora-cip__layer--active' : ''}`}
                onClick={() => onPick(s.id)}
              >
                {IconComp ? <IconComp size={12} className="aurora-cip__layer-icon" /> : null}
                <span className="aurora-cip__layer-name" title={s.text}>
                  {s.text || (s.type === 'note-card' ? '(空卡片)' : s.type)}
                </span>
                {s.fileId && filePathById.get(s.fileId) && (
                  <span className="aurora-cip__layer-btn" title={filePathById.get(s.fileId)}>
                    <Icon.file size={11} className="aurora-cip__layer-icon" />
                  </span>
                )}
                <button
                  type="button"
                  className="aurora-cip__layer-btn"
                  title={s.isLocked ? '解锁' : '锁定'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLock(s.id)
                  }}
                >
                  <Icon.lock size={11} className={s.isLocked ? '' : 'aurora-cip__layer-icon'} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

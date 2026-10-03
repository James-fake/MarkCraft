import { Icon } from '../../icons'
import { TYPE_ICON, type ParsedShape } from './inspectorPanelShared'
import { useLanguage } from '@stores/LanguageStore'

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
  const { t } = useLanguage()
  const ct = t.canvasTab
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">{ct.layersTitle.replace(String.raw`{n}`, String(shapes.length))}</div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">{ct.layersEmpty}</div>
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
                  {s.text || (s.type === 'note-card' ? ct.emptyCard : s.type)}
                </span>
                {s.fileId && filePathById.get(s.fileId) && (
                  <span className="aurora-cip__layer-btn" title={filePathById.get(s.fileId)}>
                    <Icon.file size={11} className="aurora-cip__layer-icon" />
                  </span>
                )}
                <button
                  type="button"
                  className="aurora-cip__layer-btn"
                  title={s.isLocked ? ct.layerUnlock : ct.layerLock}
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

import { Icon } from '../../icons'
import type { ParsedShape } from './inspectorPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 收藏 ─────────────
export function FavTab({
  shapes,
  mode,
  setMode,
  onPick,
  onToggleFav,
}: {
  shapes: ParsedShape[]
  mode: 'grid' | 'list'
  setMode: (m: 'grid' | 'list') => void
  onPick: (id: string) => void
  onToggleFav: (id: string, v: boolean) => void
}) {
  const { t } = useLanguage()
  const ch = t.canvasTab
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__header-row">
        <span className="aurora-cip__section-title">{ch.favTitle.replace('{n}', String(shapes.length))}</span>
        <div className="aurora-cip__viewtoggle">
          <button
            type="button"
            className={mode === 'grid' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('grid')}
            title={ch.favGridView}
          >
            <Icon.grid size={13} />
          </button>
          <button
            type="button"
            className={mode === 'list' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('list')}
            title={ch.favListView}
          >
            <Icon.list size={13} />
          </button>
        </div>
      </div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">
          {ch.favEmpty}<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>{ch.favEmptyHint}</span>
        </div>
      ) : (
        <div className={mode === 'grid' ? 'aurora-cip__fav-grid' : 'aurora-cip__fav-list'}>
          {shapes.map((s) => (
            <div key={s.id} className="aurora-cip__fav" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__fav-title">{s.text || ch.favEmptyCard}</span>
              <button
                type="button"
                className="aurora-cip__fav-x"
                title={ch.favRemove}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFav(s.id, false)
                }}
              >
                <Icon.star size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

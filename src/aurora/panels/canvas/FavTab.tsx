import { Icon } from '../../icons'
import type { ParsedShape } from './inspectorPanelShared'

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
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__header-row">
        <span className="aurora-cip__section-title">收藏（{shapes.length}）</span>
        <div className="aurora-cip__viewtoggle">
          <button
            type="button"
            className={mode === 'grid' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('grid')}
            title="网格"
          >
            <Icon.grid size={13} />
          </button>
          <button
            type="button"
            className={mode === 'list' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('list')}
            title="列表"
          >
            <Icon.list size={13} />
          </button>
        </div>
      </div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">
          暂无收藏<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>选中卡片后在属性面板打开「置顶」即可收藏</span>
        </div>
      ) : (
        <div className={mode === 'grid' ? 'aurora-cip__fav-grid' : 'aurora-cip__fav-list'}>
          {shapes.map((s) => (
            <div key={s.id} className="aurora-cip__fav" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__fav-title">{s.text || '(空卡片)'}</span>
              <button
                type="button"
                className="aurora-cip__fav-x"
                title="取消收藏"
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

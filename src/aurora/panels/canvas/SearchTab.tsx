import { useMemo } from 'react'
import { Icon } from '../../icons'
import type { ParsedShape } from './inspectorPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 搜索 ─────────────
export function SearchTab({
  shapes,
  q,
  setQ,
  onPick,
}: {
  shapes: ParsedShape[]
  q: string
  setQ: (v: string) => void
  onPick: (id: string) => void
}) {
  const { t } = useLanguage()
  const ct = t.canvasTab
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return shapes
      .filter((s) => s.text.toLowerCase().includes(term) || s.type.toLowerCase().includes(term))
      .slice(0, 30)
  }, [shapes, q])
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__search">
        <Icon.search size={12} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ct.searchPlaceholder}
          aria-label={ct.searchAria}
        />
        {q && (
          <button type="button" className="aurora-cip__search-opt" onClick={() => setQ('')} title={ct.clearSearch} aria-label={ct.clearSearchAria}>
            <Icon.close size={12} />
          </button>
        )}
      </div>
      {!q.trim() ? (
        <div className="aurora-cip__empty">{ct.searchEmptyHint}</div>
      ) : results.length === 0 ? (
        <div className="aurora-cip__empty">{ct.searchNoMatch.replace(String.raw`{q}`, q)}</div>
      ) : (
        <div className="aurora-cip__layers">
          {results.map((s) => (
            <button key={s.id} type="button" className="aurora-cip__layer" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__layer-name">{s.text || s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

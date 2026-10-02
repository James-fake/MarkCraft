import { useMemo } from 'react'
import { Icon } from '../../icons'
import type { ParsedShape } from './inspectorPanelShared'

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
          placeholder="搜索白板元素…"
          aria-label="搜索白板元素"
        />
        {q && (
          <button type="button" className="aurora-cip__search-opt" onClick={() => setQ('')} title="清空" aria-label="清空搜索">
            <Icon.close size={12} />
          </button>
        )}
      </div>
      {!q.trim() ? (
        <div className="aurora-cip__empty">输入关键词搜索白板上的卡片与图形</div>
      ) : results.length === 0 ? (
        <div className="aurora-cip__empty">未匹配到「{q}」</div>
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

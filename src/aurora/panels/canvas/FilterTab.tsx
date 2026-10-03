import { useMemo } from 'react'
import type { ParsedShape } from './inspectorPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 筛选 ─────────────
export function FilterTab({
  shapes,
  allTags,
  filterTags,
  setFilterTags,
  filterTagLogic,
  setFilterTagLogic,
  filterTypes,
  setFilterTypes,
  filterStatus,
  setFilterStatus,
  onPick,
}: {
  shapes: ParsedShape[]
  allTags: string[]
  filterTags: Set<string>
  setFilterTags: (s: Set<string>) => void
  filterTagLogic: 'AND' | 'OR'
  setFilterTagLogic: (v: 'AND' | 'OR') => void
  filterTypes: Set<string>
  setFilterTypes: (s: Set<string>) => void
  filterStatus: 'all' | 'locked' | 'unlocked'
  setFilterStatus: (v: 'all' | 'locked' | 'unlocked') => void
  onPick: (id: string) => void
}) {
  // 注意：本组件内多处用 t 作 map 变量（标签/类型），故语言对象解构为 lang
  const { t: lang } = useLanguage()
  const cf = lang.canvasTab
  const typeSet = useMemo(() => {
    const t = new Set<string>()
    for (const s of shapes) {
      if (s.type !== 'arrow') t.add(s.type)
    }
    return Array.from(t).sort()
  }, [shapes])
  const toggleTag = (t: string) => {
    const next = new Set(filterTags)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setFilterTags(next)
  }
  const toggleType = (t: string) => {
    const next = new Set(filterTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setFilterTypes(next)
  }
  const clearAll = () => {
    setFilterTags(new Set())
    setFilterTypes(new Set())
    setFilterStatus('all')
  }
  const matched = useMemo(() => {
    return shapes.filter((s) => {
      if (filterStatus === 'locked' && !s.isLocked) return false
      if (filterStatus === 'unlocked' && s.isLocked) return false
      if (filterTypes.size > 0 && !filterTypes.has(s.type)) return false
      if (filterTags.size > 0) {
        const has = (t: string) => s.tags.includes(t)
        const ok = filterTagLogic === 'AND'
          ? Array.from(filterTags).every(has)
          : Array.from(filterTags).some(has)
        if (!ok) return false
      }
      return true
    })
  }, [shapes, filterStatus, filterTypes, filterTags, filterTagLogic])
  const clearBtn = (
    <button
      type="button"
      className="aurora-cip__more"
      onClick={clearAll}
      disabled={filterTags.size === 0 && filterTypes.size === 0 && filterStatus === 'all'}
    >
      {cf.filterClearAll}
    </button>
  )
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">{cf.filterTagsTitle}</div>
      <div className="aurora-cip__seg" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`aurora-cip__seg-btn ${filterTagLogic === 'AND' ? 'aurora-cip__seg-btn--on' : ''}`}
          onClick={() => setFilterTagLogic('AND')}
        >
          AND
        </button>
        <button
          type="button"
          className={`aurora-cip__seg-btn ${filterTagLogic === 'OR' ? 'aurora-cip__seg-btn--on' : ''}`}
          onClick={() => setFilterTagLogic('OR')}
        >
          OR
        </button>
      </div>
      <div className="aurora-cip__chips">
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            className={`aurora-cip__chip ${filterTags.has(t) ? 'aurora-cip__chip--on' : ''}`}
            onClick={() => toggleTag(t)}
          >
            #{t}
          </button>
        ))}
      </div>
      <div className="aurora-cip__section-title">{cf.filterTypesTitle}</div>
      <div className="aurora-cip__types">
        {typeSet.map((t) => (
          <label key={t} className="aurora-cip__type">
            <input type="checkbox" checked={filterTypes.has(t)} onChange={() => toggleType(t)} />
            <span>{t}</span>
          </label>
        ))}
      </div>
      <div className="aurora-cip__section-title">{cf.filterStatusTitle}</div>
      <div className="aurora-cip__radio">
        {([['all', cf.filterAll], ['locked', cf.filterLocked], ['unlocked', cf.filterUnlocked]] as const).map(([v, label]) => (
          <label key={v} className="aurora-cip__radio-item">
            <input type="radio" name="aurora-cip-status" checked={filterStatus === v} onChange={() => setFilterStatus(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {clearBtn}
      <div className="aurora-cip__section-title">{cf.filterMatched.replace(String.raw`{n}`, String(matched.length))}</div>
      {matched.length === 0 ? (
        <div className="aurora-cip__empty">{cf.filterEmpty}</div>
      ) : (
        <div className="aurora-cip__layers">
          {matched.slice(0, 30).map((s) => (
            <button key={s.id} type="button" className="aurora-cip__layer" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__layer-name">{s.text || s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

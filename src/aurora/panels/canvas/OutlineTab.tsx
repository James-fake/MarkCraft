import { useMemo, useState } from 'react'
import { Icon } from '../../icons'
import type { ParsedShape } from './sidebarPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 大纲 ─────────────
export function OutlineTab({
  noteCards, otherCount, q, setQ, scrolled, onJump,
}: {
  noteCards: ParsedShape[]
  otherCount: number
  q: string
  setQ: (v: string) => void
  scrolled: boolean
  onJump: (id: string) => void
}) {
  const { t } = useLanguage()
  const ct = t.canvasTab
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return noteCards
    return noteCards.filter((c) => c.text.toLowerCase().includes(term))
  }, [noteCards, q])
  // 搜索框默认隐藏，下滑（scrolled）或已输入查询时才浮现，回到顶部且查询空则收起
  const revealSearch = scrolled || q.trim().length > 0

  // spec 20：前 3 根、其余子 → 前 3 个展开，剩余折叠在「其他 (N)」下
  const [expanded, setExpanded] = useState(true)
  const roots = filtered.slice(0, 3)
  const others = filtered.slice(3)

  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">{ct.outlineTitle}</div>
        <div className="aurora-csp__sub">{ct.outlineSub.replace(String.raw`{n}`, String(noteCards.length)).replace(String.raw`{m}`, String(otherCount))}</div>
      </div>
      <div className={`aurora-csp__search ${revealSearch ? '' : 'aurora-csp__search--hidden'}`}>
        <Icon.search size={12} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ct.outlineSearch}
        />
      </div>
      {noteCards.length === 0 ? (
        <div className="aurora-csp__empty">
          {ct.outlineEmpty}<br />
          {ct.outlineEmptyHint}
        </div>
      ) : filtered.length === 0 ? (
        <div className="aurora-csp__empty">{ct.outlineNoMatch.replace(String.raw`{q}`, q)}</div>
      ) : (
        <div className="aurora-csp__list">
          {roots.map((c) => (
            <OutlineRow key={c.id} shape={c} onJump={onJump} />
          ))}
          {others.length > 0 && (
            <>
              <button
                type="button"
                className="aurora-csp__item aurora-csp__tagitem"
                onClick={() => setExpanded((v) => !v)}
                style={{ justifyContent: 'flex-start' }}
              >
                <span className={`aurora-csp__arrow ${expanded ? 'aurora-csp__arrow--open' : ''}`}>
                  <Icon.chevronRight size={12} />
                </span>
                <span className="aurora-csp__item-title">
                  {ct.outlineOthers.replace(String.raw`{n}`, String(others.length))}
                </span>
              </button>
              {expanded && others.map((c) => (
                <div key={c.id} style={{ paddingLeft: 14 }}>
                  <OutlineRow shape={c} onJump={onJump} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function OutlineRow({ shape, onJump }: { shape: ParsedShape; onJump: (id: string) => void }) {
  const { t } = useLanguage()
  const ct = t.canvasTab
  return (
    <button type="button" className="aurora-csp__item" onClick={() => onJump(shape.id)}>
      <span className="aurora-csp__arrow-ghost" />
      <span className="aurora-csp__dot" style={{ background: 'var(--mc-accent)' }} />
      <span className="aurora-csp__item-title">{shape.text || ct.emptyCard}</span>
      {shape.fileId && <Icon.fileText size={12} className="aurora-csp__filelink" />}
    </button>
  )
}

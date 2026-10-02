// ───────────── 标签 ─────────────
export function TagsTab({
  tags, getTagCount, picked, onToggle, onClear, tagLogic, setTagLogic,
}: {
  tags: string[]
  getTagCount: (t: string) => number
  picked: Set<string>
  onToggle: (t: string) => void
  onClear: () => void
  tagLogic: 'AND' | 'OR'
  setTagLogic: (v: 'AND' | 'OR') => void
}) {
  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">标签</div>
        <div className="aurora-csp__sub">{picked.size > 0 ? `${picked.size} 已选` : '未筛选'}</div>
      </div>
      <div className="aurora-csp__logic">
        <button
          type="button"
          className={`aurora-csp__logic-btn ${tagLogic === 'AND' ? 'aurora-csp__logic-btn--on' : ''}`}
          onClick={() => setTagLogic('AND')}
        >
          AND
        </button>
        <button
          type="button"
          className={`aurora-csp__logic-btn ${tagLogic === 'OR' ? 'aurora-csp__logic-btn--on' : ''}`}
          onClick={() => setTagLogic('OR')}
        >
          OR
        </button>
      </div>
      {tags.length === 0 ? (
        <div className="aurora-csp__empty">
          暂无标签<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>在笔记中使用 #标签 即可创建</span>
        </div>
      ) : (
        <div className="aurora-csp__list">
          {tags.map((t) => {
            const count = getTagCount(t)
            const on = picked.has(t)
            return (
              <button
                key={t}
                type="button"
                className={`aurora-csp__tagitem ${on ? 'aurora-csp__tagitem--on' : ''}`}
                onClick={() => onToggle(t)}
              >
                <span className="aurora-csp__tag-hash" style={{ color: on ? 'var(--mc-accent)' : 'var(--mc-text-tertiary)' }}>#</span>
                <span className="aurora-csp__tag-name">{t}</span>
                <span className="aurora-csp__tag-count">{count}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="aurora-csp__footer">
        <span style={{ fontSize: 11, color: 'var(--mc-text-tertiary)' }}>{tagLogic} 匹配</span>
        <button
          type="button"
          className="aurora-csp__footer-btn"
          disabled={picked.size === 0}
          onClick={onClear}
        >
          清除筛选
        </button>
      </div>
    </div>
  )
}

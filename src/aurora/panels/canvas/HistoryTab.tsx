import { Icon } from '../../icons'
import type { NoteVersion } from '@stores/NoteVersionStore'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 历史 ─────────────
type GroupKey = 'today' | 'yesterday' | 'earlier'

export function HistoryTab({
  groups, onDelete, onLock, filePathById,
}: {
  groups: { today: NoteVersion[]; yesterday: NoteVersion[]; earlier: NoteVersion[] }
  onDelete: (vid: string) => void
  onLock: (vid: string) => void
  filePathById: Map<string, string>
}) {
  const { t } = useLanguage()
  const ch = t.canvasTab
  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  const opLabel = (op: string) =>
    op === 'manual' ? ch.historyManual : op === 'auto' ? ch.historyAuto : ch.historySave
  const groupTitle = (k: GroupKey) =>
    k === 'today' ? ch.historyToday : k === 'yesterday' ? ch.historyYesterday : ch.historyEarlier
  const renderGroup = (k: GroupKey, list: NoteVersion[]) => {
    if (list.length === 0) return null
    const title = groupTitle(k)
    return (
      <>
        <div className="aurora-csp__section-title">{title}</div>
        <div className="aurora-csp__timeline">
          {list.map((v, i) => (
            <div key={v.versionId} className="aurora-csp__hist">
              <span className={`aurora-csp__hist-dot ${i === 0 && k === 'today' ? 'aurora-csp__hist-dot--new' : ''}`} />
              <span className="aurora-csp__hist-icon"><Icon.save size={12} /></span>
              <div className="aurora-csp__hist-main">
                <div className="aurora-csp__hist-label">{opLabel(v.operation)} · {v.wordCount}{ch.historyWordUnit}</div>
                <div className="aurora-csp__hist-time">
                  {filePathById.get(v.fileId) ?? v.fileId} · {fmtTime(v.timestamp)}
                </div>
              </div>
              <div className="aurora-csp__hist-actions">
                <button type="button" title={v.locked ? ch.historyUnlock : ch.historyLock} onClick={() => onLock(v.versionId)}>
                  {v.locked ? <Icon.lock size={11} /> : <Icon.star size={11} />}
                </button>
                <button type="button" title={ch.historyDelete} onClick={() => onDelete(v.versionId)}>
                  <Icon.trash size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }
  const total = groups.today.length + groups.yesterday.length + groups.earlier.length
  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">{ch.historyTitle}</div>
        <div className="aurora-csp__sub">{ch.historyCount.replace('{n}', String(total))}</div>
      </div>

      {renderGroup('today', groups.today)}
      {renderGroup('yesterday', groups.yesterday)}
      {renderGroup('earlier', groups.earlier)}
      {total === 0 && (
        <div className="aurora-csp__empty">
          {ch.historyEmpty}<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>{ch.historyEmptyHint}</span>
        </div>
      )}
    </div>
  )
}

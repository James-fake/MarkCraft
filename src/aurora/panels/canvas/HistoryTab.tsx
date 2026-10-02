import { Icon } from '../../icons'
import type { NoteVersion } from '@stores/NoteVersionStore'

// ───────────── 历史 ─────────────
export function HistoryTab({
  groups, onDelete, onLock, filePathById,
}: {
  groups: { today: NoteVersion[]; yesterday: NoteVersion[]; earlier: NoteVersion[] }
  onDelete: (vid: string) => void
  onLock: (vid: string) => void
  filePathById: Map<string, string>
}) {
  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  const opLabel = (op: string) => op === 'manual' ? '手动保存' : op === 'auto' ? '自动保存' : '保存'
  const renderGroup = (title: string, list: NoteVersion[]) => {
    if (list.length === 0) return null
    return (
      <>
        <div className="aurora-csp__section-title">{title}</div>
        <div className="aurora-csp__timeline">
          {list.map((v, i) => (
            <div key={v.versionId} className="aurora-csp__hist">
              <span className={`aurora-csp__hist-dot ${i === 0 && title === '今天' ? 'aurora-csp__hist-dot--new' : ''}`} />
              <span className="aurora-csp__hist-icon"><Icon.save size={12} /></span>
              <div className="aurora-csp__hist-main">
                <div className="aurora-csp__hist-label">{opLabel(v.operation)} · {v.wordCount} 字</div>
                <div className="aurora-csp__hist-time">
                  {filePathById.get(v.fileId) ?? v.fileId} · {fmtTime(v.timestamp)}
                </div>
              </div>
              <div className="aurora-csp__hist-actions">
                <button type="button" title={v.locked ? '解锁' : '锁定'} onClick={() => onLock(v.versionId)}>
                  {v.locked ? <Icon.lock size={11} /> : <Icon.star size={11} />}
                </button>
                <button type="button" title="删除版本" onClick={() => onDelete(v.versionId)}>
                  <Icon.trash size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }
  return (
    <div className="aurora-csp__panel">
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">历史</div>
        <div className="aurora-csp__sub">{groups.today.length + groups.yesterday.length + groups.earlier.length} 版本</div>
      </div>

      {renderGroup('今天', groups.today)}
      {renderGroup('昨天', groups.yesterday)}
      {renderGroup('更早', groups.earlier)}
      {groups.today.length + groups.yesterday.length + groups.earlier.length === 0 && (
        <div className="aurora-csp__empty">
          暂无历史版本<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>对白板的操作会自动产生撤销栈</span>
        </div>
      )}
    </div>
  )
}

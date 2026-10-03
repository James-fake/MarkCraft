import { useState } from 'react'
import { Icon } from '../../icons'
import { NoteHoverCardView } from '@features/editor/components/NoteHoverCard'
import type { ParsedShape } from './sidebarPanelShared'
import { useLanguage } from '@stores/LanguageStore'

// ───────────── 反链 ─────────────
export function BacklinksTab({
  selected, backlinks, outgoing, filePathById, onOpenFile,
}: {
  selected: ParsedShape | undefined
  backlinks: { sourceFileId: string; target: string; relation?: string }[]
  outgoing: { sourceFileId: string; target: string; relation?: string }[]
  filePathById: Map<string, string>
  onOpenFile?: (fileId: string) => void
}) {
  const { t } = useLanguage()
  const cb = t.canvasTab
  // hover 卡片（P2-3：对齐编辑器反链的悬浮预览）
  const [hover, setHover] = useState<{ x: number; y: number; fileId: string; label: string; rel?: string } | null>(null)
  const showHover = (e: React.MouseEvent, fileId: string, rel?: string) => {
    const label = filePathById.get(fileId) ?? fileId
    setHover({ x: e.clientX, y: e.clientY, fileId, label, rel })
  }
  if (!selected) {
    return (
      <div className="aurora-csp__panel">
        <div className="aurora-csp__header">
          <div className="aurora-csp__title">{cb.backlinksTitle}</div>
        </div>
        <div className="aurora-csp__empty">
          {cb.backlinksEmpty}<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>{cb.backlinksEmptyHint}</span>
        </div>
      </div>
    )
  }
  const hoverCard = hover && (
    <div
      style={{
        position: 'fixed',
        left: Math.min(hover.x + 14, window.innerWidth - 300),
        top: Math.min(hover.y + 10, window.innerHeight - 120),
        // 层级由卡片自带的 .aurora-dropdown 基底（锚定浮层带 1000）决定，
        // 定位容器不再自持 z-index（原 10002 属越带魔数，见 tokens.css §14）。
        pointerEvents: 'none',
      }}
      onMouseLeave={() => setHover(null)}
    >
      <NoteHoverCardView
        data={{
          title: hover.label,
          summary: hover.rel ?? '',
          backlinkCount: 0,
          outgoingCount: 0,
          tags: [],
          broken: false,
          fuzzy: false,
          fileId: hover.fileId,
        }}
        onOpen={onOpenFile}
        width={280}
      />
    </div>
  )
  return (
    <div className="aurora-csp__panel">
      {hoverCard}
      <div className="aurora-csp__header">
        <div className="aurora-csp__title">{cb.backlinksTitle}</div>
        <div className="aurora-csp__sub">
          {(filePathById.get(selected.fileId) ?? selected.text) || cb.currentCard}
        </div>
      </div>
      <div className="aurora-csp__section-title">{cb.inLinks.replace(String.raw`{n}`, String(backlinks.length))}</div>
      {backlinks.length === 0 ? (
        <div className="aurora-csp__empty" style={{ padding: '12px' }}>{cb.noInLinks}</div>
      ) : (
        backlinks.slice(0, 12).map((b, i) => (
          <div key={`in-${i}`} className="aurora-csp__linkcard" onMouseEnter={(e) => showHover(e, b.sourceFileId, b.relation)} onMouseLeave={() => setHover(null)}>
            <div className="aurora-csp__linkcard-title">
              <Icon.fileText size={12} className="aurora-csp__filelink" />
              <span>{filePathById.get(b.sourceFileId) ?? b.sourceFileId}</span>
            </div>
            {b.relation && <span className="aurora-csp__realtag">{b.relation}</span>}
          </div>
        ))
      )}
      <div className="aurora-csp__section-title">{cb.outLinks.replace(String.raw`{n}`, String(outgoing.length))}</div>
      {outgoing.length === 0 ? (
        <div className="aurora-csp__empty" style={{ padding: '12px' }}>{cb.noOutLinks}</div>
      ) : (
        outgoing.slice(0, 12).map((o, i) => (
          <div key={`out-${i}`} className="aurora-csp__linkcard" onMouseEnter={(e) => showHover(e, o.sourceFileId, o.relation)} onMouseLeave={() => setHover(null)}>
            <div className="aurora-csp__linkcard-title">
              <Icon.link size={12} className="aurora-csp__filelink" />
              <span>{o.target}</span>
            </div>
            {o.relation && <span className="aurora-csp__realtag aurora-csp__realtag--success">{o.relation}</span>}
          </div>
        ))
      )}
    </div>
  )
}

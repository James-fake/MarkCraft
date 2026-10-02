import { useMemo } from 'react'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import type { ParsedShape } from './inspectorPanelShared'

// ───────────── 推荐（真实关联笔记） ─────────────
export function RecTab({
  engine,
  shapes,
  getOutgoingLinks,
  filePathById,
}: {
  engine: CanvasEngine | null
  shapes: ParsedShape[]
  getOutgoingLinks: (fileId: string) => { target: string; relation?: string; context?: string }[]
  filePathById: Map<string, string>
}) {
  const onCanvasFileIds = useMemo(() => new Set(shapes.map((s) => s.fileId).filter(Boolean)), [shapes])
  const recs = useMemo(() => {
    const seen = new Map<string, { name: string; fileId: string; relation: string }>()
    for (const s of shapes) {
      if (!s.fileId) continue
      for (const link of getOutgoingLinks(s.fileId)) {
        const targetName = link.target.replace(/#.*$/, '').replace(/\.md$/, '')
        const targetFileId = Array.from(filePathById.entries())
          .find(([, path]) => path.replace(/\.md$/, '') === targetName || path.endsWith(`${targetName}.md`))?.[0]
        if (!targetFileId || onCanvasFileIds.has(targetFileId)) continue
        const key = targetFileId
        if (!seen.has(key)) {
          seen.set(key, { name: targetName, fileId: targetFileId, relation: link.relation || '关联' })
        }
      }
    }
    return Array.from(seen.values()).slice(0, 12)
  }, [shapes, getOutgoingLinks, filePathById, onCanvasFileIds])

  const addToCanvas = (fileId: string, name: string) => {
    if (!engine) return
    const v = engine.getViewportPageBounds()
    const pos = engine.findFreeSlot({ x: v.x + 80, y: v.y + 80 }, 260, 200)
    engine.createShape({
      type: 'note-card',
      x: pos.x,
      y: pos.y,
      props: { text: name, w: 260, h: 200, fileId, color: '#F59E0B' },
    })
  }

  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">关联笔记推荐</div>
      {recs.length === 0 ? (
        <div className="aurora-cip__empty">
          暂无关联笔记推荐<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>白板卡片关联的笔记已全部在白板上</span>
        </div>
      ) : (
        recs.map((r) => (
          <div key={r.fileId} className="aurora-cip__rec">
            <div className="aurora-cip__rec-title">{r.name}</div>
            <div className="aurora-cip__rec-meta">
              {filePathById.get(r.fileId) ?? r.fileId} · {r.relation}
            </div>
            <div className="aurora-cip__rec-actions">
              <button type="button" className="aurora-cip__rec-add" onClick={() => addToCanvas(r.fileId, r.name)}>
                <Icon.plus size={11} /> 添加到白板
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

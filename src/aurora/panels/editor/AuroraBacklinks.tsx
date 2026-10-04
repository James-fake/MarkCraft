import { useMemo } from 'react'
import { Icon } from '../../icons'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useLanguage } from '@stores/LanguageStore'
import {
  extractNeighborhood,
  layoutMiniGraph,
} from '@features/editor/noteGraphUtils'

const GRAPH_W = 224
const GRAPH_H = 168

interface AuroraBacklinksProps {
  /** 当前笔记 id（来自编辑器 activeFileId） */
  activeFileId?: string
  /** 点击反链 / 图谱节点时打开对应笔记 */
  onOpenNote: (fileId: string) => void
}

/**
 * Aurora 块级反链面板（编辑器右栏 · 块级反链 Tab · 换芯）
 *
 * 对齐 Aurora 设计（与大纲 Tab 同款视觉语言）：
 *  - 数据：真实 `useLinkIndex`（getBacklinks / getGraphData）+ noteGraphUtils（迷你图谱布局）。
 *  - 界面：面板头（标题 + 计数）+ 反链列表 + 迷你图谱；配色统一 --mc-accent，
 *          无旧界面的 #a78bfa 硬色 / 胶囊徽章 / Inter 字体。
 *  - 交互：反链项点击经 onOpenNote 跳转；图谱节点点击跳转；默认展开。
 */
export function AuroraBacklinks({ activeFileId, onOpenNote }: AuroraBacklinksProps) {
  const { t } = useLanguage()
  const { getBacklinks, getGraphData, indexVersion } = useLinkIndex()

  const backlinks = useMemo(() => {
    if (!activeFileId) return []
    const seen = new Set<string>()
    const list: Array<{ id: string; title: string }> = []
    for (const rec of getBacklinks(activeFileId)) {
      if (seen.has(rec.sourceFileId)) continue
      seen.add(rec.sourceFileId)
      list.push({ id: rec.sourceFileId, title: rec.sourceFileName })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, indexVersion])

  const positioned = useMemo(() => {
    if (!activeFileId) {
      return { positions: [] as Array<{ id: string; label: string; x: number; y: number; isCenter: boolean }>, edgeKeys: [] as Array<[string, string]> }
    }
    const graph = getGraphData()
    const mini = extractNeighborhood(graph.nodes, graph.edges, activeFileId)
    const positions = layoutMiniGraph(mini, GRAPH_W, GRAPH_H)
    const ids = new Set(positions.map((p) => p.id))
    const edgeKeys = mini.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => [e.source, e.target] as [string, string])
    return { positions, edgeKeys }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, indexVersion])

  const hasGraph = positioned.positions.length > 1

  return (
    <div className="aurora-backlinks">
      <div className="aurora-outline__header">
        <div className="aurora-outline__title">
          <span className="aurora-outline__title-bar" />
          <span>{t.auroraEditor.backlinksTitle}</span>
          {backlinks.length > 0 && <span className="aurora-outline__count">{t.auroraEditor.backlinksCount.replace('{n}', String(backlinks.length))}</span>}
        </div>
      </div>

      <div className="aurora-backlinks__list">
        <div className="aurora-backlinks__section-label">{t.writingAid.backlinks.replace('{n}', String(backlinks.length))}</div>
        {backlinks.length === 0 ? (
          <div className="aurora-backlinks__hint">{t.writingAid.backlinksEmpty}</div>
        ) : (
          <div className="aurora-backlinks__items">
            {backlinks.map((b) => (
              <button
                key={b.id}
                type="button"
                className="aurora-backlinks__item"
                onClick={() => onOpenNote(b.id)}
                title={t.writingAid.openNote.replace('{name}', b.title)}
              >
                <Icon.link size={13} className="aurora-backlinks__item-icon" />
                <span className="aurora-backlinks__item-title">{b.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="aurora-backlinks__section-label">{t.writingAid.miniGraph}</div>
        {!activeFileId ? (
          <div className="aurora-backlinks__hint">{t.writingAid.miniGraphEmpty}</div>
        ) : (
          <svg
            className="aurora-backlinks__graph"
            width="100%"
            viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
            role="img"
            aria-label={t.writingAid.miniGraphAria}
          >
            {positioned.edgeKeys.map(([s, tt], i) => {
              const a = positioned.positions.find((p) => p.id === s)!
              const b = positioned.positions.find((p) => p.id === tt)!
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--mc-border-medium)"
                  strokeWidth={1}
                />
              )
            })}
            {positioned.positions.map((p) => (
              <g
                key={p.id}
                style={{ cursor: p.isCenter ? 'default' : 'pointer' }}
                onClick={() => {
                  if (!p.isCenter) onOpenNote(p.id)
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.isCenter ? 9 : 6}
                  fill={p.isCenter ? 'var(--mc-accent)' : 'var(--mc-accent-soft)'}
                  stroke={p.isCenter ? 'var(--mc-accent)' : 'var(--mc-border-medium)'}
                  strokeWidth={1}
                />
                <text
                  x={p.x}
                  y={p.y - (p.isCenter ? 14 : 11)}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--mc-text-tertiary)"
                >
                  {p.label.length > 6 ? `${p.label.slice(0, 6)}…` : p.label}
                </text>
              </g>
            ))}
            {!hasGraph && (
              <text x={GRAPH_W / 2} y={GRAPH_H / 2 + 26} textAnchor="middle" fontSize={9} fill="var(--mc-text-tertiary)">
                {t.writingAid.miniGraphNoRelated}
              </text>
            )}
          </svg>
        )}
      </div>
    </div>
  )
}

export default AuroraBacklinks

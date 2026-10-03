/**
 * P1-4 编辑器内反链 / 迷你图谱侧栏
 *
 * 常驻于编辑器右侧（大纲列内），展示：
 *  - 反链：哪些笔记用 [[wikilink]] 指向当前笔记（来自 LinkIndexStore 已索引数据）
 *  - 迷你图谱：当前笔记 + 直接邻居的环形缩略图，点击跳转
 * 默认展开、可折叠，不打断写作流。
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useLanguage } from '@stores/LanguageStore'
import NoteHoverCard from './NoteHoverCard'
import {
  extractNeighborhood,
  layoutMiniGraph,
  type MiniGraphNode,
} from '../noteGraphUtils'

const GRAPH_W = 224
const GRAPH_H = 168

function truncate(s: string, n: number): string {
  return s && s.length > n ? `${s.slice(0, n)}…` : s || ''
}

export interface NoteContextPanelProps {
  /** 当前笔记 id（来自编辑器 activeFileId） */
  activeFileId?: string
  /** 点击反链 / 图谱节点时打开对应笔记 */
  onOpenNote: (fileId: string) => void
}

export default function NoteContextPanel({ activeFileId, onOpenNote }: NoteContextPanelProps) {
  const { getBacklinks, getGraphData, indexVersion } = useLinkIndex()
  const { t } = useLanguage()
  const wa = t.writingAid
  const [expanded, setExpanded] = useState(true)
  // 反链条目悬浮预览（对标 Obsidian hover preview）
  const [hover, setHover] = useState<{ fileId: string; x: number; y: number } | null>(null)

  // 反链按来源文件分组：合并同一文件的多条引用，附计数与首条上下文片段
  const backlinkGroups = useMemo(() => {
    if (!activeFileId) return []
    const map = new Map<string, { id: string; title: string; count: number; context: string }>()
    for (const rec of getBacklinks(activeFileId)) {
      const group = map.get(rec.sourceFileId)
      if (group) {
        group.count++
        if (!group.context && rec.context) group.context = rec.context
      } else {
        map.set(rec.sourceFileId, {
          id: rec.sourceFileId,
          title: rec.sourceFileName,
          count: 1,
          context: rec.context || rec.text || '',
        })
      }
    }
    return Array.from(map.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, indexVersion])

  const showHover = (fileId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    let x = rect.right + 8
    if (x + 300 > window.innerWidth - 8) x = Math.max(8, rect.left - 308)
    setHover({ fileId, x, y: rect.top })
  }

  const positioned = useMemo(() => {
    if (!activeFileId) return { positions: [] as Array<{ id: string; label: string; x: number; y: number; isCenter: boolean }>, edgeKeys: [] as Array<[string, string]> }
    const graph = getGraphData()
    const mini = extractNeighborhood(graph.nodes, graph.edges, activeFileId)
    const positions = layoutMiniGraph(mini, GRAPH_W, GRAPH_H)
    const ids = new Set(positions.map(p => p.id))
    const edgeKeys = mini.edges
      .filter(e => ids.has(e.source) && ids.has(e.target))
      .map(e => [e.source, e.target] as [string, string])
    return { positions, edgeKeys }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, indexVersion])

  const hasGraph = positioned.positions.length > 1

  return (
    <div
      className="flex flex-col min-h-0"
      style={{ borderTop: '1px solid var(--mc-border-subtle)', fontSize: 12 }}
    >
      {/* 头部（可折叠） */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-label={wa.contextToggleAria}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--mc-text-primary)', fontSize: 'var(--mc-font-xs)', fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7,
        }}
      >
        <span>{wa.contextTitle}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {backlinkGroups.length > 0 && (
            <span style={{
              fontSize: 'var(--mc-font-xs)', fontWeight: 700, color: 'var(--mc-accent-text)',
              background: 'var(--mc-accent-soft)', borderRadius: 'var(--mc-radius-pill)', padding: '1px 6px',
            }}>
              {backlinkGroups.length}
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.6 }}>{expanded ? '▾' : '▸'}</span>
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflow: 'auto' }}>
          {/* 反链 */}
          <div>
            <div style={{ fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-primary)', opacity: 0.5, marginBottom: 6 }}>
              {wa.backlinks.replace(String.raw`{n}`, String(backlinkGroups.length))}
            </div>
            {backlinkGroups.length === 0 ? (
              <div style={{ fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-primary)', opacity: 0.4, lineHeight: 1.6 }}>
                {wa.backlinksEmpty}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {backlinkGroups.map(b => (
                  <div
                    key={b.id}
                    onMouseEnter={(e) => showHover(b.id, e)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      border: '1px solid var(--mc-border-subtle)', borderRadius: 'var(--mc-radius-md)',
                      background: 'transparent', overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => onOpenNote(b.id)}
                      title={wa.openNote.replace(String.raw`{name}`, b.title)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', textAlign: 'left', padding: '6px 8px', border: 'none',
                        background: 'transparent', cursor: 'pointer', color: 'var(--mc-text-primary)',
                        fontSize: 'var(--mc-font-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mc-bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ↩ {truncate(b.title, 14)}
                      </span>
                      {b.count > 1 && (
                        <span style={{
                          fontSize: 'var(--mc-font-xs)', fontWeight: 700, color: 'var(--mc-accent-text)',
                          background: 'var(--mc-accent-soft)', borderRadius: 'var(--mc-radius-pill)', padding: '0 6px',
                          flexShrink: 0,
                        }}>
                          {b.count}
                        </span>
                      )}
                    </button>
                    {b.context && (
                      <div
                        style={{
                          padding: '4px 8px 6px', fontSize: 'var(--mc-font-xs)', lineHeight: 1.5,
                          color: 'var(--mc-text-primary)', opacity: 0.55,
                          borderTop: '1px solid var(--mc-border-subtle)',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {truncate(b.context, 80)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 迷你图谱 */}
          <div>
            <div style={{ fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-primary)', opacity: 0.5, marginBottom: 6 }}>
              {wa.miniGraph}
            </div>
            {!activeFileId ? (
              <div style={{ fontSize: 'var(--mc-font-xs)', color: 'var(--mc-text-primary)', opacity: 0.4 }}>
                {wa.miniGraphEmpty}
              </div>
            ) : (
              <svg
                width="100%"
                viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
                role="img"
                aria-label={wa.miniGraphAria}
                style={{
                  // 「凹陷画布」语义：两主题下都比周边表面更深一档，保证迷你图谱底板可见
                  background: 'var(--mc-bg-window)', borderRadius: 'var(--mc-radius-lg)',
                  border: '1px solid var(--mc-border-subtle)', display: 'block',
                }}
              >
                {positioned.edgeKeys.map(([s, t], i) => {
                  const a = positioned.positions.find(p => p.id === s)!
                  const b = positioned.positions.find(p => p.id === t)!
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="var(--mc-graph-edge)" strokeWidth={1}
                    />
                  )
                })}
                {positioned.positions.map(p => (
                  <g
                    key={p.id}
                    style={{ cursor: p.isCenter ? 'default' : 'pointer' }}
                    onClick={() => { if (!p.isCenter) onOpenNote(p.id) }}
                  >
                    <circle
                      cx={p.x} cy={p.y}
                      r={p.isCenter ? 9 : 6}
                      fill={p.isCenter ? 'var(--mc-accent)' : 'var(--mc-graph-file)'}
                      stroke={p.isCenter ? 'var(--mc-accent-hover)' : 'var(--mc-graph-file-stroke)'}
                      strokeWidth={1}
                    />
                    <text
                      x={p.x} y={p.y - (p.isCenter ? 14 : 11)}
                      textAnchor="middle"
                      fontSize={8}
                      fill="var(--mc-text-primary)"
                      opacity={0.7}
                    >
                      {truncate(p.label, 6)}
                    </text>
                  </g>
                ))}
                {!hasGraph && (
                  <text x={GRAPH_W / 2} y={GRAPH_H / 2 + 26} textAnchor="middle" fontSize={9} fill="var(--mc-text-primary)" opacity={0.35}>
                    {wa.miniGraphNoRelated}
                  </text>
                )}
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 反链条目悬浮预览（对标 Obsidian hover preview）
          定位容器本身不带 z-index：层级由卡片自带的 .aurora-dropdown 基底（锚定浮层带 1000）决定，
          禁止再写 10002 之类越带魔数（见 tokens.css §14 层级带表）。 */}
      {hover && createPortal(
        <div
          style={{ position: 'fixed', left: hover.x, top: hover.y }}
          onMouseEnter={() => setHover(null)}
          onMouseLeave={() => setHover(null)}
        >
          <NoteHoverCard
            fileId={hover.fileId}
            onOpen={(id) => { setHover(null); onOpenNote(id) }}
          />
        </div>,
        document.body
      )}
    </div>
  )
}

// 便于测试访问的类型
export type { MiniGraphNode }

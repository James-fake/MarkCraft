/**
 * Aurora 知识图谱 · 画布区（顶部筛选条 + SVG 渲染）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出：渲染与事件转发，物理/派生逻辑在主面板与 graphModel。
 */
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { Icon } from '../../../icons'
import { useLanguage } from '@stores/LanguageStore'
import {
  RADIUS, CURRENT_R, hexPoints,
  type GNode, type GEdge,
} from './graphModel'

export interface GraphCanvasAreaProps {
  // —— 顶部筛选条 ——
  scopeKind: 'files' | 'all' | 'kb'
  scopeLabel: string
  setScope: (s: string) => void
  defaultScope: string
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  matchedIds: Set<string> | null
  typeOpen: boolean
  setTypeOpen: Dispatch<SetStateAction<boolean>>
  showNote: boolean
  setShowNote: (v: boolean) => void
  showTag: boolean
  setShowTag: (v: boolean) => void
  showFolder: boolean
  setShowFolder: (v: boolean) => void
  // —— SVG 画布 ——
  size: { w: number; h: number }
  svgRef: RefObject<SVGSVGElement>
  panActive: boolean
  dragActive: boolean
  view: { scale: number; tx: number; ty: number }
  nodes: GNode[]
  edges: GEdge[]
  nodeById: Map<string, GNode>
  visibleIds: Set<string>
  showFolderLinks: boolean
  showArrows: boolean
  activeId: string | null
  hoverId: string | null
  setHoverId: Dispatch<SetStateAction<string | null>>
  isDim: (id: string) => boolean
  isEdgeDim: (s: string, t: string) => boolean
  cull: (x: number, y: number) => boolean
  groupColorOf: (n: GNode) => string | undefined
  onBgPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onCanvasClick: (e: React.MouseEvent) => void
  onWheel: (e: React.WheelEvent) => void
  onNodePointerDown: (e: React.PointerEvent, id: string) => void
  onNodeDouble: (id: string) => void
  onNodeContext: (e: React.MouseEvent, id: string) => void
}

export function GraphCanvasArea(p: GraphCanvasAreaProps) {
  const { t } = useLanguage()
  const G = t.graph
  return (
    <>
      {/* 方案 C · 顶部筛选条：搜索 + 节点类型 + 着色（高频操作提升，告别左栏长列表混排） */}
      <div className="aurora-graph__topbar">
        {/* 范围芯片（非默认档出现）：一眼看清「现在看的只是这一批」，并给出一键退出口 */}
        {p.scopeKind !== 'files' && (
          <>
            <span className="aurora-graph__scope" title={G.scopeOnlyTitle.replace('{name}', p.scopeLabel)}>
              {p.scopeKind === 'kb' ? <Icon.book size={13} /> : <Icon.layers size={13} />}
              <span className="aurora-graph__scope-name">{p.scopeLabel}</span>
            </span>
            <button
              type="button"
              className="aurora-graph__scope-exit"
              onClick={() => p.setScope(p.defaultScope)}
              title={G.scopeExitTitle}
            >
              {G.backToFileList}
            </button>
            <span className="aurora-graph__topbar-sep" />
          </>
        )}
        <div className="aurora-graph__search">
          <Icon.search size={14} />
          <input value={p.search} onChange={(e) => p.setSearch(e.target.value)} placeholder={G.searchNodePh} />
          {p.matchedIds && <span className="count">{G.matchedCount.replace('{n}', String(p.matchedIds.size))}</span>}
        </div>
        <span className="aurora-graph__topbar-sep" />
        <div className="aurora-graph__topbar-type">
          <button
            type="button"
            className={`aurora-graph__topbar-btn${p.typeOpen ? ' is-open' : ''}`}
            onClick={() => p.setTypeOpen((o) => !o)}
          >
            <Icon.filter size={14} /> {G.nodeType}
            <Icon.chevronDown size={12} />
          </button>
          {p.typeOpen && (
            <div className="aurora-graph__pop" onPointerLeave={() => p.setTypeOpen(false)}>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showNote} onChange={(e) => p.setShowNote(e.target.checked)} />
                {G.typeNote}
              </label>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showTag} onChange={(e) => p.setShowTag(e.target.checked)} />
                {G.typeTag}
              </label>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showFolder} onChange={(e) => p.setShowFolder(e.target.checked)} />
                {G.typeFolder}
              </label>
            </div>
          )}
        </div>
      </div>

      <svg
        ref={p.svgRef}
        className={`aurora-graph__svg${p.panActive ? ' is-panning' : ''}${p.dragActive ? ' is-dragging' : ''}`}
        width={p.size.w}
        height={p.size.h}
        onPointerDown={p.onBgPointerDown}
        onPointerMove={p.onPointerMove}
        onPointerUp={p.onPointerUp}
        onPointerCancel={p.onPointerCancel}
        onClick={p.onCanvasClick}
        onWheel={p.onWheel}
      >
        <g transform={`translate(${p.view.tx}, ${p.view.ty}) scale(${p.view.scale})`}>
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="aurora-graph__arrow" />
            </marker>
          </defs>
          {p.edges.map((e, i) => {
            const s = p.nodeById.get(e.source)
            const t = p.nodeById.get(e.target)
            if (!s || !t) return null
            if (!p.visibleIds.has(s.id) || !p.visibleIds.has(t.id)) return null
            if (e.kind === 'folder' && !p.showFolderLinks) return null
            if (p.cull(s.x, s.y) && p.cull(t.x, t.y)) return null
            const dim = p.isEdgeDim(s.id, t.id)
            const act = p.activeId && (s.id === p.activeId || t.id === p.activeId)
            const arrow = p.showArrows && (e.kind === 'wiki' || e.kind === 'embed')
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                markerEnd={arrow ? 'url(#graph-arrow)' : undefined}
                className={`aurora-graph__edge aurora-graph__edge--${e.kind}${act ? ' is-active' : ''}${dim ? ' is-dim' : ''}`}
              />
            )
          })}
          {p.nodes.map((n) => {
            if (!p.visibleIds.has(n.id)) return null
            if (p.cull(n.x, n.y)) return null
            // P2-4 度数权重：file 节点半径随连接数增大（核心笔记一眼可见）；当前笔记放大强调保留
            const r = n.isCurrent
              ? CURRENT_R
              : n.type === 'file'
                ? RADIUS.file + Math.min(n.deg, 8) * 0.8
                : RADIUS[n.type]
            const dim = p.isDim(n.id)
            const act = p.activeId === n.id
            const hov = p.hoverId === n.id
            const hot = n.type === 'file' && n.deg >= 4
            const isOrphan = n.type === 'file' && n.deg === 0
            const cls = n.isCurrent ? 'current' : n.type === 'folder' ? 'folder' : isOrphan ? 'orphan' : n.type
            const gColor = p.groupColorOf(n) // P2-3 分组着色（inline 覆盖类型色）
            const showLabel =
              n.isCurrent || n.type === 'folder' || isOrphan || hot || hov || act || (p.matchedIds?.has(n.id) ?? false)
            return (
              <g
                key={n.id}
                // 节点身份锚点（对齐 BlogPanel 的 data-file-id 惯例）：label 只在
                // 孤立/热点/悬停/命中节点上渲染，靠文字认节点会漏判，
                // 故把 id/type 挂到 DOM 上供测试与真机探针精确定位（无视觉影响）。
                data-node-id={n.id}
                data-node-type={n.type}
                className={`aurora-graph__node${act ? ' is-active' : ''}${hov ? ' is-hover' : ''}${dim ? ' is-dim' : ''}`}
                onPointerDown={(e) => p.onNodePointerDown(e, n.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  p.onNodeDouble(n.id)
                }}
                onContextMenu={(e) => p.onNodeContext(e, n.id)}
                onPointerEnter={() => p.setHoverId(n.id)}
                onPointerLeave={() => p.setHoverId((h) => (h === n.id ? null : h))}
              >
                {n.type === 'tag' ? (
                  <polygon points={hexPoints(n.x, n.y, r)} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                ) : n.type === 'folder' ? (
                  <rect x={n.x - r * 0.85} y={n.y - r * 0.85} width={r * 1.7} height={r * 1.7} rx={4} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                ) : (
                  <circle cx={n.x} cy={n.y} r={r} className={`aurora-graph__dot aurora-graph__dot--${cls}${hot ? ' is-hot' : ''}`} style={gColor ? { fill: gColor } : undefined} />
                )}
                {showLabel && (
                  <text x={n.x} y={n.y + r + 13} className="aurora-graph__label">
                    {n.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </>
  )
}

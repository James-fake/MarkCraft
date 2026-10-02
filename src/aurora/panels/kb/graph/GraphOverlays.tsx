/**
 * Aurora 知识图谱 · 画布内浮层组
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出：纯展示 + 回调上行。
 * 区块：右上视图控制 · 导出菜单 · 节点信息卡 · 右键菜单 · 底部状态栏 · 空态。
 */
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '../../../icons'
import type { GNode, GraphMode } from './graphModel'
import { clamp } from './graphModel'
import { useLanguage } from '../../../../stores/LanguageStore'

export interface GraphOverlaysProps {
  // —— 视图控制 ——
  view: { scale: number; tx: number; ty: number }
  setView: Dispatch<SetStateAction<{ scale: number; tx: number; ty: number }>>
  reheat: (a?: number) => void
  focusCenter: () => void
  toggleFullscreen: () => void
  // —— 导出 ——
  exportOpen: boolean
  setExportOpen: (fn: (o: boolean) => boolean) => void
  exportPresence: { mounted: boolean; exiting: boolean }
  exportPng: () => void
  exportSvg: () => void
  exportJson: () => void
  // —— 信息卡 ——
  infoNode: GNode | null
  infoFill: string
  infoModified: string
  infoPos: { left: number; top: number } | null
  setInfoCard: Dispatch<SetStateAction<{ id: string } | null>>
  openNoteInEditor: (id: string) => void
  setMode: Dispatch<SetStateAction<GraphMode>>
  setCenterId: (id: string) => void
  // —— 右键菜单 ——
  menuPresence: { mounted: boolean; exiting: boolean; value: { id: string; x: number; y: number } | null }
  setMenu: Dispatch<SetStateAction<{ id: string; x: number; y: number } | null>>
  nodeById: Map<string, GNode>
  adjacency: Map<string, Set<string>>
  onNodeDouble: (id: string) => void
  openOwningKb: (id: string) => void
  setHidden: (fn: (h: Set<string>) => Set<string>) => void
  setExtraNeighbors: Dispatch<SetStateAction<Set<string>>>
  setSelectedId: (id: string) => void
  // —— 状态栏 / 空态 ——
  stats: { note: number; tag: number; folder: number; edge: number }
  visibleCount: number
  scopeKind: 'files' | 'all' | 'kb'
  scopeLabel: string
  setScope: (s: string) => void
  defaultScope: string
}

export function GraphOverlays(p: GraphOverlaysProps) {
  const { t } = useLanguage()
  const G = t.graph
  return (
    <>
      {/* 视图控制（右上）*/}
      <div className="aurora-graph__float aurora-graph__controls">
        <button onClick={() => p.setView((v) => ({ ...v, scale: clamp(v.scale / 1.2, 0.2, 3) }))} title={G.zoomOut}>
          <Icon.minus size={15} />
        </button>
        <button
          className="aurora-graph__zoom"
          onClick={() => {
            p.setView({ scale: 1, tx: 0, ty: 0 })
            p.reheat(0.5)
          }}
          title={G.zoomReset}
        >
          {Math.round(p.view.scale * 100)}%
        </button>
        <button onClick={() => p.setView((v) => ({ ...v, scale: clamp(v.scale * 1.2, 0.2, 3) }))} title={G.zoomIn}>
          <Icon.plus size={15} />
        </button>
        <span className="divider" />
        <button
          onClick={() => {
            p.setView({ scale: 1, tx: 0, ty: 0 })
            p.reheat(0.6)
          }}
          title={G.fitView}
        >
          <Icon.frame size={15} />
        </button>
        <button onClick={p.focusCenter} title={G.focusCurrent}>
          <Icon.target size={15} />
        </button>
        <button onClick={p.toggleFullscreen} title={G.fullscreen}>
          <Icon.maximize size={15} />
        </button>
        <span className="divider" />
        <button onClick={() => p.setExportOpen((o) => !o)} title={G.export}>
          <Icon.download size={15} />
        </button>
      </div>

      {p.exportPresence.mounted && (
        <div
          className="aurora-graph__float aurora-graph__menu"
          data-exiting={p.exportPresence.exiting || undefined}
        >
          <button onClick={() => { p.exportPng(); p.setExportOpen(() => false) }}>
            <Icon.download size={14} /> {G.exportPng}
          </button>
          <button onClick={() => { p.exportSvg(); p.setExportOpen(() => false) }}>
            <Icon.download size={14} /> {G.exportSvg}
          </button>
          <button onClick={() => { p.exportJson(); p.setExportOpen(() => false) }}>
            <Icon.copy size={14} /> {G.exportJson}
          </button>
        </div>
      )}

      {/* 节点信息卡 */}
      {p.infoNode && p.infoPos && (
        <div className="aurora-graph__float aurora-graph__infocard" style={{ left: p.infoPos.left, top: p.infoPos.top }}>
          <div className="aurora-graph__ic-head">
            <div className="aurora-graph__ic-title">
              <span className="aurora-graph__ic-dot" style={{ background: p.infoFill }} />
              {p.infoNode.label}
            </div>
            <button className="aurora-graph__ic-close" onClick={() => p.setInfoCard(null)}>
              <Icon.close size={14} />
            </button>
          </div>
          <span className="aurora-graph__ic-type">
            {p.infoNode.isCurrent ? G.typeCurrent : p.infoNode.type === 'tag' ? G.typeTag : p.infoNode.type === 'folder' ? G.typeFolder : p.infoNode.deg === 0 ? G.typeOrphan : G.typeNote}
          </span>
          {p.infoNode.filePath && <div className="aurora-graph__ic-path">{p.infoNode.filePath}</div>}
          {p.infoNode.tags.length > 0 && (
            <div className="aurora-graph__ic-tags">
              {p.infoNode.tags.map((t) => (
                <em key={t}>{t}</em>
              ))}
            </div>
          )}
          <div className="aurora-graph__ic-stats">
            <div className="aurora-graph__ic-stat"><div className="v">{p.infoNode.inLinks}</div><div className="k">{G.inLinks}</div></div>
            <div className="aurora-graph__ic-stat"><div className="v">{p.infoNode.outLinks}</div><div className="k">{G.outLinks}</div></div>
            <div className="aurora-graph__ic-stat"><div className="v">{p.infoNode.wordCount ?? '—'}</div><div className="k">{G.wordCount}</div></div>
            <div className="aurora-graph__ic-stat"><div className="v sm">{p.infoModified}</div><div className="k">{G.modified}</div></div>
          </div>
          <div className="aurora-graph__ic-actions">
            {p.infoNode.type === 'file' && (
              <button
                className="primary"
                onClick={() => {
                  p.openNoteInEditor(p.infoNode!.id)
                  p.setInfoCard(null)
                }}
              >
                <Icon.arrowR size={13} /> {G.openNote}
              </button>
            )}
            <button onClick={() => { p.setMode('local'); p.setCenterId(p.infoNode!.id); p.setInfoCard(null); p.reheat(0.4) }}>
              <Icon.target size={13} /> {G.focusInGraph}
            </button>
            <button onClick={() => { p.setMode('backlinks'); p.setCenterId(p.infoNode!.id); p.setInfoCard(null); p.reheat(0.4) }}>
              <Icon.link size={13} /> {G.viewBacklinks}
            </button>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {p.menuPresence.mounted && p.menuPresence.value && (() => {
        // 退场窗口内沿用最后一份非空载荷（usePresenceValue 已保证），坐标不丢
        const menu = p.menuPresence.value!
        const m = p.nodeById.get(menu.id)
        if (!m) return null
        return (
          <div
            className="aurora-graph__float aurora-graph__ctx"
            data-exiting={p.menuPresence.exiting || undefined}
            style={{ left: menu.x, top: menu.y }}
            onPointerLeave={() => p.setMenu(null)}
          >
            <button onClick={() => { p.onNodeDouble(m.id); p.setMenu(null) }}>
              <Icon.arrowR size={14} /> {G.openNote}
            </button>
            {m.type === 'file' && (
              <button onClick={() => { void p.openOwningKb(m.id); p.setMenu(null) }}>
                <Icon.book size={14} /> {G.openOwningKb}
              </button>
            )}
            <button onClick={() => { p.setMode('local'); p.setCenterId(m.id); p.setMenu(null); p.reheat(0.4) }}>
              <Icon.frame size={14} /> {G.localView}
            </button>
            <button onClick={() => { p.setMode('backlinks'); p.setCenterId(m.id); p.setMenu(null) }}>
              <Icon.link size={14} /> {G.viewBacklinks}
            </button>
            <button onClick={() => { p.setMode('forwardlinks'); p.setCenterId(m.id); p.setMenu(null) }}>
              <Icon.share size={14} /> {G.viewForwardLinks}
            </button>
            <button onClick={() => { p.setCenterId(m.id); p.setMenu(null); p.reheat(0.4) }}>
              <Icon.refresh size={14} /> {G.setCenter}
            </button>
            <div className="sep" />
            <button
              onClick={() => {
                p.setHidden((h) => new Set(h).add(m.id))
                p.setMenu(null)
                p.setInfoCard(null)
              }}
            >
              <Icon.eyeOff size={14} /> {G.hideNode}
            </button>
            <button
              onClick={() => {
                // 展开邻居：把该节点一跳邻居并入显示（真实实现，替换原 toast 桩）
                p.setExtraNeighbors((prev) => {
                  const next = new Set(prev)
                  ;(p.adjacency.get(m.id) || []).forEach((nid) => next.add(nid))
                  return next
                })
                p.setMenu(null)
                p.setInfoCard(null)
                p.reheat(0.4)
              }}
            >
              <Icon.share size={14} /> {G.expandNeighbors}
            </button>
            <button onClick={() => { p.setSelectedId(m.id); p.setInfoCard({ id: m.id }); p.setMenu(null) }}>
              <Icon.info size={14} /> {G.viewDetails}
            </button>
          </div>
        )
      })()}

      {/* 底部状态栏（居中）*/}
      <div className="aurora-graph__statusbar">
        <div className="aurora-graph__sb-stats">
          <span className="lg-current">{p.stats.note}</span>
          <span className="lg-tag">{p.stats.tag}</span>
          <span className="lg-folder">{p.stats.folder}</span>
          <span><i className="lg-wiki" />{p.stats.edge}</span>
        </div>
        <span className="aurora-graph__sb-sep" />
        <div className="aurora-graph__sb-legend">
          <span className="lg-current">{G.legendCurrent}</span>
          <span className="lg-file">{G.legendNote}</span>
          <span className="lg-folder">{G.legendFolder}</span>
          <span className="lg-tag">{G.legendTag}</span>
          <span><i className="lg-wiki" />{G.legendRefs}</span>
          <span><i className="lg-taglink" />{G.legendTagLinks}</span>
        </div>
        <span className="aurora-graph__sb-sep" />
        {/* 布局切换已在左侧栏「视图·布局方式」提供，状态栏去重，避免与左栏重复 */}
      </div>

      {/* 空态 */}
      {p.visibleCount === 0 && (
        <div className="aurora-graph__empty">
          <Icon.graph size={32} />
          {/* 范围内的空态必须说明「是范围所致」，否则用户会以为是筛选条件把图筛没了 */}
          <div className="title">
            {p.scopeKind === 'kb'
              ? G.emptyKb
              : p.scopeKind === 'files'
                ? G.emptyFiles
                : G.emptyNone}
          </div>
          <div className="sub">
            {p.scopeKind === 'kb'
              ? G.emptyKbSub.replace('{n}', p.scopeLabel)
              : p.scopeKind === 'files'
                ? G.emptyFilesSub
                : G.emptyNoneSub}
          </div>
          {p.scopeKind === 'files' ? (
            <button type="button" className="aurora-graph__empty-exit" onClick={() => p.setScope('all')}>
              {G.viewAllFiles}
            </button>
          ) : p.scopeKind === 'kb' ? (
            <button type="button" className="aurora-graph__empty-exit" onClick={() => p.setScope(p.defaultScope)}>
              {G.backToFileList}
            </button>
          ) : null}
        </div>
      )}
    </>
  )
}

/**
 * Aurora 知识图谱 · 左缘导航侧栏（hoverzone 召唤的浮层）
 * 🧩 P2-3（2026-09-28）从 GraphPanel.tsx 拆出：纯展示 + 回调上行，状态全部由主面板持有。
 * 区块（自上而下）：图钉/收起头 · 数据范围 · 图谱模式/布局 · 标签筛选/连接强度/显示开关
 * · 着色分组导航 · 分组着色（可折叠）· 链接健康 · 重置视图。
 */
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '../../../icons'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { GROUP_COLORS } from '../../../themes/categoricalColors'
import type { Layout, GraphMode, GraphGroup } from './graphModel'
import { useLanguage } from '../../../../stores/LanguageStore'

export interface GraphSidebarProps {
  // —— 左缘 hoverzone / 导航浮层 ——
  navOverlay: { mounted: boolean; exiting: boolean }
  navPinned: boolean
  setNavPinned: (fn: (p: boolean) => boolean) => void
  openNavIntent: () => void
  closeNavIntent: () => void
  cancelNavClose: () => void
  scheduleNavClose: () => void
  closeNav: () => void
  // —— 数据范围 ——
  scope: string
  setScope: (s: string) => void
  scopeOptions: { value: string; label: string }[]
  scopeKind: 'files' | 'all' | 'kb'
  scopeLabel: string
  // —— 图谱模式 / 布局 ——
  mode: GraphMode
  onModeChange: (m: GraphMode) => void
  depth: number
  setDepth: (d: number) => void
  layout: Layout
  applyLayout: (l: Layout) => void
  // —— 筛选 ——
  allTags: string[]
  selectedTags: string[]
  toggleTag: (t: string) => void
  minConn: number
  setMinConn: Dispatch<SetStateAction<number>>
  showOrphan: boolean
  setShowOrphan: (v: boolean) => void
  showFolderLinks: boolean
  setShowFolderLinks: (v: boolean) => void
  showArrows: boolean
  setShowArrows: (v: boolean) => void
  // —— 着色分组 ——
  focusGroup: string | null
  setFocusGroup: (fn: (cur: string | null) => string | null) => void
  groupAgg: { key: string; name: string; color: string; count: number }[]
  grpOpen: boolean
  setGrpOpen: (fn: (o: boolean) => boolean) => void
  groups: GraphGroup[]
  setGroups: (fn: (prev: GraphGroup[]) => GraphGroup[]) => void
  grpName: string
  setGrpName: (v: string) => void
  grpMatch: 'tag' | 'name'
  setGrpMatch: (v: 'tag' | 'name') => void
  grpKeyword: string
  setGrpKeyword: (v: string) => void
  grpColor: string
  setGrpColor: (c: string) => void
  addGroup: () => void
  // —— 链接健康 / 重置 ——
  band: 'healthy' | 'warn' | 'poor'
  healthScore: number
  linkHealth: { brokenList: { target: string; count: number }[]; orphan: unknown[] }
  resetView: () => void
}

export function GraphSidebar(p: GraphSidebarProps) {
  const { t } = useLanguage()
  const G = t.graph
  return (
    <div
      className={`aurora-graph__hoverzone ${p.navPinned ? 'is-pinned' : ''}`}
      onMouseEnter={p.openNavIntent}
      onMouseLeave={p.closeNavIntent}
    >
      <div className="aurora-graph__edge" aria-hidden />
      {p.navOverlay.mounted && (
        <div
          className="aurora-graph__overlay"
          data-exiting={p.navOverlay.exiting || undefined}
          onMouseEnter={p.cancelNavClose}
          onMouseLeave={p.scheduleNavClose}
        >
          <div className="aurora-graph__overlay-head">
            <span className="aurora-graph__overlay-title">{G.navTitle}</span>
            <div className="aurora-graph__overlay-actions">
              <button
                type="button"
                className={`aurora-graph__pin ${p.navPinned ? 'is-on' : ''}`}
                onClick={() => p.setNavPinned((v) => !v)}
                aria-label={p.navPinned ? G.unpinNav : G.pinNav}
                title={p.navPinned ? G.collapse : G.pinStay}
              >
                <svg width="13" height="13" viewBox="0 0 13 13"><path d="M8 2l3 3-5 5-1-1 1-3-3-3 2-2z" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
              </button>
              <button
                type="button"
                className="aurora-graph__overlay-close"
                onClick={p.closeNav}
                aria-label={G.collapseNav}
                title={G.collapse}
              >
                <Icon.chevronLeft size={14} />
              </button>
            </div>
          </div>
          <div className="aurora-graph__overlay-body">
            {/* 数据范围（2026-09-23 用户需求）：最上游的一档 —— 决定「画哪些文件」，
                故置于视图控制之前。选项 = 文件列表（默认）/ 全部文件 / 每个知识库一档。 */}
            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">{G.scopeTitle}</div>
              <AuroraSelect
                ariaLabel={G.scopeTitle}
                className="aurora-graph__scopesel"
                value={p.scope}
                onChange={p.setScope}
                options={p.scopeOptions}
              />
              <div className="aurora-graph__grp-hint">
                {p.scopeKind === 'files'
                  ? G.scopeFilesOnly
                  : p.scopeKind === 'all'
                    ? G.scopeAll
                    : G.scopeKbOnly.replace('{n}', p.scopeLabel)}
              </div>
            </div>

            <div className="aurora-graph__divider" />

            {/* 使用优化⑤ · 重排：视图控制（模式/布局）置顶——高频操作优先 */}
            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">{G.modeTitle}</div>
              <div className="aurora-graph__seg">
                {([
                  ['global', G.modeGlobal],
                  ['local', G.modeLocal],
                  ['backlinks', G.modeBacklinks],
                  ['forwardlinks', G.modeForward],
                  ['tag', G.modeTag],
                ] as const).map(([m, label]) => (
                  <button key={m} className={p.mode === m ? 'is-active' : ''} onClick={() => p.onModeChange(m)}>
                    {label}
                  </button>
                ))}
              </div>
              {p.mode === 'local' && (
                <div className="aurora-graph__depth">
                  {G.depth}
                  <input type="range" min={1} max={3} value={p.depth} onChange={(e) => p.setDepth(Number(e.target.value))} />
                  <span>{p.depth}</span>
                </div>
              )}
            </div>

            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">{G.layoutTitle}</div>
              <div className="aurora-graph__seg">
                {([
                  ['force', G.layoutForce],
                  ['concentric', G.layoutConcentric],
                  ['tree', G.layoutTree],
                  ['grid', G.layoutGrid],
                ] as const).map(([l, label]) => (
                  <button key={l} className={p.layout === l ? 'is-active' : ''} onClick={() => p.applyLayout(l)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="aurora-graph__divider" />

            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">{G.tagFilter}</div>
              <div className="aurora-graph__chips">
                {p.allTags.map((t) => (
                  <button
                    key={t}
                    className={`aurora-graph__chip${p.selectedTags.includes(t) ? ' is-active' : ''}`}
                    onClick={() => p.toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">
                {G.minConn} <span className="val">{G.minConnVal.replace('{n}', String(p.minConn))}</span>
              </div>
              <input
                className="aurora-graph__slider"
                type="range"
                min={0}
                max={10}
                value={p.minConn}
                onChange={(e) => p.setMinConn(Number(e.target.value))}
              />
            </div>

            <div className="aurora-graph__group">
              <div className="aurora-graph__group-title">{G.show}</div>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showOrphan} onChange={(e) => p.setShowOrphan(e.target.checked)} />
                {G.showOrphan}
              </label>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showFolderLinks} onChange={(e) => p.setShowFolderLinks(e.target.checked)} />
                {G.showFolderLinks}
              </label>
              <label className="aurora-graph__check">
                <input type="checkbox" checked={p.showArrows} onChange={(e) => p.setShowArrows(e.target.checked)} />
                {G.showArrows}
              </label>
            </div>

            <div className="aurora-graph__divider" />

            {/* 方案 C · 着色分组导航：点分组聚焦该色节点（dim 其余），既是导航也是图例（使用优化⑤：随分组着色一并后置） */}
            <div className="aurora-graph__nav">
              <div className="aurora-graph__group-title">
                {G.groupNavTitle} <span className="val">{p.focusGroup ? G.focusing : G.groupsCount.replace('{n}', String(p.groupAgg.length))}</span>
              </div>
              {p.groupAgg.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className={`aurora-graph__nav-row${p.focusGroup === g.key ? ' is-active' : ''}`}
                  onClick={() => p.setFocusGroup((cur) => (cur === g.key ? null : g.key))}
                  title={G.focusGroupTitle.replace('{n}', g.name)}
                >
                  <i className="aurora-graph__nav-dot" style={{ background: g.color }} />
                  <span className="aurora-graph__nav-name">{g.name}</span>
                  <span className="aurora-graph__nav-count">{g.count}</span>
                </button>
              ))}
              {p.focusGroup && (
                <button type="button" className="aurora-graph__nav-clear" onClick={() => p.setFocusGroup(() => null)}>
                  {G.clearFocus}
                </button>
              )}
            </div>

            {/* P2-3 分组着色（对标 Obsidian Groups）· 方案 C：可折叠，默认收起（grp-form 始终在 DOM，测试兼容） */}
            <div className={`aurora-graph__group aurora-graph__grp${p.grpOpen ? '' : ' is-fold'}`}>
              <div className="aurora-graph__group-title aurora-graph__grp-head" onClick={() => p.setGrpOpen((o) => !o)}>
                {G.groupColorTitle} <span className="val">{p.grpOpen ? G.fold : G.unfold}</span>
              </div>
              <div className="aurora-graph__grp-body">
                {p.groups.length > 0 && (
                  <div className="aurora-graph__grp-list">
                    {p.groups.map((g) => (
                      <div key={g.id} className="aurora-graph__grp-row">
                        <i className="aurora-graph__grp-dot" style={{ background: g.color }} />
                        <span className="aurora-graph__grp-name">{g.name}</span>
                        <span className="aurora-graph__grp-rule">{g.match === 'tag' ? `#${g.keyword}` : g.keyword}</span>
                        <button
                          type="button"
                          className="aurora-graph__grp-del"
                          title={G.deleteGroup}
                          onClick={() => p.setGroups((prev) => prev.filter((x) => x.id !== g.id))}
                        >
                          <Icon.close size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="aurora-graph__grp-form">
                  <input
                    className="aurora-graph__grp-input"
                    value={p.grpName}
                    onChange={(e) => p.setGrpName(e.target.value)}
                    placeholder={G.groupNamePh}
                    aria-label={G.groupNamePh}
                  />
                  <div className="aurora-graph__grp-row">
                    <AuroraSelect
                      ariaLabel={G.matchMode}
                      value={p.grpMatch}
                      onChange={(v) => p.setGrpMatch(v as 'tag' | 'name')}
                      options={[
                        { value: 'tag', label: G.matchTag },
                        { value: 'name', label: G.matchName },
                      ]}
                    />
                    <input
                      className="aurora-graph__grp-input"
                      value={p.grpKeyword}
                      onChange={(e) => p.setGrpKeyword(e.target.value)}
                      placeholder={p.grpMatch === 'tag' ? G.tagPh : G.keywordPh}
                      aria-label={G.keywordAria}
                    />
                  </div>
                  <div className="aurora-graph__grp-colors">
                    {GROUP_COLORS.map((c, i) => (
                      <button
                        key={c}
                        type="button"
                        className={`aurora-graph__grp-swatch${p.grpColor === c ? ' is-on' : ''}`}
                        style={{ background: c }}
                        title={G.groupColorN.replace('{n}', String(i + 1))}
                        onClick={() => p.setGrpColor(c)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="aurora-graph__grp-add"
                    onClick={p.addGroup}
                    disabled={!p.grpName.trim() || !p.grpKeyword.trim()}
                  >
                    {G.addGroup}
                  </button>
                </div>
                <div className="aurora-graph__grp-hint">{G.groupHint}</div>
              </div>
            </div>

            <div className="aurora-graph__divider" />

            {/* G4/I3 链接健康（复用 useDashboardData 单一数据源） */}
            <div className="aurora-graph__group aurora-graph__health">
              <div className="aurora-graph__group-title">
                {G.healthTitle} <span className={`val band band--${p.band}`}>{G.score.replace('{n}', String(p.healthScore))}</span>
              </div>
              <div className="aurora-graph__health-row">
                <span className="aurora-graph__health-item">
                  {G.broken} <b className={p.linkHealth.brokenList.length ? 'bad' : 'ok'}>{p.linkHealth.brokenList.length}</b>
                </span>
                <span className="aurora-graph__health-item">
                  {G.orphanWord} <b className={p.linkHealth.orphan.length ? 'bad' : 'ok'}>{p.linkHealth.orphan.length}</b>
                </span>
              </div>
              {p.linkHealth.brokenList.length > 0 && (
                <ul className="aurora-graph__health-list">
                  {p.linkHealth.brokenList.slice(0, 3).map((b) => (
                    <li key={b.target} title={G.citedBy.replace('{n}', String(b.count))}>
                      <span className="tgt">{b.target.length > 16 ? b.target.slice(0, 15) + '…' : b.target}</span>
                      <em>×{b.count}</em>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button className="aurora-graph__reset" onClick={p.resetView}>
              {G.resetView}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

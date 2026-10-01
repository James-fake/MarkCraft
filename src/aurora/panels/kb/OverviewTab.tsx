import type { ReactNode } from 'react'
import { Icon } from '../../icons'
import type { IconName } from '../../types'
import { KbFileRow } from './KbFileRow'
import { MiniGraph } from './MiniGraph'
import { healthColor, pctOf, compactNum, type OverviewData } from './kbPanelShared'

// ---- 专属图谱迷你节点图：已抽为单源组件 ./MiniGraph（2026-09-22 哑节点修复）----
// 原实现内联在 KbPanel.tsx，节点只有 `cursor: pointer` 而整张图无点击处理，且只给一个节点渲染名字
// （即「00 开始使用」）⇒ 用户点它毫无反应、停在知识库详情页。根因与修法见 MiniGraph.tsx 顶部。

export function OverviewTab({
  toast,
  data,
  onOpenFullGraph,
  onOpenNote,
  canvasSlot,
}: {
  toast?: (m: string) => void
  data: OverviewData
  /**
   * 「查看完整图谱」的动作。由 KbPanel 注入并**在此处只负责触发**：
   * 图谱入参（kbId）的拼装单源收敛在 KbPanel 的 openFullGraph 里，
   * 免得哑组件各自拼 nav 参数、把「范围」这件事散成多处真值。
   */
  onOpenFullGraph?: () => void
  /**
   * 文件行的打开动作（在编辑器中打开指定笔记）。
   * 缺省时「最近活动」退化为纯展示列表 —— 不再出现「看着可点、点了没反应」的哑行。
   */
  onOpenNote?: (id: string) => void
  /**
   * 「关联白板」区块的插槽：与「专属图谱」同排双卡（左图谱 / 右白板）。
   * 由 KbPanel 注入 KbCanvasSection——概览 Tab 保持哑组件，区块自身逻辑不内联。
   */
  canvasSlot?: ReactNode
}) {
  const kpiData = [
    { icon: 'file' as IconName, title: '笔记文件', value: String(data.fileCount), sub: '本库收录' },
    { icon: 'canvas' as IconName, title: '关联白板', value: String(data.canvasCount), sub: '跨库关联' },
    { icon: 'tag' as IconName, title: '标签', value: String(data.tagCount), sub: '去重计数' },
    { icon: 'book' as IconName, title: '总字数', value: compactNum(data.totalWords), sub: '中文字+英文词' },
    { icon: 'link' as IconName, title: '双链数', value: String(data.linkCount), sub: '库内引用' },
  ]

  const healthItems = data.health
    ? [
        { label: '链接密度', score: data.health.linkScore },
        { label: '非孤立率', score: data.health.orphanScore },
        { label: '标签覆盖', score: data.health.tagScore },
        { label: '更新活跃', score: data.health.activeScore },
      ]
    : []

  return (
    <div className="aurora-kb-overview">
      {/* KPI 行 */}
      <div className="aurora-kb-kpi-row">
        {kpiData.map((k) => {
          const I = Icon[k.icon]
          return (
            <div key={k.title} className="aurora-kb-kpi">
              <div className="aurora-kb-kpi__icon"><I size={16} /></div>
              <div className="aurora-kb-kpi__body">
                <div className="aurora-kb-kpi__title">{k.title}</div>
                <div className="aurora-kb-kpi__value">{k.value}</div>
                <div className="aurora-kb-kpi__sub">{k.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 健康度 + AI 摘要 */}
      <div className="aurora-kb-row">
        <div className="aurora-kb-card aurora-kb-card--health">
          <div className="aurora-kb-card__title">健康度</div>
          <div className="aurora-kb-health">
            {healthItems.map((h) => {
              const pct = pctOf(h.score)
              return (
                <div key={h.label} className="aurora-kb-health__item">
                  <div className="aurora-kb-health__top">
                    <span>{h.label}</span>
                    <span className="aurora-kb-health__score">{h.score}</span>
                  </div>
                  <div className="aurora-kb-health__track">
                    <div className="aurora-kb-health__fill" style={{ width: `${pct}%`, background: healthColor(pct) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="aurora-kb-card aurora-kb-card--ai">
          <div className="aurora-kb-card__title">AI 摘要<span className="aurora-kb-badge">本地</span></div>
          <div className="aurora-kb-ai__body">
            {data.aiSummary ?? '尚未生成 AI 摘要。点击「重新生成」调用本地模型对本库笔记做概括（需配置 AI 服务）。'}
          </div>
          <button className="aurora-kb-btn" onClick={() => toast?.('重新生成摘要（本地模型）')}>
            <Icon.refresh size={14} /> 重新生成
          </button>
        </div>
      </div>

      {/* 最近活动 + 标签体系 */}
      <div className="aurora-kb-row">
        <div className="aurora-kb-card aurora-kb-card--recent">
          <div className="aurora-kb-card__title">最近活动</div>
          <div className="aurora-kb-recent">
            {data.recentFiles.length === 0 ? (
              <div className="aurora-kb-recent__empty">暂无文件</div>
            ) : (
              data.recentFiles.map((f) => (
                <KbFileRow key={f.id} file={f} onSelect={onOpenNote} hint={`在编辑器中打开「${f.name}」`} />
              ))
            )}
          </div>
        </div>

        <div className="aurora-kb-card aurora-kb-card--tags">
          <div className="aurora-kb-card__title">标签体系</div>
          <div className="aurora-kb-tags">
            {data.topTags.length === 0 ? (
              <div className="aurora-kb-recent__empty">暂无标签</div>
            ) : (
              data.topTags.map((t) => (
                <span key={t.tag} className="aurora-kb-tag">
                  {t.tag}<em>{t.count}</em>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 专属图谱 + 关联白板：同排双卡（左图谱 / 右白板），免去「图谱下面还有一屏」的查找成本 */}
      <div className="aurora-kb-row aurora-kb-row--graph">
        <div className="aurora-kb-card aurora-kb-card--graph">
          <div className="aurora-kb-card__title">
            专属图谱<span className="aurora-kb-card__hint">节点=笔记 · 连线=引用</span>
            {onOpenFullGraph && (
              <button className="aurora-kb-card__link" onClick={onOpenFullGraph} title="在完整双链图谱中查看（仅本库）">
                查看完整图谱 →
              </button>
            )}
          </div>
          {/* 节点=笔记：点节点即「在编辑器中打开该笔记」，与列表行同一动作
              （此前节点只有手型没有 handler —— 点第一篇毫无反应，见 MiniGraph.tsx） */}
          {data.miniNodes.length === 0 ? (
            <div className="aurora-kb-recent__empty">库内暂无引用关系</div>
          ) : (
            <MiniGraph
              nodes={data.miniNodes}
              edges={data.miniEdges}
              currentId={data.miniNodes[0]?.id}
              onSelect={onOpenNote}
            />
          )}
        </div>
        {canvasSlot}
      </div>
    </div>
  )
}

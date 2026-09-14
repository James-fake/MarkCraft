/**
 * TimelineView - 时间轴视图（P3-7）
 *
 * 横向时间轴，刻度可缩放（日/周/月/年）。
 * - 卡片按 updatedAt 定位
 * - 同一天多个卡片自动聚合，放大后展开
 * - SVG 渲染
 * - 滚轮缩放时间粒度
 * - 点击节点选中卡片
 * - 顶部柱状图显示每天活跃度
 */
import React, { useCallback, useMemo, useState } from 'react'
import { useValue } from '../../engine/useValue'
import type { Editor, TLShapeId } from '../../engine/engineTypes'
import type { NoteCardShape } from '../../shapes/NoteCardShape'
import { CanvasIcon } from '../CanvasIcon'

interface TimelineViewProps {
  editor: Editor
}

/** 时间粒度 */
type Granularity = 'day' | 'week' | 'month' | 'year'

const GRANULARITY_ORDER: Granularity[] = ['day', 'week', 'month', 'year']
const GRANULARITY_LABEL: Record<Granularity, string> = {
  day: '日', week: '周', month: '月', year: '年',
}

/** 时间轴条目 */
interface TimelineNode {
  id: TLShapeId
  title: string
  color: string
  timestamp: number
  tags: string[]
}

/** 聚合桶 */
interface TimeBucket {
  key: string
  start: number
  end: number
  nodes: TimelineNode[]
}

export const TimelineView: React.FC<TimelineViewProps> = ({ editor }) => {
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 当粒度 > day 时，聚合桶点击展开
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)

  // 收集卡片
  const nodes = useValue(
    'timeline-nodes',
    () => {
      const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'note-card') as NoteCardShape[]
      return shapes
        .map(card => ({
          id: card.id,
          title: card.props.text.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 40) || '空笔记',
          color: card.props.color,
          timestamp: card.props.updatedAt ?? Date.now(),
          tags: card.props.tags?.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) ?? [],
        }))
        .sort((a, b) => a.timestamp - b.timestamp) as TimelineNode[]
    },
    [editor],
  )

  /** 按粒度分桶 */
  const buckets = useMemo<TimeBucket[]>(() => {
    if (nodes.length === 0) return []
    const map = new Map<string, TimelineNode[]>()
    for (const n of nodes) {
      const key = bucketKey(n.timestamp, granularity)
      const arr = map.get(key) ?? []
      arr.push(n)
      map.set(key, arr)
    }
    const result: TimeBucket[] = []
    for (const [key, bucketNodes] of map.entries()) {
      const start = parseBucketStart(key, granularity)
      const end = start + bucketDurationMs(granularity)
      result.push({ key, start, end, nodes: bucketNodes })
    }
    return result.sort((a, b) => a.start - b.start)
  }, [nodes, granularity])

  // 时间范围
  const { minTs, maxTs } = useMemo(() => {
    if (nodes.length === 0) {
      const now = Date.now()
      return { minTs: now - 30 * 86400000, maxTs: now }
    }
    const min = Math.min(...nodes.map(n => n.timestamp))
    const max = Math.max(...nodes.map(n => n.timestamp))
    // 留出边距
    const span = max - min || 86400000
    return { minTs: min - span * 0.1, maxTs: max + span * 0.1 }
  }, [nodes])

  /** 滚轮缩放时间粒度 */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const idx = GRANULARITY_ORDER.indexOf(granularity)
    if (e.deltaY > 0 && idx < GRANULARITY_ORDER.length - 1) {
      setGranularity(GRANULARITY_ORDER[idx + 1])
    } else if (e.deltaY < 0 && idx > 0) {
      setGranularity(GRANULARITY_ORDER[idx - 1])
    }
  }, [granularity])

  /** 选中卡片 */
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    editor.setSelectedShapes([id as TLShapeId])
    const bounds = editor.getShapePageBounds(id as TLShapeId)
    if (bounds) editor.zoomToBounds(bounds, { inset: 0.2 })
  }, [editor])

  // SVG 布局参数
  const padding = 40
  const topBarH = 60 // 顶部活跃度柱状图高度
  const axisY = topBarH + 20
  const nodeAreaH = 320
  const svgW = 1200
  const svgH = axisY + nodeAreaH + 40
  const innerW = svgW - padding * 2

  const xForTs = (ts: number) => {
    if (maxTs === minTs) return padding + innerW / 2
    return padding + ((ts - minTs) / (maxTs - minTs)) * innerW
  }

  // 活跃度柱状图：按天聚合
  const dailyActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of nodes) {
      const key = bucketKey(n.timestamp, 'day')
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count, ts: parseBucketStart(key, 'day') }))
      .sort((a, b) => a.ts - b.ts)
  }, [nodes])
  const maxDaily = Math.max(...dailyActivity.map(d => d.count), 1)

  const btnStyle: React.CSSProperties = {
    border: '1px solid var(--cv-toolbar-border)',
    background: 'transparent',
    color: 'var(--cv-text-main)',
    padding: '4px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--cv-card-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CanvasIcon name="timeline" size={18} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cv-text-main)' }}>时间轴视图</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
            {GRANULARITY_ORDER.map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                style={{
                  ...btnStyle,
                  background: granularity === g ? 'var(--cv-accent)' : 'transparent',
                  color: granularity === g ? '#fff' : 'var(--cv-text-secondary)',
                }}
              >{GRANULARITY_LABEL[g]}</button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'var(--cv-text-tertiary)', marginLeft: 8 }}>
            Ctrl + 滚轮缩放粒度
          </span>
        </div>
      </div>

      {/* SVG 时间轴 */}
      {nodes.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cv-text-tertiary)', fontSize: 14,
        }}>
          画布上还没有带时间戳的卡片
        </div>
      ) : (
        <div
          style={{ flex: 1, overflow: 'auto', padding: 16 }}
          onWheel={handleWheel}
        >
          <svg width={Math.max(svgW, buckets.length * 80 + padding * 2)} height={svgH} style={{ display: 'block' }}>
            {/* 顶部活跃度柱状图 */}
            {dailyActivity.map(d => {
              const x = xForTs(d.ts)
              const h = (d.count / maxDaily) * (topBarH - 10)
              return (
                <rect
                  key={d.key}
                  x={x - 3}
                  y={topBarH - h}
                  width={6}
                  height={h}
                  fill="var(--cv-accent)"
                  opacity={0.6}
                  rx={2}
                >
                  <title>{`${d.key}: ${d.count} 张卡片`}</title>
                </rect>
              )
            })}

            {/* 时间轴主线 */}
            <line
              x1={padding}
              y1={axisY}
              x2={svgW - padding}
              y2={axisY}
              stroke="var(--cv-toolbar-border)"
              strokeWidth={2}
            />

            {/* 刻度与节点 */}
            {buckets.map((bucket) => {
              const x = xForTs(bucket.start)
              const isExpanded = granularity !== 'day' && expandedBucket === bucket.key
              const showAggregate = bucket.nodes.length > 1 && granularity !== 'day' && !isExpanded
              const nodesToShow = isExpanded ? bucket.nodes : (showAggregate ? [] : bucket.nodes)
              return (
                <g key={bucket.key}>
                  {/* 刻度线 */}
                  <line
                    x1={x} y1={axisY - 5}
                    x2={x} y2={axisY + 5}
                    stroke="var(--cv-text-tertiary)"
                    strokeWidth={1}
                  />
                  {/* 刻度标签 */}
                  <text
                    x={x} y={axisY + 20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--cv-text-secondary)"
                  >
                    {formatBucketLabel(bucket.start, granularity)}
                  </text>
                  {/* 聚合节点（多个卡片合一） */}
                  {showAggregate && (
                    <g
                      onClick={() => setExpandedBucket(bucket.key)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={x}
                        cy={axisY}
                        r={14 + Math.min(bucket.nodes.length, 8)}
                        fill="var(--cv-accent)"
                        opacity={0.8}
                      />
                      <text
                        x={x} y={axisY + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        fill="#fff"
                      >
                        {bucket.nodes.length}
                      </text>
                      <text
                        x={x} y={axisY - 24}
                        textAnchor="middle"
                        fontSize={9}
                        fill="var(--cv-text-tertiary)"
                      >
                        点击展开
                      </text>
                    </g>
                  )}
                  {/* 单个节点 */}
                  {nodesToShow.map((node, ni) => {
                    const ny = axisY + 40 + ni * 36
                    const isSelected = selectedId === String(node.id)
                    return (
                      <g
                        key={node.id}
                        onClick={() => handleSelect(String(node.id))}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* 连接线 */}
                        <line
                          x1={x} y1={axisY}
                          x2={x} y2={ny - 6}
                          stroke={node.color}
                          strokeWidth={1}
                          opacity={0.4}
                        />
                        {/* 节点圆点 */}
                        <circle
                          cx={x} cy={ny - 6}
                          r={5}
                          fill={node.color}
                          stroke={isSelected ? '#fff' : 'var(--cv-card-bg)'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        {/* 节点矩形卡片 */}
                        <rect
                          x={x - 80} y={ny}
                          width={160} height={28}
                          rx={6}
                          fill={isSelected ? 'var(--cv-active-bg)' : 'var(--cv-card-bg)'}
                          stroke={isSelected ? 'var(--cv-accent)' : 'var(--cv-card-border)'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        {/* 颜色条 */}
                        <rect x={x - 80} y={ny} width={3} height={28} fill={node.color} rx={2} />
                        {/* 标题 */}
                        <text
                          x={x - 72} y={ny + 18}
                          fontSize={11}
                          fill="var(--cv-text-main)"
                        >
                          {node.title.length > 16 ? node.title.slice(0, 15) + '…' : node.title}
                        </text>
                      </g>
                    )
                  })}
                  {/* 展开时显示收起提示 */}
                  {isExpanded && (
                    <text
                      x={x} y={axisY + 50 + nodesToShow.length * 36}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--cv-accent)"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedBucket(null)}
                    >
                      ▲ 收起
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── 时间分桶辅助 ───

/** 按粒度生成桶 key */
function bucketKey(ts: number, g: Granularity): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  switch (g) {
    case 'day': return `${y}-${m}-${day}`
    case 'week': {
      // 本周第一天（周日）
      const sunday = new Date(d)
      sunday.setDate(d.getDate() - d.getDay())
      const sy = sunday.getFullYear()
      const sm = String(sunday.getMonth() + 1).padStart(2, '0')
      const sd = String(sunday.getDate()).padStart(2, '0')
      return `${sy}-${sm}-${sd}`
    }
    case 'month': return `${y}-${m}`
    case 'year': return `${y}`
  }
}

/** 解析桶 key 为起始时间戳 */
function parseBucketStart(key: string, g: Granularity): number {
  switch (g) {
    case 'day':
    case 'week':
      return new Date(key + 'T00:00:00').getTime()
    case 'month':
      return new Date(key + '-01T00:00:00').getTime()
    case 'year':
      return new Date(key + '-01-01T00:00:00').getTime()
  }
}

/** 桶时长（ms） */
function bucketDurationMs(g: Granularity): number {
  switch (g) {
    case 'day': return 86400000
    case 'week': return 7 * 86400000
    case 'month': return 30 * 86400000
    case 'year': return 365 * 86400000
  }
}

/** 格式化桶标签 */
function formatBucketLabel(ts: number, g: Granularity): string {
  const d = new Date(ts)
  switch (g) {
    case 'day':
      return `${d.getMonth() + 1}/${d.getDate()}`
    case 'week':
      return `${d.getMonth() + 1}/${d.getDate()}`
    case 'month':
      return `${d.getFullYear()}/${d.getMonth() + 1}`
    case 'year':
      return `${d.getFullYear()}`
  }
}

export default TimelineView

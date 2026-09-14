/**
 * FileDependencyPanel - 文件依赖分析面板
 * 侧边面板，展示文件的出链、入链、删除影响，并绘制 1 跳邻居图
 */
import React, { useMemo, useState } from 'react'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { KB_COLORS } from '../kbTheme'
import { IconLink, IconNetwork, IconClose, IconFileText, IconFolder, IconAlert, IconCheck } from './KbIcons'
import type { LinkRecord } from '@stores/LinkIndexStore'

interface FileDependencyPanelProps {
  fileId: string
  onClose: () => void
}

/** 邻居图节点类型 */
interface GraphNode {
  id: string
  label: string
  isCurrent: boolean
  isBroken: boolean
  x: number
  y: number
}

/** 邻居图边类型 */
interface GraphEdge {
  source: string
  target: string
  broken: boolean
  type: 'out' | 'in'
}

export const FileDependencyPanel: React.FC<FileDependencyPanelProps> = ({ fileId, onClose }) => {
  const { getOutgoingLinks, getBacklinks, resolveTarget, getFilePath } = useLinkIndex()
  const [activeTab, setActiveTab] = useState<'outgoing' | 'backlinks' | 'impact'>('outgoing')
  const [showGraph, setShowGraph] = useState(true)

  // 获取出链和入链
  const outgoingLinks = useMemo(() => getOutgoingLinks(fileId), [getOutgoingLinks, fileId])
  const backlinks = useMemo(() => getBacklinks(fileId), [getBacklinks, fileId])

  // 分析出链：哪些是断链（目标文件不存在）
  const outgoingAnalyzed = useMemo(() => {
    return outgoingLinks.map(link => {
      const targetId = resolveTarget(link.target)
      return {
        link,
        targetId,
        isBroken: !targetId,
        targetName: link.target,
      }
    })
  }, [outgoingLinks, resolveTarget])

  // 删除影响：出链中引用了哪些存在的文件，删除本文件后这些出链不受影响；
  // 真正受影响的是入链 —— 其他文件引用了本文件，删除后这些引用会变成断链
  const impactAnalyzed = useMemo(() => {
    return backlinks.map(link => {
      // 入链来源文件本身是否还存在（理论上存在，因为索引基于现有文件）
      const sourceExists = !!link.sourceFileId
      return {
        link,
        sourceExists,
        sourceName: link.sourceFileName,
      }
    })
  }, [backlinks])

  // 断链统计
  const brokenOutgoingCount = outgoingAnalyzed.filter(o => o.isBroken).length
  const impactCount = backlinks.length

  // 构建 1 跳邻居图数据
  const graphData = useMemo(() => {
    return buildNeighborGraph(fileId, outgoingAnalyzed, backlinks)
  }, [fileId, outgoingAnalyzed, backlinks])

  // 当前文件名
  const currentFileName = useMemo(() => {
    const out = outgoingLinks[0]?.sourceFileName
    const back = backlinks[0]?.target
    return out ?? back ?? getFilePath(fileId) ?? fileId.slice(0, 12)
  }, [outgoingLinks, backlinks, getFilePath, fileId])

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 400, zIndex: 1000,
      backgroundColor: KB_COLORS.bg,
      borderLeft: `1px solid ${KB_COLORS.border}`,
      boxShadow: `-4px 0 16px ${KB_COLORS.shadow}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        backgroundColor: KB_COLORS.bgCard,
        borderBottom: `1px solid ${KB_COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ display: 'grid', placeItems: 'center', color: KB_COLORS.primary }}>
          <IconLink size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: KB_COLORS.textMain }}>依赖分析</div>
          <div style={{
            fontSize: 11, color: KB_COLORS.textSecondary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{currentFileName}</div>
        </div>
        <button
          onClick={() => setShowGraph(!showGraph)}
          style={showGraph ? activeBtnStyle : btnStyle}
          title="切换图谱视图"
          aria-label="切换图谱视图"
        ><IconNetwork size={15} /></button>
        <button onClick={onClose} style={btnStyle} title="关闭" aria-label="关闭"><IconClose size={15} /></button>
      </div>

      {/* 小型依赖图 */}
      {showGraph && (
        <NeighborGraph nodes={graphData.nodes} edges={graphData.edges} />
      )}

      {/* 统计概览 */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 14px',
        backgroundColor: KB_COLORS.bgCard,
        borderBottom: `1px solid ${KB_COLORS.border}`,
        flexShrink: 0,
      }}>
        <StatPill label="出链" value={outgoingLinks.length} color={KB_COLORS.primary} />
        <StatPill label="入链" value={backlinks.length} color={KB_COLORS.success} />
        {brokenOutgoingCount > 0 && (
          <StatPill label="断链" value={brokenOutgoingCount} color={KB_COLORS.danger} />
        )}
        {impactCount > 0 && (
          <StatPill label="删除影响" value={impactCount} color={KB_COLORS.warning} />
        )}
      </div>

      {/* Tab 切换 */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${KB_COLORS.border}`,
        flexShrink: 0,
      }}>
        <TabButton
          active={activeTab === 'outgoing'}
          onClick={() => setActiveTab('outgoing')}
          label={`出链 (${outgoingLinks.length})`}
        />
        <TabButton
          active={activeTab === 'backlinks'}
          onClick={() => setActiveTab('backlinks')}
          label={`入链 (${backlinks.length})`}
        />
        <TabButton
          active={activeTab === 'impact'}
          onClick={() => setActiveTab('impact')}
          label={`删除影响 (${impactCount})`}
        />
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
        {activeTab === 'outgoing' && (
          <LinkList
            items={outgoingAnalyzed.map(item => ({
              id: `${item.link.sourceFileId}-${item.link.line}-${item.link.target}`,
              name: item.targetName,
              targetId: item.targetId,
              isBroken: item.isBroken,
              line: item.link.line,
              context: item.link.context,
              type: item.link.type,
              relation: item.link.relation,
            }))}
            emptyText="该文件没有出链"
            getFilePath={getFilePath}
          />
        )}
        {activeTab === 'backlinks' && (
          <LinkList
            items={backlinks.map(link => ({
              id: `${link.sourceFileId}-${link.line}`,
              name: link.sourceFileName,
              targetId: link.sourceFileId,
              isBroken: false,
              line: link.line,
              context: link.context,
              type: link.type,
              relation: link.relation,
            }))}
            emptyText="没有文件引用此文件"
            getFilePath={getFilePath}
          />
        )}
        {activeTab === 'impact' && (
          <ImpactList
            items={impactAnalyzed.map(item => ({
              id: `${item.link.sourceFileId}-${item.link.line}`,
              name: item.sourceName,
              targetId: item.link.sourceFileId,
              line: item.link.line,
              context: item.link.context,
            }))}
            getFilePath={getFilePath}
          />
        )}
      </div>
    </div>
  )
}

// ─── 子组件：邻居图 ───

const NeighborGraph: React.FC<{ nodes: GraphNode[]; edges: GraphEdge[] }> = ({ nodes, edges }) => {
  const width = 372
  const height = 160
  if (nodes.length === 0) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: KB_COLORS.textTertiary, fontSize: 12,
        borderBottom: `1px solid ${KB_COLORS.border}`,
      }}>暂无依赖关系</div>
    )
  }
  return (
    <div style={{
      padding: '8px 14px',
      backgroundColor: KB_COLORS.bgCard,
      borderBottom: `1px solid ${KB_COLORS.border}`,
      flexShrink: 0,
    }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* 边 */}
        {edges.map((edge, idx) => {
          const source = nodes.find(n => n.id === edge.source)
          const target = nodes.find(n => n.id === edge.target)
          if (!source || !target) return null
          const color = edge.broken ? KB_COLORS.danger : (edge.type === 'out' ? KB_COLORS.primary : KB_COLORS.success)
          return (
            <line
              key={idx}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray={edge.broken ? '4 2' : undefined}
              markerEnd={edge.type === 'out' ? 'url(#arrow-out)' : undefined}
            />
          )
        })}
        {/* 箭头定义 */}
        <defs>
          <marker id="arrow-out" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 7 3, 0 6" fill={KB_COLORS.primary} />
          </marker>
        </defs>
        {/* 节点 */}
        {nodes.map(node => {
          const r = node.isCurrent ? 16 : 12
          const fill = node.isCurrent
            ? KB_COLORS.primary
            : (node.isBroken ? KB_COLORS.danger : KB_COLORS.bgCard)
          const stroke = node.isCurrent ? KB_COLORS.primaryDark : (node.isBroken ? KB_COLORS.danger : KB_COLORS.border)
          const textColor = node.isCurrent ? KB_COLORS.onPrimary : (node.isBroken ? KB_COLORS.danger : KB_COLORS.textMain)
          return (
            <g key={node.id}>
              <circle
                cx={node.x} cy={node.y} r={r}
                fill={fill} stroke={stroke} strokeWidth={1.5}
              />
              <text
                x={node.x} y={node.y + r + 12}
                textAnchor="middle"
                fontSize={9}
                fill={node.isBroken ? KB_COLORS.danger : KB_COLORS.textSecondary}
              >
                {node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}
              </text>
              {node.isBroken && (
                <text
                  x={node.x + r - 2} y={node.y - r + 2}
                  fontSize={10} fill={KB_COLORS.danger}
                  textAnchor="middle"
                >!</text>
              )}
              {node.isCurrent && (
                <text
                  x={node.x} y={node.y + 3}
                  textAnchor="middle"
                  fontSize={9} fill={textColor} fontWeight="bold"
                >本文件</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── 子组件：统计胶囊 ───

const StatPill: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
    padding: '4px 10px', borderRadius: 6, flex: 1,
    backgroundColor: KB_COLORS.bg,
    border: `1px solid ${KB_COLORS.border}`,
  }}>
    <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 10, color: KB_COLORS.textSecondary }}>{label}</span>
  </div>
)

// ─── 子组件：Tab 按钮 ───

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '8px 4px',
      border: 'none', borderBottom: active ? `2px solid ${KB_COLORS.primary}` : '2px solid transparent',
      backgroundColor: 'transparent',
      color: active ? KB_COLORS.primary : KB_COLORS.textSecondary,
      fontSize: 12, fontWeight: active ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
    }}
  >{label}</button>
)

// ─── 子组件：链接列表项 ───

interface LinkListItem {
  id: string
  name: string
  targetId: string | undefined
  isBroken: boolean
  line: number
  context?: string
  type?: string
  relation?: string
}

const LinkList: React.FC<{
  items: LinkListItem[]
  emptyText: string
  getFilePath: (fileId: string) => string
}> = ({ items, emptyText, getFilePath }) => {
  if (items.length === 0) {
    return <div style={emptyStyle}>{emptyText}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(item => {
        const path = item.targetId ? getFilePath(item.targetId) : ''
        return (
          <div
            key={item.id}
            style={{
              padding: '8px 10px', borderRadius: 6,
              backgroundColor: KB_COLORS.bgCard,
              border: `1px solid ${item.isBroken ? KB_COLORS.danger : KB_COLORS.border}`,
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
            }}>
              <span style={{ fontSize: 12, display: 'inline-flex' }}>{item.isBroken ? <IconAlert size={12} /> : <IconFileText size={12} />}</span>
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 500,
                color: item.isBroken ? KB_COLORS.danger : KB_COLORS.textMain,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.name}
              </span>
              <span style={{
                fontSize: 10, color: KB_COLORS.textTertiary,
                backgroundColor: KB_COLORS.bgHover,
                padding: '1px 6px', borderRadius: 8,
              }}>L{item.line}</span>
            </div>
            {path && (
              <div style={{ fontSize: 10, color: KB_COLORS.textTertiary, marginBottom: 2 }}>
                <IconFolder size={10} /> {path}
              </div>
            )}
            {item.isBroken && (
              <div style={{ fontSize: 10, color: KB_COLORS.danger, marginBottom: 2 }}>
                断链：目标文件不存在
              </div>
            )}
            {item.relation && (
              <div style={{
                display: 'inline-block',
                fontSize: 10, color: KB_COLORS.primary,
                backgroundColor: KB_COLORS.primaryLight,
                padding: '1px 6px', borderRadius: 8,
                marginBottom: 4, marginRight: 4,
              }}>关系: {item.relation}</div>
            )}
            {item.context && (
              <pre style={{
                margin: 0, padding: '4px 6px',
                fontSize: 10, lineHeight: 1.4,
                fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                color: KB_COLORS.textSecondary,
                backgroundColor: KB_COLORS.bg,
                borderRadius: 4,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 60, overflow: 'hidden',
              }}>{item.context}</pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 子组件：删除影响列表 ───

interface ImpactItem {
  id: string
  name: string
  targetId: string | undefined
  line: number
  context?: string
}

const ImpactList: React.FC<{
  items: ImpactItem[]
  getFilePath: (fileId: string) => string
}> = ({ items, getFilePath }) => {
  if (items.length === 0) {
    return (
      <div style={emptyStyle}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconCheck size={22} /></div>
        删除此文件不会产生断链
      </div>
    )
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        padding: '8px 10px', marginBottom: 8,
        backgroundColor: KB_COLORS.warningBg, borderRadius: 6,
        fontSize: 12, color: KB_COLORS.warningText,
      }}>
        <IconAlert size={12} /> 删除此文件后，以下 {items.length} 处引用将变为断链：
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => {
          const path = item.targetId ? getFilePath(item.targetId) : ''
          return (
            <div
              key={item.id}
              style={{
                padding: '8px 10px', borderRadius: 6,
                backgroundColor: KB_COLORS.bgCard,
                border: `1px solid ${KB_COLORS.danger}`,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              }}>
                <IconFileText size={12} />
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 500,
                  color: KB_COLORS.textMain,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{item.name}</span>
                <span style={{
                  fontSize: 10, color: KB_COLORS.textTertiary,
                  backgroundColor: KB_COLORS.bgHover,
                  padding: '1px 6px', borderRadius: 8,
                }}>L{item.line}</span>
              </div>
              {path && (
                <div style={{ fontSize: 10, color: KB_COLORS.textTertiary, marginBottom: 2 }}>
                  <IconFolder size={10} /> {path}
                </div>
              )}
              {item.context && (
                <pre style={{
                  margin: 0, padding: '4px 6px',
                  fontSize: 10, lineHeight: 1.4,
                  fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                  color: KB_COLORS.textSecondary,
                  backgroundColor: KB_COLORS.bg,
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 60, overflow: 'hidden',
                }}>{item.context}</pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 图构建工具 ───

/**
 * 构建 1 跳邻居图
 * 中心节点为当前文件，周围节点为出链目标和入链来源
 */
function buildNeighborGraph(
  currentFileId: string,
  outgoingAnalyzed: { link: LinkRecord; targetId: string | undefined; isBroken: boolean; targetName: string }[],
  backlinks: LinkRecord[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // 中心节点（当前文件）
  const centerX = 186
  const centerY = 80
  const centerNode: GraphNode = {
    id: currentFileId,
    label: '当前',
    isCurrent: true,
    isBroken: false,
    x: centerX,
    y: centerY,
  }
  nodes.push(centerNode)

  // 收集邻居（去重）
  const neighbors: { id: string; label: string; isBroken: boolean; type: 'out' | 'in' }[] = []
  const seenIds = new Set<string>([currentFileId])

  // 出链邻居
  for (const item of outgoingAnalyzed) {
    const neighborId = item.targetId ?? `broken:${item.targetName}`
    if (seenIds.has(neighborId)) {
      // 已存在，仅添加边
      edges.push({
        source: currentFileId,
        target: neighborId,
        broken: item.isBroken,
        type: 'out',
      })
      continue
    }
    seenIds.add(neighborId)
    neighbors.push({
      id: neighborId,
      label: item.targetName,
      isBroken: item.isBroken,
      type: 'out',
    })
    edges.push({
      source: currentFileId,
      target: neighborId,
      broken: item.isBroken,
      type: 'out',
    })
  }

  // 入链邻居
  for (const link of backlinks) {
    const neighborId = link.sourceFileId
    if (seenIds.has(neighborId)) {
      // 已存在，仅添加边
      edges.push({
        source: neighborId,
        target: currentFileId,
        broken: false,
        type: 'in',
      })
      continue
    }
    seenIds.add(neighborId)
    const sourceName = link.sourceFileName.replace(/\.md$/i, '')
    neighbors.push({
      id: neighborId,
      label: sourceName,
      isBroken: false,
      type: 'in',
    })
    edges.push({
      source: neighborId,
      target: currentFileId,
      broken: false,
      type: 'in',
    })
  }

  // 限制邻居数量（避免图过于拥挤）
  const maxNeighbors = 8
  const limitedNeighbors = neighbors.slice(0, maxNeighbors)
  if (neighbors.length > maxNeighbors) {
    // 截断对应的边
    const validIds = new Set(limitedNeighbors.map(n => n.id))
    for (let i = edges.length - 1; i >= 0; i--) {
      const e = edges[i]
      const otherEnd = e.source === currentFileId ? e.target : e.source
      if (!validIds.has(otherEnd) && otherEnd !== currentFileId) {
        edges.splice(i, 1)
      }
    }
  }

  // 圆形布局邻居节点
  const radius = 60
  const angleStep = (Math.PI * 2) / Math.max(1, limitedNeighbors.length)
  for (let i = 0; i < limitedNeighbors.length; i++) {
    const neighbor = limitedNeighbors[i]
    const angle = angleStep * i - Math.PI / 2
    const node: GraphNode = {
      id: neighbor.id,
      label: neighbor.label,
      isCurrent: false,
      isBroken: neighbor.isBroken,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
    nodes.push(node)
  }

  return { nodes, edges }
}

// ─── 样式 ───

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.border}`,
  backgroundColor: KB_COLORS.bgCard,
  color: KB_COLORS.textMain, fontSize: 12,
}

const activeBtnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${KB_COLORS.primary}`,
  backgroundColor: KB_COLORS.primaryLight,
  color: KB_COLORS.primaryDark, fontSize: 12,
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: '32px 16px',
  color: KB_COLORS.textTertiary, fontSize: 13,
}

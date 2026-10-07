/**
 * MindMapView - 思维导图视图（P3-5）
 *
 * 基于卡片 parentId 构建树，横向树形布局（左→右）。
 * - SVG 渲染节点（矩形，颜色取自卡片 color）
 * - 贝塞尔曲线连线
 * - 双击节点展开/折叠子树
 * - 顶部：根节点选择 + 关闭
 * - 无根节点时提示选择
 */
import React, { useCallback, useMemo, useState } from 'react'
import { useValue } from '../../engine/useValue'
import type { Editor, TLShapeId } from '../../engine/engineTypes'
import type { NoteCardShape } from '../../shapes/NoteCardShape'
import { layoutTree, type TreeNode } from '../../utils/treeLayout'
import { CanvasIcon } from '../CanvasIcon'
import { AuroraSelect } from '@components/ui/AuroraSelect'
import { useLanguage } from '@stores/LanguageStore'

interface MindMapViewProps {
  editor: Editor
  rootCardId: string | null
}

/** 思维导图节点信息 */
interface MindNode {
  id: string
  title: string
  color: string
  parentId?: string
}

export const MindMapView: React.FC<MindMapViewProps> = ({ editor, rootCardId }) => {
  const { t } = useLanguage()
  const [rootId, setRootId] = useState<string | null>(rootCardId)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 收集所有 note-card（含 parentId）
  const cards = useValue(
    'mindmap-cards',
    () => {
      const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'note-card') as NoteCardShape[]
      return shapes.map(card => ({
        id: String(card.id),
        title: card.props.text.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 30) || t.mindMap.emptyCard,
        color: card.props.color,
        parentId: card.props.parentId,
      })) as MindNode[]
    },
    [editor, t],
  )

  /** parentMap：子→父 */
  const parentMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cards) {
      if (c.parentId) m.set(c.id, c.parentId)
    }
    return m
  }, [cards])

  /** 构建折叠后的树 */
  const tree = useMemo<TreeNode | null>(() => {
    if (cards.length === 0) return null
    const ids = cards.map(c => c.id)
    const actualRoot = rootId && ids.includes(rootId) ? rootId : ids.find(id => !parentMap.has(id)) ?? ids[0]
    if (!actualRoot) return null

    // 构建树时过滤掉折叠节点的子树
    const childrenMap = new Map<string, string[]>()
    for (const c of cards) {
      if (c.parentId && ids.includes(c.parentId)) {
        const arr = childrenMap.get(c.parentId) ?? []
        arr.push(c.id)
        childrenMap.set(c.parentId, arr)
      }
    }

    const build = (id: string, visited: Set<string>): TreeNode => {
      if (visited.has(id)) return { id, children: [] } // 防环
      visited.add(id)
      if (collapsed.has(id)) return { id, children: [] }
      const children = childrenMap.get(id) ?? []
      return { id, children: children.map(c => build(c, new Set(visited))) }
    }
    return build(actualRoot, new Set())
  }, [cards, rootId, parentMap, collapsed])

  /** 计算布局位置 */
  const layout = useMemo(() => {
    if (!tree) return new Map<string, { x: number; y: number }>()
    return layoutTree(tree, {
      nodeWidth: 140,
      nodeHeight: 36,
      hGap: 60,
      vGap: 16,
    })
  }, [tree])

  /** 卡片信息查找表 */
  const cardMap = useMemo(() => {
    const m = new Map<string, MindNode>()
    for (const c of cards) m.set(c.id, c)
    return m
  }, [cards])

  /** 父→子映射（用于绘制连线） */
  const edges = useMemo(() => {
    if (!tree) return [] as { from: string; to: string }[]
    const result: { from: string; to: string }[] = []
    const walk = (node: TreeNode) => {
      for (const child of node.children) {
        result.push({ from: node.id, to: child.id })
        walk(child)
      }
    }
    walk(tree)
    return result
  }, [tree])

  /** 双击节点：折叠/展开 */
  const handleToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** 单击节点：选中 */
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    editor.setSelectedShapes([id as TLShapeId])
    const bounds = editor.getShapePageBounds(id as TLShapeId)
    if (bounds) editor.zoomToBounds(bounds, { inset: 0.2 })
  }, [editor])

  // 计算视图边界
  const bounds = useMemo(() => {
    if (layout.size === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 400 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [, pos] of layout.entries()) {
      const w = 140, h = 36
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + w)
      maxY = Math.max(maxY, pos.y + h)
    }
    return { minX, minY, maxX, maxY }
  }, [layout])

  const svgW = Math.max(bounds.maxX - bounds.minX + 80, 800)
  const svgH = Math.max(bounds.maxY - bounds.minY + 80, 400)
  const offsetX = -bounds.minX + 40
  const offsetY = -bounds.minY + 40

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
          <CanvasIcon name="mindmap" size={18} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cv-text-main)' }}>{t.mindMap.title}</span>
          {/* 根节点选择 */}
          <AuroraSelect
            value={rootId ?? ''}
            onChange={(v) => setRootId(v || null)}
            options={[
              { value: '', label: t.mindMap.autoRoot },
              ...cards.map(c => ({ value: c.id, label: c.title })),
            ]}
          />
          <span style={{ fontSize: 11, color: 'var(--cv-text-tertiary)' }}>
            {t.mindMap.doubleClickHint}
          </span>
        </div>
      </div>

      {/* SVG 画布 */}
      {cards.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cv-text-tertiary)', fontSize: 14,
        }}>
          {t.mindMap.noCards}
        </div>
      ) : !rootId && cards.every(c => !c.parentId) ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cv-text-tertiary)', fontSize: 14, flexDirection: 'column', gap: 8,
        }}>
          <div>{t.mindMap.noHierarchy}</div>
          <div style={{ fontSize: 12 }}>{t.mindMap.noHierarchyHint}</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <svg width={svgW} height={svgH} style={{ display: 'block' }}>
            {/* 连线（贝塞尔曲线） */}
            {edges.map((edge, i) => {
              const fromPos = layout.get(edge.from)
              const toPos = layout.get(edge.to)
              if (!fromPos || !toPos) return null
              const fromNode = cardMap.get(edge.from)
              const fromW = 140, fromH = 36
              const toH = 36
              const x1 = fromPos.x + fromW + offsetX
              const y1 = fromPos.y + fromH / 2 + offsetY
              const x2 = toPos.x + offsetX
              const y2 = toPos.y + toH / 2 + offsetY
              const mx = (x1 + x2) / 2
              const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={fromNode?.color ?? '#9ca3af'}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )
            })}
            {/* 节点 */}
            {Array.from(layout.entries()).map(([id, pos]) => {
              const node = cardMap.get(id)
              if (!node) return null
              const x = pos.x + offsetX
              const y = pos.y + offsetY
              const w = 140, h = 36
              const isSelected = selectedId === id
              const isCollapsed = collapsed.has(id)
              return (
                <g
                  key={id}
                  onClick={() => handleSelect(id)}
                  onDoubleClick={() => handleToggle(id)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x} y={y}
                    width={w} height={h}
                    rx={6}
                    fill="var(--cv-card-bg)"
                    stroke={isSelected ? 'var(--cv-accent)' : node.color}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                  {/* 左侧颜色条 */}
                  <rect x={x} y={y} width={4} height={h} fill={node.color} rx={2} />
                  {/* 标题 */}
                  <text
                    x={x + 12} y={y + h / 2 + 4}
                    fontSize={11}
                    fill="var(--cv-text-main)"
                  >
                    {node.title.length > 12 ? node.title.slice(0, 11) + '…' : node.title}
                  </text>
                  {/* 折叠指示器 */}
                  {isCollapsed && (
                    <circle
                      cx={x + w - 10} cy={y + h / 2}
                      r={6}
                      fill="var(--cv-accent)"
                    >
                      <title>{t.mindMap.collapsedHint}</title>
                    </circle>
                  )}
                  {/* 有子节点但未折叠的标记 */}
                  {!isCollapsed && edges.some(e => e.from === id) && (
                    <circle
                      cx={x + w} cy={y + h / 2}
                      r={3}
                      fill="var(--cv-text-tertiary)"
                    />
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

export default MindMapView

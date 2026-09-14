/**
 * AutoLayoutPanel - 自动排版面板（P3-15）
 *
 * 提供树形/网格/圆形/流程图四种自动排版算法。
 * - 算法选择
 * - 范围：选中卡片 / 全部卡片
 * - 间距调节：紧凑 / 标准 / 宽松
 * - 应用 + 预览
 */
import React, { useCallback, useMemo, useState } from 'react'
import type { Editor, TLShape, TLShapeId, TLArrowBinding, TLBinding } from '../engine/engineTypes'
import type { NoteCardShape } from '../shapes/NoteCardShape'
import {
  layoutTree,
  layoutGrid,
  layoutCircle,
  layoutFlow,
} from '../utils/layoutUtils'
import { CanvasIcon } from './CanvasIcon'

interface AutoLayoutPanelProps {
  editor: Editor
  onClose: () => void
}

type Algorithm = 'tree' | 'grid' | 'circle' | 'flow'
type Scope = 'selected' | 'all'
type Spacing = 'compact' | 'standard' | 'loose'

const ALGORITHM_LABEL: Record<Algorithm, string> = {
  tree: '树形布局',
  grid: '网格布局',
  circle: '圆形布局',
  flow: '流程图布局',
}

const ALGORITHM_DESC: Record<Algorithm, string> = {
  tree: '基于卡片 parentId 构建树，横向层级排列',
  grid: '按行列等距排列',
  circle: '均匀分布在圆周上',
  flow: '按连线拓扑分层（Sugiyama 风格）',
}

const SPACING_GAP: Record<Spacing, { grid: number; tree: number; flow: number; circle: number }> = {
  compact: { grid: 20, tree: 40, flow: 40, circle: 200 },
  standard: { grid: 40, tree: 80, flow: 80, circle: 350 },
  loose: { grid: 80, tree: 120, flow: 120, circle: 500 },
}

const CARD_TYPES = new Set(['note-card', 'image-card', 'file-card', 'embed-card', 'canvas-ref'])

export const AutoLayoutPanel: React.FC<AutoLayoutPanelProps> = ({ editor, onClose }) => {
  const [algorithm, setAlgorithm] = useState<Algorithm>('tree')
  const [scope, setScope] = useState<Scope>('selected')
  const [spacing, setSpacing] = useState<Spacing>('standard')
  const [previewPositions, setPreviewPositions] = useState<Map<string, { x: number; y: number }> | null>(null)

  /** 获取目标形状 */
  const targetShapes = useMemo<TLShape[]>(() => {
    const all = editor.getCurrentPageShapes().filter(s => CARD_TYPES.has(s.type))
    if (scope === 'selected') {
      const selectedIds = new Set(editor.getSelectedShapeIds())
      const selected = all.filter(s => selectedIds.has(s.id))
      return selected.length >= 2 ? selected : all
    }
    return all
  }, [editor, scope])

  /** 提取 parentMap（用于树形布局） */
  const parentMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of targetShapes) {
      if (s.type === 'note-card') {
        const card = s as NoteCardShape
        if (card.props.parentId) m.set(String(s.id), card.props.parentId)
      }
    }
    return m
  }, [targetShapes])

  /** 提取边（用于流程图布局） */
  const edges = useMemo<{ source: string; target: string }[]>(() => {
    const allBindings = editor.store.allRecords().filter(
      (r): r is TLBinding => r.typeName === 'binding',
    )
    const arrowBindings = allBindings.filter(
      (b): b is TLArrowBinding => b.type === 'arrow',
    )
    const byArrow = new Map<string, { start?: TLArrowBinding; end?: TLArrowBinding }>()
    for (const b of arrowBindings) {
      const entry = byArrow.get(b.fromId) ?? {}
      if (b.props.terminal === 'start') entry.start = b
      else entry.end = b
      byArrow.set(b.fromId, entry)
    }
    const idSet = new Set(targetShapes.map(s => s.id))
    const result: { source: string; target: string }[] = []
    for (const { start, end } of byArrow.values()) {
      if (!start || !end) continue
      if (idSet.has(start.toId) && idSet.has(end.toId)) {
        result.push({ source: start.toId, target: end.toId })
      }
    }
    return result
  }, [editor, targetShapes])

  /** 计算布局（预览） */
  const computeLayout = useCallback((): Map<string, { x: number; y: number }> => {
    if (targetShapes.length === 0) return new Map()
    const gaps = SPACING_GAP[spacing]
    switch (algorithm) {
      case 'tree':
        return layoutTree(targetShapes, parentMap)
      case 'grid':
        return layoutGrid(targetShapes, Math.ceil(Math.sqrt(targetShapes.length)), gaps.grid)
      case 'circle': {
        const center = { x: 0, y: 0 }
        return layoutCircle(targetShapes, center, gaps.circle)
      }
      case 'flow':
        return layoutFlow(targetShapes, edges)
    }
  }, [targetShapes, parentMap, edges, algorithm, spacing])

  /** 预览 */
  const handlePreview = useCallback(() => {
    setPreviewPositions(computeLayout())
  }, [computeLayout])

  /** 应用布局到 editor */
  const handleApply = useCallback(() => {
    const positions = computeLayout()
    if (positions.size === 0) return

    // 居中到当前视口中心
    const viewport = editor.getViewportPageBounds()
    const centerX = (viewport.minX + viewport.maxX) / 2
    const centerY = (viewport.minY + viewport.maxY) / 2

    // 计算布局的几何中心
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [, pos] of positions.entries()) {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x)
      maxY = Math.max(maxY, pos.y)
    }
    const layoutCx = (minX + maxX) / 2
    const layoutCy = (minY + maxY) / 2
    const dx = centerX - layoutCx
    const dy = centerY - layoutCy

    const updates = []
    for (const [id, pos] of positions.entries()) {
      const shape = editor.getShape(id as TLShapeId)
      if (!shape) continue
      updates.push({
        id: shape.id,
        type: shape.type,
        x: pos.x + dx,
        y: pos.y + dy,
      })
    }
    editor.updateShapes(updates)
    setPreviewPositions(null)
  }, [computeLayout, editor])

  const btnStyle: React.CSSProperties = {
    border: '1px solid var(--cv-toolbar-border)',
    background: 'transparent',
    color: 'var(--cv-text-main)',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
  }

  const activeBtnStyle = (active: boolean): React.CSSProperties => ({
    ...btnStyle,
    background: active ? 'var(--cv-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--cv-text-secondary)',
  })

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 24,
      zIndex: 500,
      width: 280,
      backgroundColor: 'var(--cv-toolbar-bg)',
      border: '1px solid var(--cv-toolbar-border)',
      borderRadius: 'var(--cv-radius-lg)',
      boxShadow: 'none',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cv-text-main)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CanvasIcon name="sparkle" size={14} /> 自动排版
        </span>
        <button
          onClick={onClose}
          style={{
            border: 'none', background: 'transparent',
            color: 'var(--cv-text-tertiary)', cursor: 'pointer', fontSize: 14,
          }}
        ><CanvasIcon name="close" size={14} /></button>
      </div>

      {/* 算法选择 */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--cv-text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>
          排版算法
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {(Object.keys(ALGORITHM_LABEL) as Algorithm[]).map(algo => (
            <button
              key={algo}
              onClick={() => { setAlgorithm(algo); setPreviewPositions(null) }}
              style={activeBtnStyle(algorithm === algo)}
            >
              {ALGORITHM_LABEL[algo]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--cv-text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
          {ALGORITHM_DESC[algorithm]}
        </div>
      </div>

      {/* 范围选择 */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--cv-text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>
          范围
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => { setScope('selected'); setPreviewPositions(null) }}
            style={{ ...activeBtnStyle(scope === 'selected'), flex: 1 }}
          >选中卡片</button>
          <button
            onClick={() => { setScope('all'); setPreviewPositions(null) }}
            style={{ ...activeBtnStyle(scope === 'all'), flex: 1 }}
          >全部卡片</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--cv-text-tertiary)', marginTop: 4 }}>
          目标卡片数：{targetShapes.length}
        </div>
      </div>

      {/* 间距调节 */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--cv-text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>
          间距
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['compact', 'standard', 'loose'] as Spacing[]).map(sp => (
            <button
              key={sp}
              onClick={() => { setSpacing(sp); setPreviewPositions(null) }}
              style={{ ...activeBtnStyle(spacing === sp), flex: 1 }}
            >
              {sp === 'compact' ? '紧凑' : sp === 'standard' ? '标准' : '宽松'}
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          onClick={handlePreview}
          style={{ ...btnStyle, flex: 1 }}
          disabled={targetShapes.length < 2}
        ><CanvasIcon name="eye" size={14} /> 预览</button>
        <button
          onClick={handleApply}
          style={{
            ...btnStyle,
            flex: 1,
            background: 'var(--cv-accent)',
            color: '#fff',
            border: 'none',
          }}
          disabled={targetShapes.length < 2}
        >应用</button>
      </div>

      {/* 预览信息 */}
      {previewPositions && (
        <div style={{
          fontSize: 10, color: 'var(--cv-text-secondary)',
          backgroundColor: 'var(--cv-meta-bg)', padding: 6, borderRadius: 6,
        }}>
          预览已生成：{previewPositions.size} 个节点
          <br />
          点击「应用」将布局写入画布
        </div>
      )}

      {/* 提示 */}
      {targetShapes.length < 2 && (
        <div style={{
          fontSize: 10, color: 'var(--cv-text-tertiary)',
          textAlign: 'center',
        }}>
          至少需要 2 个卡片
        </div>
      )}
    </div>
  )
}

export default AutoLayoutPanel

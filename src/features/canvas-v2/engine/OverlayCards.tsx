/**
 * OverlayCards — 浮层卡片渲染（Excalidraw 混合架构）
 *
 * 交互模型：
 * - 选中/拖拽工具下，卡片浮层 pointer-events:auto，自管拖拽与选中（写回引擎 → 代理矩形同步 → 箭头跟随）。
 * - 绘图工具（箭头/矩形/椭圆/画笔）下，卡片浮层 body pointer-events:none，让 Excalidraw 接管，
 *   从而箭头可原生绑定到卡片代理矩形。
 * - 编辑态 textarea 始终可交互。
 */
import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useValue } from './useValue'
import type { CanvasEngine } from './CanvasEngine'
import type { ShapeLike, PropsBag } from './engineTypes'
import { getColorDef, parseTags, renderNoteCardContent, formatRelativeTime, getCardTitle, syncCardTitleToNote } from './cardHelpers'
import { useFileManager } from '@stores/FileStore'
import { CanvasIcon } from '../components/CanvasIcon'

const headerBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--cv-text-secondary)',
  cursor: 'pointer',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
  lineHeight: 1,
  flexShrink: 0,
}

const anchorStyle: React.CSSProperties = {
  position: 'absolute',
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: 'var(--cv-accent)',
  border: '2px solid var(--cv-card-bg)',
  cursor: 'crosshair',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  zIndex: 10,
}

// 共享：拖拽/选中交互
function useCardInteraction(engine: CanvasEngine, shape: ShapeLike, zoom: number) {
  const tool = useValue('tool', () => engine.getCurrentToolId(), [engine])
  const isSelected = useValue('isSel', () => engine.getSelectedShapeIds().includes(shape.id), [engine, shape.id])
  // 引擎统一存 tldraw 工具名：选择/拖拽/橡皮 下卡片可交互；绘图工具下让 Excalidraw 接管
  const interactive = tool === 'select' || tool === 'hand' || tool === 'eraser'

  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return
    // 按钮/textarea 内部不触发拖拽
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return
    if (!isSelected) engine.setSelectedShapes([shape.id])
    else engine.setSelectedShapes(Array.from(new Set([...engine.getSelectedShapeIds(), shape.id])))
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: shape.x, oy: shape.y }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [interactive, isSelected, engine, shape.id, shape.x, shape.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.sx) / zoom
    const dy = (e.clientY - dragRef.current.sy) / zoom
    const nx = dragRef.current.ox + dx
    const ny = dragRef.current.oy + dy
    engine.updateShape({ id: shape.id, x: nx, y: ny })
    // 分组联动（P2-1）：拖动分组框时带动其成员卡
    if (shape.type === 'group-card') {
      for (const s of engine.getCurrentPageShapes()) {
        if (s.id !== shape.id && s.props?.groupId === shape.id) {
          engine.updateShape({ id: s.id, x: (s.x ?? 0) + dx, y: (s.y ?? 0) + dy })
        }
      }
    }
  }, [engine, shape.id, zoom, shape.type])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    setDragging(false)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  return { tool, isSelected, interactive, dragging, onPointerDown, onPointerMove, onPointerUp }
}

// ─── 笔记卡片（完整富渲染） ───
export function OverlayNoteCard({ shape, engine, zoom }: { shape: ShapeLike; engine: CanvasEngine; zoom: number }) {
  const { isSelected, interactive, dragging, onPointerDown, onPointerMove, onPointerUp } =
    useCardInteraction(engine, shape, zoom)
  const isEditing = useValue('isEditing', () => engine.getEditingShapeId() === shape.id, [engine, shape.id])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { w, h, text, color, collapsed, syncEnabled, fileId, tags, pinned, updatedAt, placeholder } = shape.props
  const colorDef = getColorDef(color)
  const tagList = parseTags(tags)

  // C8 卡片 ↔ 笔记标题同步：编辑开始记录旧标题，编辑结束（Escape/失焦）提交改名
  const { renameNode } = useFileManager()
  const editStartTitleRef = useRef<string>(getCardTitle(text))
  useEffect(() => {
    if (isEditing) editStartTitleRef.current = getCardTitle(shape.props.text ?? '')
  }, [isEditing, shape.props.text])

  const commitTitleSync = useCallback(() => {
    syncCardTitleToNote({
      engine,
      shapeId: shape.id,
      fileId,
      syncEnabled,
      startTitle: editStartTitleRef.current,
      renameNode,
    })
  }, [engine, shape.id, fileId, syncEnabled, renameNode])

  const updateProps = useCallback((patch: PropsBag) => {
    engine.updateShape({ id: shape.id, props: { ...patch, updatedAt: Date.now() } })
  }, [engine, shape.id])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateProps({ text: e.target.value })
  }, [updateProps])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); commitTitleSync(); engine.setEditingShape(null) }
  }, [commitTitleSync, engine])

  const toggleCollapse = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); updateProps({ collapsed: !collapsed })
  }, [updateProps, collapsed])
  const toggleSync = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); updateProps({ syncEnabled: !syncEnabled })
  }, [updateProps, syncEnabled])
  const openFile = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    if (fileId) window.dispatchEvent(new CustomEvent('note-card:open-file', { detail: { fileId, shapeId: shape.id } }))
  }, [fileId, shape.id])
  const handleDoubleClick = useCallback(() => {
    if (engine.getEditingShapeId() !== shape.id) engine.setEditingShape(shape.id)
  }, [engine, shape.id])
  const startArrow = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); engine.setCurrentTool('arrow')
  }, [engine])

  const html = text?.trim() ? renderNoteCardContent(text) : ''
  const title = (text || '').split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 40) || '空笔记'
  const lineCount = (text || '').split('\n').length
  const displayH = collapsed ? 44 : (h ?? 200)
  const gradient = `linear-gradient(135deg, ${colorDef.from} 0%, ${colorDef.to} 100%)`

  const cardStyle: React.CSSProperties = {
    width: w ?? 260,
    height: displayH,
    backgroundColor: 'var(--cv-card-bg)',
    borderRadius: 12,
    border: isSelected ? '1px solid transparent' : `1px solid var(--cv-card-border)`,
    boxShadow: isHovered ? 'var(--cv-card-shadow-hover)' : 'var(--cv-card-shadow)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    pointerEvents: interactive ? 'auto' : 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transform: isHovered && !isSelected && !dragging ? 'translateY(-1px)' : 'none',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease',
    cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'default',
    position: 'relative',
  }

  return (
    <div
      style={cardStyle}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div style={{ height: 4, background: gradient, flexShrink: 0 }} />
      <div style={{
        height: 40, minHeight: 40, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
        fontSize: 13, fontWeight: 600, color: 'var(--cv-text-main)', userSelect: 'none', flexShrink: 0,
      }}>
        <button data-no-drag onPointerDown={toggleCollapse} style={headerBtnStyle} title={collapsed ? '展开' : '折叠'}>
          {collapsed ? <CanvasIcon name="chevronRight" size={12} /> : <CanvasIcon name="chevronDown" size={12} />}
        </button>
        {pinned && <span style={{ fontSize: 11, display: 'inlineFlex', alignItems: 'center' }} title="已置顶"><CanvasIcon name="pinFill" size={11} /></span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {collapsed && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8, backgroundColor: 'var(--cv-accent-soft)',
            color: 'var(--cv-accent)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
          }} title="已折叠，点击左侧箭头展开">{lineCount} 行</span>
        )}
        {tagList.slice(0, 2).map((tag) => (
          <span key={tag} style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8, backgroundColor: 'var(--cv-accent-soft)',
            color: 'var(--cv-accent)', fontWeight: 500, maxWidth: 60, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={`#${tag}`}>#{tag}</span>
        ))}
        {fileId && <button data-no-drag onPointerDown={openFile} style={headerBtnStyle} title="打开文件">↗</button>}
        <button data-no-drag onPointerDown={toggleSync} style={{
          ...headerBtnStyle,
          backgroundColor: syncEnabled ? 'var(--cv-accent-soft)' : 'transparent',
          color: syncEnabled ? 'var(--cv-accent)' : 'var(--cv-text-tertiary)',
        }} title={syncEnabled ? '同步已开启' : '同步已关闭'}>{syncEnabled ? '⟳' : '⟲'}</button>
      </div>

      {!collapsed && (
        <div style={{
          flex: 1, overflow: 'auto', padding: '4px 12px', fontSize: 13, lineHeight: 1.6, color: 'var(--cv-text-main)',
        }}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              data-no-drag
              value={text ?? ''}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={commitTitleSync}
              style={{
                width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.6,
                backgroundColor: 'transparent', color: 'var(--cv-text-main)', padding: 0,
              }}
              placeholder={placeholder || '输入 markdown 内容...'}
              autoFocus
            />
          ) : html ? (
            <div className="note-card-md" dangerouslySetInnerHTML={{ __html: html }} style={{ wordBreak: 'break-word' }} />
          ) : (
            <div style={{ color: 'var(--cv-text-tertiary)', fontStyle: 'italic', fontSize: 12 }}>
              {placeholder || '双击编辑内容...'}
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <div style={{
          height: 24, minHeight: 24, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
          fontSize: 10, color: 'var(--cv-text-tertiary)', backgroundColor: 'var(--cv-meta-bg)',
          borderTop: '1px solid var(--cv-card-border)', userSelect: 'none', flexShrink: 0,
        }}>
          {syncEnabled && <span title="同步已开启">⟳ 同步</span>}
          {fileId && <span title="关联文件" style={{ display: 'inlineFlex', alignItems: 'center', gap: 3 }}><CanvasIcon name="link" size={10} /> 关联</span>}
          {pinned && <span title="已置顶" style={{ display: 'inlineFlex', alignItems: 'center', gap: 3 }}><CanvasIcon name="pinFill" size={10} /> 置顶</span>}
          {updatedAt && (
            <span style={{ marginLeft: 'auto' }} title={new Date(updatedAt).toLocaleString()}>
              {formatRelativeTime(updatedAt)}
            </span>
          )}
        </div>
      )}

      {isHovered && !isEditing && interactive && (
        <>
          <div data-no-drag onPointerDown={startArrow} style={{ ...anchorStyle, right: -5, top: '50%', transform: 'translateY(-50%)' }} title="拖拽创建连线" />
          <div data-no-drag onPointerDown={startArrow} style={{ ...anchorStyle, left: -5, top: '50%', transform: 'translateY(-50%)' }} title="拖拽创建连线" />
          <div data-no-drag onPointerDown={startArrow} style={{ ...anchorStyle, top: -5, left: '50%', transform: 'translateX(-50%)' }} title="拖拽创建连线" />
          <div data-no-drag onPointerDown={startArrow} style={{ ...anchorStyle, bottom: -5, left: '50%', transform: 'translateX(-50%)' }} title="拖拽创建连线" />
        </>
      )}
    </div>
  )
}

// ─── 标签元素（label-card）：画布内轻量可交互标签 ───
// 与其它卡片同管线：拖拽/选中走 useCardInteraction，几何写回引擎（代理矩形同步、
// 箭头可绑定、随相机缩放平移、持久化与撤销由引擎统一承担）。

/** 标签背景色预设（浅色底 + 深色文字 / 深色底 + 浅色文字 自动判断） */
// eslint-disable-next-line react-refresh/only-export-components -- 预设常量与唯一消费组件同文件聚合，非跨组件共享
export const LABEL_BG_PRESETS = [
  '#FDE68A', '#FCA5A5', '#A7F3D0', '#93C5FD', '#DDD6FE', '#F9A8D4', '#334155',
]

/** 根据背景色亮度自动给出可读的默认文字色 */
// eslint-disable-next-line react-refresh/only-export-components -- 纯函数与唯一消费组件同文件聚合，非跨组件共享
export function autoTextColor(bg: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg || '')
  if (!m) return '#1F2937'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1F2937' : '#F9FAFB'
}

/** 按文本内容估算标签宽度（CJK 按全角、其余按半角），用于输入时自适应 */
function estimateLabelWidth(text: string, fontSize: number): number {
  let units = 0
  for (const ch of text || '') units += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.58
  return Math.min(480, Math.max(88, Math.round(units * fontSize + 32)))
}

export function OverlayLabelCard({ shape, engine, zoom }: { shape: ShapeLike; engine: CanvasEngine; zoom: number }) {
  const { isSelected, interactive, dragging, onPointerDown, onPointerMove, onPointerUp } =
    useCardInteraction(engine, shape, zoom)
  const isEditing = useValue('isEditingLabel', () => engine.getEditingShapeId() === shape.id, [engine, shape.id])
  const [isHovered, setIsHovered] = useState(false)

  const {
    w, h, text,
    bg = LABEL_BG_PRESETS[0],
    textColor,
    fontSize = 14,
    borderOn = true,
  } = shape.props
  const resolvedText = (text ?? '') as string
  const resolvedTextColor = (textColor as string) || autoTextColor(bg)
  // 边框色随背景加深，保持同色系描边
  const borderColor = borderOn ? 'rgba(0,0,0,0.28)' : 'transparent'

  const updateProps = useCallback((patch: PropsBag) => {
    engine.updateShape({ id: shape.id, props: { ...patch, updatedAt: Date.now() } })
  }, [engine, shape.id])

  // 文本变更：同步引擎状态 + 宽度自适应（引擎会同步代理矩形，箭头/持久化随之更新）
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    updateProps({ text: v, w: estimateLabelWidth(v, fontSize) })
  }, [updateProps, fontSize])

  const endEditing = useCallback(() => {
    if (engine.getEditingShapeId() === shape.id) engine.setEditingShape(null)
  }, [engine, shape.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); endEditing() }
  }, [endEditing])

  const handleDoubleClick = useCallback(() => {
    if (engine.getEditingShapeId() !== shape.id) engine.setEditingShape(shape.id)
  }, [engine, shape.id])

  const labelStyle: React.CSSProperties = {
    width: w ?? 120,
    height: h ?? 36,
    backgroundColor: bg,
    color: resolvedTextColor,
    borderRadius: 8,
    border: isSelected ? '1.5px solid transparent' : `1.5px solid ${borderColor}`,
    boxShadow: isHovered ? 'var(--cv-card-shadow-hover)' : 'var(--cv-card-shadow)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 14px', boxSizing: 'border-box',
    fontSize, fontWeight: 600, lineHeight: 1.2,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    pointerEvents: interactive ? 'auto' : 'none',
    cursor: interactive ? (dragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
    transform: isHovered && !isSelected && !dragging ? 'translateY(-1px)' : 'none',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease',
    position: 'relative',
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={labelStyle}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            data-no-drag
            value={resolvedText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={endEditing}
            autoFocus
            placeholder="输入标签…"
            style={{
              width: '100%', border: 'none', outline: 'none', background: 'transparent',
              color: resolvedTextColor, fontSize, fontWeight: 600, textAlign: 'center',
              fontFamily: 'inherit', padding: 0,
            }}
          />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {resolvedText || <span style={{ opacity: 0.55, fontStyle: 'italic' }}>双击编辑</span>}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── 通用卡片（image/file/embed/canvas-ref）：占位式富框，支持拖拽/选中/删除 ───
export function OverlayGenericCard({ shape, engine, zoom }: { shape: ShapeLike; engine: CanvasEngine; zoom: number }) {
  const { isSelected, interactive, onPointerDown, onPointerMove, onPointerUp } = useCardInteraction(engine, shape, zoom)

  // 分组框（P2-1 最小可用）：虚线框 + 标题 + 成员数 + 加入分组
  if (shape.type === 'group-card') {
    const members = engine
      .getCurrentPageShapes()
      .filter((s) => s.type !== 'group-card' && s.type !== 'arrow' && s.props?.groupId === shape.id)
    const addSelected = (e: React.PointerEvent) => {
      e.stopPropagation()
      for (const id of engine.getSelectedShapeIds()) {
        const s = engine.getShape(id)
        if (s && s.id !== shape.id && s.type !== 'arrow') {
          engine.updateShape({ id, props: { groupId: shape.id } })
        }
      }
    }
    const ungroupAll = (e: React.PointerEvent) => {
      e.stopPropagation()
      for (const m of members) engine.updateShape({ id: m.id, props: { groupId: undefined } })
    }
    const gTitle = String(shape.props.title || '分组').slice(0, 30)
    return (
      <div
        style={{
          width: shape.props.w ?? 340,
          height: shape.props.h ?? 220,
          boxSizing: 'border-box',
          borderRadius: 12,
          border: isSelected ? '1.5px solid var(--cv-accent)' : '1.5px dashed var(--cv-accent)',
          backgroundColor: isSelected ? 'rgba(124,140,255,0.10)' : 'rgba(124,140,255,0.05)',
          display: 'flex', flexDirection: 'column',
          pointerEvents: interactive ? 'auto' : 'none',
          fontFamily: 'system-ui, sans-serif', position: 'relative',
          cursor: interactive ? (isSelected ? 'move' : 'grab') : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          fontSize: 12, fontWeight: 600, color: 'var(--cv-accent)',
          borderBottom: '1px dashed rgba(124,140,255,0.25)', userSelect: 'none',
        }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gTitle}</span>
          <span style={{ fontSize: 10, opacity: 0.7, whiteSpace: 'nowrap' }}>{members.length} 成员</span>
          <button
            data-no-drag
            onPointerDown={addSelected}
            title="将选中卡片加入该分组"
            style={{ ...headerBtnStyle, color: 'var(--cv-accent)', fontWeight: 700 }}
          >＋</button>
          {members.length > 0 && (
            <button data-no-drag onPointerDown={ungroupAll} title="移出全部成员" style={headerBtnStyle}>✕</button>
          )}
        </div>
      </div>
    )
  }

  const colorDef = getColorDef(shape.props.color ?? '#3b82f6')
  const title = (shape.props.title || shape.props.fileName || shape.props.alt || shape.type).toString().slice(0, 30)
  const style: React.CSSProperties = {
    width: shape.props.w ?? 240,
    height: shape.props.h ?? 180,
    backgroundColor: 'var(--cv-card-bg)',
    borderRadius: 12,
    border: isSelected ? '1px solid transparent' : `1px solid var(--cv-card-border)`,
    boxShadow: 'var(--cv-card-shadow)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    pointerEvents: interactive ? 'auto' : 'none',
    fontFamily: 'system-ui, sans-serif', position: 'relative',
    cursor: interactive ? 'grab' : 'default',
  }
  return (
    <div style={style} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div style={{ height: 4, background: `linear-gradient(135deg, ${colorDef.from} 0%, ${colorDef.to} 100%)`, flexShrink: 0 }} />
      <div style={{ padding: 10, fontSize: 12, color: 'var(--cv-text-secondary)' }}>
        <div style={{ fontWeight: 600, color: 'var(--cv-text-main)', marginBottom: 4 }}>{title}</div>
        <div style={{ opacity: 0.7 }}>{shape.type}</div>
      </div>
    </div>
  )
}

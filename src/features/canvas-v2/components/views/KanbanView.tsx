/**
 * KanbanView - 看板视图（P3-6）
 *
 * 按标签/颜色分列展示当前画布卡片。
 * - 横向多列，每列：列头（分组名 + 卡片数）+ 卡片列表
 * - 卡片缩略形式：标题 + 颜色条 + 标签
 * - 拖拽跨列改变标签（HTML5 Drag & Drop API）
 * - 点击卡片选中（同步到 tldraw editor）
 * - 顶部：分列规则切换（标签/颜色）+ 关闭按钮
 * - 空状态提示
 */
import React, { useCallback, useMemo, useState } from 'react'
import { useValue } from '../../engine/useValue'
import type { Editor, TLShapeId } from '../../engine/engineTypes'
import type { NoteCardShape } from '../../shapes/NoteCardShape'
import { CanvasIcon } from '../CanvasIcon'

interface KanbanViewProps {
  editor: Editor
}

/** 看板卡片条目（仅 note-card） */
interface KanbanCard {
  id: TLShapeId
  title: string
  color: string
  tags: string[]
  pinned: boolean
  updatedAt?: number
}

type GroupBy = 'tag' | 'color'

/** 卡片颜色友好名（hex→名称） */
const COLOR_NAMES: Record<string, string> = {
  '#6366F1': '靛蓝', '#6366f1': '靛蓝',
  '#10B981': '翠绿', '#10b981': '翠绿',
  '#F59E0B': '琥珀', '#f59e0b': '琥珀',
  '#EC4899': '玫红', '#ec4899': '玫红',
  '#06B6D4': '青蓝', '#06b6d4': '青蓝',
  '#8B5CF6': '紫罗兰', '#8b5cf6': '紫罗兰',
  '#64748B': '石板', '#64748b': '石板',
  '#F97316': '橙红', '#f97316': '橙红',
}

export const KanbanView: React.FC<KanbanViewProps> = ({ editor }) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('tag')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 订阅 editor 中所有 note-card
  const cards = useValue(
    'kanban-cards',
    () => {
      const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'note-card') as NoteCardShape[]
      return shapes.map(card => ({
        id: card.id,
        title: card.props.text.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 60) || '空笔记',
        color: card.props.color,
        tags: card.props.tags?.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) ?? [],
        pinned: card.props.pinned ?? false,
        updatedAt: card.props.updatedAt,
      })) as KanbanCard[]
    },
    [editor],
  )

  // 分组
  const groups = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    if (groupBy === 'tag') {
      for (const c of cards) {
        if (c.tags.length === 0) {
          const arr = map.get('未分组') ?? []
          arr.push(c)
          map.set('未分组', arr)
        } else {
          for (const t of c.tags) {
            const arr = map.get(t) ?? []
            arr.push(c)
            map.set(t, arr)
          }
        }
      }
    } else {
      for (const c of cards) {
        const key = COLOR_NAMES[c.color] ?? c.color
        const arr = map.get(key) ?? []
        arr.push(c)
        map.set(key, arr)
      }
    }
    // 排序：置顶在前，然后按 updatedAt 降序
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      })
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items, color: items[0]?.color }))
  }, [cards, groupBy])

  /** 拖拽放置：改变卡片标签/颜色 */
  const handleDrop = useCallback((groupName: string) => {
    if (!draggingId) return
    const shape = editor.getShape(draggingId as TLShapeId)
    if (!shape || shape.type !== 'note-card') return
    const card = shape as NoteCardShape

    if (groupBy === 'tag') {
      if (groupName === '未分组') {
        // 清空标签
        editor.updateShape({ id: card.id, type: 'note-card', props: { tags: '' } })
      } else {
        // 替换为单个标签（看板模式下每列代表一个标签）
        editor.updateShape({ id: card.id, type: 'note-card', props: { tags: groupName } })
      }
    } else {
      // 颜色分组：找到对应 hex
      const hex = Object.entries(COLOR_NAMES).find(([, name]) => name === groupName)?.[0]
      if (hex) {
        editor.updateShape({ id: card.id, type: 'note-card', props: { color: hex } })
      }
    }
    setDraggingId(null)
    setDragOverGroup(null)
  }, [draggingId, editor, groupBy])

  /** 点击卡片：选中并在画布上聚焦 */
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    editor.setSelectedShapes([id as TLShapeId])
    const bounds = editor.getShapePageBounds(id as TLShapeId)
    if (bounds) editor.zoomToBounds(bounds, { inset: 0.2 })
  }, [editor])

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
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--cv-card-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CanvasIcon name="kanban" size={18} />
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cv-text-main)' }}>看板视图</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
            <button
              onClick={() => setGroupBy('tag')}
              style={{
                ...btnStyle,
                background: groupBy === 'tag' ? 'var(--cv-accent)' : 'transparent',
                color: groupBy === 'tag' ? '#fff' : 'var(--cv-text-secondary)',
              }}
            >按标签</button>
            <button
              onClick={() => setGroupBy('color')}
              style={{
                ...btnStyle,
                background: groupBy === 'color' ? 'var(--cv-accent)' : 'transparent',
                color: groupBy === 'color' ? '#fff' : 'var(--cv-text-secondary)',
              }}
            >按颜色</button>
          </div>
        </div>
      </div>

      {/* 看板列 */}
      {cards.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cv-text-tertiary)', fontSize: 14,
        }}>
          画布上还没有卡片，添加笔记卡片后可在此查看
        </div>
      ) : (
        <div style={{
          flex: 1, overflowX: 'auto', overflowY: 'hidden',
          padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          {groups.map(group => (
            <div
              key={group.name}
              onDragOver={e => { e.preventDefault(); setDragOverGroup(group.name) }}
              onDragLeave={() => setDragOverGroup(null)}
              onDrop={() => handleDrop(group.name)}
              style={{
                width: 260,
                flexShrink: 0,
                backgroundColor: dragOverGroup === group.name ? 'var(--cv-active-bg)' : 'var(--cv-meta-bg)',
                borderRadius: 10,
                padding: 8,
                border: dragOverGroup === group.name ? '2px dashed var(--cv-accent)' : '1px solid transparent',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 列头 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px 10px', borderBottom: '1px solid var(--cv-card-border)',
                marginBottom: 8,
              }}>
                {group.color && (
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: group.color, flexShrink: 0,
                  }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cv-text-main)', flex: 1 }}>
                  {group.name}
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--cv-text-tertiary)',
                  backgroundColor: 'var(--cv-card-bg)', padding: '2px 8px', borderRadius: 10,
                }}>{group.items.length}</span>
              </div>
              {/* 卡片列表 */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggingId(String(card.id))}
                    onDragEnd={() => { setDraggingId(null); setDragOverGroup(null) }}
                    onClick={() => handleSelect(String(card.id))}
                    style={{
                      backgroundColor: 'var(--cv-card-bg)',
                      border: selectedId === String(card.id)
                        ? '2px solid var(--cv-accent)'
                        : '1px solid var(--cv-card-border)',
                      borderRadius: 8,
                      padding: 0,
                      cursor: 'grab',
                      overflow: 'hidden',
                      boxShadow: 'var(--cv-card-shadow)',
                      opacity: draggingId === String(card.id) ? 0.5 : 1,
                    }}
                  >
                    {/* 颜色条 */}
                    <div style={{ height: 3, backgroundColor: card.color }} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{
                        fontSize: 12, color: 'var(--cv-text-main)', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {card.pinned && (
                          <span style={{ marginRight: 4, display: 'inline-flex', verticalAlign: 'middle' }}>
                            <CanvasIcon name="pinFill" size={12} />
                          </span>
                        )}
                        {card.title}
                      </div>
                      {card.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {card.tags.slice(0, 3).map((t: string) => (
                            <span key={t} style={{
                              fontSize: 9, color: 'var(--cv-text-secondary)',
                              backgroundColor: 'var(--cv-meta-bg)', padding: '1px 6px', borderRadius: 8,
                            }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default KanbanView

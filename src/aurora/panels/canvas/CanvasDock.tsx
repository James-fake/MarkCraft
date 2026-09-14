import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'
import { getCardTemplates, saveCardTemplate, deleteCardTemplate } from '@features/canvas-v2'
import type { CardTemplate } from '@features/canvas-v2'

/**
 * Aurora 底部工具栏（.aurora-dock）—— 旧白板 BottomBar 全功能 + Aurora 设计体系
 *
 * 分组：工具组（选择/拖拽/画笔/橡皮/矩形/椭圆/箭头/文本/便签/标签）
 *      | 撤销/重做 | 缩放簇（缩小/%重置/放大/适应/选缩放）| 同步 | 更多▾
 * 交互：画笔右键 → 颜色/粗细菜单；橡皮右键 → 「清空全部画笔笔迹」滑动条；
 *      更多菜单（Portal）→ 直线/框/图片 + 网格吸附/自动布局/自动同步。
 * 全部经真实引擎 API（setCurrentTool / setPenColor / clearBrushStrokes / zoom 族…）。
 */
export interface CanvasDockProps {
  engine: CanvasEngine | null
  toast?: (msg: string) => void
  /** 同步笔记链接（真实逻辑，由 CanvasPanel 提供） */
  onSync?: () => void
  autoSync?: boolean
  onToggleAutoSync?: () => void
  gridSnapEnabled?: boolean
  onToggleGrid?: () => void
  onAutoLayout?: () => void
}

interface ToolDef {
  id: string
  icon: string
  label: string
  geo?: string
  /** 白板原生元素类型（便签=note-card / 标签=label-card） */
  create?: 'note' | 'label'
}

const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', icon: 'cursor', label: '选择' },
  { id: 'hand', icon: 'hand', label: '拖拽' },
  { id: 'draw', icon: 'edit', label: '画笔' },
  { id: 'eraser', icon: 'trash', label: '橡皮' },
  { id: 'geo', icon: 'square', label: '矩形', geo: 'rectangle' },
  { id: 'geo', icon: 'circle', label: '椭圆', geo: 'ellipse' },
  { id: 'arrow', icon: 'arrowR', label: '箭头' },
  { id: 'text', icon: 'type', label: '文本' },
  { id: 'note', icon: 'file', label: '便签', create: 'note' },
  { id: 'label', icon: 'tag', label: '标签', create: 'label' },
]

const ADVANCED_TOOLS: ToolDef[] = [
  { id: 'line', icon: 'minus', label: '直线' },
  { id: 'frame', icon: 'frame', label: '框' },
  { id: 'asset', icon: 'image', label: '图片' },
]

// 画笔预设色（黑/红/橙/黄/绿/蓝/紫/白，与旧 PenContextMenu 一致）
const PEN_COLORS: { name: string; value: string }[] = [
  { name: '黑', value: '#1e1e1e' },
  { name: '红', value: '#e03131' },
  { name: '橙', value: '#f08c00' },
  { name: '黄', value: '#f1c40f' },
  { name: '绿', value: '#2f9e44' },
  { name: '蓝', value: '#1971c2' },
  { name: '紫', value: '#6741d9' },
  { name: '白', value: '#ffffff' },
]
const PEN_WIDTHS: { name: string; value: number }[] = [
  { name: '细', value: 2 },
  { name: '中', value: 5 },
  { name: '粗', value: 9 },
]

export function CanvasDock({
  engine, toast,
  onSync, autoSync = false, onToggleAutoSync,
  gridSnapEnabled = false, onToggleGrid, onAutoLayout,
}: CanvasDockProps) {
  const tool = useEngineSnapshot(engine, (e) => e.getCurrentToolId(), 'session')
  const canUndo = useEngineSnapshot(engine, (e) => e.getCanUndo(), 'session') ?? false
  const canRedo = useEngineSnapshot(engine, (e) => e.getCanRedo(), 'session') ?? false

  // 画笔颜色/粗细（右键菜单 + 按钮色点）
  const [penColor, setPenColor] = useState<string>(() => engine?.getPenColor() ?? '#1e1e1e')
  const [penWidth, setPenWidth] = useState<number>(() => engine?.getPenWidth() ?? 2)
  useEffect(() => {
    if (!engine) return
    setPenColor(engine.getPenColor())
    setPenWidth(engine.getPenWidth())
  }, [engine])

  // 浮层状态：画笔右键菜单 / 橡皮清空滑动条 / 更多菜单 / 卡片模板
  const [penMenu, setPenMenu] = useState<{ open: boolean; x: number; bottom: number } | null>(null)
  const [eraserClear, setEraserClear] = useState<{ open: boolean; x: number; bottom: number } | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [tpls, setTpls] = useState<CardTemplate[]>([])
  const moreRef = useRef<HTMLButtonElement>(null)

  const loadTpls = async () => {
    try { setTpls(await getCardTemplates()) } catch { setTpls([]) }
  }

  // 存为模板：选中第一张 note-card 的文本/颜色/尺寸 → canvasStore 模板 CRUD
  const saveTemplate = () => {
    if (!engine) return
    const ids = engine.getSelectedShapeIds()
    const s = ids.length ? engine.getShape(ids[0]) : undefined
    if (!s || s.type !== 'note-card') {
      toast?.('请先选中一张笔记卡片')
      return
    }
    const p = s.props
    const name = String(p.text || '').split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 20) || '未命名模板'
    void saveCardTemplate({
      name,
      category: 'custom',
      icon: 'fileText',
      width: p.w ?? 260,
      height: p.h ?? 200,
      color: p.color,
      tags: p.tags,
      content: p.text || '',
    }).then((t) => toast?.(`已保存模板「${t.name}」`))
  }

  const insertTemplate = (t: CardTemplate) => {
    if (!engine) return
    const v = engine.getViewportPageBounds()
    engine.createCardFree(
      'note-card',
      { text: t.content, color: t.color ?? '#F59E0B', w: t.width, h: t.height, tags: t.tags },
      { x: v.x + 80, y: v.y + 80 },
      t.width,
      t.height,
    )
    setTplOpen(false)
    toast?.(`已插入模板「${t.name}」`)
  }

  const activeTool = (id: string) => (id === 'geo' ? tool === 'geo' : tool === id)

  const activate = (t: ToolDef) => {
    if (!engine) return
    if (t.create === 'note') {
      engine.createCardFree('note-card', { text: '新便签', color: '#F59E0B' })
      setMoreOpen(false)
      return
    }
    if (t.create === 'label') {
      // 标签：视口中心创建 label-card 并进入编辑态（对齐旧 handleCreateLabel）
      const center = engine.getViewportPageBounds().center
      const id = engine.createCardFree('label-card', { text: '新标签' }, { x: center.x - 60, y: center.y - 18 })
      engine.setSelectedShapes([id])
      engine.setEditingShape(id)
      setMoreOpen(false)
      return
    }
    if (t.id === 'geo' && t.geo) engine.setStyleForNextShapes(null, t.geo)
    engine.setCurrentTool(t.id)
    setMoreOpen(false)
  }

  // 打开浮层定位（以按钮 rect 为基准）
  const openFloat = (btn: HTMLElement, key: 'pen' | 'eraser') => {
    const r = btn.getBoundingClientRect()
    const pos = { x: r.left + r.width / 2, bottom: window.innerHeight - r.top + 10 }
    if (key === 'pen') setPenMenu({ open: true, ...pos })
    else setEraserClear({ open: true, ...pos })
  }

  const toggleMore = () => {
    if (moreRef.current) {
      const r = moreRef.current.getBoundingClientRect()
      // 记录 bottom/right 供菜单定位
      setMoreOpen((o) => !o)
      ;(moreRef.current as HTMLButtonElement).dataset.menuRight = String(window.innerWidth - r.right)
      ;(moreRef.current as HTMLButtonElement).dataset.menuBottom = String(window.innerHeight - r.top + 8)
    }
  }

  const pickColor = (c: string) => {
    engine?.setPenColor(c)
    setPenColor(c)
    setPenMenu(null)
  }
  const pickWidth = (w: number) => {
    engine?.setPenWidth(w)
    setPenWidth(w)
    setPenMenu(null)
  }
  const clearStrokes = () => {
    ;(engine as unknown as { clearBrushStrokes?: () => void })?.clearBrushStrokes?.()
    engine?.setCurrentTool('draw')
    setEraserClear(null)
    toast?.('已清空全部画笔笔迹')
  }

  const moreBottom = moreRef.current ? Number(moreRef.current.dataset.menuBottom ?? 0) : 0
  const moreRight = moreRef.current ? Number(moreRef.current.dataset.menuRight ?? 0) : 0

  return (
    <>
      <div className="aurora-dock" role="toolbar" aria-label="底部工具栏">
        {/* 撤销 / 重做（第一、第二位置） */}
        <div className="aurora-dock__group">
          <button type="button" className="aurora-dock__item" onClick={() => engine?.undo()} disabled={!canUndo} title="撤销 Ctrl+Z" aria-label="撤销">
            <Icon.undo size={16} className="aurora-dock__item-icon" />
          </button>
          <button type="button" className="aurora-dock__item" onClick={() => engine?.redo()} disabled={!canRedo} title="重做 Ctrl+Y" aria-label="重做">
            <Icon.redo size={16} className="aurora-dock__item-icon" />
          </button>
        </div>

        <div className="aurora-dock__divider" />

        {/* 工具组 */}
        <div className="aurora-dock__group">
          {PRIMARY_TOOLS.map((t) => {
            const IconComp = Icon[t.icon as keyof typeof Icon]
            const isDraw = t.id === 'draw'
            const isEraser = t.id === 'eraser'
            return (
              <button
                key={t.label}
                type="button"
                className={`aurora-dock__item ${activeTool(t.id) ? 'aurora-dock__item--active' : ''}`}
                onClick={() => activate(t)}
                onContextMenu={(e) => {
                  if (isDraw) { e.preventDefault(); openFloat(e.currentTarget, 'pen') }
                  else if (isEraser) { e.preventDefault(); openFloat(e.currentTarget, 'eraser') }
                }}
                title={t.label}
                aria-label={t.label}
                aria-pressed={activeTool(t.id)}
                style={isDraw ? { position: 'relative' } : undefined}
              >
                {IconComp ? <IconComp size={18} className="aurora-dock__item-icon" /> : <span>{t.label}</span>}
                {isDraw && (
                  <span
                    className="aurora-dock__pen-dot"
                    style={{ background: penColor }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="aurora-dock__divider" />

        {/* 同步笔记链接 */}
        <div className="aurora-dock__group">
          <button type="button" className="aurora-dock__item" onClick={() => onSync?.()} title="同步笔记链接" aria-label="同步笔记链接">
            <Icon.sync size={14} className="aurora-dock__item-icon" />
          </button>
        </div>

        <div className="aurora-dock__divider" />

        {/* 更多 */}
        <div className="aurora-dock__group">
          <button
            ref={moreRef}
            type="button"
            className={`aurora-dock__item ${moreOpen ? 'aurora-dock__item--active' : ''}`}
            onClick={toggleMore}
            title="更多工具与功能"
            aria-label="更多工具与功能"
          >
            <Icon.chevronDown size={14} className="aurora-dock__item-icon" />
          </button>
        </div>
      </div>

      {/* 更多菜单（Portal 到 body） */}
      {moreOpen && createPortal(
        <>
          <div className="aurora-dock__mask" onClick={() => setMoreOpen(false)} />
          <div className="aurora-canvas-ctxmenu aurora-dock__more-menu" style={{ position: 'fixed', right: moreRight, bottom: moreBottom, zIndex: 10001 }}>
            <div className="aurora-dock__menu-title">绘图工具</div>
            {ADVANCED_TOOLS.map((t) => {
              const IconComp = Icon[t.icon as keyof typeof Icon]
              return (
                <button key={t.label} type="button" className="aurora-canvas-ctxmenu__item" onClick={() => activate(t)}>
                  {IconComp ? <IconComp size={14} /> : null}
                  <span>{t.label}</span>
                </button>
              )
            })}
            <div className="aurora-canvas-ctxmenu__sep" />
            <div className="aurora-dock__menu-title">视图与同步</div>
            <button
              type="button"
              className={`aurora-canvas-ctxmenu__item ${gridSnapEnabled ? 'is-on' : ''}`}
              onClick={() => { onToggleGrid?.(); setMoreOpen(false) }}
            >
              <Icon.grid size={14} />
              <span>网格吸附 {gridSnapEnabled ? <Icon.check size={12} /> : null}</span>
            </button>
            <button type="button" className="aurora-canvas-ctxmenu__item" onClick={() => { onAutoLayout?.(); setMoreOpen(false) }}>
              <Icon.refresh size={14} />
              <span>自动布局</span>
            </button>
            <button
              type="button"
              className={`aurora-canvas-ctxmenu__item ${autoSync ? 'is-on' : ''}`}
              onClick={() => { onToggleAutoSync?.(); setMoreOpen(false) }}
            >
              <Icon.sync size={14} />
              <span>自动同步 {autoSync ? <Icon.check size={12} /> : null}</span>
            </button>
            <div className="aurora-dock__menu-title">卡片模板</div>
            <button type="button" className="aurora-canvas-ctxmenu__item" onClick={() => { saveTemplate(); setMoreOpen(false) }}>
              <Icon.save size={14} />
              <span>存为模板（选中卡片）</span>
            </button>
            <button
              type="button"
              className="aurora-canvas-ctxmenu__item"
              onClick={() => { setMoreOpen(false); setTplOpen(true); void loadTpls() }}
            >
              <Icon.export size={14} />
              <span>插入模板</span>
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* 画笔右键：颜色/粗细菜单 */}
      {penMenu?.open && createPortal(
        <>
          <div className="aurora-dock__mask" onClick={() => setPenMenu(null)} />
          <div className="aurora-dock__float aurora-dock__pen-menu" style={{ left: penMenu.x, bottom: penMenu.bottom }}>
            <div className="aurora-dock__menu-title">画笔设置</div>
            <div className="aurora-dock__pen-colors">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  className={`aurora-dock__swatch ${c.value.toLowerCase() === penColor.toLowerCase() ? 'is-on' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => pickColor(c.value)}
                />
              ))}
            </div>
            <div className="aurora-dock__menu-title" style={{ marginTop: 10 }}>粗细</div>
            <div className="aurora-dock__pen-widths">
              {PEN_WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  className={`aurora-dock__width-row ${w.value === penWidth ? 'is-on' : ''}`}
                  onClick={() => pickWidth(w.value)}
                >
                  <span className="aurora-dock__width-line" style={{ height: Math.max(w.value, 2), background: penColor }} />
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* 橡皮右键：「清空全部画笔笔迹」滑动条 */}
      {eraserClear?.open && createPortal(
        <>
          <div className="aurora-dock__mask" onClick={() => setEraserClear(null)} />
          <div className="aurora-dock__float aurora-dock__eraser-slider" style={{ left: eraserClear.x, bottom: eraserClear.bottom }}>
            <div className="aurora-dock__menu-title">清空全部画笔笔迹</div>
            <EraserSlider onCommit={clearStrokes} />
          </div>
        </>,
        document.body,
      )}

      {/* 卡片模板列表（插入/删除） */}
      {tplOpen && createPortal(
        <>
          <div className="aurora-dock__mask" onClick={() => setTplOpen(false)} />
          <div className="aurora-dock__float" style={{ left: moreRight, bottom: moreBottom, width: 300, maxHeight: 380, overflowY: 'auto' }}>
            <div className="aurora-dock__menu-title">卡片模板</div>
            {tpls.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--mc-text-tertiary)', padding: '6px 10px' }}>
                暂无模板，先选中卡片后「存为模板」
              </div>
            ) : (
              tpls.map((t) => (
                <div key={t.id} className="aurora-canvas-ctxmenu__item" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <button
                    type="button"
                    style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--mc-text-primary)', fontSize: 12, padding: 0 }}
                    onClick={() => insertTemplate(t)}
                    title={`插入「${t.name}」`}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mc-text-tertiary)', fontSize: 12, padding: 0 }}
                    title="删除模板"
                    onClick={async () => {
                      await deleteCardTemplate(t.id)
                      void loadTpls()
                    }}
                  ><Icon.close size={12} /></button>
                </div>
              ))
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

/** 清空确认滑动条：拖到最右（≥0.95）触发 */
function EraserSlider({ onCommit }: { onCommit: () => void }) {
  const [pct, setPct] = useState(0)
  const [armed, setArmed] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startPct: number } | null>(null)

  const down = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startPct: pct }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = dragRef.current
    const track = trackRef.current
    if (!d || !track) return
    const r = track.getBoundingClientRect()
    const next = Math.min(1, Math.max(0, d.startPct + (e.clientX - d.startX) / Math.max(r.width, 1)))
    setPct(next)
    if (next >= 0.95 && !armed) {
      setArmed(true)
      onCommit()
    }
  }
  const up = () => {
    dragRef.current = null
    if (!armed) setPct(0)
  }

  return (
    <div
      ref={trackRef}
      className="aurora-dock__eraser-track"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="aurora-dock__eraser-fill" style={{ width: `${pct * 100}%` }} />
      <div className="aurora-dock__eraser-thumb" style={{ left: `calc(${pct * 100}% - 12px)` }}>
        <Icon.trash size={14} />
      </div>
      <span className="aurora-dock__eraser-hint">{armed ? '已清空' : '拖到最右清空'}</span>
    </div>
  )
}

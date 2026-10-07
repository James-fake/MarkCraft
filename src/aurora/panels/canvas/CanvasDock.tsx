import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePresence, usePresenceValue, POPOVER_EXIT_MS } from '@components/ui/usePresence'
import { Icon } from '../../icons'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { useEngineSnapshot } from './canvasHooks'
import { useLanguage } from '../../../stores/LanguageStore'
import type { Translations } from '../../../locales/zh'
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

type DockKey = keyof Translations['canvasDock']

interface ToolDef {
  id: string
  icon: string
  labelKey: DockKey
  geo?: string
  /** 白板原生元素类型（便签=note-card / 标签=label-card） */
  create?: 'note' | 'label'
}

const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', icon: 'cursor', labelKey: 'select' },
  { id: 'hand', icon: 'hand', labelKey: 'hand' },
  { id: 'draw', icon: 'edit', labelKey: 'draw' },
  { id: 'eraser', icon: 'trash', labelKey: 'eraser' },
  { id: 'geo', icon: 'square', labelKey: 'rect', geo: 'rectangle' },
  { id: 'geo', icon: 'circle', labelKey: 'ellipse', geo: 'ellipse' },
  { id: 'arrow', icon: 'arrowR', labelKey: 'arrow' },
  { id: 'text', icon: 'type', labelKey: 'text' },
  { id: 'note', icon: 'file', labelKey: 'note', create: 'note' },
  { id: 'label', icon: 'tag', labelKey: 'label', create: 'label' },
]

const ADVANCED_TOOLS: ToolDef[] = [
  { id: 'line', icon: 'minus', labelKey: 'line' },
  { id: 'frame', icon: 'frame', labelKey: 'frame' },
  { id: 'asset', icon: 'image', labelKey: 'image' },
]

// 画笔预设色（黑/红/橙/黄/绿/蓝/紫/白，与旧 PenContextMenu 一致）
const PEN_COLORS: { nameKey: DockKey; value: string }[] = [
  { nameKey: 'penBlack', value: '#1e1e1e' },
  { nameKey: 'penRed', value: '#e03131' },
  { nameKey: 'penOrange', value: '#f08c00' },
  { nameKey: 'penYellow', value: '#f1c40f' },
  { nameKey: 'penGreen', value: '#2f9e44' },
  { nameKey: 'penBlue', value: '#1971c2' },
  { nameKey: 'penPurple', value: '#6741d9' },
  { nameKey: 'penWhite', value: '#ffffff' },
]
const PEN_WIDTHS: { nameKey: DockKey; value: number }[] = [
  { nameKey: 'widthThin', value: 2 },
  { nameKey: 'widthMedium', value: 5 },
  { nameKey: 'widthThick', value: 9 },
]

export function CanvasDock({
  engine, toast,
  onSync, autoSync = false, onToggleAutoSync,
  gridSnapEnabled = false, onToggleGrid, onAutoLayout,
}: CanvasDockProps) {
  const { t } = useLanguage()
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
  // 退场相位（动效审计 P1-6）：四类 dock 浮层关闭时先播 100ms 退场再卸载。
  // 遮罩（mask）不参与退场 —— 退场期间指针已被浮层自身的 pointer-events:none 挡住，
  // 遮罩留着只会多一个立即消失的暗层。
  const morePresence = usePresence(moreOpen, POPOVER_EXIT_MS)
  const tplPresence = usePresence(tplOpen, POPOVER_EXIT_MS)
  const penPresence = usePresenceValue(penMenu?.open ? penMenu : null, POPOVER_EXIT_MS)
  const eraserPresence = usePresenceValue(eraserClear?.open ? eraserClear : null, POPOVER_EXIT_MS)
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
      toast?.(t.canvasDock.selectNoteFirst)
      return
    }
    const p = s.props
    const name = String(p.text || '').split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 20) || t.canvasDock.untitledTemplate
    void saveCardTemplate({
      name,
      category: 'custom',
      icon: 'fileText',
      width: p.w ?? 260,
      height: p.h ?? 200,
      color: p.color,
      tags: p.tags,
      content: p.text || '',
    }).then((saved) => toast?.(t.canvasDock.templateSaved.replace('{n}', saved.name)))
  }

  const insertTemplate = (tpl: CardTemplate) => {
    if (!engine) return
    const v = engine.getViewportPageBounds()
    engine.createCardFree(
      'note-card',
      { text: tpl.content, color: tpl.color ?? '#F59E0B', w: tpl.width, h: tpl.height, tags: tpl.tags },
      { x: v.x + 80, y: v.y + 80 },
      tpl.width,
      tpl.height,
    )
    setTplOpen(false)
    toast?.(t.canvasDock.templateInserted.replace('{n}', tpl.name))
  }

  const activeTool = (id: string) => (id === 'geo' ? tool === 'geo' : tool === id)

  const activate = (tool: ToolDef) => {
    if (!engine) return
    if (tool.create === 'note') {
      engine.createCardFree('note-card', { text: t.canvasDock.newNoteDefault, color: '#F59E0B' })
      setMoreOpen(false)
      return
    }
    if (tool.create === 'label') {
      // 标签：视口中心创建 label-card 并进入编辑态（对齐旧 handleCreateLabel）
      const center = engine.getViewportPageBounds().center
      const id = engine.createCardFree('label-card', { text: t.canvasDock.newLabelDefault }, { x: center.x - 60, y: center.y - 18 })
      engine.setSelectedShapes([id])
      engine.setEditingShape(id)
      setMoreOpen(false)
      return
    }
    if (tool.id === 'geo' && tool.geo) engine.setStyleForNextShapes(null, tool.geo)
    engine.setCurrentTool(tool.id)
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
    (engine as unknown as { clearBrushStrokes?: () => void })?.clearBrushStrokes?.()
    engine?.setCurrentTool('draw')
    setEraserClear(null)
    toast?.(t.canvasDock.strokesCleared)
  }

  const moreBottom = moreRef.current ? Number(moreRef.current.dataset.menuBottom ?? 0) : 0
  const moreRight = moreRef.current ? Number(moreRef.current.dataset.menuRight ?? 0) : 0

  return (
    <>
      <div className="aurora-dock" role="toolbar" aria-label={t.canvasDock.toolbarAria}>
        {/* 撤销 / 重做（第一、第二位置） */}
        <div className="aurora-dock__group">
          <button type="button" className="aurora-dock__item" onClick={() => engine?.undo()} disabled={!canUndo} title={`${t.canvasDock.undo} Ctrl+Z`} aria-label={t.canvasDock.undo}>
            <Icon.undo size={16} className="aurora-dock__item-icon" />
          </button>
          <button type="button" className="aurora-dock__item" onClick={() => engine?.redo()} disabled={!canRedo} title={`${t.canvasDock.redo} Ctrl+Y`} aria-label={t.canvasDock.redo}>
            <Icon.redo size={16} className="aurora-dock__item-icon" />
          </button>
        </div>

        <div className="aurora-dock__divider" />

        {/* 工具组 */}
        <div className="aurora-dock__group">
          {PRIMARY_TOOLS.map((tool) => {
            const IconComp = Icon[tool.icon as keyof typeof Icon]
            const isDraw = tool.id === 'draw'
            const isEraser = tool.id === 'eraser'
            const toolLabel = t.canvasDock[tool.labelKey]
            return (
              <button
                key={tool.labelKey}
                type="button"
                className={`aurora-dock__item ${activeTool(tool.id) ? 'aurora-dock__item--active' : ''}`}
                onClick={() => activate(tool)}
                onContextMenu={(e) => {
                  if (isDraw) { e.preventDefault(); openFloat(e.currentTarget, 'pen') }
                  else if (isEraser) { e.preventDefault(); openFloat(e.currentTarget, 'eraser') }
                }}
                title={toolLabel}
                aria-label={toolLabel}
                aria-pressed={activeTool(tool.id)}
                style={isDraw ? { position: 'relative' } : undefined}
              >
                {IconComp ? <IconComp size={18} className="aurora-dock__item-icon" /> : <span>{toolLabel}</span>}
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
          <button type="button" className="aurora-dock__item" onClick={() => onSync?.()} title={t.canvasDock.syncLink} aria-label={t.canvasDock.syncLink}>
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
            title={t.canvasDock.moreTools}
            aria-label={t.canvasDock.moreTools}
          >
            <Icon.chevronDown size={14} className="aurora-dock__item-icon" />
          </button>
        </div>
      </div>

      {/* 更多菜单（Portal 到 body） */}
      {morePresence.mounted && createPortal(
        <>
          {!morePresence.exiting && <div className="aurora-dock__mask" onClick={() => setMoreOpen(false)} />}
          <div
            className="aurora-canvas-ctxmenu aurora-dock__more-menu"
            data-exiting={morePresence.exiting || undefined}
            style={{ position: 'fixed', right: moreRight, bottom: moreBottom, zIndex: 10001 }}
          >
            <div className="aurora-dock__menu-title">{t.canvasDock.drawTools}</div>
            {ADVANCED_TOOLS.map((tool) => {
              const IconComp = Icon[tool.icon as keyof typeof Icon]
              return (
                <button key={tool.labelKey} type="button" className="aurora-canvas-ctxmenu__item" onClick={() => activate(tool)}>
                  {IconComp ? <IconComp size={14} /> : null}
                  <span>{t.canvasDock[tool.labelKey]}</span>
                </button>
              )
            })}
            <div className="aurora-canvas-ctxmenu__sep" />
            <div className="aurora-dock__menu-title">{t.canvasDock.viewSync}</div>
            <button
              type="button"
              className={`aurora-canvas-ctxmenu__item ${gridSnapEnabled ? 'is-on' : ''}`}
              onClick={() => { onToggleGrid?.(); setMoreOpen(false) }}
            >
              <Icon.grid size={14} />
              <span>{t.canvasDock.gridSnap} {gridSnapEnabled ? <Icon.check size={12} /> : null}</span>
            </button>
            <button type="button" className="aurora-canvas-ctxmenu__item" onClick={() => { onAutoLayout?.(); setMoreOpen(false) }}>
              <Icon.refresh size={14} />
              <span>{t.canvasDock.autoLayout}</span>
            </button>
            <button
              type="button"
              className={`aurora-canvas-ctxmenu__item ${autoSync ? 'is-on' : ''}`}
              onClick={() => { onToggleAutoSync?.(); setMoreOpen(false) }}
            >
              <Icon.sync size={14} />
              <span>{t.canvasDock.autoSync} {autoSync ? <Icon.check size={12} /> : null}</span>
            </button>
            <div className="aurora-dock__menu-title">{t.canvasDock.cardTemplates}</div>
            <button type="button" className="aurora-canvas-ctxmenu__item" onClick={() => { saveTemplate(); setMoreOpen(false) }}>
              <Icon.save size={14} />
              <span>{t.canvasDock.saveAsTemplate}</span>
            </button>
            <button
              type="button"
              className="aurora-canvas-ctxmenu__item"
              onClick={() => { setMoreOpen(false); setTplOpen(true); void loadTpls() }}
            >
              <Icon.export size={14} />
              <span>{t.canvasDock.insertTemplate}</span>
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* 画笔右键：颜色/粗细菜单 */}
      {penPresence.mounted && penPresence.value && createPortal(
        <>
          {!penPresence.exiting && <div className="aurora-dock__mask" onClick={() => setPenMenu(null)} />}
          <div
            className="aurora-dock__float aurora-dock__pen-menu"
            data-exiting={penPresence.exiting || undefined}
            style={{ left: penPresence.value.x, bottom: penPresence.value.bottom }}
          >
            <div className="aurora-dock__menu-title">{t.canvasDock.penSettings}</div>
            <div className="aurora-dock__pen-colors">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={t.canvasDock[c.nameKey]}
                  className={`aurora-dock__swatch ${c.value.toLowerCase() === penColor.toLowerCase() ? 'is-on' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => pickColor(c.value)}
                />
              ))}
            </div>
            <div className="aurora-dock__menu-title" style={{ marginTop: 10 }}>{t.canvasDock.penWidthTitle}</div>
            <div className="aurora-dock__pen-widths">
              {PEN_WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  className={`aurora-dock__width-row ${w.value === penWidth ? 'is-on' : ''}`}
                  onClick={() => pickWidth(w.value)}
                >
                  <span className="aurora-dock__width-line" style={{ height: Math.max(w.value, 2), background: penColor }} />
                  <span>{t.canvasDock[w.nameKey]}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* 橡皮右键：「清空全部画笔笔迹」滑动条 */}
      {eraserPresence.mounted && eraserPresence.value && createPortal(
        <>
          {!eraserPresence.exiting && <div className="aurora-dock__mask" onClick={() => setEraserClear(null)} />}
          <div
            className="aurora-dock__float aurora-dock__eraser-slider"
            data-exiting={eraserPresence.exiting || undefined}
            style={{ left: eraserPresence.value.x, bottom: eraserPresence.value.bottom }}
          >
            <div className="aurora-dock__menu-title">{t.canvasDock.clearStrokesTitle}</div>
            <EraserSlider onCommit={clearStrokes} />
          </div>
        </>,
        document.body,
      )}

      {/* 卡片模板列表（插入/删除） */}
      {tplPresence.mounted && createPortal(
        <>
          {!tplPresence.exiting && <div className="aurora-dock__mask" onClick={() => setTplOpen(false)} />}
          <div
            className="aurora-dock__float"
            data-exiting={tplPresence.exiting || undefined}
            style={{ left: moreRight, bottom: moreBottom, width: 300, maxHeight: 380, overflowY: 'auto' }}
          >
            <div className="aurora-dock__menu-title">{t.canvasDock.cardTemplates}</div>
            {tpls.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--mc-text-tertiary)', padding: '6px 10px' }}>
                {t.canvasDock.noTemplates}
              </div>
            ) : (
              tpls.map((tpl) => (
                <div key={tpl.id} className="aurora-canvas-ctxmenu__item" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <button
                    type="button"
                    style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--mc-text-primary)', fontSize: 12, padding: 0 }}
                    onClick={() => insertTemplate(tpl)}
                    title={t.canvasDock.insertTplTitle.replace('{n}', tpl.name)}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</span>
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mc-text-tertiary)', fontSize: 12, padding: 0 }}
                    title={t.canvasDock.deleteTemplate}
                    onClick={async () => {
                      await deleteCardTemplate(tpl.id)
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
  const { t } = useLanguage()
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
      <span className="aurora-dock__eraser-hint">{armed ? t.canvasDock.eraserCleared : t.canvasDock.eraserHint}</span>
    </div>
  )
}

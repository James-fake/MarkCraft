import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { usePresence, POPOVER_EXIT_MS } from '@components/ui/usePresence'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import type { ShapeLike } from '@features/canvas-v2/engine/engineTypes'
import { LABEL_BG_PRESETS, autoTextColor } from '@features/canvas-v2/engine/OverlayCards'
import { CARD_COLORS_LEGACY } from '@features/canvas-v2/theme/canvasTheme'
import { useEngineSnapshot } from './canvasHooks'
import { useTagIndex } from '@stores/TagIndexStore'
import { useLinkIndex } from '@stores/LinkIndexStore'
import { useFileManager } from '@stores/FileStore'
import type { FileNode } from '@src/types/fileManager'

/**
 * Aurora 右栏检查器（.aurora-csp/.aurora-cip）—— spec 20 §2 六 Tab 面板
 *   属性（文本/颜色/字号/坐标/尺寸/旋转/锁定/删除）/ 图层（类型图标+锁定+跳选）
 *   筛选（标签 chips + 类型 + 状态 + 结果列表）/ 收藏（pinned 真实字段，list/grid）
 *   推荐（真实关联笔记，可添加为卡片）/ 搜索（实时过滤 + 跳选）
 * 数据全部来自真实来源：引擎 shape 读写 + useTagIndex/useLinkIndex/useFileManager。
 * 引擎无 reorder/可见性 API → 拖拽重排、可见 Switch 不实现（不造假功能）。
 */

/**
 * 主题化下拉选择器（替代原生 <select>，避免 Windows 下 option 弹层由 OS 接管、无法套用主题）。
 * 触发器沿用 .aurora-cip__input 外观；展开菜单用 portal + fixed 定位，避免被检视浮层滚动容器裁切。
 * 交互：点击触发器开/关、点选项选中并关闭（onMouseDown 防止 trigger 失焦闪烁）、点外部/Esc 关闭、滚动/缩放自动收起。
 */
interface InspectorSelectOption { value: string; label: string }

function InspectorSelect({
  value, options, placeholder, onChange, ariaLabel,
}: {
  value: string
  options: InspectorSelectOption[]
  placeholder?: string
  onChange: (v: string) => void
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-3）；rect 是 state，退场窗口内仍可定位
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)

  const toggle = () => {
    if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`aurora-cip__select ${open ? 'aurora-cip__select--open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`aurora-cip__select-value ${selected ? '' : 'aurora-cip__select-value--ph'}`}>
          {selected ? selected.label : (placeholder ?? '请选择')}
        </span>
        <Icon.chevronDown size={12} className="aurora-cip__select-chevron" />
      </button>
      {mounted && rect && createPortal(
        <div
          ref={menuRef}
          className="aurora-cip__menu"
          data-exiting={exiting || undefined}
          role="listbox"
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, minWidth: rect.width }}
        >
          {options.map((o) => {
            const on = o.value === value
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={on}
                className={`aurora-cip__option ${on ? 'aurora-cip__option--on' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false) }}
              >
                <span className="aurora-cip__option-check">{on ? <Icon.check size={12} /> : null}</span>
                <span className="aurora-cip__option-label">{o.label}</span>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

export interface CanvasInspectorPanelProps {
  engine: CanvasEngine | null
}

const TABS = [
  { id: 'props', label: '属性', icon: 'settings' },
  { id: 'layers', label: '图层', icon: 'layers' },
  { id: 'filter', label: '筛选', icon: 'filter' },
  { id: 'fav', label: '收藏', icon: 'star' },
  { id: 'rec', label: '推荐', icon: 'sparkle' },
  { id: 'search', label: '搜索', icon: 'search' },
] as const

type TabId = (typeof TABS)[number]['id']

// 颜色色板必须对齐渲染侧的 CARD_COLORS_V2（getColorDef 只在其中匹配 from 字段），
// 否则写入的 hex 全部 fallback 成第一个色，表现为「颜色切不动」。单一数据源，避免两套色板漂移。
const COLORS = CARD_COLORS_LEGACY

const TAG_SUGGESTIONS = ['重要', '待办', '想法', '参考资料', '设计', '紧急']

// 形状类型 → 图标名（与 Icon 注册表对齐）
const TYPE_ICON: Record<string, string> = {
  'note-card': 'fileText',
  'label-card': 'tag',
  rectangle: 'square',
  ellipse: 'ellipse',
  arrow: 'arrowR',
  text: 'type',
  line: 'line',
  draw: 'draw',
  frame: 'frame',
}

interface ParsedShape {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  isLocked: boolean
  w: number
  h: number
  text: string
  color: string
  fontSize: number
  fileId: string
  parentId: string
  pinned: boolean
  tags: string[]
  // 标签（label-card）专属：背景色 / 文字色 / 边框开关
  bg: string
  textColor: string
  borderOn: boolean
}

const rad2deg = (r: number) => Math.round((r * 180) / Math.PI)
const deg2rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const numOr = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function CanvasInspectorPanel({ engine }: CanvasInspectorPanelProps) {
  const [tab, setTab] = useState<TabId>('props')
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterTagLogic, setFilterTagLogic] = useState<'AND' | 'OR'>('OR')
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all')
  const [favMode, setFavMode] = useState<'grid' | 'list'>('grid')
  const [searchQ, setSearchQ] = useState('')

  // 引擎数据 → 手动订阅 'document' 变更（避开 useSyncExternalStore 对逐帧新数组的 tearing）
  const [shapes, setShapes] = useState<ParsedShape[]>([])
  useEffect(() => {
    if (!engine) {
      setShapes([])
      return
    }
    const recompute = () => {
      const list = engine.getCurrentPageShapes()
      const next = list
        .filter((s) => s.type !== 'arrow')
        .map((s) => {
          const p = s.props ?? {}
          return {
            id: s.id,
            type: s.type,
            x: s.x ?? 0,
            y: s.y ?? 0,
            rotation: s.rotation ?? 0,
            isLocked: !!s.isLocked,
            w: numOr(p.w, 0),
            h: numOr(p.h, 0),
            text: String(p.text ?? '').replace(/\n/g, ' '),
            color: String(p.color ?? ''),
            fontSize: numOr(p.fontSize, 14),
            fileId: String(p.fileId ?? ''),
            parentId: String(p.parentId ?? ''),
            pinned: !!p.pinned,
            // props.tags 实际存储为逗号分隔字符串（看板拖拽/工具栏写入），兼容历史数组
            tags: typeof p.tags === 'string'
              ? (p.tags as string).split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
              : (Array.isArray(p.tags) ? (p.tags as string[]) : []),
            bg: String(p.bg ?? ''),
            textColor: String(p.textColor ?? ''),
            borderOn: p.borderOn !== false,
          } satisfies ParsedShape
        })
      setShapes((prev) => {
        // 签名须覆盖可编辑属性（含 color / bg / fontSize），否则改色 / 改字号时
        // selected 引用不刷新，检视内色块高亮与数值不跟随变更。
        const sig = next.map((s) => `${s.id}:${s.text}:${s.color}:${s.bg}:${s.fontSize}:${s.pinned}:${s.isLocked}`).join('|')
        const prevSig = prev.map((s) => `${s.id}:${s.text}:${s.color}:${s.bg}:${s.fontSize}:${s.pinned}:${s.isLocked}`).join('|')
        return sig === prevSig ? prev : next
      })
    }
    recompute()
    const unsub = engine.store.listen(recompute, { scope: 'document' })
    return () => unsub()
  }, [engine])

  const selectedIdsSig = useEngineSnapshot(
    engine,
    (e) => e.getSelectedShapeIds().join('|'),
    'session',
  ) ?? ''
  // 按 sig 记忆化：空/非空分支都保持引用稳定，避免下游 useMemo 每渲染失效
  const selectedIds = useMemo(
    () => (selectedIdsSig ? selectedIdsSig.split('|').filter(Boolean) : []),
    [selectedIdsSig],
  )

  const selected = shapes.find((s) => selectedIds.includes(s.id) && s.type !== 'arrow')

  // 选中联动「属性」Tab：选区从空 → 非空（点击便签/标签等）时，自动切回属性列表，
  // 与面板自动展开配合，确保首屏即见属性。已选中时切换其它卡片不再强切 Tab（尊重用户手动选择）。
  const prevSelCount = useRef(0)
  useEffect(() => {
    const count = selectedIds.length
    if (count > 0 && prevSelCount.current === 0) setTab('props')
    prevSelCount.current = count
  }, [selectedIds.length])

  // 父卡片候选：当前白板全部 note-card（排除自身），供思维导图 parentId 设置
  const parentCards = useMemo(
    () => shapes
      .filter((s) => s.type === 'note-card' && !selectedIds.includes(s.id))
      .map((s) => ({ id: s.id, text: s.text || '(空卡片)' })),
    [shapes, selectedIds],
  )

  const { getAllTags } = useTagIndex()
  const { getOutgoingLinks } = useLinkIndex()
  const { rootFolder } = useFileManager()

  // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce: shapes 变化时强制重算标签合集（getAllTags 为读取型函数，规则看不见其内部数据源）
  const allTags = useMemo(() => Array.from(new Set([...getAllTags(), ...TAG_SUGGESTIONS])), [getAllTags, shapes])

  const update = (id: string, partial: Record<string, unknown>) => {
    // 面板侧以宽松 Record 收集控件值，此处一次定向收窄到引擎签名（Partial<ShapeLike> & { id }）
    engine?.updateShape({ id, ...partial } as Partial<ShapeLike> & { id: string })
  }

  const filePathById = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (n: FileNode, parents: string[]) => {
      const path = [...parents, n.name].filter(Boolean).join('/')
      if (n.id) m.set(n.id, path)
      if (n.children) for (const c of n.children) walk(c, [...parents, n.name])
    }
    walk(rootFolder, [])
    return m
  }, [rootFolder])

  return (
    <div className="aurora-csp">
      <div className="aurora-csp__head">
        <div className="aurora-csp__tabs" role="tablist">
          {TABS.map((t) => {
            const IconComp = Icon[t.icon as keyof typeof Icon]
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                title={t.label}
                className={`aurora-csp__tab ${tab === t.id ? 'aurora-csp__tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {IconComp ? <IconComp size={14} /> : null}
                {/* 使用优化⑥：补渲染文字（图标+文字竖排，与编辑器 rightbar__tab 全站同款） */}
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="aurora-csp__body">
        {tab === 'props' && (
          <PropsTab
            engine={engine}
            selected={selected}
            update={update}
            rad2deg={rad2deg}
            deg2rad={deg2rad}
            clamp={clamp}
            parentCards={parentCards}
          />
        )}
        {tab === 'layers' && (
          <LayersTab
            shapes={shapes}
            selectedIds={selectedIds}
            onPick={(id) => engine?.setSelectedShapes([id])}
            onToggleLock={(id) => update(id, { isLocked: !(shapes.find((s) => s.id === id)?.isLocked ?? false) })}
            filePathById={filePathById}
          />
        )}
        {tab === 'filter' && (
          <FilterTab
            shapes={shapes}
            allTags={allTags}
            filterTags={filterTags}
            setFilterTags={setFilterTags}
            filterTagLogic={filterTagLogic}
            setFilterTagLogic={setFilterTagLogic}
            filterTypes={filterTypes}
            setFilterTypes={setFilterTypes}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onPick={(id) => engine?.setSelectedShapes([id])}
          />
        )}
        {tab === 'fav' && (
          <FavTab
            shapes={shapes.filter((s) => s.pinned)}
            mode={favMode}
            setMode={setFavMode}
            onPick={(id) => engine?.setSelectedShapes([id])}
            onToggleFav={(id, v) => update(id, { props: { pinned: v } })}
          />
        )}
        {tab === 'rec' && (
          <RecTab
            engine={engine}
            shapes={shapes}
            getOutgoingLinks={getOutgoingLinks}
            filePathById={filePathById}
          />
        )}
        {tab === 'search' && (
          <SearchTab
            shapes={shapes}
            q={searchQ}
            setQ={setSearchQ}
            onPick={(id) => engine?.setSelectedShapes([id])}
          />
        )}
      </div>
    </div>
  )
}

// ───────────── 属性 ─────────────
function PropsTab({
  engine,
  selected,
  update,
  rad2deg,
  deg2rad,
  clamp,
  parentCards,
}: {
  engine: CanvasEngine | null
  selected: ParsedShape | undefined
  update: (id: string, partial: Record<string, unknown>) => void
  rad2deg: (r: number) => number
  deg2rad: (d: number) => number
  clamp: (v: number, min: number, max: number) => number
  parentCards: { id: string; text: string }[]
}) {
  if (!selected) {
    return (
      <div className="aurora-cip__empty">
        未选中元素。点击白板上的卡片查看属性。
      </div>
    )
  }
  const s = selected
  const set = (partial: Record<string, unknown>) => update(s.id, partial)
  const setNum = (k: string, v: number, min: number, max: number) => {
    const n = clamp(Number.isFinite(v) ? v : 0, min, max)
    set({ [k]: n })
  }
  const setSize = (k: 'w' | 'h', v: number) => {
    const n = clamp(Number.isFinite(v) ? v : 0, 20, 1200)
    set({ props: { [k]: n } })
  }
  const canDelete = !!engine
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">内容</div>
      <textarea
        className="aurora-cip__textarea"
        rows={4}
        value={s.text.replace(/ {2,}/g, ' ')}
        placeholder="卡片内容…"
        onChange={(e) => set({ props: { text: e.target.value } })}
      />
      {s.type === 'label-card' ? (
        <>
          <div className="aurora-cip__section-title">背景色</div>
          <div className="aurora-cip__swatches">
            {LABEL_BG_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`aurora-cip__swatch ${(s.bg ?? '').toLowerCase() === c.toLowerCase() ? 'aurora-cip__swatch--on' : ''}`}
                style={{ background: c }}
                onClick={() => set({ props: { bg: c, textColor: autoTextColor(c) } })}
                aria-label={`背景色 ${c}`}
              />
            ))}
          </div>
          <div className="aurora-cip__section-title">文字色</div>
          <div className="aurora-cip__row" style={{ gap: 8 }}>
            <button type="button" className="aurora-cip__chip" onClick={() => set({ props: { textColor: '#1F2937' } })}>深色</button>
            <button type="button" className="aurora-cip__chip" onClick={() => set({ props: { textColor: '#F9FAFB' } })}>浅色</button>
          </div>
          <div className="aurora-cip__row" style={{ justifyContent: 'space-between' }}>
            <span className="aurora-cip__label">边框</span>
            <button
              type="button"
              className={`aurora-cip__switch ${s.borderOn ? 'aurora-cip__switch--on' : ''}`}
              onClick={() => set({ props: { borderOn: !s.borderOn } })}
              aria-label={s.borderOn ? '关闭边框' : '开启边框'}
            >
              <span className="aurora-cip__switch-knob" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="aurora-cip__section-title">颜色</div>
          <div className="aurora-cip__swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`aurora-cip__swatch ${(s.color ?? '').toLowerCase() === c.toLowerCase() ? 'aurora-cip__swatch--on' : ''}`}
                style={{ background: c }}
                onClick={() => set({ props: { color: c } })}
                aria-label={`颜色 ${c}`}
              />
            ))}
          </div>
        </>
      )}
      <div className="aurora-cip__section-title">字号</div>
      <div className="aurora-cip__row">
        <span className="aurora-cip__label">字号</span>
        <ScrollNumberInput
          className="aurora-cip__input"
          value={s.fontSize}
          min={10}
          max={32}
          onChange={(n) => set({ props: { fontSize: clamp(Number.isNaN(n) ? 14 : n, 10, 32) } })}
        />
        <span className="aurora-cip__unit">px</span>
        <span className="aurora-cip__label">旋转</span>
        <ScrollNumberInput
          className="aurora-cip__input"
          value={rad2deg(s.rotation)}
          min={-180}
          max={360}
          onChange={(n) => set({ rotation: deg2rad(Number.isNaN(n) ? 0 : n) })}
        />
        <span className="aurora-cip__unit">°</span>
      </div>
      <div className="aurora-cip__row">
        <span className="aurora-cip__label">X</span>
        <ScrollNumberInput className="aurora-cip__input" value={Math.round(s.x)} onChange={(n) => setNum('x', Number.isNaN(n) ? 0 : n, -100000, 100000)} />
        <span className="aurora-cip__label">Y</span>
        <ScrollNumberInput className="aurora-cip__input" value={Math.round(s.y)} onChange={(n) => setNum('y', Number.isNaN(n) ? 0 : n, -100000, 100000)} />
      </div>
      {s.type === 'note-card' && (
        <>
          <div className="aurora-cip__section-title">父卡片（思维导图）</div>
          <InspectorSelect
            ariaLabel="父卡片"
            value={s.parentId ?? ''}
            placeholder="（无）"
            options={[
              { value: '', label: '（无）' },
              ...parentCards.map((c) => ({ value: c.id, label: c.text })),
            ]}
            onChange={(v) => set({ props: { parentId: v || undefined } })}
          />
          <div className="aurora-cip__section-title">标签（看板分组）</div>
          <input
            className="aurora-cip__input aurora-cip__field"
            value={s.tags.join('，')}
            onChange={(e) => set({ props: { tags: e.target.value } })}
            placeholder="逗号分隔：重要，待办"
            aria-label="卡片标签"
          />
        </>
      )}
      <div className="aurora-cip__row">
        <span className="aurora-cip__label">宽</span>
        <ScrollNumberInput className="aurora-cip__input" min={20} max={1200} value={Math.round(s.w)} onChange={(n) => setSize('w', Number.isNaN(n) ? 20 : n)} />
        <span className="aurora-cip__label">高</span>
        <ScrollNumberInput className="aurora-cip__input" min={20} max={1200} value={Math.round(s.h)} onChange={(n) => setSize('h', Number.isNaN(n) ? 20 : n)} />
      </div>
      <div className="aurora-cip__row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="aurora-cip__label">置顶</span>
        <button
          type="button"
          className={`aurora-cip__switch ${s.pinned ? 'aurora-cip__switch--on' : ''}`}
          onClick={() => set({ props: { pinned: !s.pinned } })}
          aria-label={s.pinned ? '取消置顶收藏' : '置顶收藏'}
        >
          <span className="aurora-cip__switch-knob" />
        </button>
      </div>
      <div className="aurora-cip__row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="aurora-cip__label">锁定</span>
        <button
          type="button"
          className={`aurora-cip__switch ${s.isLocked ? 'aurora-cip__switch--on' : ''}`}
          onClick={() => set({ isLocked: !s.isLocked })}
          aria-label={s.isLocked ? '解锁元素' : '锁定元素'}
        >
          <span className="aurora-cip__switch-knob" />
        </button>
      </div>
      {s.type === 'label-card' && (
        <button
          type="button"
          className="aurora-cip__copy"
          onClick={() => {
            const ids = engine?.duplicateShapes([s.id])
            if (ids && ids[0]) engine?.setSelectedShapes([ids[0]])
          }}
        >
          <Icon.copy size={13} /> 复制元素
        </button>
      )}
      {canDelete && (
        <button type="button" className="aurora-cip__delete" onClick={() => engine?.deleteShapes([s.id])}>
          <Icon.trash size={13} /> 删除元素
        </button>
      )}
    </div>
  )
}

// ───────────── 图层 ─────────────
function LayersTab({
  shapes,
  selectedIds,
  onPick,
  onToggleLock,
  filePathById,
}: {
  shapes: ParsedShape[]
  selectedIds: string[]
  onPick: (id: string) => void
  onToggleLock: (id: string) => void
  filePathById: Map<string, string>
}) {
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">图层（{shapes.length}）</div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">白板暂无元素</div>
      ) : (
        <div className="aurora-cip__layers">
          {[...shapes].reverse().map((s) => {
            const IconComp = Icon[TYPE_ICON[s.type] ?? 'shapes']
            const active = selectedIds.includes(s.id)
            return (
              <div
                key={s.id}
                className={`aurora-cip__layer ${active ? 'aurora-cip__layer--active' : ''}`}
                onClick={() => onPick(s.id)}
              >
                {IconComp ? <IconComp size={12} className="aurora-cip__layer-icon" /> : null}
                <span className="aurora-cip__layer-name" title={s.text}>
                  {s.text || (s.type === 'note-card' ? '(空卡片)' : s.type)}
                </span>
                {s.fileId && filePathById.get(s.fileId) && (
                  <span className="aurora-cip__layer-btn" title={filePathById.get(s.fileId)}>
                    <Icon.file size={11} className="aurora-cip__layer-icon" />
                  </span>
                )}
                <button
                  type="button"
                  className="aurora-cip__layer-btn"
                  title={s.isLocked ? '解锁' : '锁定'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLock(s.id)
                  }}
                >
                  <Icon.lock size={11} className={s.isLocked ? '' : 'aurora-cip__layer-icon'} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ───────────── 筛选 ─────────────
function FilterTab({
  shapes,
  allTags,
  filterTags,
  setFilterTags,
  filterTagLogic,
  setFilterTagLogic,
  filterTypes,
  setFilterTypes,
  filterStatus,
  setFilterStatus,
  onPick,
}: {
  shapes: ParsedShape[]
  allTags: string[]
  filterTags: Set<string>
  setFilterTags: (s: Set<string>) => void
  filterTagLogic: 'AND' | 'OR'
  setFilterTagLogic: (v: 'AND' | 'OR') => void
  filterTypes: Set<string>
  setFilterTypes: (s: Set<string>) => void
  filterStatus: 'all' | 'locked' | 'unlocked'
  setFilterStatus: (v: 'all' | 'locked' | 'unlocked') => void
  onPick: (id: string) => void
}) {
  const typeSet = useMemo(() => {
    const t = new Set<string>()
    for (const s of shapes) {
      if (s.type !== 'arrow') t.add(s.type)
    }
    return Array.from(t).sort()
  }, [shapes])
  const toggleTag = (t: string) => {
    const next = new Set(filterTags)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setFilterTags(next)
  }
  const toggleType = (t: string) => {
    const next = new Set(filterTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setFilterTypes(next)
  }
  const clearAll = () => {
    setFilterTags(new Set())
    setFilterTypes(new Set())
    setFilterStatus('all')
  }
  const matched = useMemo(() => {
    return shapes.filter((s) => {
      if (filterStatus === 'locked' && !s.isLocked) return false
      if (filterStatus === 'unlocked' && s.isLocked) return false
      if (filterTypes.size > 0 && !filterTypes.has(s.type)) return false
      if (filterTags.size > 0) {
        const has = (t: string) => s.tags.includes(t)
        const ok = filterTagLogic === 'AND'
          ? Array.from(filterTags).every(has)
          : Array.from(filterTags).some(has)
        if (!ok) return false
      }
      return true
    })
  }, [shapes, filterStatus, filterTypes, filterTags, filterTagLogic])
  const clearBtn = (
    <button
      type="button"
      className="aurora-cip__more"
      onClick={clearAll}
      disabled={filterTags.size === 0 && filterTypes.size === 0 && filterStatus === 'all'}
    >
      清除全部
    </button>
  )
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">标签</div>
      <div className="aurora-cip__seg" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`aurora-cip__seg-btn ${filterTagLogic === 'AND' ? 'aurora-cip__seg-btn--on' : ''}`}
          onClick={() => setFilterTagLogic('AND')}
        >
          AND
        </button>
        <button
          type="button"
          className={`aurora-cip__seg-btn ${filterTagLogic === 'OR' ? 'aurora-cip__seg-btn--on' : ''}`}
          onClick={() => setFilterTagLogic('OR')}
        >
          OR
        </button>
      </div>
      <div className="aurora-cip__chips">
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            className={`aurora-cip__chip ${filterTags.has(t) ? 'aurora-cip__chip--on' : ''}`}
            onClick={() => toggleTag(t)}
          >
            #{t}
          </button>
        ))}
      </div>
      <div className="aurora-cip__section-title">类型</div>
      <div className="aurora-cip__types">
        {typeSet.map((t) => (
          <label key={t} className="aurora-cip__type">
            <input type="checkbox" checked={filterTypes.has(t)} onChange={() => toggleType(t)} />
            <span>{t}</span>
          </label>
        ))}
      </div>
      <div className="aurora-cip__section-title">状态</div>
      <div className="aurora-cip__radio">
        {([['all', '全部'], ['locked', '已锁定'], ['unlocked', '未锁定']] as const).map(([v, label]) => (
          <label key={v} className="aurora-cip__radio-item">
            <input type="radio" name="aurora-cip-status" checked={filterStatus === v} onChange={() => setFilterStatus(v)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {clearBtn}
      <div className="aurora-cip__section-title">匹配（{matched.length}）</div>
      {matched.length === 0 ? (
        <div className="aurora-cip__empty">无匹配元素</div>
      ) : (
        <div className="aurora-cip__layers">
          {matched.slice(0, 30).map((s) => (
            <button key={s.id} type="button" className="aurora-cip__layer" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__layer-name">{s.text || s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────── 收藏 ─────────────
function FavTab({
  shapes,
  mode,
  setMode,
  onPick,
  onToggleFav,
}: {
  shapes: ParsedShape[]
  mode: 'grid' | 'list'
  setMode: (m: 'grid' | 'list') => void
  onPick: (id: string) => void
  onToggleFav: (id: string, v: boolean) => void
}) {
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__header-row">
        <span className="aurora-cip__section-title">收藏（{shapes.length}）</span>
        <div className="aurora-cip__viewtoggle">
          <button
            type="button"
            className={mode === 'grid' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('grid')}
            title="网格"
          >
            <Icon.grid size={13} />
          </button>
          <button
            type="button"
            className={mode === 'list' ? 'aurora-cip__viewtoggle--on' : ''}
            onClick={() => setMode('list')}
            title="列表"
          >
            <Icon.list size={13} />
          </button>
        </div>
      </div>
      {shapes.length === 0 ? (
        <div className="aurora-cip__empty">
          暂无收藏<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>选中卡片后在属性面板打开「置顶」即可收藏</span>
        </div>
      ) : (
        <div className={mode === 'grid' ? 'aurora-cip__fav-grid' : 'aurora-cip__fav-list'}>
          {shapes.map((s) => (
            <div key={s.id} className="aurora-cip__fav" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__fav-title">{s.text || '(空卡片)'}</span>
              <button
                type="button"
                className="aurora-cip__fav-x"
                title="取消收藏"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFav(s.id, false)
                }}
              >
                <Icon.star size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────── 推荐（真实关联笔记） ─────────────
function RecTab({
  engine,
  shapes,
  getOutgoingLinks,
  filePathById,
}: {
  engine: CanvasEngine | null
  shapes: ParsedShape[]
  getOutgoingLinks: (fileId: string) => { target: string; relation?: string; context?: string }[]
  filePathById: Map<string, string>
}) {
  const onCanvasFileIds = useMemo(() => new Set(shapes.map((s) => s.fileId).filter(Boolean)), [shapes])
  const recs = useMemo(() => {
    const seen = new Map<string, { name: string; fileId: string; relation: string }>()
    for (const s of shapes) {
      if (!s.fileId) continue
      for (const link of getOutgoingLinks(s.fileId)) {
        const targetName = link.target.replace(/#.*$/, '').replace(/\.md$/, '')
        const targetFileId = Array.from(filePathById.entries())
          .find(([, path]) => path.replace(/\.md$/, '') === targetName || path.endsWith(`${targetName}.md`))?.[0]
        if (!targetFileId || onCanvasFileIds.has(targetFileId)) continue
        const key = targetFileId
        if (!seen.has(key)) {
          seen.set(key, { name: targetName, fileId: targetFileId, relation: link.relation || '关联' })
        }
      }
    }
    return Array.from(seen.values()).slice(0, 12)
  }, [shapes, getOutgoingLinks, filePathById, onCanvasFileIds])

  const addToCanvas = (fileId: string, name: string) => {
    if (!engine) return
    const v = engine.getViewportPageBounds()
    const pos = engine.findFreeSlot({ x: v.x + 80, y: v.y + 80 }, 260, 200)
    engine.createShape({
      type: 'note-card',
      x: pos.x,
      y: pos.y,
      props: { text: name, w: 260, h: 200, fileId, color: '#F59E0B' },
    })
  }

  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__section-title">关联笔记推荐</div>
      {recs.length === 0 ? (
        <div className="aurora-cip__empty">
          暂无关联笔记推荐<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>白板卡片关联的笔记已全部在白板上</span>
        </div>
      ) : (
        recs.map((r) => (
          <div key={r.fileId} className="aurora-cip__rec">
            <div className="aurora-cip__rec-title">{r.name}</div>
            <div className="aurora-cip__rec-meta">
              {filePathById.get(r.fileId) ?? r.fileId} · {r.relation}
            </div>
            <div className="aurora-cip__rec-actions">
              <button type="button" className="aurora-cip__rec-add" onClick={() => addToCanvas(r.fileId, r.name)}>
                <Icon.plus size={11} /> 添加到白板
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ───────────── 搜索 ─────────────
function SearchTab({
  shapes,
  q,
  setQ,
  onPick,
}: {
  shapes: ParsedShape[]
  q: string
  setQ: (v: string) => void
  onPick: (id: string) => void
}) {
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return shapes
      .filter((s) => s.text.toLowerCase().includes(term) || s.type.toLowerCase().includes(term))
      .slice(0, 30)
  }, [shapes, q])
  return (
    <div className="aurora-cip__section" style={{ padding: 'var(--mc-space-5)' }}>
      <div className="aurora-cip__search">
        <Icon.search size={12} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索白板元素…"
          aria-label="搜索白板元素"
        />
        {q && (
          <button type="button" className="aurora-cip__search-opt" onClick={() => setQ('')} title="清空" aria-label="清空搜索">
            <Icon.close size={12} />
          </button>
        )}
      </div>
      {!q.trim() ? (
        <div className="aurora-cip__empty">输入关键词搜索白板上的卡片与图形</div>
      ) : results.length === 0 ? (
        <div className="aurora-cip__empty">未匹配到「{q}」</div>
      ) : (
        <div className="aurora-cip__layers">
          {results.map((s) => (
            <button key={s.id} type="button" className="aurora-cip__layer" onClick={() => onPick(s.id)}>
              <span className="aurora-cip__layer-name">{s.text || s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

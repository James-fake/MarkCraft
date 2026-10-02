import { Icon } from '../../icons'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { LABEL_BG_PRESETS, autoTextColor } from '@features/canvas-v2/engine/OverlayCards'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { InspectorSelect } from './InspectorSelect'
import { COLORS, type ParsedShape } from './inspectorPanelShared'

// ───────────── 属性 ─────────────
export function PropsTab({
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

import { Icon } from '../../icons'
import { ScrollNumberInput } from '@components/ui/ScrollNumberInput'
import { LABEL_BG_PRESETS, autoTextColor } from '@features/canvas-v2/engine/OverlayCards'
import type { CanvasEngine } from '@features/canvas-v2/engine/CanvasEngine'
import { InspectorSelect } from './InspectorSelect'
import { COLORS, type ParsedShape } from './inspectorPanelShared'
import { useLanguage } from '../../../stores/LanguageStore'

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
  const { t } = useLanguage()
  if (!selected) {
    return (
      <div className="aurora-cip__empty">
        {t.propsTab.empty}
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
      <div className="aurora-cip__section-title">{t.propsTab.content}</div>
      <textarea
        className="aurora-cip__textarea"
        rows={4}
        value={s.text.replace(/ {2,}/g, ' ')}
        placeholder={t.propsTab.contentPlaceholder}
        onChange={(e) => set({ props: { text: e.target.value } })}
      />
      {s.type === 'label-card' ? (
        <>
          <div className="aurora-cip__section-title">{t.propsTab.bgColor}</div>
          <div className="aurora-cip__swatches">
            {LABEL_BG_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`aurora-cip__swatch ${(s.bg ?? '').toLowerCase() === c.toLowerCase() ? 'aurora-cip__swatch--on' : ''}`}
                style={{ background: c }}
                onClick={() => set({ props: { bg: c, textColor: autoTextColor(c) } })}
                aria-label={t.propsTab.bgColorAria.replace('{n}', c)}
              />
            ))}
          </div>
          <div className="aurora-cip__section-title">{t.propsTab.textColor}</div>
          <div className="aurora-cip__row" style={{ gap: 8 }}>
            <button type="button" className="aurora-cip__chip" onClick={() => set({ props: { textColor: '#1F2937' } })}>{t.propsTab.colorDark}</button>
            <button type="button" className="aurora-cip__chip" onClick={() => set({ props: { textColor: '#F9FAFB' } })}>{t.propsTab.colorLight}</button>
          </div>
          <div className="aurora-cip__row" style={{ justifyContent: 'space-between' }}>
            <span className="aurora-cip__label">{t.propsTab.border}</span>
            <button
              type="button"
              className={`aurora-cip__switch ${s.borderOn ? 'aurora-cip__switch--on' : ''}`}
              onClick={() => set({ props: { borderOn: !s.borderOn } })}
              aria-label={s.borderOn ? t.propsTab.borderOffAria : t.propsTab.borderOnAria}
            >
              <span className="aurora-cip__switch-knob" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="aurora-cip__section-title">{t.propsTab.color}</div>
          <div className="aurora-cip__swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`aurora-cip__swatch ${(s.color ?? '').toLowerCase() === c.toLowerCase() ? 'aurora-cip__swatch--on' : ''}`}
                style={{ background: c }}
                onClick={() => set({ props: { color: c } })}
                aria-label={t.propsTab.colorAria.replace('{n}', c)}
              />
            ))}
          </div>
        </>
      )}
      <div className="aurora-cip__section-title">{t.propsTab.fontSize}</div>
      <div className="aurora-cip__row">
        <span className="aurora-cip__label">{t.propsTab.fontSize}</span>
        <ScrollNumberInput
          className="aurora-cip__input"
          value={s.fontSize}
          min={10}
          max={32}
          onChange={(n) => set({ props: { fontSize: clamp(Number.isNaN(n) ? 14 : n, 10, 32) } })}
        />
        <span className="aurora-cip__unit">px</span>
        <span className="aurora-cip__label">{t.propsTab.rotation}</span>
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
          <div className="aurora-cip__section-title">{t.propsTab.parentCard}</div>
          <InspectorSelect
            ariaLabel={t.propsTab.parentCardAria}
            value={s.parentId ?? ''}
            placeholder={t.propsTab.none}
            options={[
              { value: '', label: t.propsTab.none },
              ...parentCards.map((c) => ({ value: c.id, label: c.text })),
            ]}
            onChange={(v) => set({ props: { parentId: v || undefined } })}
          />
          <div className="aurora-cip__section-title">{t.propsTab.tagsTitle}</div>
          <input
            className="aurora-cip__input aurora-cip__field"
            value={s.tags.join('，')}
            onChange={(e) => set({ props: { tags: e.target.value } })}
            placeholder={t.propsTab.tagsPlaceholder}
            aria-label={t.propsTab.tagsAria}
          />
        </>
      )}
      <div className="aurora-cip__row">
        <span className="aurora-cip__label">{t.propsTab.width}</span>
        <ScrollNumberInput className="aurora-cip__input" min={20} max={1200} value={Math.round(s.w)} onChange={(n) => setSize('w', Number.isNaN(n) ? 20 : n)} />
        <span className="aurora-cip__label">{t.propsTab.height}</span>
        <ScrollNumberInput className="aurora-cip__input" min={20} max={1200} value={Math.round(s.h)} onChange={(n) => setSize('h', Number.isNaN(n) ? 20 : n)} />
      </div>
      <div className="aurora-cip__row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="aurora-cip__label">{t.propsTab.pinned}</span>
        <button
          type="button"
          className={`aurora-cip__switch ${s.pinned ? 'aurora-cip__switch--on' : ''}`}
          onClick={() => set({ props: { pinned: !s.pinned } })}
          aria-label={s.pinned ? t.propsTab.unpinAria : t.propsTab.pinAria}
        >
          <span className="aurora-cip__switch-knob" />
        </button>
      </div>
      <div className="aurora-cip__row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="aurora-cip__label">{t.propsTab.lock}</span>
        <button
          type="button"
          className={`aurora-cip__switch ${s.isLocked ? 'aurora-cip__switch--on' : ''}`}
          onClick={() => set({ isLocked: !s.isLocked })}
          aria-label={s.isLocked ? t.propsTab.unlockAria : t.propsTab.lockAria}
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
          <Icon.copy size={13} /> {t.propsTab.duplicate}
        </button>
      )}
      {canDelete && (
        <button type="button" className="aurora-cip__delete" onClick={() => engine?.deleteShapes([s.id])}>
          <Icon.trash size={13} /> {t.propsTab.delete}
        </button>
      )}
    </div>
  )
}

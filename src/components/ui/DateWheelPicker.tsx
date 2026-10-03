import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useUiLabels } from './UiLabels'

/**
 * 苹果风格日期滚轮鼓（年 / 月 / 日 三列，参考 iOS 日期选择器）
 * 每列复用数字滚轮鼓的圆柱曲面 + 中心选取带 + 惯性吸附；
 * 月 / 日联动：切换年月后日列自动按当月天数重算并钳制（如 2 月 31 日 → 28/29）。
 * 属于共享 UI 层，features / Aurora 均可引用，不触发分层守卫。
 */

const ITEM_H = 34

function pad2(n: number) {
  return n < 10 ? '0' + n : String(n)
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate()
}
function parseDate(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  return { y: +m[1], m: +m[2], d: +m[3] }
}

interface DrumItem {
  label: string
  value: number
}

function DrumColumn({
  items,
  selectedIndex,
  onChange,
  ariaLabel,
}: {
  items: DrumItem[]
  selectedIndex: number
  onChange: (i: number) => void
  ariaLabel?: string
}) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const lastIdx = useRef(selectedIndex)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const apply = useRef<() => void>(() => {})
  apply.current = () => {
    const cont = listRef.current
    if (!cont) return
    // 首尾已由垫块撑出留白，选中浮点 = scrollTop / ITEM_H（无偏移）
    const selFloat = cont.scrollTop / ITEM_H
    const selIdx = Math.round(selFloat)
    const children = cont.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const idx = Number(child.dataset.idx)
      // 首尾留白垫块（无 data-idx）不参与曲率计算
      if (!Number.isFinite(idx)) continue
      const d = idx - selFloat
      const ad = Math.abs(d)
      const rot = Math.max(-75, Math.min(75, d * 16))
      const scale = 1 - Math.min(ad, 3) * 0.06
      const opacity = 1 - Math.min(Math.max(ad - 1.5, 0), 4) * 0.16
      child.style.transform = `rotateX(${rot}deg) scale(${scale})`
      child.style.opacity = String(opacity)
      child.style.filter = ad > 2.5 ? `blur(${Math.min(ad - 2.5, 2) * 0.6}px)` : 'none'
    }
    if (selIdx !== lastIdx.current && selIdx >= 0 && selIdx < items.length) {
      lastIdx.current = selIdx
      onChangeRef.current(selIdx)
    }
  }

  const itemsKey = items.map((it) => it.value).join(',')
  useLayoutEffect(() => {
    const cont = listRef.current
    if (!cont) return
    cont.scrollTop = selectedIndex * ITEM_H
    lastIdx.current = selectedIndex
    apply.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey])

  useEffect(() => {
    const cont = listRef.current
    if (!cont) return
    const onScroll = () => apply.current()
    cont.addEventListener('scroll', onScroll, { passive: true })
    return () => cont.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="aurora-wheel__viewport aurora-datewheel__col">
      <div ref={listRef} className="aurora-wheel__list" role="listbox" aria-label={ariaLabel}>
        <div className="aurora-wheel__pad" aria-hidden="true" />
        {items.map((it, i) => (
          <div
            key={i}
            data-idx={i}
            className="aurora-wheel__item"
            onClick={() => listRef.current?.scrollTo?.({ top: i * ITEM_H, behavior: 'smooth' })}
          >
            {it.label}
          </div>
        ))}
        <div className="aurora-wheel__pad" aria-hidden="true" />
      </div>
      <div className="aurora-wheel__band" aria-hidden="true" />
    </div>
  )
}

export interface DateWheelPickerProps {
  /** 当前日期，ISO 短格式 'YYYY-MM-DD'（空 → 未设置） */
  value: string
  /** 值变化回调（拖动 / 滚动 / 点按实时回传 ISO 短格式） */
  onChange: (v: string) => void
  minYear?: number
  maxYear?: number
  onClose?: () => void
}

export function DateWheelPicker({
  value,
  onChange,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  onClose,
}: DateWheelPickerProps) {
  const ui = useUiLabels()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const defaultY = Math.min(maxYear, Math.max(minYear, maxYear - 25))
  const [sel, setSel] = useState<{ y: number; m: number; d: number }>(() =>
    parseDate(value) ?? { y: defaultY, m: 1, d: 1 },
  )
  const touched = useRef(false)
  const lastEmitted = useRef<string>('')

  const years = useMemo<DrumItem[]>(() => {
    const arr: DrumItem[] = []
    for (let y = minYear; y <= maxYear; y++) arr.push({ label: String(y), value: y })
    return arr
  }, [minYear, maxYear])

  const months = useMemo<DrumItem[]>(
    () => {
      const arr: DrumItem[] = []
      for (let m = 1; m <= 12; m++) arr.push({ label: String(m), value: m })
      return arr
    },
    [],
  )

  const days = useMemo<DrumItem[]>(() => {
    const max = daysInMonth(sel.y, sel.m)
    const arr: DrumItem[] = []
    for (let d = 1; d <= max; d++) arr.push({ label: String(d), value: d })
    return arr
  }, [sel.y, sel.m])

  const yIdx = Math.min(Math.max(sel.y - minYear, 0), years.length - 1)
  const mIdx = Math.min(Math.max(sel.m - 1, 0), months.length - 1)
  const dIdx = Math.min(Math.max(sel.d - 1, 0), days.length - 1)

  const setPart = (part: 'y' | 'm' | 'd', idx: number) => {
    touched.current = true
    setSel((prev) => {
      let y = prev.y
      let m = prev.m
      let d = prev.d
      if (part === 'y') y = minYear + idx
      else if (part === 'm') m = idx + 1
      else d = idx + 1
      const maxD = daysInMonth(y, m)
      if (d > maxD) d = maxD
      return { y, m, d }
    })
  }

  // 仅用户交互后回传（避免打开即把空值覆盖为默认值）
  useEffect(() => {
    if (!touched.current) return
    const next = `${pad2(sel.y)}-${pad2(sel.m)}-${pad2(sel.d)}`
    if (next !== lastEmitted.current) {
      lastEmitted.current = next
      onChangeRef.current(next)
    }
  }, [sel.y, sel.m, sel.d])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="aurora-datewheel">
      <DrumColumn items={years} selectedIndex={yIdx} onChange={(i) => setPart('y', i)} ariaLabel={ui.wheelYear} />
      <DrumColumn items={months} selectedIndex={mIdx} onChange={(i) => setPart('m', i)} ariaLabel={ui.wheelMonth} />
      <DrumColumn items={days} selectedIndex={dIdx} onChange={(i) => setPart('d', i)} ariaLabel={ui.wheelDay} />
    </div>
  )
}

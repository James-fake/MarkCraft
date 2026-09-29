import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/**
 * 苹果风格数字滚轮鼓（参考 iOS / macOS 日期·时间选择器）
 * - 单列数字以圆柱曲面排列，中心高亮选取带，上下两侧随距离旋转 / 缩放 / 淡出
 * - 支持拖动滚动、鼠标滚轮、点按选中对齐（scroll-snap 惯性吸附）
 * - 有界区间一次性渲染全部；超大 / 无界区间采用窗口化锚点，滚动到边缘自动无缝续接
 * 属于共享 UI 层，Aurora 与 features 组件树均可使用，不触发分层守卫。
 */

const ITEM_H = 34
const BUFFER = 40 // 窗口化每侧槽位数
const EDGE = 4 // 距边缘多少槽位触发续接

interface WheelItem {
  value: number
  disabled: boolean
}

export interface NumberWheelPickerProps {
  /** 当前数值（空字符串表示未填写） */
  value: number | ''
  min?: number
  max?: number
  /** 步进，默认 1 */
  step?: number
  /** 值变化回调（拖动 / 滚动 / 点按实时回传） */
  onChange: (v: number) => void
  /** 关闭（Esc / 点外部）回调 */
  onClose?: () => void
}

function formatWheelValue(v: number, step: number): string {
  if (step >= 1) return String(Math.round(v))
  const decimals = Math.min(2, (String(step).split('.')[1] || '').length)
  return v.toFixed(decimals)
}

export function NumberWheelPicker({
  value,
  min,
  max,
  step = 1,
  onChange,
  onClose,
}: NumberWheelPickerProps) {
  const finiteMin = min != null && Number.isFinite(min) ? min : null
  const finiteMax = max != null && Number.isFinite(max) ? max : null
  const count =
    finiteMin != null && finiteMax != null ? Math.floor((finiteMax - finiteMin) / step) + 1 : Infinity
  const windowed = count === Infinity || count > 400

  // useCallback 稳定化：clampV 是下游 useMemo 的 dep（否则该 memo 每渲染失效）
  const clampV = useCallback((v: number) => {
    let r = v
    if (finiteMin != null) r = Math.max(finiteMin, r)
    if (finiteMax != null) r = Math.min(finiteMax, r)
    return r
  }, [finiteMin, finiteMax])
  const roundStep = (v: number) => Math.round(v / step) * step

  const initialValue =
    value === '' || value == null || !Number.isFinite(value as number)
      ? finiteMin ?? 0
      : (value as number)

  const [anchor, setAnchor] = useState<number>(() =>
    windowed ? clampV(roundStep(initialValue)) : 0,
  )

  const items = useMemo<WheelItem[]>(() => {
    if (!windowed) {
      const arr: WheelItem[] = []
      for (let i = 0; i < (count as number); i++) {
        arr.push({ value: finiteMin! + i * step, disabled: false })
      }
      return arr
    }
    const arr: WheelItem[] = []
    for (let k = -BUFFER; k <= BUFFER; k++) {
      const raw = anchor + k * step
      const eff = clampV(raw)
      arr.push({ value: eff, disabled: raw !== eff })
    }
    return arr
  }, [windowed, anchor, count, finiteMin, step, clampV])

  const centerSlotIndex = windowed
    ? BUFFER
    : Math.min(
        Math.max(Math.round((initialValue - (finiteMin ?? 0)) / step), 0),
        (count as number) - 1,
      )

  const listRef = useRef<HTMLDivElement | null>(null)
  const lastCommitted = useRef<number>(NaN)
  const pendingRecenter = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const applyCurvature = useRef<() => void>(() => {})
  applyCurvature.current = () => {
    const cont = listRef.current
    if (!cont) return
    const st = cont.scrollTop
    // 首尾已由垫块撑出留白，选中浮点 = scrollTop / ITEM_H（无偏移）
    const selFloat = st / ITEM_H
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
    if (selIdx >= 0 && selIdx < items.length) {
      const it = items[selIdx]
      if (!it.disabled && it.value !== lastCommitted.current) {
        lastCommitted.current = it.value
        onChangeRef.current(it.value)
      }
    }
    if (windowed && (selIdx <= EDGE || selIdx >= items.length - 1 - EDGE)) {
      const atLow = finiteMin != null && anchor - BUFFER * step <= finiteMin
      const atHigh = finiteMax != null && anchor + BUFFER * step >= finiteMax
      const nearLow = selIdx <= EDGE && !atLow
      const nearHigh = selIdx >= items.length - 1 - EDGE && !atHigh
      if ((nearLow || nearHigh) && !items[selIdx].disabled) {
        setAnchor(items[selIdx].value)
        pendingRecenter.current = true
      }
    }
  }

  // 初始定位到当前值对应的行
  useLayoutEffect(() => {
    const cont = listRef.current
    if (!cont) return
    cont.scrollTop = centerSlotIndex * ITEM_H
    lastCommitted.current = items[centerSlotIndex]?.value ?? NaN
    applyCurvature.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 窗口化续接后回中，保持视觉连续
  useLayoutEffect(() => {
    if (!pendingRecenter.current) return
    pendingRecenter.current = false
    const cont = listRef.current
    if (!cont) return
    cont.scrollTop = BUFFER * ITEM_H
    applyCurvature.current()
  }, [anchor])

  useEffect(() => {
    const cont = listRef.current
    if (!cont) return
    const onScroll = () => applyCurvature.current()
    cont.addEventListener('scroll', onScroll, { passive: true })
    return () => cont.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="aurora-wheel">
      <div className="aurora-wheel__viewport">
        <div ref={listRef} className="aurora-wheel__list">
          <div className="aurora-wheel__pad" aria-hidden="true" />
          {items.map((it, i) => (
            <div
              key={windowed ? i : it.value}
              data-idx={i}
              className={`aurora-wheel__item${it.disabled ? ' is-disabled' : ''}`}
              onClick={() => {
                if (it.disabled) return
                // 点选 = 明确选择：立即回传数值，并滚动对齐到中央（重复值由 lastCommitted 去重）
                onChangeRef.current(it.value)
                lastCommitted.current = it.value
                listRef.current?.scrollTo?.({ top: i * ITEM_H, behavior: 'smooth' })
              }}
            >
              {it.disabled ? '' : formatWheelValue(it.value, step)}
            </div>
          ))}
          <div className="aurora-wheel__pad" aria-hidden="true" />
        </div>
        <div className="aurora-wheel__band" aria-hidden="true" />
      </div>
    </div>
  )
}

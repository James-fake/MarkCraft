import { useEffect, useLayoutEffect, useRef } from 'react'
import { useWheelListGestures } from './useWheelListGestures'

/**
 * 苹果风格「文字滚轮选择器」本体（参考 iOS / macOS 日期·时间选择器，但承载任意 string 选项）
 * - 选项以圆柱曲面排列，中心高亮选取带，上下两侧随距离旋转 / 缩放 / 淡出（与 NumberWheelPicker 同套视觉）
 * - 支持拖动滚动、鼠标滚轮、点按选中对齐（scroll-snap 惯性吸附）
 * - 选项数量有限，一次性渲染全部（无界续接逻辑由调用方在选项上保证）
 * 属于共享 UI 层，Aurora 与 features 组件树均可使用，不触发分层守卫。
 */

const ITEM_H = 34

export interface OptionWheelItem {
  value: string
  label: string
  disabled?: boolean
}

export interface OptionWheelPickerProps {
  /** 全部选项（有限集合，一次性渲染） */
  options: OptionWheelItem[]
  /** 当前选中值（须与某 option.value 对应；找不到则回退到首项） */
  value: string
  /** 值变化回调（拖动 / 滚动实时回传选中的 value） */
  onChange: (value: string) => void
  /** 点选某项时的回调（点按 = 明确的最终选择，调用方可据此立即提交并收起） */
  onPick?: (value: string) => void
  /** 关闭（Esc / 点外部）回调 */
  onClose?: () => void
}

export function OptionWheelPicker({ options, value, onChange, onPick, onClose }: OptionWheelPickerProps) {
  const selIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  const listRef = useRef<HTMLDivElement | null>(null)
  // 滚轮精准步进 + 按住拖拽滚动（修复「一滑跳 2 项」与「拖动被当成切页」）
  useWheelListGestures(listRef, ITEM_H)
  const lastCommitted = useRef<string>('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

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
    if (selIdx >= 0 && selIdx < options.length) {
      const it = options[selIdx]
      if (!it.disabled && it.value !== lastCommitted.current) {
        lastCommitted.current = it.value
        onChangeRef.current(it.value)
      }
    }
  }

  // 初始定位到当前值对应的行
  useLayoutEffect(() => {
    const cont = listRef.current
    if (!cont) return
    cont.scrollTop = selIndex * ITEM_H
    lastCommitted.current = options[selIndex]?.value ?? ''
    applyCurvature.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <div ref={listRef} className="aurora-wheel__list" role="listbox">
          <div className="aurora-wheel__pad" aria-hidden="true" />
          {options.map((o, i) => (
            <div
              key={o.value}
              data-idx={i}
              data-value={o.value}
              role="option"
              aria-selected={i === selIndex}
              aria-disabled={o.disabled || undefined}
              className={`aurora-wheel__item${o.disabled ? ' is-disabled' : ''}`}
              onClick={() => {
                if (o.disabled) return
                // 点选 = 明确选择：立即回传 value，并滚动对齐到中央（滚动会再次触发 onChange，由 lastCommitted 去重）
                onChangeRef.current(o.value)
                lastCommitted.current = o.value
                onPickRef.current?.(o.value)
                listRef.current?.scrollTo?.({ top: i * ITEM_H, behavior: 'smooth' })
              }}
            >
              {o.disabled ? '' : <span className="aurora-wheel__label">{o.label}</span>}
            </div>
          ))}
          <div className="aurora-wheel__pad" aria-hidden="true" />
        </div>
        <div className="aurora-wheel__band" aria-hidden="true" />
      </div>
    </div>
  )
}

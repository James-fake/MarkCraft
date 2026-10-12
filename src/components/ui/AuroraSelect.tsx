import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { OptionWheelPicker } from './OptionWheelPicker'
import { usePresence, POPOVER_EXIT_MS } from './usePresence'
import { useUiLabels } from './UiLabels'

/**
 * AuroraSelect —— 统一下拉选择器（替代原生 <select>），现已升级为苹果风格滚轮鼓。
 * 触发器沿用 .aurora-select 外观；**鼠标触碰即自动展开** portal + fixed 定位的滚轮浮层
 * （OptionWheelPicker，与数字滚轮 ScrollNumberInput 手感一致），点击亦可开 / 关；
 * 移出浮层 / 触发器约 160ms 后收起。避免被滚动容器裁切，也彻底规避 Windows 下
 * 原生 option 弹层由 OS 接管、无法套用主题（白底菜单）的问题。
 * 交互：滚轮浮层内拖拽 / 滚轮 / 点按选中，**滚动停止约 150ms 即提交生效**
 * （macOS 手感：停在哪项就立刻采用哪项）；Esc / 点外部 / 背景滚动兜底提交并收起。
 * 实时提交带防抖：连续快速滚动浏览长列表（主题 / 字体等）时不逐项触发，只有停下才生效。
 * 共享 UI 组件（src/components/ui），Aurora 与 features 均可引用，不触发分层反向依赖。
 * 选项可带 groupLabel（向后兼容），但滚轮不支持分组标题渲染，故此处忽略（调用方可按需把分组信息并入 label）。
 */
export interface AuroraSelectOption {
  value: string
  label: string
  disabled?: boolean
  groupLabel?: string
}

export interface AuroraSelectProps {
  value: string
  options: AuroraSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  id?: string
  className?: string
  minWidth?: number
}

export function AuroraSelect({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  id,
  className = '',
  minWidth,
}: AuroraSelectProps) {
  const ui = useUiLabels()
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  // 关闭时先播 100ms 退场再卸载（动效审计 P0-4）；rect 是 state，退场窗口内定位不丢
  const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<string>(value)
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const commitTimer = useRef<number | null>(null)

  const selected = options.find((o) => o.value === value)

  const flushPending = () => {
    if (pendingRef.current !== valueRef.current) onChangeRef.current(pendingRef.current)
  }
  const commitAndClose = () => {
    if (commitTimer.current) {
      window.clearTimeout(commitTimer.current)
      commitTimer.current = null
    }
    flushPending()
    setOpen(false)
  }
  // 滚动停止约 150ms 后立即提交（防抖），避免连续快速滚动时逐项触发整页重渲染
  const onWheelChange = (v: string) => {
    pendingRef.current = v
    if (commitTimer.current) window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null
      flushPending()
    }, 150)
  }
  // 点选选项 = 明确选择：清除挂起防抖、立即提交并收起（不等滚动停止 / 不点外部）
  const onPick = (v: string) => {
    if (commitTimer.current) {
      window.clearTimeout(commitTimer.current)
      commitTimer.current = null
    }
    pendingRef.current = v
    flushPending()
    setOpen(false)
  }
  // 卸载时清理挂起的提交定时器，避免卸载后 setState / 泄漏
  useEffect(
    () => () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current)
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    },
    [],
  )

  // —— hover 自动展开（与数字滚轮 ScrollNumberInput 一致）——
  // 鼠标触碰触发器立即展开；移出触发器 / 浮层约 160ms 后收起，期间回到二者之一则取消收起，
  // 保证鼠标能从容地「跨过间隙」移进滚轮浮层去滚动 / 点选。
  const hoverTimer = useRef<number | null>(null)
  const cancelClose = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    hoverTimer.current = window.setTimeout(() => commitAndClose(), 160)
  }
  const onTriggerEnter = () => {
    cancelClose()
    if (!open) {
      if (triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect())
        pendingRef.current = value
      }
      setOpen(true)
    }
  }

  const toggle = () => {
    cancelClose()
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
      pendingRef.current = value
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      commitAndClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') commitAndClose()
    }
    const close = (e?: Event) => {
      // 滚轮鼓自身内部的滚动（scroll 事件 target 落在浮层内）不应关闭浮层，
      // 否则一在鼓内滚动就立即关闭、表现为「无法滚动」。仅当背后页面 / 容器滚动才关闭。
      if (e && popoverRef.current?.contains(e.target as Node)) return
      commitAndClose()
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const buildPopover = () => {
    if (!mounted || !rect) return null
    const width = Math.min(300, Math.max(rect.width, 200))
    const height = 5 * 34 + 32
    let top = rect.bottom + 6
    if (top + height > window.innerHeight) top = rect.top - height - 6
    let left = rect.left
    if (left + width > window.innerWidth) left = window.innerWidth - width - 8
    return createPortal(
      <div
        ref={popoverRef}
        className="aurora-wheel-popover"
        data-exiting={exiting || undefined}
        style={{ position: 'fixed', top, left, width }}
        role="dialog"
        aria-label={ariaLabel ?? ui.wheelSelect}
        onMouseEnter={cancelClose}
        onMouseLeave={(e) => {
          // 拖动滚轮鼓时指针可能短暂移出浮层：左键仍按住（buttons&1）说明是拖拽中，
          // 不要收起，否则表现为「一拖就切走设置页」
          if (e.buttons & 1) return
          scheduleClose()
        }}
      >
        <OptionWheelPicker
          options={options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
          value={value}
          onChange={(v) => {
            onWheelChange(v)
          }}
          onPick={onPick}
          onClose={commitAndClose}
        />
      </div>,
      document.body,
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`aurora-select aurora-select--custom${open ? ' aurora-select--open' : ''} ${className}`.trim()}
        style={minWidth ? { minWidth } : undefined}
        onClick={toggle}
        onMouseEnter={onTriggerEnter}
        onMouseLeave={scheduleClose}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="aurora-select__value">{selected ? selected.label : (placeholder ?? ui.selectPlaceholder)}</span>
        <svg
          className="aurora-select__chevron"
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {buildPopover()}
    </>
  )
}

import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react'

export interface WheelItem {
  value: number
  label: string
}

// ---------- 统一惯性物理参数（鼠标滚轮与触摸滑动共用，确保两种交互体验完全一致） ----------
const WHEEL_FRICTION = 0.94 // 每 16ms 保留的速度比例；指数衰减 = 自然 ease-out 减速
const WHEEL_STOP_V = 0.02 // 低于此速度(px/ms)即停止并吸附对齐
const WHEEL_TOUCH_BOOST = 8 // 触摸松手速度放大系数（轻弹即长时间滑行）
const WHEEL_KICK = 0.01 // 鼠标滚轮每 px 位移转化的初速度（决定单次滚动强度）
const WHEEL_MAX_V = 18 // 速度上限(px/ms)，防止连续猛滚失控
const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface WheelPickerProps {
  items: WheelItem[]
  selectedIndex: number
  onSelect: (index: number) => void
  width?: number
  itemHeight?: number
  visible?: number
  accent?: string
  ariaLabel?: string
  /** 循环滚动：滚到末尾无缝回到开头（月/日滚轮启用；年份按硬范围不循环） */
  loop?: boolean
}

/**
 * WheelPicker —— 垂直滚轮选择器（iOS 时间滚轮风格）
 * - 触摸滑动 / 鼠标拖拽 / 滚轮操作，释放后惯性滚动 + 吸附对齐
 * - **池化虚拟列表**：始终只渲染视口周围固定数量（POOL）的节点，与总项数解耦——
 *   年滚轮 1~4001 也仅 ~18 个 DOM，彻底消除超长列表导致的卡顿。
 * - **3D 动态视觉**：选中项 scale 放大 + translateZ 凸出 + 高光阴影；相邻项 rotateX 倾斜、
 *   渐隐、模糊，随滚动连续过渡，呈现丝滑 3D 透视质感。
 * - 受控组件：selectedIndex 变化时平滑滚动到目标（外部联动）。
 * - loop 模式：虚拟索引任意整数，实际索引取模归一，无缝循环、无整段重复渲染。
 */
const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedIndex,
  onSelect,
  width = 72,
  itemHeight = 40,
  visible = 5,
  accent = '#8b5cf6',
  ariaLabel,
  loop = false,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const velRef = useRef(0) // 当前滑行速度(px/ms)，滚轮与触摸共用

  const offsetRef = useRef(0)
  const selRef = useRef(selectedIndex)
  selRef.current = selectedIndex

  // 最新 items 引用（避免 applyOffset 因 items 变化而重建）
  const itemsRef = useRef(items)
  itemsRef.current = items

  const len = items.length
  const center = ((visible - 1) / 2) * itemHeight
  const maxIndex = Math.max(0, len - 1)
  const minOff = center - maxIndex * itemHeight
  const maxOff = center

  // 池化：固定渲染视口周围节点（可见项两倍 + 缓冲），不随总项数增长
  const POOL = visible * 2 + 8

  const clampIndex = useCallback((i: number) => Math.max(0, Math.min(maxIndex, i)), [maxIndex])

  const offsetForIndex = useCallback(
    (i: number) => {
      if (!loop || len <= 1) return center - i * itemHeight
      // loop 模式：选离当前滚动位置最近的循环落点，避免整段长距离旋转
      const cur = (center - offsetRef.current) / itemHeight
      let best = i + len
      let bestD = Math.abs(best - cur)
      for (const cand of [i, i + 2 * len]) {
        const d = Math.abs(cand - cur)
        if (d < bestD) {
          bestD = d
          best = cand
        }
      }
      return center - best * itemHeight
    },
    [center, itemHeight, loop, len],
  )

  // 将当前 offset 应用到 DOM：列表整体平移 + 池内每个节点按相对中心做 3D 透视变换
  const applyOffset = useCallback(
    (off: number) => {
      let o = off
      // 循环归一化：把中心虚拟索引精确映射到 [len, 2*len)，因内容每 len*itemHeight 重复一次，
      // 整段平移 len*itemHeight 视觉完全一致 → 无缝循环。取模计算对年份这类大范围也稳定。
      if (loop && len > 1) {
        const vi = (center - o) / itemHeight
        const norm = ((vi % len) + len) % len
        o = center - (norm + len) * itemHeight
      }
      offsetRef.current = o
      const list = listRef.current
      if (!list) return
      list.style.transform = `translate3d(0, ${o}px, 0)`
      const children = list.children
      const cvi = (center - o) / itemHeight
      const startVi = Math.round(cvi - (POOL - 1) / 2)
      const src = itemsRef.current
      for (let p = 0; p < POOL; p++) {
        const node = children[p] as HTMLElement | undefined
        if (!node) continue
        const vi = startVi + p
        // 非循环且越界：留白（不显示端点重复项），保持边界语义
        if (!loop && (vi < 0 || vi > maxIndex)) {
          if (node.style.opacity !== '0') node.style.opacity = '0'
          node.style.filter = 'none'
          node.style.textShadow = 'none'
          continue
        }
        const actual = loop && len > 1 ? ((vi % len) + len) % len : clampIndex(vi)
        const prevIdx = (node as unknown as { _idx?: number })._idx
        if (prevIdx !== actual) {
          node.textContent = src[actual]?.label ?? ''
          ;(node as unknown as { _idx?: number })._idx = actual
        }
        // rel 为浮点相对中心距离 —— 随滚动连续变化，使缩放/透明度平滑过渡（丝滑）
        const rel = vi - cvi
        const dist = Math.abs(rel)
        const scale = Math.max(0.5, 1.35 - 0.2 * dist)
        const z = dist < 1 ? 42 * (1 - dist) : 0 // 仅中心项凸出
        const rx = Math.max(-45, Math.min(45, rel * 16))
        const opacity = Math.max(0.08, 1 - 0.34 * dist)
        const blur = dist > 1.3 ? Math.min(3, (dist - 1.3) * 1.8) : 0
        const isCenter = dist < 0.5
        node.style.transform = `translateY(${vi * itemHeight}px) translateZ(${z}px) scale(${scale}) rotateX(${rx}deg)`
        node.style.opacity = String(opacity)
        node.style.filter = blur > 0 ? `blur(${blur}px)` : 'none'
        node.style.color = isCenter ? accent : 'var(--dv-ink)'
        // 选中项高光阴影，强化 3D 凸出质感
        node.style.textShadow = isCenter
          ? `0 6px 16px rgba(139,92,246,0.45), 0 1px 2px rgba(0,0,0,0.35)`
          : 'none'
        node.style.zIndex = isCenter ? '3' : String(2 - Math.floor(dist))
      }
    },
    [itemHeight, center, accent, loop, len, visible, POOL, maxIndex, clampIndex],
  )

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // 平滑滚动到目标 offset，到达后提交选中项
  const animateTo = useCallback(
    (target: number) => {
      cancelRaf()
      const start = offsetRef.current
      const dist = target - start
      if (Math.abs(dist) < 0.5) {
        applyOffset(target)
        const raw = Math.round((center - target) / itemHeight)
        const commit = loop ? ((raw % len) + len) % len : clampIndex(raw)
        if (commit !== selRef.current) onSelect(commit)
        return
      }
      const dur = 280
      const t0 = performance.now()
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        applyOffset(start + dist * ease(p))
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          rafRef.current = null
          const raw = Math.round((center - target) / itemHeight)
          const commit = loop ? ((raw % len) + len) % len : clampIndex(raw)
          if (commit !== selRef.current) onSelect(commit)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [applyOffset, cancelRaf, center, itemHeight, clampIndex, onSelect, loop, len],
  )

  const snap = useCallback(() => {
    const raw = Math.round((center - offsetRef.current) / itemHeight)
    animateTo(center - raw * itemHeight)
  }, [center, itemHeight, animateTo])

  // 统一惯性滑行（鼠标滚轮 / 触摸松手共用）：速度按摩擦指数衰减 → 自然 ease-out 减速，
  // 速度归零后吸附对齐。两种交互入口只负责“注入初速度”，动画曲线与摩擦参数完全一致。
  const startMomentum = useCallback(() => {
    cancelRaf()
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      const o = offsetRef.current + velRef.current * dt
      velRef.current *= Math.pow(WHEEL_FRICTION, dt / 16)
      if (!loop) {
        if (o > maxOff) {
          offsetRef.current = maxOff
          velRef.current = 0
          applyOffset(maxOff)
          rafRef.current = null
          snap()
          return
        }
        if (o < minOff) {
          offsetRef.current = minOff
          velRef.current = 0
          applyOffset(minOff)
          rafRef.current = null
          snap()
          return
        }
      }
      applyOffset(o)
      if (Math.abs(velRef.current) < WHEEL_STOP_V) {
        rafRef.current = null
        snap()
      } else {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [cancelRaf, applyOffset, snap, loop, minOff, maxOff])

  const dragRef = useRef<{
    active: boolean
    startY: number
    startOffset: number
    lastY: number
    lastT: number
    vel: number
  }>({ active: false, startY: 0, startOffset: 0, lastY: 0, lastT: 0, vel: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    cancelRaf()
    velRef.current = 0 // 抓住时立即终止残余滑行，避免和下一次手势叠加
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startOffset: offsetRef.current,
      lastY: e.clientY,
      lastT: performance.now(),
      vel: 0,
    }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    const dy = e.clientY - dragRef.current.startY
    let off = dragRef.current.startOffset + dy
    if (!loop) {
      const minOffM = minOff - 40
      const maxOffM = maxOff + 40
      off = Math.max(minOffM, Math.min(maxOffM, off))
    }
    applyOffset(off)
    const now = performance.now()
    const dt = now - dragRef.current.lastT
    if (dt > 0) dragRef.current.vel = (e.clientY - dragRef.current.lastY) / dt
    dragRef.current.lastY = e.clientY
    dragRef.current.lastT = now
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (!loop) {
      const off = offsetRef.current
      if (off > maxOff + 0.5 || off < minOff - 0.5) {
        animateTo(Math.max(minOff, Math.min(maxOff, off)))
        return
      }
    }
    // 慢速轻放：直接吸附；快速滑动：注入放大后的初速度进入统一惯性滑行
    if (Math.abs(dragRef.current.vel) < 0.05) {
      snap()
    } else {
      velRef.current = clampNum(dragRef.current.vel * WHEEL_TOUCH_BOOST, -WHEEL_MAX_V, WHEEL_MAX_V)
      startMomentum()
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    // 归一化不同浏览器的 deltaMode（像素 / 行 / 页）→ px
    let d = e.deltaY
    if (e.deltaMode === 1) d *= 16
    else if (e.deltaMode === 2) d *= itemHeight * visible
    // 把滚轮位移转化为初速度并累加：连续快速滚动 → 速度叠加 → 强烈连续滚动；
    // 停止滚动后剩余速度由统一惯性循环自然衰减滑行，与触摸滑动手感完全一致。
    const kick = -d * WHEEL_KICK
    velRef.current = clampNum(velRef.current + kick, -WHEEL_MAX_V, WHEEL_MAX_V)
    startMomentum()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = selRef.current
    const page = Math.max(1, visible - 1)
    let idx = cur
    switch (e.key) {
      case 'ArrowDown': idx = loop ? (cur + 1) % len : clampIndex(cur + 1); break
      case 'ArrowUp': idx = loop ? (cur - 1 + len) % len : clampIndex(cur - 1); break
      case 'PageDown': idx = loop ? (cur + page) % len : clampIndex(cur + page); break
      case 'PageUp': idx = loop ? (cur - page + len) % len : clampIndex(cur - page); break
      case 'Home': idx = 0; break
      case 'End': idx = maxIndex; break
      default: return
    }
    e.preventDefault()
    if (idx !== cur) onSelect(idx)
  }

  // 首次挂载：直接定位（无动画）
  const mountedRef = useRef(false)
  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      applyOffset(offsetForIndex(selectedIndex))
      return
    }
    animateTo(offsetForIndex(selectedIndex))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex])

  // items 变化（如大小月）：保持当前 offset 重新着色，不跳变
  useLayoutEffect(() => {
    applyOffset(offsetRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useEffect(() => {
    return () => {
      cancelRaf()
    }
  }, [cancelRaf])

  return (
    <div
      ref={viewportRef}
      className="dv-wheel"
      style={{ width }}
      tabIndex={0}
      role="listbox"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      <div className="dv-wheel-list" ref={listRef}>
        {Array.from({ length: POOL }, (_, p) => (
          <div key={p} className="dv-wheel-item" />
        ))}
      </div>
    </div>
  )
}

export default WheelPicker

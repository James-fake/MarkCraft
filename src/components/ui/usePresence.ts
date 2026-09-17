import { useEffect, useRef, useState } from 'react'

/**
 * 浮层生命周期相位机（共享原语）—— 把 `components/ui/Modal.tsx` 内联的那套相位机单源化。
 *
 * 背景（动效审计 P0 对称性收口）：浮层族此前一律写成 `{open && createPortal(...)}`，
 * **关闭 = 瞬时卸载**，于是入场关键帧播得很漂亮、收场是 0ms 硬切。
 * 本 hook 提供「先播退场、再卸载」的相位：`open → exiting → closed`。
 *
 * 放置层级：`src/components/ui/` = 共享中性层（`src/features/*` 与 `src/aurora/*` 都可向下引用）。
 * 不放 `src/aurora/hooks/`，因为 features 层禁止反向依赖 aurora UI（守卫 local/no-aurora-ui-import）。
 *
 * 硬约束（与 CSS 逐字对齐）：
 * - `exitMs` 必须等于 CSS 里 `[data-exiting='true']` 那条动画的时长。
 *   浮层 = 100ms（`--mc-dur-micro`）；面板浮层 = 180ms（`--mc-dur-fast`）。
 * - 退场期间由 CSS 负责 `pointer-events: none`，否则幽灵浮层继续吞点击。
 * - **可中断**：退场中途 `open` 回到 true 会立即回到 `open`，不跳变、不重播入场。
 *   面板浮层由 hover-intent + 延迟关闭驱动，必须能被打断（cancelClose）。
 */
export type PresencePhase = 'open' | 'exiting' | 'closed'

/** 相位机内核：`open` 为真值门控，返回当前相位。 */
function usePhase(open: boolean, exitMs: number): PresencePhase {
  const [phase, setPhase] = useState<PresencePhase>(open ? 'open' : 'closed')

  useEffect(() => {
    if (open) {
      setPhase('open')
      return
    }
    // 只有「开过的」才需要退场；初始即 closed 的不要误入 exiting（否则首帧白播一次退场）
    setPhase((p) => (p === 'open' ? 'exiting' : p))
  }, [open])

  useEffect(() => {
    if (phase !== 'exiting') return
    const t = window.setTimeout(() => setPhase('closed'), exitMs)
    return () => window.clearTimeout(t)
  }, [phase, exitMs])

  return phase
}

/**
 * 布尔门控的浮层（`{open && …}` 型）。
 *
 * @example
 * const { mounted, exiting } = usePresence(open, POPOVER_EXIT_MS)
 * if (!mounted) return null
 * return createPortal(<div data-exiting={exiting || undefined} … />, document.body)
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; exiting: boolean } {
  const phase = usePhase(open, exitMs)
  return { mounted: phase !== 'closed', exiting: phase === 'exiting' }
}

/**
 * 对象门控的浮层（`{menu && …}` 型）—— 退场期间**保留最后一份非空载荷**，
 * 否则 `setMenu(null)` 的那一刻就丢失了坐标/文案，退场根本无从渲染。
 *
 * @example
 * const { value: menu, mounted, exiting } = usePresenceValue(rawMenu, POPOVER_EXIT_MS)
 * if (!mounted || !menu) return null
 * return createPortal(<div data-exiting={exiting || undefined} style={{ left: menu.x }} … />, document.body)
 */
export function usePresenceValue<T>(
  value: T | null | undefined,
  exitMs: number,
): { value: T | null; mounted: boolean; exiting: boolean } {
  const open = value !== null && value !== undefined
  const phase = usePhase(open, exitMs)

  // 记住最后一份非空载荷（退场窗口内继续渲染它）。渲染期写入 ref 是幂等的：
  // 同一份非空 value 反复写入不改变结果，StrictMode 双渲染安全。
  const lastRef = useRef<T | null>(open ? (value as T) : null)
  if (open) lastRef.current = value as T

  const held = open ? (value as T) : phase === 'closed' ? null : lastRef.current
  return { value: held, mounted: phase !== 'closed', exiting: phase === 'exiting' }
}

/** 浮层（下拉/菜单/滚轮/Dock 气泡）退场时长：对齐 `--mc-dur-micro`。 */
export const POPOVER_EXIT_MS = 100
/** 面板悬浮侧栏退场时长：对齐 `--mc-dur-fast`（Modal 入 420 → 出 180 的同一比例）。 */
export const OVERLAY_EXIT_MS = 180

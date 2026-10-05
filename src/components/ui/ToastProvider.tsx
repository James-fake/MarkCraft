import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useUiLabels } from './UiLabels'

export type ToastKind = 'info' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  msg: string
  kind: ToastKind
  /** 出场中：置 data-exiting 触发 toast.css 反向离场 transition */
  exiting?: boolean
}

interface ToastContextValue {
  /** 弹出一条通知。kind 缺省为 info。 */
  show: (msg: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** 停留时长：两套旧实现（features 4000ms / aurora 2400ms）合并统一为中值。 */
const TOAST_DURATION_MS = 3000

/** 出场 transition 时长（toast.css [data-exiting] 180ms）+ 余量，之后才真正卸载。 */
const TOAST_EXIT_MS = 200

function KindIcon({ kind }: { kind: ToastKind }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'success') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9" />
      </svg>
    )
  }
  if (kind === 'error') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <path d="M12 16.4v.01" />
      </svg>
    )
  }
  if (kind === 'warning') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5" />
        <path d="M12 16.2v.01" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M11.5 11v5.5" />
      <path d="M11.5 8v.01" />
    </svg>
  )
}

/**
 * 全局 Toast 提供器 —— 已与 Aurora 版合并为单一实现（审计 R2 双体系收敛）。
 * 样式单源 = src/aurora/styles/toast.css 的 `.aurora-toast*`（token 化、语义色 currentColor），
 * 支持 info/success/error/warning 四类、多条堆叠、点击关闭、自动移除。
 * Phase 3（2026-09-18）已删除 aurora/app/ToastProvider re-export 壳 ——
 * 原壳是同一 Context 的第二导入源（维护隐患）；AuroraShell 现直引本模块，全站仍同一 Context、同一视觉。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const ui = useUiLabels()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const containerRef = useRef<HTMLDivElement | null>(null)
  /** 上一次布局后各 toast 的视口顶坐标，用于栈重排 FLIP 求位移量 */
  const prevTops = useRef<Map<number, number>>(new Map())

  // 栈重排 FLIP（审计 MO-1，macOS 动效方案 §3.3）：容器底边锚定，新增/移除条目都会让
  // 其余条目整体瞬时位移。这里把位移反向补偿成 transform 再于下一帧释放，
  // 由 toast.css 既有的 `transition: transform` 接住 —— 无需引入 FLIP 库或测量框架。
  useLayoutEffect(() => {
    const box = containerRef.current
    if (!box) return
    const nodes = Array.from(box.querySelectorAll<HTMLElement>('.aurora-toast'))
    const next = new Map<number, number>()
    nodes.forEach((node) => {
      const id = Number(node.dataset.toastId)
      if (!Number.isFinite(id)) return
      const top = node.getBoundingClientRect().top
      next.set(id, top)
      const prevTop = prevTops.current.get(id)
      // 新条目无历史坐标；出场中的条目自有反向 transition；入场动画进行中的条目
      // inline transform 会被 animation 覆盖，一并跳过（避免动画互相打架）。
      if (prevTop === undefined || prevTop === top || node.dataset.exiting === 'true') return
      if ((node.getAnimations?.() ?? []).some((a) => a.playState === 'running')) return
      const dy = prevTop - top
      node.style.transition = 'none'
      node.style.transform = `translateY(${dy}px)`
      requestAnimationFrame(() => {
        node.style.transition = ''
        node.style.transform = ''
      })
    })
    prevTops.current = next
  }, [toasts])

  // 清掉某个 toast 的待触发定时器（入场定时器或出场定时器都可能残留）
  const clearTimer = useCallback((id: number) => {
    const tm = timers.current.get(id)
    if (tm) {
      clearTimeout(tm)
      timers.current.delete(id)
    }
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimer(id)
  }, [clearTimer])

  // 两段式出场（macOS 动效方案 §3.3）：先置 data-exiting 播反向离场 transition，再卸载。
  const requestExit = useCallback(
    (id: number) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
      // 先清掉该 id 可能仍挂着的入场定时器：否则它会稍后再次触发 requestExit，
      // 造成重复出场动画 + 定时器泄漏（token 审查 M3-ToastProvider）
      clearTimer(id)
      const tm = setTimeout(() => remove(id), TOAST_EXIT_MS)
      timers.current.set(id, tm)
    },
    [remove, clearTimer],
  )

  const show = useCallback(
    (msg: string, kind: ToastKind = 'info') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, msg, kind }])
      clearTimer(id) // 防御：同一 id 不应有残留定时器
      const tm = setTimeout(() => requestExit(id), TOAST_DURATION_MS)
      timers.current.set(id, tm)
    },
    [requestExit, clearTimer],
  )

  // 卸载时清掉所有待触发定时器：避免延迟回调在已卸载组件上 setState、以及定时器驻留内存
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((tm) => clearTimeout(tm))
      map.clear()
    }
  }, [])

  // Context 值必须 memo：否则每次 provider 渲染（弹/收 toast 都会改 toasts 状态）都产生
  // 新的对象身份，令所有 useToast() 消费者的依赖（如 AuroraShell 的命令注册 effect）重跑，
  // 造成每次 toast 都全量重注册命令并重渲染面板（审查 M4-AuroraShell）。
  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={containerRef}
        className="aurora-toast-container"
        role="region"
        aria-label={ui.notify}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-toast-id={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`aurora-toast aurora-toast--${t.kind}`}
            data-exiting={t.exiting ? 'true' : undefined}
            onClick={() => requestExit(t.id)}
          >
            <span className="aurora-toast__icon">
              <KindIcon kind={t.kind} />
            </span>
            <span className="aurora-toast__msg">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * 全局 Toast hook。未处于 Provider 内时返回空实现（开发/测试期容错）。
 * 返回的 show 引用稳定，可安全放入 useCallback 依赖数组。
 */
// 无 Provider 时的稳定空实现：模块级常量，避免每次调用返回新对象/新函数造成下游依赖抖动
const EMPTY_TOAST: ToastContextValue = { show: () => {} }

// eslint-disable-next-line react-refresh/only-export-components -- Provider 与配套 hook 强耦合，同文件为 React 惯用形态
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  return ctx ?? EMPTY_TOAST
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUiLabels } from './UiLabels'

export type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** 标题，支持节点；设置后自动生成 aria-labelledby */
  title?: React.ReactNode
  /** 副标题/描述，设置后自动生成 aria-describedby */
  description?: React.ReactNode
  children?: React.ReactNode
  /** 底部操作区（通常为 Button 组） */
  footer?: React.ReactNode
  size?: ModalSize
  /** 点击遮罩关闭，默认 true */
  closeOnOverlayClick?: boolean
  /** 按 ESC 关闭，默认 true */
  closeOnEscape?: boolean
  /** 标题前是否显示品牌强调条 —— 已随 mc 体系退役，保留仅为调用点兼容（不再渲染） */
  /** @deprecated 已随双体系收敛移除，传入将被忽略 */
  accent?: boolean
  className?: string
  contentClassName?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// body 滚动锁引用计数：多个模态/嵌套弹窗叠加时，只有最后一个关闭才真正解锁，
// 避免内层先关就把仍打开的模态也解锁（原实现用 prevOverflow 快照，会错误恢复）。
let bodyScrollLockCount = 0
function lockBodyScroll() {
  bodyScrollLockCount += 1
  document.body.style.overflow = 'hidden'
}
function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
  if (bodyScrollLockCount === 0) document.body.style.overflow = ''
}

/**
 * 退场时长：必须与 components.css 的
 * `.aurora-modal-overlay[data-exiting='true']` 动画时长（--mc-dur-fast = 180ms）一致。
 * 进出不对称（Apple）：入场 420ms 强减速「生长」，退场 180ms 加速离开。
 */
const MODAL_EXIT_MS = 180

/**
 * 统一对话框组件 —— 已整体收敛到 Aurora 体系（审计 R2 双体系收敛）。
 * 样式单源 = src/aurora/styles/components.css 的 `.aurora-modal*`，与 Aurora 原生弹窗 100% 同视觉：
 *   header 40px（14/600 标题 + 右上 ✕ 关闭钮）、描述移正文顶部、body 20px、footer 48px。
 * `accent` 竖条装饰随 mc 体系退役（保留参数仅为调用点兼容，不再渲染）。
 * 行为能力（比 aurora 原生 Modal 更完整，予以保留）：
 * - 通过 portal 渲染到 document.body
 * - role="dialog" + aria-modal，自动绑定 title/description 关系
 * - 打开时锁定 body 滚动、聚焦首个可聚焦元素、Tab 焦点陷阱、ESC/遮罩关闭、关闭后还原焦点
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  contentClassName,
}) => {
  const ui = useUiLabels()
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  // 生命周期相位：closed（未挂载）→ open → exiting（播退场动画，仍在 DOM）→ closed。
  // 关闭不再瞬时卸载，否则精心设计的入场会被硬切收场（审计 P0-2 的对称性收口）。
  const [phase, setPhase] = useState<'open' | 'exiting' | 'closed'>(isOpen ? 'open' : 'closed')

  useEffect(() => {
    if (isOpen) {
      setPhase('open')
      return
    }
    // 只有「开过的」才需要退场；初始就是 closed 的不要误入 exiting
    setPhase((p) => (p === 'open' ? 'exiting' : p))
  }, [isOpen])

  useEffect(() => {
    if (phase !== 'exiting') return
    const t = window.setTimeout(() => setPhase('closed'), MODAL_EXIT_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const getFocusable = useCallback((): HTMLElement[] => {
    const root = panelRef.current
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }, [])

  useEffect(() => {
    if (!isOpen) return
    prevFocus.current = document.activeElement as HTMLElement | null
    lockBodyScroll()

    const raf = requestAnimationFrame(() => {
      const f = getFocusable()
      // 自动聚焦应落在正文/操作区首个控件（如文件名输入框），跳过 header 的 ✕ 关闭钮；
      // 关闭钮仍参与 Tab 焦点陷阱（getFocusable 原样返回）。
      const target = f.find((el) => !el.classList.contains('aurora-modal__close')) ?? f[0]
      if (target) target.focus()
      else panelRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      unlockBodyScroll()
      prevFocus.current?.focus?.()
    }
  }, [isOpen, getFocusable])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key === 'Tab') {
      const f = getFocusable()
      if (f.length === 0) {
        e.preventDefault()
        return
      }
      const first = f[0]
      const last = f[f.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (phase === 'closed') return null

  return createPortal(
    <div
      ref={overlayRef}
      className={`aurora-modal-overlay ${className || ''}`}
      data-exiting={phase === 'exiting' || undefined}
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === overlayRef.current) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'aurora-modal-title' : undefined}
        aria-describedby={description ? 'aurora-modal-desc' : undefined}
        tabIndex={-1}
        className={`aurora-modal aurora-modal--${size} ${contentClassName || ''}`}
      >
        {(title || description) && (
          <header className="aurora-modal__header">
            {title && (
              <h2 id="aurora-modal-title" className="aurora-modal__title">
                {title}
              </h2>
            )}
            <button type="button" className="aurora-modal__close" onClick={onClose} aria-label={ui.close}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
        )}
        <div className="aurora-modal__body">
          {description && (
            <p id="aurora-modal-desc" className="aurora-modal__desc">
              {description}
            </p>
          )}
          {children}
        </div>
        {footer && <footer className="aurora-modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useUiLabels } from './UiLabels'

export interface ConfirmOptions {
  /** 标题；省略时仅展示 message */
  title?: React.ReactNode
  /** 描述/警告内容（必填），自动绑定 aria-describedby */
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  /** danger 用红色确认按钮，用于破坏性操作（删除/覆盖） */
  variant?: 'default' | 'danger'
}

export interface ConfirmContextValue {
  /** 弹出确认对话框，返回 Promise<boolean>；确认=resolve(true)，取消/关闭=resolve(false) */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

/**
 * 命令式确认对话框 Provider（P2#13 可访问性）。
 * 基于 Modal（继承 role="dialog" + aria-modal + 焦点陷阱 + ESC/遮罩关闭），
 * 提供 `useConfirm().confirm()` 命令式调用，返回 Promise<boolean>，
 * 用于逐步替换原生 window.confirm，避免暗黑模式下样式割裂与焦点管理缺失。
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const ui = useUiLabels()
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions }>({
    open: false,
    opts: { message: '' },
  })
  // 当前正在展示的确认项 resolver；队列用于支持「并发 confirm()」——
  // 原实现直接覆盖 resolverRef，第二个并发调用会让前一个 Promise 永不 settle（挂起）。
  const resolverRef = useRef<((v: boolean) => void) | null>(null)
  const queueRef = useRef<Array<{ opts: ConfirmOptions; resolve: (v: boolean) => void }>>([])

  const showFront = useCallback(() => {
    const item = queueRef.current[0]
    if (!item) {
      resolverRef.current = null
      setState((s) => ({ ...s, open: false }))
      return
    }
    resolverRef.current = item.resolve
    setState({ open: true, opts: item.opts })
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      queueRef.current.push({ opts, resolve })
      // 无正在展示的对话框时，立即展示队首；否则入队，待当前项 settle 后再展示
      if (!resolverRef.current) showFront()
    })
  }, [showFront])

  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current
    queueRef.current.shift()
    resolverRef.current = null
    resolve?.(result)
    // 展示下一项（若有）
    showFront()
  }, [showFront])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        isOpen={state.open}
        onClose={() => settle(false)}
        title={state.opts.title}
        description={state.opts.message}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {state.opts.cancelText ?? ui.cancel}
            </Button>
            <Button
              variant={state.opts.variant === 'danger' ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {state.opts.confirmText ?? ui.confirm}
            </Button>
          </>
        }
      >
        {/* message 已通过 Modal description 以 aria-describedby 绑定，无需重复渲染 */}
      </Modal>
    </ConfirmContext.Provider>
  )
}

/**
 * 命令式确认 hook。未处于 Provider 内时返回安全空实现（开发/测试期容错）。
 */
// eslint-disable-next-line react-refresh/only-export-components -- Provider 与配套 hook 强耦合，同文件为 React 惯用形态
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) return { confirm: () => Promise.resolve(false) }
  return ctx
}

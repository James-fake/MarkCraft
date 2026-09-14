import React, { forwardRef, useId } from 'react'
import './ui.css'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 字段标签（可选） */
  label?: React.ReactNode
  /** 错误信息，设置后输入框与标签转为错误态并暴露 aria-invalid */
  error?: string
  /** 辅助说明文字 */
  hint?: string
  /** 左侧附加内容（如图标） */
  leftAddon?: React.ReactNode
  /** 右侧附加内容（如 .md 后缀提示） */
  rightAddon?: React.ReactNode
}

/**
 * 统一文本输入组件 —— 已整体收敛到 Aurora 体系（审计 R2 双体系收敛）。
 * 输入框本体复用 `components.css` 的 `.aurora-input`（28px 桌面密度 / accent 聚焦环 /
 * token 化底色），结构对齐 aurora-input-wrapper + 左右图标插槽 + error 态；
 * label / hint / error 文本层为共享字段形态补充（.aurora-field*，样式在 ui.css，token 化）。
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftAddon, rightAddon, className = '', id, name, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id || name || `aurora-input-${autoId}`
  const descId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="aurora-field">
      {label != null && (
        <label className="aurora-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className={[
          'aurora-input-wrapper',
          leftAddon ? 'aurora-input--with-icon-left' : '',
          rightAddon ? 'aurora-input--with-icon-right' : '',
          error ? 'aurora-input--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leftAddon && <span className="aurora-input__icon-left">{leftAddon}</span>}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={`aurora-input ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          {...rest}
        />
        {rightAddon && <span className="aurora-input__icon-right">{rightAddon}</span>}
      </div>
      {error ? (
        <span id={`${inputId}-err`} className="aurora-field__error">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="aurora-field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  )
})

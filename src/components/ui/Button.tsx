import React, { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'brand'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 视觉变体，默认 secondary（中性描边） */
  variant?: ButtonVariant
  /** 尺寸，默认 md */
  size?: ButtonSize
  /** 图标专用按钮（正方形、无文字内边距） */
  iconOnly?: boolean
  /** 左侧图标 */
  leftIcon?: React.ReactNode
  /** 右侧图标 */
  rightIcon?: React.ReactNode
  /** 占满父容器宽度 */
  block?: boolean
}

/**
 * 统一按钮组件 —— 已整体收敛到 Aurora 体系（审计 R2 双体系收敛）。
 * 样式单源 = src/aurora/styles/components.css 的 `.aurora-btn`（token 化）。
 * 变体映射（保持旧调用点零改动）：
 *   primary/brand → aurora primary（accent 实底主操作；消除 mc 时代蓝/紫双主色分裂）
 *   secondary/ghost/danger → 同名直通
 *   subtle → ghost（aurora 无 subtle：透明底、hover 显底）
 * 尺寸：sm 24 / md 28 / lg 32（桌面密度统一，mc 时代 30/36/42 退役）。
 * 默认 type="button" 避免误触发表单提交，键盘 focus-visible 轮廓由 .aurora-btn 提供。
 */
const VARIANT_MAP: Record<ButtonVariant, string> = {
  primary: 'aurora-btn--primary',
  secondary: 'aurora-btn--secondary',
  ghost: 'aurora-btn--ghost',
  subtle: 'aurora-btn--ghost',
  danger: 'aurora-btn--danger',
  brand: 'aurora-btn--primary',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    leftIcon,
    rightIcon,
    block = false,
    className = '',
    type,
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    'aurora-btn',
    VARIANT_MAP[variant],
    `aurora-btn--${size}`,
    iconOnly ? 'aurora-btn--icon' : '',
    block ? 'aurora-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type={type ?? 'button'} className={classes} {...rest}>
      {leftIcon && <span className="aurora-btn__icon">{leftIcon}</span>}
      {children != null && <span className="aurora-btn__label">{children}</span>}
      {rightIcon && <span className="aurora-btn__icon">{rightIcon}</span>}
    </button>
  )
})

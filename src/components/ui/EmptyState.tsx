import React from 'react'
import { Icon } from './Icon'

export interface EmptyStateProps {
  /** 全局 Icon 名称（线性图标） */
  icon?: string
  /** 主标题 */
  title: string
  /** 辅助说明（可选） */
  description?: string
  /** 操作区（如 CTA 按钮），可选 */
  action?: React.ReactNode
  /** 紧凑模式：用于侧边栏等窄空间 */
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * 统一的引导式空状态组件 —— class 已对齐 Aurora 命名（审计 R2 双体系收敛）。
 * - icon 渲染在柔色圆形底中；标题 + 说明 + 可选 CTA
 * - 样式（src/components/ui/ui.css `.aurora-emptystate*`）全部走 --mc-* token，
 *   深色/玻璃容器（如知识图谱）如需适配，可在外层用同类 CSS 变量覆盖。
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact,
  className,
  style,
}) => {
  return (
    <div
      className={
        'aurora-emptystate' +
        (compact ? ' aurora-emptystate--compact' : '') +
        (className ? ' ' + className : '')
      }
      style={style}
    >
      {icon && (
        <div className="aurora-emptystate__icon">
          <Icon name={icon} size={compact ? 26 : 40} />
        </div>
      )}
      <div className="aurora-emptystate__title">{title}</div>
      {description && <div className="aurora-emptystate__desc">{description}</div>}
      {action && <div className="aurora-emptystate__action">{action}</div>}
    </div>
  )
}

export default EmptyState

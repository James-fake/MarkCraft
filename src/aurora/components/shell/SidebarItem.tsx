import { Icon } from '../../icons'
import type { IconName } from '../../types'

/**
 * Aurora 侧栏导航项组件
 * - 展开态：图标 + 文字 + 可选计数
 * - 收起态：仅图标（方形）
 * - 选中态：左侧 accent 指示条 + 柔和背景
 */
export interface SidebarItemProps {
  /** 图标名称 */
  icon: IconName
  /** 标签文字 */
  label: string
  /** 是否激活/选中 */
  active?: boolean
  /** 右侧计数 */
  count?: number | string
  /** 点击回调 */
  onClick?: () => void
  /** 自定义 className */
  className?: string
}

export function SidebarItem({
  icon,
  label,
  active = false,
  count,
  onClick,
  className = '',
}: SidebarItemProps) {
  const IconComp = Icon[icon]

  return (
    <button
      type="button"
      className={[
        'aurora-sidebar-item',
        active ? 'aurora-sidebar-item--active' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={label}
    >
      <span className="aurora-sidebar-item__icon">
        {IconComp && <IconComp size={20} />}
      </span>
      <span className="aurora-sidebar-item__label">{label}</span>
      {count != null && count !== '' && (
        <span className="aurora-sidebar-item__count">{count}</span>
      )}
    </button>
  )
}

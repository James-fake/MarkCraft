import React from 'react'

/**
 * 统一开关组件 —— Aurora 平行遗留 Badge.tsx（Badge/Checkbox/Switch）收编后的唯一幸存者。
 * Badge / Checkbox 全仓零消费已退役；Switch 被 Aurora Settings 4 处 section 使用，提级为共享单源。
 * 样式单源 = src/aurora/styles/components.css 的 `.aurora-switch*`（与共享 Modal/Button 同一模式）。
 * 行为契约（与退役的平行版逐行一致）：
 *   - 受控（checked）/ 非受控（defaultChecked）双模式
 *   - role="switch" + aria-checked，键盘 空格/回车 切换
 */
export interface SwitchProps {
  /** 是否打开 */
  checked?: boolean
  /** 默认状态 */
  defaultChecked?: boolean
  /** 变化回调 */
  onChange?: (checked: boolean) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义 className */
  className?: string
}

export function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = '',
}: SwitchProps) {
  const isControlled = checked !== undefined
  const [internalOn, setInternalOn] = React.useState(!!defaultChecked)
  const isOn = isControlled ? checked! : internalOn

  const handleClick = () => {
    if (disabled) return
    const val = !isOn
    if (!isControlled) setInternalOn(val)
    onChange?.(val)
  }

  return (
    <div
      role="switch"
      aria-checked={isOn}
      className={[
        'aurora-switch',
        isOn ? 'aurora-switch--on' : '',
        disabled ? 'aurora-switch--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="aurora-switch__thumb" />
    </div>
  )
}

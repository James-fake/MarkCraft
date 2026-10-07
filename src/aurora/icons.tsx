import React from 'react'
import { Icon as UiIcon, iconNames } from '../components/ui/Icon'

type P = { size?: number; className?: string }

// Phase 4 · 4.2（方案 I 全量合并）：Aurora 不再维护独立图标集。
// 全部图标定义已统一并入 components/ui/Icon（单一来源，见其 ICONS 注册表中的
// 「Aurora 图标」分区）；此处仅把其 name 列表派生为 Aurora 既有的
// 「按 key 取组件」记录，所有 `<Icon.xxx />` 调用站点无需改动。
const make = (name: string) => ({ size = 20, className }: P): React.ReactElement => (
  <UiIcon name={name} size={size} className={className} />
)

export const Icon: Record<string, (p: P) => React.ReactElement> = Object.fromEntries(
  (iconNames as readonly string[]).map((name) => [name, make(name)]),
) as Record<string, (p: P) => React.ReactElement>

export type IconName = keyof typeof Icon

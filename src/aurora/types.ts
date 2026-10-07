// ============================================================
// Aurora Design System · 类型定义
// ============================================================

import type { IconName } from './icons'

export type { IconName }

/** 面板组件 Props */
export interface PanelProps {
  nav: (id: string) => void
  toast: (msg: string) => void
  theme?: 'dark' | 'light'
  density?: 'compact' | 'comfortable'
  setTheme?: (t: 'dark' | 'light') => void
  setDensity?: (d: 'compact' | 'comfortable') => void
  catalog?: LaunchCatalog[]
}

/** 功能全景启动台的分类目录 */
export interface LaunchCatalog {
  title: string
  items: { id: string; title: string; icon: IconName }[]
}

/** 面板注册项 */
export interface PanelRegItem {
  title: string
  icon: IconName
  comp: React.ComponentType<PanelProps>
}

/** 密度类型 */
export type Density = 'compact' | 'comfortable'

/** 主题类型 */
export type Theme = 'dark' | 'light'

/** 视图模式（编辑器等） */
export type ViewMode = 'source' | 'split' | 'preview'

/** 尺寸变体 */
export type SizeVariant = 'sm' | 'md' | 'lg'

/** 颜色变体 */
export type ColorVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

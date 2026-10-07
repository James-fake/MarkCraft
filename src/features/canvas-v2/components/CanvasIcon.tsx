/**
 * CanvasIcon —— 兼容别名层
 *
 * 统一矢量图标已提升到全局组件 `src/components/ui/Icon.tsx`（导出 `Icon`）。
 * 本文件仅作为兼容别名存在，供白板模块既有 `import { CanvasIcon } from './CanvasIcon'` 复用，
 * 避免大范围改动。后续白板代码可逐步迁移到 `components/ui` 的 `Icon`。
 */
// eslint-disable-next-line react-refresh/only-export-components -- 别名 re-export 聚合，消费面统一从此入口走
export { Icon as CanvasIcon, iconNames as canvasIconNames, isIconName as isCanvasIconName } from '@components/ui/Icon'
export type { IconName as CanvasIconName } from '@components/ui/Icon'
export { Icon as default } from '@components/ui/Icon'

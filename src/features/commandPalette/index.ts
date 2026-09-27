// commandPalette module - public API (barrel)

export * from './commandCatalog'
// 命令注册表 / 快捷键归一为**零依赖纯模块**，已下沉至 services/command（P1 V6 清零，2026-09-27）：
// aurora/components 通用层不得依赖业务 features，故改由 services 消费；此处仅保留兼容再导出。
export * from '@services/command/commandRegistry'
export * from '@services/command/shortcutFormat'

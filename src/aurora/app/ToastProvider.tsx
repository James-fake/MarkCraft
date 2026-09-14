/**
 * Aurora Toast 提供器 —— 已与共享层 components/ui/ToastProvider 合并为单一实现。
 * 本文件仅作 re-export 兼容旧引用路径（AuroraShell 等 `import './ToastProvider'`），
 * 保证全站共享同一 Context 与同一 aurora-toast 视觉（审计 R2 双体系收敛）。
 */
export { ToastProvider, useToast } from '../../components/ui/ToastProvider'
export type { ToastKind } from '../../components/ui/ToastProvider'

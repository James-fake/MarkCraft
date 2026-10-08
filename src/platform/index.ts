import type { Platform } from './types'
import { browserPlatform } from './browser'

/**
 * 平台单例 —— 业务代码统一从这里取能力。
 *
 * P1 阶段恒为浏览器实现（行为与迁移前完全一致）。
 * P2 接入 Electron 后，在此按运行环境分派到 `electronPlatform`（走 preload 暴露的 IPC），
 * **业务代码无需改动** —— 这正是本层存在的意义。
 */
function resolvePlatform(): Platform {
  // 预留：桌面环境下 window.markcraft 由 preload 注入
  // const desktop = (globalThis as { markcraft?: unknown }).markcraft
  // if (desktop) return electronPlatform
  return browserPlatform
}

export const platform: Platform = resolvePlatform()

export { browserPlatform } from './browser'
export type {
  Platform,
  PlatformKind,
  SaveTarget,
  PickSaveFileOptions,
  FileTypeFilter,
  WindowControls,
} from './types'

import type { Platform } from './types'
import { browserPlatform } from './browser'
import { electronPlatform, initElectronPlatform } from './electron'

/**
 * 平台单例 —— 业务代码统一从这里取能力。
 *
 * 分派依据：`window.markcraft` 由 Electron preload 经 contextBridge 注入，
 * 只有桌面环境存在；jsdom 单测与浏览器 E2E 走 browser 实现。
 * P3 打通 fs、P6 接 Pandoc 时，都只在 `electron.ts` 里补实现，
 * **业务代码无需改动** —— 这正是本层存在的意义。
 */
function resolvePlatform(): Platform {
  const desktop = typeof window !== 'undefined' ? window.markcraft : undefined
  if (!desktop) return browserPlatform
  initElectronPlatform()
  return electronPlatform
}

export const platform: Platform = resolvePlatform()

export { browserPlatform } from './browser'
export { electronPlatform } from './electron'
export type {
  Platform,
  PlatformKind,
  SaveTarget,
  PickSaveFileOptions,
  FileTypeFilter,
  WindowControls,
  DirEntry,
  ReadDirOptions,
  FsAPI,
  FileFilter,
  OpenFileOptions,
  SaveFileOptions,
  DialogAPI,
} from './types'

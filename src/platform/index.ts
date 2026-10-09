import type { Platform } from './types'
import { testPlatform } from './test'
import { electronPlatform, initElectronPlatform } from './electron'

/**
 * 平台单例 —— 业务代码统一从这里取能力。
 *
 * 分派依据：`window.markcraft` 由 Electron preload 经 contextBridge 注入。
 * - 有 → `electronPlatform`：**唯一的产品运行形态**（桌面版）
 * - 无 → `testPlatform`：**仅 jsdom 单测用的替身**（无 fs / 无对话框），不是可发布形态
 *
 * 新增桌面能力只在 `electron.ts` 里补实现，**业务代码无需改动** —— 这正是本层存在的意义。
 */
function resolvePlatform(): Platform {
  const desktop = typeof window !== 'undefined' ? window.markcraft : undefined
  if (!desktop) return testPlatform
  initElectronPlatform()
  return electronPlatform
}

export const platform: Platform = resolvePlatform()

export { testPlatform } from './test'
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
  NetAPI,
  NetFetchInit,
  PandocAPI,
  SetupAPI,
} from './types'

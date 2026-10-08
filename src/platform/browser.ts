import type {
  FileTypeFilter,
  PickSaveFileOptions,
  Platform,
  SaveTarget,
  WindowControls,
} from './types'

/**
 * 浏览器实现 —— **刻意与迁移前行为逐字一致**。
 *
 * P1 阶段的目标是「加抽象、不改行为」：本文件里的每个方法都是对既有调用点逻辑的搬运，
 * 不做任何语义调整。这样 149 个单测与 43 个 E2E 用例必须保持全绿，作为「抽象层未引入回归」的证据。
 */

/** 用户取消选择时 File System Access API 抛 AbortError —— 视为「没选」，不视为错误 */
function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

/** 浏览器没有真实最小化/最大化，全屏是唯一可用的近似 —— 诚实降级，不伪造。 */
const browserWindowControls: WindowControls = {
  minimize() {
    // 网页无真实最小化能力；既有实现为失焦（保持原行为）
    window.blur()
  },
  toggleMaximize() {
    const el = document.documentElement
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void el.requestFullscreen().catch(() => {})
  },
  close() {
    // 网页无法关闭自身窗口（非脚本打开的窗口）→ 交由调用方走确认/回欢迎流程
  },
  isMaximized() {
    return !!document.fullscreenElement
  },
}

export const browserPlatform: Platform = {
  kind: 'browser',

  canPickFiles(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window
  },

  canPickDirectory(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  },

  async pickSaveFile(options: PickSaveFileOptions): Promise<SaveTarget | null> {
    // 刻意不用 `this.canPickFiles()`：避免解构调用（const { pickSaveFile } = platform）时丢 this
    if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) return null
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types as FileTypeFilter[] | undefined,
      })
      return {
        name: handle.name,
        kind: 'file',
        async write(blob: Blob) {
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
        },
      }
    } catch (err: unknown) {
      if (isAbortError(err)) return null
      throw err
    }
  },

  async pickSaveDirectory(): Promise<SaveTarget | null> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) return null
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      return {
        name: handle.name,
        kind: 'directory',
        async write(blob: Blob, filename?: string) {
          if (!filename) throw new Error('向目录写入时必须提供文件名')
          // filename 允许是**相对路径**（如 `posts/foo/index.html`）→ 逐级创建中间目录
          const parts = filename.split('/').filter(Boolean)
          if (parts.length === 0) throw new Error('文件名不可为空')
          let dir = handle
          for (let i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i], { create: true })
          }
          const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(blob)
          await writable.close()
        },
      }
    } catch (err: unknown) {
      if (isAbortError(err)) return null
      throw err
    }
  },

  async saveBlob(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // V6-H1（原实现注释保留）：延迟 revoke，给浏览器下载管理器留出读取 blob 的时间
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },

  async revealInFolder(): Promise<boolean> {
    // 浏览器无法在系统文件管理器中定位文件
    return false
  },

  window: browserWindowControls,
}

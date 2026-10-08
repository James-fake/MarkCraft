import type {
  FileTypeFilter,
  FsAPI,
  NetFetchInit,
  OpenFileOptions,
  PickSaveFileOptions,
  Platform,
  SaveTarget,
  SaveFileOptions,
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

  // —— P3：浏览器无真实磁盘能力，fs 一律拒绝 ——
  fs: makeUnsupportedFs(),

  // —— P3：浏览器无法给出原生绝对路径，dialog 一律返回 null（诚实降级）——
  dialog: {
    async openDirectory(): Promise<string | null> {
      return null
    },
    async openFile(_options?: OpenFileOptions): Promise<string[] | null> {
      return null
    },
    async saveFile(_options?: SaveFileOptions): Promise<string | null> {
      return null
    },
  },

  // —— P6：浏览器直连（仍受 CORS 约束）；调用时读全局 fetch，保证测试桩可替换 ——
  net: {
    fetch(url: string, init?: NetFetchInit): Promise<Response> {
      return fetch(url, init)
    },
  },

  // —— P6.2：浏览器无 Pandoc sidecar（诚实降级：不可用 + 转换返回错误）——
  pandoc: {
    async available(): Promise<boolean> {
      return false
    },
    async convert(): Promise<{ error?: string; buffer?: ArrayBuffer }> {
      return { error: 'Pandoc 仅桌面版可用' }
    },
  },
}

/**
 * 浏览器环境没有真实文件系统：返回一个所有方法都拒绝 `FsAPI` 实现。
 * 拒绝而非静默 no-op —— 防止桌面专属逻辑在浏览器路径被「悄悄吞掉」而产生隐性回归。
 */
function makeUnsupportedFs(): FsAPI {
  const unsupported = (): never => {
    throw new Error('FsAPI 在浏览器环境不可用：请使用 MarkCraft 桌面版以访问本地文件')
  }
  const noop = async (): Promise<never> => unsupported()
  return {
    readDirectory: noop,
    readFile: noop,
    writeFile: noop,
    exists: async () => false,
    stat: noop,
    mkdir: noop,
    rename: noop,
    remove: noop,
    // P4-C：浏览器无文件监听能力 → 返回 no-op 取消函数，调用方代码可双端复用而不抛错
    watch: () => () => {},
  }
}

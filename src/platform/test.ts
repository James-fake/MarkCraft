import type { FsAPI, NetFetchInit, Platform, WindowControls } from './types'

/**
 * **测试替身**（jsdom 单测专用）—— 不是可发布的运行形态。
 *
 * 背景：本项目**只做桌面端**（`electronPlatform` 是唯一产品实现）。但 152 个单测跑在
 * jsdom 里，那里没有 preload 注入的 `window.markcraft`，若没有替身，`platform` 就无从取值，
 * 全部业务代码无法在单测中运行。故保留这一份**最小内存/空实现**，语义刻意与「桌面缺失能力」
 * 对齐（原生对话框 → null、无 fs、无 Pandoc），让「桌面专属分支在非桌面环境下走降级」这件事
 * 依然可被单测覆盖。
 *
 * ⚠️ 不要在这里加任何产品能力（FSA、下载、浏览器窗口控制等）—— 那些是已删除的网页形态。
 */
const noopWindowControls: WindowControls = {
  minimize() {
    /* 无窗口系统 */
  },
  toggleMaximize() {
    /* 无窗口系统 */
  },
  close() {
    /* 无窗口系统 */
  },
  isMaximized() {
    return false
  },
}

/**
 * 无真实文件系统：所有读写方法**拒绝**（而非静默 no-op）。
 * 拒绝是刻意的 —— 防止桌面专属逻辑在非桌面环境被「悄悄吞掉」而产生隐性回归。
 */
function makeUnsupportedFs(): FsAPI {
  const unsupported = (): never => {
    throw new Error('FsAPI 仅桌面版可用（测试替身不提供文件系统）')
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
    watch: () => () => {},
  }
}

export const testPlatform: Platform = {
  kind: 'test',

  canPickFiles(): boolean {
    return false
  },
  canPickDirectory(): boolean {
    return false
  },
  async pickSaveFile() {
    return null
  },
  async pickSaveDirectory() {
    return null
  },
  async saveBlob(): Promise<void> {
    /* 无落盘能力：静默成功，避免测试里因 jsdom 缺 createObjectURL 而炸 */
  },

  async revealInFolder(): Promise<boolean> {
    return false
  },
  async openPath(): Promise<boolean> {
    return false
  },

  window: noopWindowControls,

  fs: makeUnsupportedFs(),

  dialog: {
    async openDirectory(): Promise<string | null> {
      return null
    },
    async openFile(): Promise<string[] | null> {
      return null
    },
    async saveFile(): Promise<string | null> {
      return null
    },
  },

  // 调用时读全局 fetch，保证测试桩（vi.stubGlobal）可替换
  net: {
    fetch(url: string, init?: NetFetchInit): Promise<Response> {
      return fetch(url, init)
    },
  },

  pandoc: {
    async available(): Promise<boolean> {
      return false
    },
    async convert(): Promise<{ error?: string; buffer?: ArrayBuffer }> {
      return { error: 'Pandoc 仅桌面版可用' }
    },
  },

  setup: {
    async defaultVault(): Promise<string | null> {
      return null
    },
  },

  // 无应用目录 → 存储层退回内存后端（单测不落盘）
  app: {
    async userData(): Promise<string | null> {
      return null
    },
  },
}

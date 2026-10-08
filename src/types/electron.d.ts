/**
 * Electron preload 注入的桌面能力契约（实现见 `electron/preload/index.ts`）。
 *
 * ⚠️ 业务代码**不得**直接访问 `window.markcraft` —— 一律经 `@platform`
 * （`src/platform/index.ts`）。这样 jsdom 单测与浏览器 E2E 走 browser 实现，
 * 正式桌面版走 IPC 实现，两者契约一致。
 *
 * 新增能力顺序：① `electron/preload` 加方法 → ② 本文件加契约 →
 * ③ `src/platform/electron.ts` 包装 → ④ 业务代码只经 `@platform`。
 */

export interface MarkCraftWindowControls {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  /** 订阅最大化状态变化；返回取消订阅函数 */
  onStateChanged(cb: (state: { maximized: boolean }) => void): () => void
}

/**
 * Pandoc sidecar（P6 才接线）。
 * 契约先留位：避免 `exportEpub` 再引入第二套 window 全局命名空间。
 */
export interface MarkCraftPandocAPI {
  convert(content: string, fromFormat: string, toFormat: string): Promise<{
    error?: string
    buffer?: ArrayBuffer
  }>
}

/** 目录项（fs.readDirectory 的返回元素） */
export interface MarkCraftDirEntry {
  /** 文件名（不含路径） */
  name: string
  /** 绝对路径 */
  path: string
  isDirectory: boolean
  isFile: boolean
  /** 字节大小（目录为 0） */
  size: number
  /** 最后修改时间（ms 时间戳） */
  mtimeMs: number
}

export interface MarkCraftReadDirOptions {
  /** 递归读取子目录（默认 false）；递归时跳过隐藏目录（以 `.` 开头） */
  recursive?: boolean
}

/** 文件类型过滤（对齐 Electron dialog 的 filters） */
export interface MarkCraftFileFilter {
  name: string
  extensions: string[]
}

export interface MarkCraftOpenFileOptions {
  filters?: MarkCraftFileFilter[]
  /** 允许多选（默认 false） */
  multiple?: boolean
}

export interface MarkCraftSaveFileOptions {
  defaultPath?: string
  filters?: MarkCraftFileFilter[]
}

/**
 * 真实文件系统能力（P3 接入）。
 * 全部走主进程 IPC —— 渲染进程无法直接触达磁盘。
 */
export interface MarkCraftFsAPI {
  readDirectory(path: string, options?: MarkCraftReadDirOptions): Promise<MarkCraftDirEntry[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<MarkCraftDirEntry>
  mkdir(path: string): Promise<void>
  rename(path: string, newPath: string): Promise<void>
  remove(path: string): Promise<void>
  /**
   * 监听目录（递归，跨平台差异见 `electron/main/index.ts#bindFsWatchIpc` 注释）。
   * 事件经 per-path 去抖 200ms 过滤后回调；隐藏目录内的改动不会触发回调。
   * 返回**取消订阅**函数 —— 调用后停止监听并解绑 IPC。
   */
  watch(
    root: string,
    onEvent: (event: { type: 'create' | 'change' | 'delete'; path: string }) => void,
  ): () => void
}

/** 原生对话框（选文件 / 选目录 / 保存） */
export interface MarkCraftDialogAPI {
  /** 选一个文件夹（读意图），返回绝对路径或 null（取消） */
  openDirectory(): Promise<string | null>
  /** 选一个或多个文件（读意图），返回路径数组或 null（取消） */
  openFile(options?: MarkCraftOpenFileOptions): Promise<string[] | null>
  /** 选一个保存路径（写意图），返回绝对路径或 null（取消） */
  saveFile(options?: MarkCraftSaveFileOptions): Promise<string | null>
}

/** 系统 shell 集成 */
export interface MarkCraftShellAPI {
  /** 在系统文件管理器中定位文件（「打开原文件所在位置」） */
  showItemInFolder(path: string): Promise<boolean>
}

export interface MarkCraftDesktopAPI {
  window: MarkCraftWindowControls
  fs: MarkCraftFsAPI
  dialog: MarkCraftDialogAPI
  shell: MarkCraftShellAPI
  pandoc?: MarkCraftPandocAPI
}

declare global {
  interface Window {
    markcraft?: MarkCraftDesktopAPI
  }
}

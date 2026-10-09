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
 * Pandoc sidecar（P6.2）。
 * 二进制由 `npm run fetch:pandoc` 下到 `resources/pandoc/<platform>/`，打包时随
 * `extraResources` 进入 `process.resourcesPath/pandoc/`；主进程解析「打包内 → 开发态
 * → 系统 PATH」。不可用时 `available()` 返回 false、`convert()` 返回 `error`，
 * 调用方（exportEpub）据此回退内置 EPUB 生成器。
 */
export interface MarkCraftPandocAPI {
  /** Pandoc 是否可用（探测 `pandoc --version`） */
  available(): Promise<boolean>
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
  /** 用系统默认应用打开路径（目录 → 文件管理器；用于「打开当前存储位置」） */
  openPath(path: string): Promise<boolean>
}

/** 主进程网络请求参数（P6：渲染端 → 主进程代理，绕过 CORS） */
export interface MarkCraftNetRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  /** 文本请求体（与 bodyBytes 二选一） */
  bodyText?: string
  /** 二进制请求体（结构化克隆，保留字节） */
  bodyBytes?: Uint8Array
  /** 超时（毫秒），主进程用 AbortSignal.timeout 执行 */
  timeoutMs?: number
}

/** 主进程网络响应（P6） */
export interface MarkCraftNetResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  /** 响应体字节（渲染端据此构造标准 Response，二进制安全） */
  body: Uint8Array
  url: string
}

/**
 * 主进程网络代理（P6）。渲染进程是 Chromium（受 CORS 约束），主进程是 Node（不受）——
 * 跨域 API（GitHub / Vercel / Cloudflare 等）经此发出即不被拦。
 */
export interface MarkCraftNetAPI {
  fetch(req: MarkCraftNetRequest): Promise<MarkCraftNetResponse>
}

/**
 * 安装向导设置的默认存储位置。
 * 安装包把用户选的路径写到 `dirname(process.resourcesPath)/default-vault.txt`；
 * 主进程读取并做多编码探测 + 目录存在性校验，取不到则返回 null（优雅降级）。
 */
export interface MarkCraftSetupAPI {
  /** 安装时选择的默认 Vault 路径；未设置/不可用 → null */
  defaultVault(): Promise<string | null>
}

export interface MarkCraftDesktopAPI {
  window: MarkCraftWindowControls
  fs: MarkCraftFsAPI
  dialog: MarkCraftDialogAPI
  shell: MarkCraftShellAPI
  net: MarkCraftNetAPI
  setup: MarkCraftSetupAPI
  pandoc?: MarkCraftPandocAPI
}

declare global {
  interface Window {
    markcraft?: MarkCraftDesktopAPI
  }
}

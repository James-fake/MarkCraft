/**
 * 平台抽象层 —— 类型契约。
 *
 * 目的：让 renderer 侧的业务代码**不直接依赖**具体运行环境（浏览器 / Electron）。
 * 三条收益：
 *  1. 桌面化（Electron）接入时只加一个实现，不必满仓库改 if；
 *  2. 单测（jsdom）与 E2E（真实浏览器）走 `browser` 实现，无需 Electron 环境；
 *  3. 浏览器专属能力（File System Access API / 下载 / 全屏）有唯一收敛点。
 *
 * ⚠️ 铁律：业务代码不得直接访问 `window.showSaveFilePicker` / `window.markcraft`，
 *    一律经 `@platform`。新增平台能力时先在本文件加契约，再加实现。
 */

/** 运行环境种类 */
export type PlatformKind = 'browser' | 'electron'

/** 保存对话框的文件类型过滤（对齐 File System Access API 的 `types`） */
export interface FileTypeFilter {
  description: string
  /** MIME → 扩展名数组，如 `{ 'text/markdown': ['.md'] }` */
  accept: Record<string, string[]>
}

export interface PickSaveFileOptions {
  suggestedName?: string
  types?: FileTypeFilter[]
}

/**
 * 一个**已选定**的写入目标。
 *
 * 之所以不直接暴露 `FileSystemFileHandle`：桌面环境下没有这个对象（拿到的是原生路径），
 * 故用「能写入」这一最小语义做抽象，两种环境各自实现。
 */
export interface SaveTarget {
  /** 展示名：file 目标为文件名，directory 目标为目录名 */
  name: string
  kind: 'file' | 'directory'
  /**
   * 写入内容。
   * - `kind: 'file'` → 忽略 `filename`，直接写入该文件；
   * - `kind: 'directory'` → 必须给 `filename`，在其中创建（或覆盖）该文件；
   *   `filename` 允许是**相对路径**（如 `posts/foo/index.html`），中间目录会被自动创建。
   */
  write(blob: Blob, filename?: string): Promise<void>
}

/** 窗口控制。浏览器为「诚实降级」，桌面为真实窗口操作。 */
export interface WindowControls {
  /** 最小化。浏览器无此能力 → 降级为失焦（不伪造）。 */
  minimize(): void
  /** 最大化 / 还原。浏览器降级为全屏切换。 */
  toggleMaximize(): void
  /** 关闭窗口。浏览器无此能力 → 交由调用方走确认流程。 */
  close(): void
  /** 当前是否已最大化（浏览器以全屏态近似）。 */
  isMaximized(): boolean
}

/** 目录项（fs.readDirectory 的返回元素） */
export interface DirEntry {
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

export interface ReadDirOptions {
  /** 递归读取子目录（默认 false）；递归时跳过隐藏目录（以 `.` 开头） */
  recursive?: boolean
  /**
   * 递归读取时是否纳入隐藏目录（默认 false）。
   * P3 默认跳过 `.git` / `.markcraft` 等，避免万级文件 Vault 误扫；P4 需要时可开。
   */
  includeHidden?: boolean
}

/**
 * 真实文件系统能力（P3 接入，桌面为真实磁盘；浏览器无磁盘能力 → 抛不支持）。
 *
 * ⚠️ 语义契约（桌面实现必须逐条对齐，browser.test 不覆盖此处，P3 E2E 覆盖）：
 *  - writeFile 必须**原子**（临时文件 + rename），避免崩溃留下半截文件；
 *  - writeFile 的父目录不存在时自动创建（recursive）；
 *  - readDirectory 返回项含 `isDirectory` / `isFile` / 绝对 `path`；
 *  - exists 对不存在路径返回 false 而非抛错。
 *  - watch 跨平台差异（Windows ✓ / macOS Node 20+ ✓ / Linux 顶层 only）由
 *    桌面实现内部吸收；业务只看到「对目录改动回调」，调用方据此 reload。
 */
export interface FsAPI {
  readDirectory(path: string, options?: ReadDirOptions): Promise<DirEntry[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<DirEntry>
  mkdir(path: string): Promise<void>
  rename(path: string, newPath: string): Promise<void>
  remove(path: string): Promise<void>
  /**
   * 递归监听目录改动。返回**取消订阅**函数。
   * 浏览器无此能力 → 立即返回 no-op 取消函数（不抛错，让调用方代码可双端复用）。
   * type 语义：'create' = 目录新增/重命名入；'change' = .md 内容改；'delete' = 路径消失。
   */
  watch(
    root: string,
    onEvent: (event: { type: 'create' | 'change' | 'delete'; path: string }) => void,
  ): () => void
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenFileOptions {
  filters?: FileFilter[]
  /** 允许多选（默认 false） */
  multiple?: boolean
}

export interface SaveFileOptions {
  defaultPath?: string
  filters?: FileFilter[]
}

/** 原生对话框（选文件 / 选目录 / 保存）。浏览器无原生路径能力 → 一律返回 null。 */
export interface DialogAPI {
  /** 选一个文件夹（读意图，如「打开 Vault」），返回绝对路径或 null（取消） */
  openDirectory(): Promise<string | null>
  /** 选一个或多个文件（读意图），返回路径数组或 null（取消） */
  openFile(options?: OpenFileOptions): Promise<string[] | null>
  /** 选一个保存路径（写意图），返回绝对路径或 null（取消） */
  saveFile(options?: SaveFileOptions): Promise<string | null>
}

export interface Platform {
  readonly kind: PlatformKind

  /** 是否具备「原生文件选择 / 保存」能力（浏览器 = File System Access API 可用） */
  canPickFiles(): boolean

  /**
   * 是否具备「目录选择」能力（浏览器 = `showDirectoryPicker` 可用）。
   * 与 `canPickFiles` 分开：两者在部分环境下并不同时可用，混用会误报能力。
   */
  canPickDirectory(): boolean

  /** 选一个保存文件；用户取消或能力不可用时返回 `null` */
  pickSaveFile(options: PickSaveFileOptions): Promise<SaveTarget | null>

  /** 选一个目录作为写入目标；用户取消或能力不可用时返回 `null` */
  pickSaveDirectory(): Promise<SaveTarget | null>

  /**
   * 保存一个二进制产物。
   * - 浏览器：触发下载（当前既有行为）
   * - 桌面：弹原生保存对话框并写入磁盘
   */
  saveBlob(blob: Blob, filename: string): Promise<void>

  /**
   * 在系统文件管理器中定位文件（桌面专属）。
   * 浏览器无此能力 → 返回 `false`（调用方据此决定是否提示）。
   */
  revealInFolder(path: string): Promise<boolean>

  readonly window: WindowControls

  /**
   * 真实文件系统（P3）。浏览器无磁盘能力 → 所有方法拒绝。
   * 桌面端由 `electronPlatform` 经 IPC 实现。
   */
  readonly fs: FsAPI

  /**
   * 原生对话框（P3）。浏览器无法给出原生绝对路径 → 一律返回 `null`
   * （诚实降级：不伪造路径，调用方据此提示「请升级桌面版」或走 FSA 落盘）。
   */
  readonly dialog: DialogAPI
}

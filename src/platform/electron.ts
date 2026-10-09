import { browserPlatform } from './browser'
import type { DialogAPI, FsAPI, NetAPI, NetFetchInit, Platform, WindowControls } from './types'
import type {
  MarkCraftDesktopAPI,
  MarkCraftDirEntry,
  MarkCraftOpenFileOptions,
  MarkCraftSaveFileOptions,
} from '../types/electron'

/**
 * Electron 实现（P2 骨架）。
 *
 * 本阶段**只有窗口控制**走真实 IPC；文件选择 / 保存 / reveal 仍回落 `browserPlatform`，
 * 待 P3 打通 fs 后逐个替换 —— 这样 P2 可以先落地骨架而不阻塞任何既有能力。
 *
 * ⚠️ 与 `browserPlatform` 的语义必须逐条对齐（契约测试见 `browser.test.ts`）：
 * 取消返回 null、非取消错误上抛、目录写入支持嵌套相对路径。
 */

function api(): MarkCraftDesktopAPI | undefined {
  if (typeof window === 'undefined') return undefined
  return window.markcraft
}

/**
 * 最大化状态快照。
 * 契约 `WindowControls.isMaximized()` 是**同步**的，而 IPC 是异步的 → 这里维护
 * 一份由「主进程事件推送 + 首次查询」更新的快照。用户把窗口拖到屏幕边缘触发的
 * 最大化也能被推送覆盖。
 */
let maximizedSnapshot = false

function refreshMaximized(): void {
  const a = api()
  if (!a) return
  void a.window
    .isMaximized()
    .then((v) => {
      maximizedSnapshot = v
    })
    .catch(() => {
      /* 查询失败保持上一次快照，不打断 UI */
    })
}

const desktopWindowControls: WindowControls = {
  minimize() {
    void api()?.window.minimize().catch(() => {})
  },
  toggleMaximize() {
    void api()
      ?.window.toggleMaximize()
      .then(refreshMaximized)
      .catch(() => {})
  },
  close() {
    void api()?.window.close().catch(() => {})
  },
  isMaximized() {
    return maximizedSnapshot
  },
}

/** 建立最大化状态订阅（应在平台分派时调用一次） */
export function initElectronPlatform(): void {
  const a = api()
  if (!a) return
  a.window.onStateChanged((s) => {
    maximizedSnapshot = s.maximized
  })
  refreshMaximized()
}

/**
 * 真实 fs 实现 —— 全部经 preload 的 `window.markcraft.fs`（主进程磁盘访问）。
 * 语义严格对齐 `FsAPI` 契约：原子写、自动建父目录、exists 不抛。
 */
const desktopFs: FsAPI = {
  readDirectory(path: string, options?: { recursive?: boolean; includeHidden?: boolean }) {
    return (api()?.fs.readDirectory(path, options) as Promise<MarkCraftDirEntry[]>) ?? Promise.reject(new Error('fs 不可用'))
  },
  readFile(path: string) {
    return api()?.fs.readFile(path) ?? Promise.reject(new Error('fs 不可用'))
  },
  writeFile(path: string, content: string) {
    return api()?.fs.writeFile(path, content) ?? Promise.reject(new Error('fs 不可用'))
  },
  exists(path: string) {
    return api()?.fs.exists(path) ?? Promise.resolve(false)
  },
  stat(path: string) {
    return api()?.fs.stat(path) ?? Promise.reject(new Error('fs 不可用'))
  },
  mkdir(path: string) {
    return api()?.fs.mkdir(path) ?? Promise.reject(new Error('fs 不可用'))
  },
  rename(path: string, newPath: string) {
    return api()?.fs.rename(path, newPath) ?? Promise.reject(new Error('fs 不可用'))
  },
  remove(path: string) {
    return api()?.fs.remove(path) ?? Promise.reject(new Error('fs 不可用'))
  },
  // P4-C：文件监听 → 委托 preload；返回取消订阅函数。
  watch(
    root: string,
    onEvent: (event: { type: 'create' | 'change' | 'delete'; path: string }) => void,
  ): () => void {
    const a = api()
    if (!a?.fs.watch) return () => {}
    return a.fs.watch(root, onEvent)
  },
}

/** 原生对话框（读意图选目录/文件、写意图选保存路径） */
const desktopDialog: DialogAPI = {
  openDirectory() {
    return api()?.dialog.openDirectory() ?? Promise.resolve(null)
  },
  openFile(options?: { filters?: import('./types').FileFilter[]; multiple?: boolean }) {
    const opts = options as MarkCraftOpenFileOptions | undefined
    return api()?.dialog.openFile(opts) ?? Promise.resolve(null)
  },
  saveFile(options?: { defaultPath?: string; filters?: import('./types').FileFilter[] }) {
    const opts = options as MarkCraftSaveFileOptions | undefined
    return api()?.dialog.saveFile(opts) ?? Promise.resolve(null)
  },
}

/**
 * 主进程网络代理（P6）。把标准 `RequestInit` 归一化为可 IPC 传递的形态，
 * 主进程执行后返回标准 `Response` —— 调用方零改动。
 * 不支持的 body 形态（FormData 等）回退渲染端 `fetch`，行为与迁移前逐字一致。
 */
const desktopNet: NetAPI = {
  async fetch(url: string, init?: NetFetchInit): Promise<Response> {
    const a = api()
    if (!a?.net) return fetch(url, init)

    const { method, headers, body, timeoutMs } = init ?? {}
    let bodyText: string | undefined
    let bodyBytes: Uint8Array | undefined
    if (typeof body === 'string') {
      bodyText = body
    } else if (body instanceof Uint8Array) {
      bodyBytes = body
    } else if (body instanceof ArrayBuffer) {
      bodyBytes = new Uint8Array(body)
    } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
      bodyBytes = new Uint8Array(await body.arrayBuffer())
    } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
      bodyText = body.toString()
    } else if (body != null) {
      return fetch(url, init) // 其它形态（如 FormData）→ 回退渲染端
    }

    const h: Record<string, string> = {}
    if (headers) new Headers(headers).forEach((v, k) => { h[k] = v })

    const r = await a.net.fetch({ url, method, headers: h, bodyText, bodyBytes, timeoutMs })
    // 204/205/304 是「无 body」状态码，构造 Response 时不能带 body
    const nullBody = r.status === 204 || r.status === 205 || r.status === 304
    return new Response(nullBody ? null : (r.body as unknown as BodyInit), {
      status: r.status,
      statusText: r.statusText,
      headers: r.headers,
    })
  },
}

export const electronPlatform: Platform = {
  ...browserPlatform,
  kind: 'electron',
  window: desktopWindowControls,
  // 真实文件系统（P3）
  fs: desktopFs,
  dialog: desktopDialog,
  // 主进程网络代理（P6）
  net: desktopNet,
  // Pandoc sidecar（P6.2）：委托 preload；不可用时回退 browser 的「不可用」实现
  pandoc: {
    async available(): Promise<boolean> {
      return (await api()?.pandoc?.available()) ?? false
    },
    async convert(content: string, fromFormat: string, toFormat: string) {
      const a = api()
      if (!a?.pandoc) return { error: 'Pandoc 不可用' }
      return a.pandoc.convert(content, fromFormat, toFormat)
    },
  },
  // 安装向导的默认存储位置：委托 preload（无则 null）
  setup: {
    async defaultVault(): Promise<string | null> {
      return (await api()?.setup?.defaultVault()) ?? null
    },
  },
  // 真实「打开原文件所在位置」（D3）
  async revealInFolder(path: string): Promise<boolean> {
    return (await api()?.shell.showItemInFolder(path)) ?? false
  },
}

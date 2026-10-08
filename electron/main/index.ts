/**
 * Electron 主进程。
 *
 * P2 骨架职责：创建**无边框**窗口（标题栏由应用自绘，见 `TitleBar`）、注入 preload、
 * 绑定窗口控制 IPC。P3 起在此补齐 fs / reveal 等文件能力。
 *
 * ⚠️ 安全基线：`contextIsolation: true` + `nodeIntegration: false`，渲染进程**只能**
 * 通过 preload 用 `contextBridge` 暴露的白名单 API 触达系统能力。
 * ⚠️ 渲染进程地址：`--dist` 或打包态走 `dist/index.html`，否则走 Vite dev server。
 */
import { app, BrowserWindow, ipcMain, shell, dialog, type IpcMainInvokeEvent } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, watch, statSync } from 'node:fs'
import { promises as fsp } from 'node:fs'

/**
 * ⚠️ 主进程必须走 ESM：Electron 新版（本项目为 v44）在 CJS 模式下
 * `require('electron')` 会解析到 `node_modules/electron/index.js`（其 exports 是
 * 可执行文件的**路径字符串**），导致 `app` / `BrowserWindow` 全为 undefined。
 * 因此本文件以 ES module 输出（`out/main/index.mjs`），`import 'electron'` 才能
 * 拿到内置模块。路径也因此不能用 `__dirname`，改用 import.meta。
 */
const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * 受限环境开关：沙箱 / CI / 无 GPU 的远程桌面里 GPU 进程会崩溃，进而导致
 * **整个应用退出**（`FATAL: GPU process isn't usable`）。
 * 这类环境用 `MARKCRAFT_DISABLE_GPU=1` 启动即可改为软件渲染。
 */
if (process.env.MARKCRAFT_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration()
  // 仅关硬件加速还不够：Chromium 仍会拉起 GPU 进程并在受限环境崩溃
  // （`FATAL: GPU process isn't usable` → 渲染进程 Target crashed）。
  for (const flag of ['disable-gpu', 'disable-gpu-compositing', 'disable-software-rasterizer']) {
    app.commandLine.appendSwitch(flag)
  }
}
// Chromium sandbox 在部分受限容器 / 沙箱里也会导致渲染进程崩溃
if (process.env.MARKCRAFT_NO_SANDBOX === '1') {
  app.commandLine.appendSwitch('no-sandbox')
}

/**
 * Vite dev server 地址。
 * ⚠️ 刻意用 127.0.0.1 而非 localhost：后者在部分环境解析到 ::1，而 Vite 默认只监听
 * IPv4，会导致 Electron 连不上而白屏（且报错不直观）。
 */
const DEV_SERVER_URL = process.env.MARKCRAFT_DEV_SERVER_URL || 'http://127.0.0.1:5173'
/** 生产渲染产物：`out/main/index.mjs` → `../../dist/index.html` */
const DIST_INDEX = join(HERE, '../../dist/index.html')

type RendererTarget = { kind: 'url'; url: string } | { kind: 'file'; file: string }

function resolveRendererTarget(): RendererTarget {
  const packaged = app.isPackaged || process.argv.includes('--dist')
  if (!packaged) return { kind: 'url', url: DEV_SERVER_URL }
  // 兜底：没构建过就退到 dev server，避免「白屏且原因不明」
  if (!existsSync(DIST_INDEX)) return { kind: 'url', url: DEV_SERVER_URL }
  return { kind: 'file', file: DIST_INDEX }
}

function windowOf(e: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender)
}

/** 窗口控制（真实 API，替代浏览器侧的「失焦 / 全屏」降级） */
function bindWindowIpc(): void {
  ipcMain.handle('mc:window:minimize', (e) => {
    windowOf(e)?.minimize()
  })

  ipcMain.handle('mc:window:toggle-maximize', (e) => {
    const win = windowOf(e)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return true
  })

  ipcMain.handle('mc:window:close', (e) => {
    windowOf(e)?.close()
  })

  ipcMain.handle('mc:window:is-maximized', (e) => windowOf(e)?.isMaximized() ?? false)
}

/** 把 node:fs 的 Dirent 规整成渲染进程约定的 DirEntry */
async function toDirEntry(fullPath: string): Promise<{
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  size: number
  mtimeMs: number
}> {
  const st = await fsp.stat(fullPath)
  return {
    name: fullPath.split(/[\\/]/).pop() ?? fullPath,
    path: fullPath,
    isDirectory: st.isDirectory(),
    isFile: st.isFile(),
    size: st.size,
    mtimeMs: st.mtimeMs,
  }
}

/** 文件系统（P3）：读目录树、读写文件、原子写、exists、stat、mkdir、rename、remove */
function bindFsIpc(): void {
  ipcMain.handle('mc:fs:readDir', async (_e, root: string, options?: { recursive?: boolean; includeHidden?: boolean }) => {
    const entries = await fsp.readdir(root, { withFileTypes: true })
    const top = await Promise.all(entries.map((d) => toDirEntry(join(root, d.name))))
    if (!options?.recursive) return top
    // 递归：跳过隐藏目录（除非显式要求），避免 .git/.markcraft 误扫拖垮大 Vault
    const out: Awaited<ReturnType<typeof toDirEntry>>[] = [...top]
    const stack = top.filter((d) => d.isDirectory && (options.includeHidden || !d.name.startsWith('.')))
    while (stack.length > 0) {
      const dir = stack.pop()!
      const children = await fsp.readdir(dir.path, { withFileTypes: true })
      for (const c of children) {
        const child = await toDirEntry(join(dir.path, c.name))
        out.push(child)
        if (child.isDirectory && (options.includeHidden || !child.name.startsWith('.'))) stack.push(child)
      }
    }
    return out
  })

  ipcMain.handle('mc:fs:readFile', async (_e, p: string) => {
    return await fsp.readFile(p, 'utf-8')
  })

  ipcMain.handle('mc:fs:writeFile', async (_e, p: string, content: string) => {
    // 原子写：先写临时文件再 rename，避免崩溃留下半截文件（计划 §2.3.3）
    await fsp.mkdir(dirname(p), { recursive: true })
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`
    await fsp.writeFile(tmp, content, 'utf-8')
    await fsp.rename(tmp, p)
  })

  ipcMain.handle('mc:fs:exists', async (_e, p: string) => {
    try {
      await fsp.access(p)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('mc:fs:stat', async (_e, p: string) => toDirEntry(p))

  ipcMain.handle('mc:fs:mkdir', async (_e, p: string) => {
    await fsp.mkdir(p, { recursive: true })
  })

  ipcMain.handle('mc:fs:rename', async (_e, p: string, newPath: string) => {
    await fsp.rename(p, newPath)
  })

  ipcMain.handle('mc:fs:remove', async (_e, p: string) => {
    await fsp.rm(p, { recursive: true, force: true })
  })

  // 「打开原文件所在位置」（D3）：showItemInFolder 在路径不存在时不应崩
  ipcMain.handle('mc:fs:reveal', async (_e, p: string) => {
    if (!existsSync(p)) return false
    try {
      shell.showItemInFolder(p)
      return true
    } catch {
      return false
    }
  })
}

// —— P4-C：文件监听（外部改动可感知）——
// 用 Node 内置 `fs.watch(root, {recursive:true})`，零依赖：
//   - Windows：✓ 自 Node 8+ 原生支持（ReadDirectoryChangesW）
//   - macOS ：✓ Node 20+（FSEvents 启用 recursive）
//   - Linux ：⚠️ inotify 不支持递归，仅顶层；接受此限制并文档化
// 事件去抖：per-path 200ms（外部短时 burst 合并），过滤 .md + 目录 + 跳隐藏段。
type FsWatchKind = 'create' | 'change' | 'delete'
interface FsWatchEvent { type: FsWatchKind; path: string }
interface FsWatchRecord {
  watcher: import('node:fs').FSWatcher
  debounce: Map<string, NodeJS.Timeout>
  send: (payload: FsWatchEvent) => void
}
const fsWatchers = new Map<string, FsWatchRecord>()

function isUnderHidden(fullPath: string): boolean {
  return fullPath.split(/[\\/]/).some((seg) => seg.startsWith('.'))
}

function classifyAndSend(rec: FsWatchRecord, fullPath: string): void {
  if (isUnderHidden(fullPath)) return
  let type: FsWatchKind
  if (!existsSync(fullPath)) {
    type = 'delete'
  } else {
    let isDir = false
    try { isDir = statSync(fullPath).isDirectory() } catch { return }
    type = isDir ? 'create' : 'change'
    if (!isDir && !fullPath.toLowerCase().endsWith('.md')) return
  }
  rec.send({ type, path: fullPath })
}

function bindFsWatchIpc(): void {
  ipcMain.handle('mc:fs:watch', (e, root: string) => {
    if (typeof root !== 'string' || !root) throw new Error('watch root required')
    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const wc = e.sender
    const send = (payload: FsWatchEvent) => {
      if (wc.isDestroyed()) return
      wc.send('mc:fs:watch', payload)
    }
    const debounce = new Map<string, NodeJS.Timeout>()
    // recursive: true 跨平台差异见函数头注释
    const watcher = watch(root, { recursive: true }, (_evt, filename) => {
      if (!filename) return
      const fullPath = join(root, filename)
      const prev = debounce.get(fullPath)
      if (prev) clearTimeout(prev)
      const t = setTimeout(() => {
        debounce.delete(fullPath)
        classifyAndSend(rec, fullPath)
      }, 200)
      debounce.set(fullPath, t)
    })
    const rec: FsWatchRecord = { watcher, debounce, send }
    fsWatchers.set(id, rec)
    // 渲染端销毁（窗口关闭）→ 顺手回收监听，避免泄漏
    wc.once('destroyed', () => {
      const r = fsWatchers.get(id)
      if (!r) return
      r.watcher.close()
      r.debounce.forEach((t) => clearTimeout(t))
      fsWatchers.delete(id)
    })
    return id
  })

  ipcMain.handle('mc:fs:unwatch', (_e, id: string) => {
    const r = fsWatchers.get(id)
    if (!r) return
    r.watcher.close()
    r.debounce.forEach((t) => clearTimeout(t))
    fsWatchers.delete(id)
  })
}

/** 原生对话框（P3）：选目录 / 选文件 / 保存 */
function bindDialogIpc(): void {
  // showOpenDialog/showSaveDialog 的首参是必需的 BaseWindow；无窗口时走「仅 options」重载
  const firstWin = (): BrowserWindow | undefined => BrowserWindow.getAllWindows()[0]

  ipcMain.handle('mc:dialog:openDirectory', async () => {
    const win = firstWin()
    const res = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })

  ipcMain.handle('mc:dialog:openFile', async (_e, options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean }) => {
    const win = firstWin()
    const opts = {
      properties: (options?.multiple ? ['openFile', 'multiSelections'] : ['openFile']) as Array<'openFile' | 'multiSelections'>,
      filters: options?.filters?.map((f) => ({ name: f.name, extensions: f.extensions })),
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths
  })

  ipcMain.handle('mc:dialog:saveFile', async (_e, options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
    const win = firstWin()
    const opts = {
      defaultPath: options?.defaultPath,
      filters: options?.filters?.map((f) => ({ name: f.name, extensions: f.extensions })),
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    return res.filePath
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 620,
    // 无边框：标题栏由 Aurora TitleBar 自绘（P2 的窗口控制按钮因此必须真实生效）
    frame: false,
    backgroundColor: '#101218',
    // ready-to-show 后再显示，避免启动白屏闪烁
    show: false,
    webPreferences: {
      /**
       * ⚠️ preload 必须输出 **CJS**：Electron 的 preload 加载器对 `.mjs`（ESM）支持
       * 不完整 —— 实测 ESM preload 不会被注入，导致 `window.markcraft` 为 undefined。
       * 主进程则相反，必须 ESM（见文件顶部说明）。
       */
      preload: join(HERE, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })

  // 最大化状态主动推送：用户双击标题栏 / 拖到屏幕边缘也会触发，渲染进程才能同步图标
  const pushState = () => win.webContents.send('mc:window:state', { maximized: win.isMaximized() })
  win.on('maximize', pushState)
  win.on('unmaximize', pushState)

  win.once('ready-to-show', () => win.show())

  const target = resolveRendererTarget()
  if (target.kind === 'url') {
    // 明确报错：dev 模式最常见的失败是「忘了起 Vite dev server」
    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[MarkCraft] 渲染进程加载失败（${code} ${desc}）：${url}`)
      if (url.startsWith(DEV_SERVER_URL)) {
        console.error(`[MarkCraft] 请先在另一个终端运行 \`npm run dev\`，确保 ${DEV_SERVER_URL} 可访问。`)
      }
    })
    void win.loadURL(target.url)
  } else {
    void win.loadFile(target.file)
  }

  if (process.env.MARKCRAFT_OPEN_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' })
}

void app.whenReady().then(() => {
  bindWindowIpc()
  bindFsIpc()
  bindFsWatchIpc()
  bindDialogIpc()
  createWindow()

  app.on('activate', () => {
    // macOS 上点 Dock 图标重建窗口；Windows/Linux 无需
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

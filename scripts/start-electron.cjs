/**
 * 启动 Electron（跨平台，且修正环境变量）。
 *
 * 为什么需要这个脚本，而不是直接写 `electron .`：
 *
 * 1. **`ELECTRON_RUN_AS_NODE`** —— 某些环境（IDE 终端、Node 版本管理器、容器）会
 *    把它设为 `1`，Electron 便退化为**纯 Node 进程**：不起窗口、且 `app` /
 *    `BrowserWindow` / `ipcMain` 全为 `undefined`（现象是 `require('electron')`
 *    返回可执行文件路径字符串）。这里显式删掉它，保证以桌面应用身份启动。
 *    ⚠️ 不能靠 `ELECTRON_RUN_AS_NODE= electron .` 这类 POSIX 写法 —— npm 在
 *    Windows 上走 cmd.exe，该语法不可用。
 *
 * 2. **`require('electron')` 的返回值** —— 在主进程（Node 侧）它是 **electron 可执行
 *    文件的绝对路径**，正好用来 spawn 子进程。
 *
 * 用法：`node scripts/start-electron.cjs [--dist]`
 */
const { spawn } = require('node:child_process')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// GPU 是否关闭交由调用方决定（沙箱 / CI 用 MARKCRAFT_DISABLE_GPU=1），
// 此处不做默认改动 —— 桌面端理应默认启用硬件加速。
const electronPath = require('electron')
const args = [require('node:path').join(__dirname, '..', 'out', 'main', 'index.mjs'), ...process.argv.slice(2)]

const child = spawn(electronPath, args, { stdio: 'inherit', env })
child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('[MarkCraft] 启动 Electron 失败：', err)
  process.exit(1)
})

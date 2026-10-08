/**
 * 预解压 Electron dist 到 `.electron-dist/`，供 electron-builder 的 `electronDist` 使用。
 *
 * ## 为什么需要这个脚本
 *
 * electron-builder 默认流程是「下载 zip → 解压到 `win-unpacked.tmp` → **rename** 为
 * `win-unpacked`」。在 Windows 上，刚解压出的 `electron.exe`（~240 MB）常被 Windows
 * Defender 实时扫描**锁住句柄**，于是 `fs.rename` 抛 `EPERM: operation not permitted`
 * （本仓库开发环境 2026-10-08 实测稳定复现，两次全量打包均卡在同一步）。
 *
 * 规避：提前把缓存 zip 解压到一个稳定目录 `.electron-dist/`，再用 `electronDist` 指过去。
 * electron-builder 便走「**拷贝** unpacked dist」分支（copy 不触发独占锁），不再 rename。
 *
 * ## 缓存来源
 *
 * `@electron/get` 把下载的 zip 缓存在：
 *  - Windows：`%LOCALAPPDATA%\electron\Cache\<sha>\electron-v<ver>-<plat>-<arch>.zip`
 *  - macOS  ：`~/Library/Caches/electron/<sha>/...`
 *  - Linux  ：`~/.cache/electron/<sha>/...`
 * 若缓存里没有（首次构建），先跑一次 `npx electron-builder --dir` 让它下载
 * （国内可设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`）。
 */
const { existsSync, readdirSync, mkdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

const ROOT = join(__dirname, '..')
const DEST = join(ROOT, '.electron-dist')

const platform =
  process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux'
const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'ia32' : 'x64'

const marker = platform === 'win32' ? 'electron.exe' : 'electron'

if (existsSync(join(DEST, marker))) {
  console.log('[prepare-electron-dist] 已就绪，跳过：', DEST)
  process.exit(0)
}

const electronVersion = require(join(ROOT, 'node_modules', 'electron', 'package.json')).version
const zipName = `electron-v${electronVersion}-${platform}-${arch}.zip`

const cacheRoots = [
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'electron', 'Cache') : null,
  process.env.HOME ? join(process.env.HOME, 'Library', 'Caches', 'electron') : null,
  process.env.HOME ? join(process.env.HOME, '.cache', 'electron') : null,
].filter(Boolean)

let zipPath = null
for (const root of cacheRoots) {
  if (!existsSync(root)) continue
  for (const hash of readdirSync(root)) {
    const candidate = join(root, hash, zipName)
    if (existsSync(candidate)) {
      zipPath = candidate
      break
    }
  }
  if (zipPath) break
}

if (!zipPath) {
  console.error('[prepare-electron-dist] 未找到缓存的 Electron zip：', zipName)
  console.error('  请先跑一次 `npx electron-builder --dir` 让其下载（国内可设：')
  console.error('  ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ ）')
  process.exit(1)
}

console.log('[prepare-electron-dist] 解压：', zipPath)
console.log('[prepare-electron-dist] 目标：', DEST)
rmSync(DEST, { recursive: true, force: true })
mkdirSync(DEST, { recursive: true })

if (platform === 'win32') {
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${DEST}' -Force`],
    { stdio: 'inherit' },
  )
} else {
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', DEST], { stdio: 'inherit' })
}

console.log('[prepare-electron-dist] 完成 ✓')

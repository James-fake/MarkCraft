/**
 * 下载 Pandoc 二进制到 `resources/pandoc/<platform>/`（P6.2 sidecar）。
 *
 * ## 为什么是「可选下载」而不是入库
 *
 * Pandoc 的 `pandoc.exe` 是静态链接的 Haskell 二进制，**解压后约 180MB** —— 直接入库
 * 会让仓库爆炸，打进安装包也会让体积从 ~185MB 涨到 ~365MB。故：
 *  - 二进制**不入库**（`.gitignore` 忽略 `resources/pandoc/`）；
 *  - 需要「真 EPUB」时跑 `npm run fetch:pandoc` 再打包；
 *  - 没跑也不影响：`exportEpub` 会回退到内置的最小 EPUB 生成器（见 features/export/utils/exportEpub.ts）。
 *
 * 主进程解析顺序：打包内 `process.resourcesPath/pandoc/` → 开发态 `resources/pandoc/`
 * → 系统 PATH 上的 `pandoc`（见 electron/main/index.ts#resolvePandocPath）。
 *
 * 用法：`node scripts/fetch-pandoc.cjs [版本]`（默认 3.12.1）。
 */
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { execFileSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const VERSION = process.argv[2] || '3.12.1'

const platform = process.platform
const arch = process.arch

function artifactName() {
  if (platform === 'win32') return `pandoc-${VERSION}-windows-x86_64.zip`
  if (platform === 'darwin') return `pandoc-${VERSION}-${arch === 'arm64' ? 'arm64' : 'x86_64'}-macOS.zip`
  return `pandoc-${VERSION}-linux-amd64.tar.gz`
}

const URL = `https://github.com/jgm/pandoc/releases/download/${VERSION}/${artifactName()}`
const OUT_DIR = path.join(ROOT, 'resources', 'pandoc', platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux')
const BIN_NAME = platform === 'win32' ? 'pandoc.exe' : 'pandoc'

console.log(`[fetch-pandoc] 版本 ${VERSION} / ${platform}-${arch}`)
console.log(`[fetch-pandoc] 下载 ${URL}`)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pandoc-dl-'))
const archive = path.join(tmp, artifactName())

function download(url, dest) {
  // curl 跨平台可用（Windows 10+ / macOS / Linux 自带）；-L 跟随重定向，--fail 失败即非零退出
  execFileSync('curl', ['-L', '--fail', '--retry', '3', '-o', dest, url], { stdio: 'inherit' })
}

function extract(archivePath, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  if (platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destDir}' -Force`], { stdio: 'inherit' })
  } else {
    execFileSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'inherit' })
  }
}

/** 在解压目录里递归找 pandoc 可执行文件 */
function findBin(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const hit = findBin(p)
      if (hit) return hit
    } else if (entry.name === BIN_NAME) {
      return p
    }
  }
  return null
}

try {
  download(URL, archive)
  const extracted = path.join(tmp, 'x')
  extract(archive, extracted)
  const bin = findBin(extracted)
  if (!bin) throw new Error(`解压后未找到 ${BIN_NAME}`)
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const target = path.join(OUT_DIR, BIN_NAME)
  fs.copyFileSync(bin, target)
  if (platform !== 'win32') fs.chmodSync(target, 0o755)
  const size = fs.statSync(target).size
  console.log(`[fetch-pandoc] 完成 → ${target} (${(size / 1024 / 1024).toFixed(1)} MB)`)
} finally {
  try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* 清理失败不阻断 */ }
}

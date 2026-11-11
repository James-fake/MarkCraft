/**
 * 生成 NSIS 安装向导的品牌位图（24-bit BMP，MUI2 要求）。
 *
 * 产物：
 *   build/installer-welcome.bmp  164×314  —— MUI 欢迎/完成页左侧大图
 *   build/installer-header.bmp   150×57   —— MUI 各页顶部头部图
 *
 * 为什么用 Electron：复用与 gen-icon.cjs 同一套离屏 Chromium 渲染（字体/SVG 一致、零新增依赖），
 * 再把 capturePage 的 BGRA 位图手写成 24-bit BMP（无 alpha，NSIS 只认这种）。
 *
 * 用法：node scripts/gen-installer-bmp.cjs
 */
const path = require('node:path')
const fs = require('node:fs')

const ROOT = path.join(__dirname, '..')
const SVG_PATH = path.join(ROOT, 'build', 'icon.svg')
const WELCOME_OUT = path.join(ROOT, 'build', 'installer-welcome.bmp')
const HEADER_OUT = path.join(ROOT, 'build', 'installer-header.bmp')
const LOGO_OUT = path.join(ROOT, 'build', 'installer-logo.bmp')

/** 把 BGRA 原始位图写成 24-bit BMP（bottom-up，行 4 字节对齐） */
function writeBmp(bgra, width, height, outPath) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize
  const bmp = Buffer.alloc(fileSize)
  bmp.write('BM', 0, 'ascii')
  bmp.writeUInt32LE(fileSize, 2)
  bmp.writeUInt32LE(0, 6)
  bmp.writeUInt32LE(54, 10)
  bmp.writeUInt32LE(40, 14)
  bmp.writeInt32LE(width, 18)
  bmp.writeInt32LE(height, 22)
  bmp.writeUInt16LE(1, 26)
  bmp.writeUInt16LE(24, 28)
  bmp.writeUInt32LE(0, 30)
  bmp.writeUInt32LE(pixelArraySize, 34)
  bmp.writeInt32LE(2835, 38)
  bmp.writeInt32LE(2835, 42)
  bmp.writeUInt32LE(0, 46)
  bmp.writeUInt32LE(0, 50)
  let off = 54
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = off
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      bmp[off++] = bgra[i] // B
      bmp[off++] = bgra[i + 1] // G
      bmp[off++] = bgra[i + 2] // R
    }
    while (off - rowStart < rowSize) bmp[off++] = 0
  }
  fs.writeFileSync(outPath, bmp)
}

function logoSvg(size) {
  const svg = fs.readFileSync(SVG_PATH, 'utf-8')
  return svg.replace(/<svg([^>]*?)width="\d+"([^>]*?)height="\d+"/, `<svg$1width="${size}"$2height="${size}"`)
}

function welcomeHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#ffffff;overflow:hidden;font-family:"Microsoft YaHei UI","Segoe UI",sans-serif}
  .wrap{position:relative;width:164px;height:314px;background:#ffffff;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;padding-top:56px}
  .bar{position:absolute;top:0;left:0;width:164px;height:4px;background:#7C8CFF}
  .logo{width:104px;height:104px;line-height:0}
  .name{margin-top:18px;font-size:22px;font-weight:700;color:#262834;letter-spacing:.4px}
  .site{margin-top:auto;margin-bottom:16px;font-size:10px;color:#9A9EAA}
  </style></head><body><div class="wrap"><div class="bar"></div>
  <div class="logo">${logoSvg(104)}</div>
  <div class="name">MarkCraft</div>
  <div class="site">markcraft.app</div>
  </div></body></html>`
}

function headerHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#ffffff;overflow:hidden;font-family:"Microsoft YaHei UI","Segoe UI",sans-serif}
  .wrap{width:150px;height:57px;background:#ffffff;box-sizing:border-box;display:flex;align-items:center;padding:0 12px 0 8px}
  .logo{width:38px;height:38px;line-height:0;flex:0 0 auto}
  .name{margin-left:9px;font-size:15px;font-weight:700;color:#262834;letter-spacing:.2px;white-space:nowrap}
  </style></head><body><div class="wrap">
  <div class="logo">${logoSvg(38)}</div><div class="name">MarkCraft</div>
  </div></body></html>`
}

function logoHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#ffffff;overflow:hidden}
  .wrap{width:96px;height:96px;background:#ffffff;display:flex;align-items:center;justify-content:center}
  </style></head><body><div class="wrap">${logoSvg(96)}</div></body></html>`
}

if (process.argv.includes('--render')) {
  const { app, BrowserWindow } = require('electron')
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('force-device-scale-factor', '1')
  // 关键：阻止「所有窗口关闭即退出」，否则第一个窗口 destroy 后第二个窗口 loadFile 会 ERR_FAILED
  app.on('window-all-closed', () => {})

  const render = async (html, w, h, out) => {
    const tmpHtml = path.join(ROOT, 'build', `.bmp-render-${w}x${h}.html`)
    fs.writeFileSync(tmpHtml, html, 'utf-8')
    const win = new BrowserWindow({
      width: w,
      height: h,
      useContentSize: true,
      show: false,
      frame: false,
      resizable: false,
      transparent: false,
      backgroundColor: '#ffffff',
    })
    await win.loadFile(tmpHtml)
    await new Promise((r) => setTimeout(r, 400))
    const img = await win.webContents.capturePage()
    const size = img.getSize()
    const bgra = img.toBitmap()
    if (size.width !== w || size.height !== h) {
      throw new Error(`capture size ${size.width}x${size.height} != ${w}x${h}`)
    }
    writeBmp(bgra, w, h, out)
    win.destroy()
    try { fs.rmSync(tmpHtml, { force: true }) } catch { /* ignore */ }
    console.log(`[gen-installer-bmp] wrote ${path.basename(out)} (${w}x${h}, ${fs.statSync(out).size} bytes)`)
  }

  app.whenReady().then(async () => {
    await render(welcomeHtml(), 164, 314, WELCOME_OUT)
    await render(headerHtml(), 150, 57, HEADER_OUT)
    await render(logoHtml(), 96, 96, LOGO_OUT)
    app.quit()
  }).catch((e) => {
    console.error('[gen-installer-bmp] render failed:', e)
    app.exit(1)
  })
} else {
  const { spawnSync } = require('node:child_process')
  const electron = require('electron')
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const r = spawnSync(electron, [__filename, '--render'], { stdio: 'inherit', env })
  process.exit(r.status ?? 1)
}

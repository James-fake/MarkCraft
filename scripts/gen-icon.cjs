/**
 * 生成应用图标 PNG（electron-builder 打包源图）。
 *
 * 为什么用 Electron 而不是 sharp/resvg：Electron 已随项目安装，且用的是与运行期**同一套**
 * Chromium 渲染 —— 图标里若含渐变/滤镜/字体，渲染结果与真机一致，零新增依赖。
 *
 * 用法：`node scripts/gen-icon.cjs`（内部 spawn Electron 执行渲染）。
 * 产物：`build/icon.png`（1024×1024，透明底）。electron-builder 会据此自动生成
 * Windows .ico / macOS .icns（配置见 package.json 的 build.icon）。
 */
const path = require('node:path')
const fs = require('node:fs')

const ROOT = path.join(__dirname, '..')
const SVG = path.join(ROOT, 'build', 'icon.svg')
const OUT = path.join(ROOT, 'build', 'icon.png')
const SIZE = 1024

if (process.argv.includes('--render')) {
  // —— Electron 主进程模式：离屏渲染 SVG → PNG ——
  const { app, BrowserWindow } = require('electron')
  // 软件光栅 + 关沙箱：无头/受限环境最稳（GPU 进程在此类环境常崩）
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('force-device-scale-factor', '1')

  app.whenReady().then(async () => {
    const svg = fs.readFileSync(SVG, 'utf-8')
    // 把源 SVG 的固定宽高替换为 SIZE，保持 viewBox 等比缩放
    const scaled = svg.replace(/<svg([^>]*?)width="\d+"([^>]*?)height="\d+"/, `<svg$1width="${SIZE}"$2height="${SIZE}"`)
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${scaled}</body></html>`
    // 写临时文件再 loadFile：data: URL 顶层导航在部分环境被拒（ERR_FAILED）
    const tmpHtml = path.join(ROOT, 'build', '.icon-render.html')
    fs.writeFileSync(tmpHtml, html, 'utf-8')

    const win = new BrowserWindow({
      width: SIZE,
      height: SIZE,
      useContentSize: true,
      show: false,
      frame: false,
      transparent: true,
    })
    await win.loadFile(tmpHtml)
    // 等一帧确保绘制完成
    await new Promise((r) => setTimeout(r, 400))
    const img = await win.webContents.capturePage()
    const buf = img.toPNG()
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, buf)
    try { fs.rmSync(tmpHtml, { force: true }) } catch { /* 清理失败不阻断 */ }
    console.log(`[gen-icon] wrote ${OUT} (${img.getSize().width}x${img.getSize().height}, ${buf.length} bytes)`)
    app.quit()
  }).catch((e) => {
    console.error('[gen-icon] render failed:', e)
    app.exit(1)
  })
} else {
  // —— 普通 Node 模式：spawn Electron 执行上面的渲染 ——
  const { spawnSync } = require('node:child_process')
  const electron = require('electron') // 主进程外返回 electron 可执行文件路径
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE // 清掉「退化为纯 Node」陷阱
  const r = spawnSync(electron, [__filename, '--render'], { stdio: 'inherit', env })
  process.exit(r.status ?? 1)
}

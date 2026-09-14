/**
 * 截图：设置页滑动切 Tab 的跟手中间态 + 吸附后终态
 * 用法: node .workbuddy/artifacts/shot-swipe-settings.mjs
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'node:fs'

const CDP_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return r.result.value
  }
  async shot(path) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path, Buffer.from(r.data, 'base64'))
  }
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  // 进设置页
  const key = (type) => cdp.send('Input.dispatchKeyEvent', { type, modifiers: 2, windowsVirtualKeyCode: 188, code: 'Comma', key: ',' })
  await key('keyDown'); await key('keyUp')
  for (let i = 0; i < 40; i++) { if (await cdp.eval(`!!document.querySelector('.aurora-settings__content')`)) break; await sleep(250) }

  const g = await cdp.eval(`(() => { const r = document.querySelector('.aurora-settings__content').getBoundingClientRect(); return { cx: r.x + r.width/2, cy: r.y + r.height/2, w: r.width } })()`)

  // 停在「通用」分类（默认）
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-settings__nav-tab')].find(x=>x.querySelector('span')?.textContent==='通用'); b&&b.click() })()`)
  await sleep(300)
  await cdp.shot('.workbuddy/artifacts/shot-swipe-1-idle.png')
  console.log('✅ 1 静置态')

  // 拖到一半停住（跟手中间态）
  const fromX = g.cx + g.w * 0.34
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: g.cy, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: Math.round(fromX - g.w * 0.34 * (i / 10)), y: g.cy, button: 'left', buttons: 1,
    })
    await sleep(16)
  }
  await cdp.shot('.workbuddy/artifacts/shot-swipe-2-dragging.png')
  console.log('✅ 2 跟手中间态（位移约 34% 宽）')

  const mid = await cdp.eval(`(() => {
    const el = document.querySelector('.aurora-settings__swipe-layer')
    const root = document.querySelector('.aurora-settings')
    return {
      transform: el?.style.transform ?? '',
      progress: root?.style.getPropertyValue('--swipe-progress') ?? '',
      swiping: !!document.querySelector('.aurora-settings__content.is-swiping'),
    }
  })()`)
  console.log('   跟手状态:', JSON.stringify(mid))

  // 松手
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.cx - g.w * 0.34, y: g.cy, button: 'left', clickCount: 1, buttons: 0 })
  await sleep(500)
  await cdp.shot('.workbuddy/artifacts/shot-swipe-3-settled.png')
  const after = await cdp.eval(`document.querySelector('.aurora-settings__nav-tab--active span')?.textContent`)
  console.log('✅ 3 吸附终态 · 当前 tab =', after)

  // 终态不得残留内联 transform
  const residue = await cdp.eval(`document.querySelector('.aurora-settings__swipe-layer')?.style.transform ?? '(empty)'`)
  console.log('   终态内联 transform:', residue || '(empty)')

  ws.close()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

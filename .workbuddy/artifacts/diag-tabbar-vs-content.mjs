/**
 * 诊断：对比「在 tab 栏上拖动」vs「在内容区拖动」是否触发切换
 * 用途：确认用户预期位置（tab 栏内）当前是否可用
 */
import { WebSocket } from 'ws'
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
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
}

async function swipe(cdp, { fromX, fromY, toX, toY, steps = 14, stepDelay = 16 }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: Math.round(fromX + (toX - fromX) * t), y: Math.round(fromY + (toY - fromY) * t), button: 'left', buttons: 1,
    })
    await sleep(stepDelay)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1, buttons: 0 })
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  // 进设置页（auxView，用 Ctrl+,）
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, windowsVirtualKeyCode: 188, code: 'Comma', key: ',' })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, windowsVirtualKeyCode: 188, code: 'Comma', key: ',' })
  await sleep(1500)

  const hasSettings = await cdp.eval(`!!document.querySelector('.aurora-settings')`)
  console.log('设置页已打开:', hasSettings)
  if (!hasSettings) { console.error('未能进入设置页'); process.exit(1) }

  const activeCat = () => cdp.eval(`(document.querySelector('.aurora-settings__nav-tab--active')||{}).textContent || null`)

  const geo = await cdp.eval(`(() => {
    const nav = document.querySelector('.aurora-settings__nav-tabs')
    const content = document.querySelector('.aurora-settings__content')
    const nr = nav.getBoundingClientRect(), cr = content.getBoundingClientRect()
    return {
      nav: { x: nr.x, y: nr.y, w: nr.width, h: nr.height, cy: nr.y + nr.height/2 },
      content: { x: cr.x, y: cr.y, w: cr.width, h: cr.height, cy: cr.y + cr.height/2 },
    }
  })()`)
  console.log('几何:', JSON.stringify(geo))

  const before = await activeCat()
  console.log('当前分类:', before)

  // A. 在 tab 栏内横向拖动
  const b1 = await activeCat()
  await swipe(cdp, {
    fromX: Math.round(geo.nav.x + geo.nav.w * 0.8), fromY: Math.round(geo.nav.cy),
    toX: Math.round(geo.nav.x + geo.nav.w * 0.2), toY: Math.round(geo.nav.cy),
  })
  await sleep(600)
  const a1 = await activeCat()
  console.log(`A. 【tab 栏内】拖动: ${b1} → ${a1}  ${b1 !== a1 ? '✅ 有反应' : '❌ 无反应'}`)

  // 归位
  await cdp.eval(`(() => { const b=document.querySelector('.aurora-settings__nav-tab--active'); b&&b.click() })()`)
  await sleep(300)

  // B. 在内容区横向拖动
  const b2 = await activeCat()
  await swipe(cdp, {
    fromX: Math.round(geo.content.x + geo.content.w * 0.8), fromY: Math.round(geo.content.cy),
    toX: Math.round(geo.content.x + geo.content.w * 0.25), toY: Math.round(geo.content.cy),
  })
  await sleep(600)
  const a2 = await activeCat()
  console.log(`B. 【内容区】拖动: ${b2} → ${a2}  ${b2 !== a2 ? '✅ 有反应' : '❌ 无反应'}`)

  ws.close(); process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

/**
 * 诊断：白板纵向拖拽为何被判定为横滑
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

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  await cdp.eval(`(document.querySelector('.aurora-canvas__empty-skip')||document.querySelector('.aurora-canvas__empty-btn--primary')||{}).click?.()`)
  await sleep(1200)

  let hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)
  if (!hasTabs) {
    const z = await cdp.eval(`(() => { const el=document.querySelector('.aurora-canvas__hoverzone--left'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
    if (z) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x), y: Math.round(z.y) })
      await sleep(200)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x) + 3, y: Math.round(z.y) })
    }
    for (let i = 0; i < 40; i++) { hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`); if (hasTabs) break; await sleep(250) }
  }
  await cdp.eval(`(document.querySelector('.aurora-canvas__pin')||{}).click?.()`)
  await sleep(300)

  const g = await cdp.eval(`(() => { const r=document.querySelector('.aurora-csp__tabs').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2} })()`)
  console.log('tab 行几何:', JSON.stringify(g))

  // 安装指针事件探针，记录真实 delta
  await cdp.eval(`(() => {
    window.__gestLog = []
    const tabs = document.querySelector('.aurora-csp__tabs')
    let sx=0, sy=0, st=0
    tabs.addEventListener('pointerdown', (e) => { sx=e.clientX; sy=e.clientY; st=performance.now(); window.__gestLog.push({t:'down',x:e.clientX,y:e.clientY}) }, true)
    document.addEventListener('pointermove', (e) => { window.__gestLog.push({t:'move',dx:+(e.clientX-sx).toFixed(1),dy:+(e.clientY-sy).toFixed(1)}) }, true)
    document.addEventListener('pointerup', (e) => { window.__gestLog.push({t:'up',dx:+(e.clientX-sx).toFixed(1),dy:+(e.clientY-sy).toFixed(1),dt:Math.round(performance.now()-st)}) }, true)
    return true
  })()`)

  const before = await cdp.eval(`document.querySelector('.aurora-csp__tab--active')?.querySelector('span')?.textContent`)

  // 纵向拖动：dx 恒为 0
  const X = Math.round(g.cx), Y0 = Math.round(g.cy - 10)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: X, y: Y0, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: X, y: Y0 + i * 2, button: 'left', buttons: 1 })
    await sleep(16)
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: X, y: Y0 + 20, button: 'left', clickCount: 1, buttons: 0 })
  await sleep(450)

  const after = await cdp.eval(`document.querySelector('.aurora-csp__tab--active')?.querySelector('span')?.textContent`)
  console.log(`tab: ${before} → ${after}`)
  const log = await cdp.eval(`JSON.stringify(window.__gestLog)`)
  console.log('手势日志:', log)
  ws.close()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

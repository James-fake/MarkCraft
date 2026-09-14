/**
 * 截图：四面板滑动切换的「拖拽中」视觉状态（用于人工复核）
 * 用法: node .workbuddy/artifacts/shot-swipe-all.mjs
 */
import { WebSocket } from 'ws'
import { writeFileSync } from 'fs'

const CDP_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'D:/TracSolo_Project/MarkdownEditor qoder/.workbuddy/artifacts'

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
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${OUT}/${name}`, Buffer.from(r.data, 'base64'))
    console.log('已保存', name)
  }
}

/** 按下并水平拖到一半 → 保持按住（触发 is-swiping 视觉态），随后截图 */
async function holdDrag(cdp, { fromX, fromY, toX, steps = 10 }) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1, buttons: 1 })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(fromX + (toX - fromX) * t), y: fromY, button: 'left', buttons: 1 })
    await sleep(20)
  }
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
  await new Promise((r) => ws.on('open', r))
  const cdp = new Cdp(ws)
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')

  /* ---- 白板侧栏 ---- */
  await cdp.eval(`location.hash = '#view=canvas'`); await sleep(2600)
  await cdp.eval(`(document.querySelector('.aurora-canvas__empty-skip')||document.querySelector('.aurora-canvas__empty-btn--primary')||{}).click?.()`)
  await sleep(1200)
  let hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)
  if (!hasTabs) {
    const z = await cdp.eval(`(() => { const el=document.querySelector('.aurora-canvas__hoverzone--left'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
    if (z) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x), y: Math.round(z.y) }); await sleep(200)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x) + 3, y: Math.round(z.y) })
    }
    for (let i = 0; i < 40; i++) { hasTabs = await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`); if (hasTabs) break; await sleep(250) }
  }
  await cdp.eval(`(document.querySelector('.aurora-canvas__pin')||{}).click?.()`); await sleep(350)
  // 侧栏可能仍未开（热区 hover 偶发不触发）→ 重试几轮
  for (let i = 0; i < 6 && !(await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`)); i++) {
    const z = await cdp.eval(`(() => { const el=document.querySelector('.aurora-canvas__hoverzone--left'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
    if (z) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x), y: Math.round(z.y) }); await sleep(250)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(z.x) + 2, y: Math.round(z.y) }); await sleep(600)
      await cdp.eval(`(document.querySelector('.aurora-canvas__pin')||{}).click?.()`); await sleep(400)
    }
  }
  if (!(await cdp.eval(`!!document.querySelector('.aurora-csp__tabs')`))) {
    console.error('白板侧栏未就绪，跳过白板截图'); ws.close(); process.exit(0)
  }
  const cg = await cdp.eval(`(() => { const r=document.querySelector('.aurora-csp__tabs').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2} })()`)
  await holdDrag(cdp, { fromX: Math.round(cg.x + cg.w * 0.75), fromY: Math.round(cg.cy), toX: Math.round(cg.x + cg.w * 0.35) })
  await cdp.shot('shot-swipe-c2-drag.png')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(cg.x + cg.w * 0.35), y: Math.round(cg.cy), button: 'left', clickCount: 1, buttons: 0 })
  await sleep(500)
  await cdp.shot('shot-swipe-c3-settled.png')

  /* ---- 博客浮层 ---- */
  await cdp.eval(`location.hash = '#view=blog'`); await sleep(2600)
  const ensure = async (label) => {
    const isActive = await cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__tab.is-active'); return b ? b.querySelector('span')?.textContent : null })()`)
    const bodyOpen = await cdp.eval(`!!document.querySelector('.aurora-blog__panelzone-body')`)
    if (isActive === label && bodyOpen) return
    await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-blog__tab')].find(x=>x.querySelector('span')?.textContent===${JSON.stringify(label)}); b&&b.click() })()`)
    await sleep(500)
  }
  await ensure('主题'); await ensure('主题')
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-blog__subseg-btn')].find(x=>x.textContent==='样式'); b&&b.click() })()`)
  await sleep(350)
  const bg = await cdp.eval(`(() => { const b=document.querySelector('.aurora-blog__panelzone-body').getBoundingClientRect(); const s=document.querySelector('.aurora-blog__subseg'); const sr=s?s.getBoundingClientRect():null; return {x:b.x,y:b.y,w:b.width,h:b.height, y2: Math.round(Math.max(b.y, sr?sr.bottom:0)+48)} })()`)
  await holdDrag(cdp, { fromX: Math.round(bg.x + bg.w * 0.8), fromY: bg.y2, toX: Math.round(bg.x + bg.w * 0.3) })
  await cdp.shot('shot-swipe-b2-drag.png')
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(bg.x + bg.w * 0.3), y: bg.y2, button: 'left', clickCount: 1, buttons: 0 })
  await sleep(500)
  await cdp.shot('shot-swipe-b3-settled.png')

  ws.close(); process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })

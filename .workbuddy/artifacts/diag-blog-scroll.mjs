/** 调试 12：追踪 hasScrollableAncestor 在博客 subseg 上的判定 */
import { WebSocket } from 'ws'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map()
    ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) } }) }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails)); return r.result.value }
}
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json()
const page = list.find((t) => t.type === 'page' && t.url.includes('localhost:5174'))
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
await new Promise((r) => ws.on('open', r))
const cdp = new Cdp(ws)
await cdp.send('Runtime.enable')
await cdp.eval(`new Promise(r => { const i = setInterval(() => { if (document.querySelector('.aurora-page')) { clearInterval(i); r(1) } }, 50); setTimeout(() => { clearInterval(i); r(0) }, 12000) })`)
await sleep(800)
if (await cdp.eval(`!!document.querySelector('.aurora-audience')`)) {
  await cdp.eval(`(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('开始使用')); b?b.click():localStorage.setItem('markcraft.onboarding.seen','1') })()`)
  await sleep(800); await cdp.eval(`(() => { const e=document.querySelector('.aurora-audience'); e&&e.remove() })()`)
}
await cdp.eval(`(() => { const b=[...document.querySelectorAll('.aurora-sidebar-item')].find(e=>(e.textContent||'').includes('博客')); b&&b.click() })()`)
await sleep(2000)

// 复刻 hasScrollableAncestor 的遍历，逐个祖先输出判定依据
console.log(await cdp.eval(`(() => {
  const seg = document.querySelector('.aurora-blog__subseg')
  const btn = seg.querySelector('button')
  const out = []
  let el = btn
  const stop = seg
  while (el && el !== stop && el.parentElement) {
    const cs = getComputedStyle(el)
    out.push({
      cls: typeof el.className === 'string' ? el.className : el.tagName,
      sw: el.scrollWidth, cw: el.clientWidth, diff: el.scrollWidth - el.clientWidth,
      overflowX: cs.overflowX,
      verdict: (el.scrollWidth <= el.clientWidth + 4) ? 'not-scrollable' : ((cs.overflowX==='auto'||cs.overflowX==='scroll') ? 'SCROLLABLE!' : 'over-wide-but-not-scrollable'),
    })
    el = el.parentElement
  }
  return JSON.stringify({ from: btn.tagName + '.' + btn.className, stop: seg.className, chain: out }, null, 2)
})()`))

// 也看看 seg 自身与 body
console.log('\n--- subseg 自身 ---')
console.log(await cdp.eval(`(() => {
  const seg = document.querySelector('.aurora-blog__subseg')
  const cs = getComputedStyle(seg)
  return JSON.stringify({ sw: seg.scrollWidth, cw: seg.clientWidth, overflowX: cs.overflowX, overflow: cs.overflow })
})()`))

console.log('\n--- panelzone-body 是否存在 ---')
console.log(await cdp.eval(`JSON.stringify([...document.querySelectorAll('[class*=aurora-blog]')].map(e => typeof e.className==='string'?e.className:'').filter((v,i,a)=>a.indexOf(v)===i).slice(0,40))`))

ws.close(); process.exit(0)

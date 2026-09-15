/** 列出侧栏导航按钮的类名，供探针使用 */
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
await sleep(500)

console.log('--- 所有 button 的 class + text（前 60）---')
console.log(await cdp.eval(`JSON.stringify([...document.querySelectorAll('button')].slice(0,60).map(b => (typeof b.className==='string'?b.className:'') + ' | ' + (b.textContent||'').trim().slice(0,14)))`))
console.log('\n--- 含 data-* 的元素 ---')
console.log(await cdp.eval(`JSON.stringify([...document.querySelectorAll('[data-view],[data-panel],[data-tab],[data-key]')].slice(0,30).map(e => e.tagName + '.' + (typeof e.className==='string'?e.className:'') + ' | ' + JSON.stringify(e.dataset)))`))
ws.close(); process.exit(0)

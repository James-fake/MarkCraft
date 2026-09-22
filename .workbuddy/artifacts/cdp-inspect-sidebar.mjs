/**
 * 枚举外壳侧栏导航项（图标 aria-label / title / 激活态）—— 定位「跳转至编辑器」图标用
 * 用法：与 Edge 同一条 bash：node .workbuddy/artifacts/cdp-inspect-sidebar.mjs [可选:点击编辑器侧栏项先]
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find(t => t.type === 'page' && t.url.includes('5174'))
if (!page) throw new Error('no 5174 target')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
let id = 0; const pending = new Map()
ws.on('message', raw => { const m = JSON.parse(raw.toString()); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p(m.result) } })
const send = (method, params = {}) => new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value

await sleep(800)
const r = await evalJs(`(() => {
  const nav = document.querySelector('.aurora-sidebar__nav')
  const items = nav ? [...nav.querySelectorAll('button, [role="button"], a')]
    .map(el => ({
      cls: String(el.className).slice(0, 100),
      text: (el.textContent || '').trim().slice(0, 16),
      aria: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      active: /active/.test(String(el.className)),
    })) : []
  const brief = document.querySelectorAll('.aurora-brief').length
  return { brief, items }
})()`)
console.log(JSON.stringify(r, null, 1))
process.exit(0)

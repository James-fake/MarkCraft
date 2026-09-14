const DEBUG_PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getTargetWs() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const page = (await res.json()).find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(500)
  }
  throw new Error('no cdp')
}
let msgId = 0
const pending = new Map()
function send(ws, method, params = {}) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
const ws = new WebSocket(await getTargetWs())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result) }
}
async function evalJs(expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value
}
await send(ws, 'Page.enable')
await send(ws, 'Page.navigate', { url: 'http://localhost:5174/#view=blog' })
for (let i = 0; i < 40; i++) { await sleep(500); if (await evalJs(`!!document.querySelector('.aurora-blog__tab.is-active')`)) break }
await sleep(800)
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`)
await sleep(1000)
await evalJs(`(() => { const el = document.querySelector('.aurora-blog-panel__scroll'); el.scrollTop = 140; el.dispatchEvent(new Event('scroll')) })()`)
await sleep(500)
const probe = await evalJs(`(() => {
  const s = document.querySelector('.aurora-blog-search')
  const r = s.getBoundingClientRect()
  const cs = getComputedStyle(s)
  const midX = Math.round(r.left + r.width / 2)
  const pts = { top3: midX + ',' + Math.round(r.top + 3), bottom3: midX + ',' + Math.round(r.bottom - 3), below5: midX + ',' + Math.round(r.bottom + 5) }
  const hit = {}
  for (const [k, p] of Object.entries(pts)) { const [x, y] = p.split(',').map(Number); const el = document.elementFromPoint(x, y); hit[k] = el?.className?.toString().slice(0, 60) || el?.tagName }
  return { rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) }, pos: cs.position, z: cs.zIndex, bg: cs.backgroundColor, hit }
})()`)
console.log('PROBE:', JSON.stringify(probe, null, 1))
ws.close()

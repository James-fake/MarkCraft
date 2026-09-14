// CDP 探针：展开浮层后高频采样 st/hidden，观察锚定 effect 是否执行（st 100→0 跳变）
const DEBUG_PORT = 9333
const PAGE_URL = 'http://localhost:5174/#view=blog'
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
  throw new Error('no cdp target')
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
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id)
    pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
  }
}
async function evalJs(expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

await send(ws, 'Page.enable')
await send(ws, 'Page.navigate', { url: PAGE_URL })
for (let i = 0; i < 40; i++) { await sleep(500); if (await evalJs(`!!document.querySelector('.aurora-blog__tab.is-active')`)) break }
await sleep(800)

// 挂全局 scroll 日志（捕获阶段，记录所有 scroll 事件目标与 st）
await evalJs(`window.__log = []; document.addEventListener('scroll', (e) => {
  window.__log.push({ cls: (e.target.className || '').toString().slice(0, 40), st: Math.round(e.target.scrollTop), t: Math.round(performance.now()) })
}, true)`)

// 先把浮层展开再收起，回到「未展开」初始态，然后正式探针
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`)
await sleep(800)
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 收起
await sleep(600)
await evalJs(`window.__log = []`)

console.log('--- click 展开 → 立即 scrollTop=100 → 高频采样 ---')
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 展开
await evalJs(`(() => { const el = document.querySelector('.aurora-blog-panel__scroll'); if (el) { el.scrollTop = 100; el.dispatchEvent(new Event('scroll')); return 'set100' } return 'NO-EL' })()`)
for (let i = 0; i < 20; i++) {
  const s = await evalJs(`(() => {
    const el = document.querySelector('.aurora-blog-panel__scroll')
    const s = document.querySelector('.aurora-blog-search')
    return { st: el ? Math.round(el.scrollTop) : null, hidden: s ? s.classList.contains('is-hidden') : null, h: s ? Math.round(s.getBoundingClientRect().height) : null }
  })()`)
  console.log(`+${i * 30}ms:`, JSON.stringify(s))
  await sleep(30)
}
const log = await evalJs(`window.__log`)
console.log('SCROLL-LOG:', JSON.stringify(log))
ws.close()
process.exit(0)

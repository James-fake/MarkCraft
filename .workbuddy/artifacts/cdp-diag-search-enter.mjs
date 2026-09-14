// CDP 诊断：复现用户「刚进入面板搜索框不显示」——采集打开浮层瞬间的状态序列
// 场景 A：fresh load → 点 tab 展开 → 每 120ms 采样 ×15
// 场景 B：滚到 140（收起）→ 关浮层 → 再展开 → 采样 ×15（StylePanel 重新挂载）
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

const snap = `(() => {
  const s = document.querySelector('.aurora-blog-search')
  const sc = document.querySelector('.aurora-blog-panel__scroll')
  const body = document.querySelector('.aurora-blog__panelzone-body')
  return {
    open: !!document.querySelector('.aurora-blog__panelzone.is-open'),
    bodyShown: !!body,
    search: s ? { h: Math.round(s.getBoundingClientRect().height), hidden: s.classList.contains('is-hidden') } : null,
    st: sc ? sc.scrollTop : null,
    clientH: sc ? sc.clientHeight : null,
    scrollH: sc ? sc.scrollHeight : null,
    bodySt: body ? body.scrollTop : null,
  }
})()`

console.log('--- 场景 A：fresh load 首次展开 ---')
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`)
for (let i = 0; i < 15; i++) {
  console.log(`A+${(i * 120)}ms:`, JSON.stringify(await evalJs(snap)))
  await sleep(120)
}

console.log('--- 场景 B：滚到 140 收起 → 关浮层 → 再展开 ---')
await evalJs(`(() => { const el = document.querySelector('.aurora-blog-panel__scroll'); el.scrollTop = 140; el.dispatchEvent(new Event('scroll')) })()`)
await sleep(400)
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 收起浮层
await sleep(600)
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 再展开
for (let i = 0; i < 15; i++) {
  console.log(`B+${(i * 120)}ms:`, JSON.stringify(await evalJs(snap)))
  await sleep(120)
}

ws.close()
process.exit(0)

// CDP 验证：搜索框「回顶显示」终版语义
// ①刚进入面板（即使列表在顶端）→ 收起 ②下滑越 12px 置位 hasLeftTop ③中途上滑仍收起
// ④滚回顶端 → 显示 ⑤再下滑收起、再回顶再显示 ⑥动画期伪滚动被二跑锚定清除
// ⑦关开浮层重置初始态 ⑧输入查询保持可见
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
async function shot(name) {
  const { data } = await send(ws, 'Page.captureScreenshot', { format: 'png' })
  const { writeFileSync } = await import('node:fs')
  writeFileSync(`.workbuddy/artifacts/${name}.png`, Buffer.from(data, 'base64'))
}

await send(ws, 'Page.enable')
await send(ws, 'Page.navigate', { url: PAGE_URL })
for (let i = 0; i < 40; i++) { await sleep(500); if (await evalJs(`!!document.querySelector('.aurora-blog__tab.is-active')`)) break }
await sleep(800)

const visible = `(() => {
  const s = document.querySelector('.aurora-blog-search')
  if (!s) return { missing: true }
  const r = s.getBoundingClientRect()
  return { h: Math.round(r.height), hidden: s.classList.contains('is-hidden'), st: document.querySelector('.aurora-blog-panel__scroll').scrollTop }
})()`
const scroll = (top) => evalJs(`(() => { const el = document.querySelector('.aurora-blog-panel__scroll'); el.scrollTop = ${top}; el.dispatchEvent(new Event('scroll')); return el.scrollTop })()`)

// ①首次展开（真机时序：等一帧让锚定 effect 跑完）→ 收起（刚进入不显示）
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`)
await sleep(650) // 盖过二跑锚定（500ms），确认伪状态也被清除
const enter = await evalJs(visible)
console.log('1-ENTER-COLLAPSED:', JSON.stringify(enter))
await shot('search-final-1-enter-collapsed')

// ②下滑越 12px（置位 hasLeftTop）→ 收起
await scroll(140)
await sleep(400)
const down = await evalJs(visible)
console.log('2-DOWN-HIDDEN:', JSON.stringify(down))

// ③中途上滑（未到顶）→ 仍收起
await scroll(90)
await sleep(400)
const midUp = await evalJs(visible)
console.log('3-MID-UP-STILL-HIDDEN:', JSON.stringify(midUp))
await shot('search-final-2-midup-hidden')

// ④滚回顶端 → 显示（用户核心诉求）
await scroll(0)
await sleep(400)
const backTop = await evalJs(visible)
console.log('4-BACK-TOP-SHOWN:', JSON.stringify(backTop))
await shot('search-final-3-backtop-shown')

// ⑤再下滑 → 收起；再回顶 → 再显示
await scroll(120)
await sleep(300)
await scroll(0)
await sleep(400)
const cycle = await evalJs(visible)
console.log('5-SECOND-CYCLE-SHOWN:', JSON.stringify(cycle))

// ⑥可见态下顶端微抖（带内 0↔6）→ 维持显示不闪
for (let i = 0; i < 6; i++) { await scroll(i % 2 === 0 ? 6 : 0); await sleep(60) }
await sleep(400)
const jitter = await evalJs(visible)
console.log('6-TOP-JITTER-NO-FLIP:', JSON.stringify(jitter))

// ⑦关浮层 → 再展开 → 重置初始态（收起 + st=0）
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 收起
await sleep(500)
await evalJs(`document.querySelector('.aurora-blog__tab.is-active').click()`) // 再展开
await sleep(650)
const reopen = await evalJs(visible)
console.log('7-REOPEN-RESET-COLLAPSED:', JSON.stringify(reopen))
await shot('search-final-4-reopen-collapsed')

// ⑧输入查询 → 保持可见（即使滚离顶端）
await evalJs(`(() => {
  const s = document.querySelector('.aurora-blog-search')
  s.classList.remove('is-hidden')
  const input = s.querySelector('input')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, 'mini')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
await sleep(300)
await scroll(80)
await sleep(300)
const typing = await evalJs(visible)
console.log('8-TYPING-VISIBLE-EVEN-SCROLLED:', JSON.stringify(typing))
await shot('search-final-5-typing')

const ok =
  enter.hidden === true && enter.st === 0 &&
  down.hidden === true &&
  midUp.hidden === true &&
  backTop.hidden === false && backTop.h >= 26 &&
  cycle.hidden === false &&
  jitter.hidden === false &&
  reopen.hidden === true && reopen.st === 0 &&
  typing.hidden === false
console.log(ok ? 'ALL-CHECKS-PASSED' : 'CHECKS-FAILED')
ws.close()
process.exit(ok ? 0 : 1)

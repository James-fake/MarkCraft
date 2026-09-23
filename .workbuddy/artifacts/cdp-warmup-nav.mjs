/**
 * CDP 预热轮：让 Vite dev **按需转换**完成后再跑正式探针。
 * ==========================================================================
 * 为什么需要它（2026-09-23 实测教训）：
 * 用**独立 worktree** 起的新 dev server 是「冷」的 —— 首次访问时 Vite 要逐模块转换，
 * 于是出现「应用外壳已就绪、DOM 齐全、hasFocus()=true，**但侧栏点击就是不生效**」，
 * 让一整套「本应保持绿」的门也变红 ⇒ **对照运行失真**（不该红的也红 = 无效对照）。
 *
 * 做法：用**合成 el.click()**（不经窗口激活，链路最稳）把目标面板各点一遍，
 * 逼 Vite 把对应模块树转换完；然后**退出但不关浏览器**，把实例交给紧随其后的正式探针复用。
 *
 * 用法：
 *   CDP_PORT=9471 MC_PORT=5175 node .workbuddy/artifacts/cdp-warmup-nav.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const MC_PORT = Number(process.env.MC_PORT || 5174)
const TARGETS = (process.env.WARM_TARGETS || '双链图谱,知识库,编辑器,双链图谱').split(',')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const pageRe = new RegExp(`(localhost|127\\.0\\.0\\.1):${MC_PORT}`)
const page = list.find((t) => t.type === 'page' && pageRe.test(t.url))
if (!page) {
  console.error(`[warmup] 未找到 ${MC_PORT} 页面 target`)
  process.exit(2)
}
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 64 * 1024 * 1024 })
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })

let id = 0
const pending = new Map()
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString())
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
})
const send = (method, params = {}) =>
  new Promise((res, rej) => { const i = ++id; pending.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value
}

await send('Runtime.enable')
await send('Page.enable')
await send('Page.bringToFront')

// 等外壳（冷启动可能很慢）
let readyAt = -1
for (let i = 0; i < 240; i++) {
  try {
    if (await ev(`document.readyState === 'complete' && document.querySelectorAll('.aurora-sidebar-item').length > 0 && document.styleSheets.length > 8`)) { readyAt = i; break }
  } catch { /* 导航中 */ }
  await sleep(500)
}
console.log(`[warmup] §0 外壳就绪 waitIdx=${readyAt}`)

const clickSidebar = (label) => ev(`(() => {
  const el = [...document.querySelectorAll('.aurora-sidebar-item')].find((e) => (e.textContent || '').includes(${JSON.stringify(label)}))
  if (!el) return false
  el.click(); return true
})()`)

/** 每个目标点一遍并等一小会儿（目的是逼 Vite 转换该面板的模块树，不是断言对错） */
for (const t of TARGETS) {
  const hit = await clickSidebar(t)
  await sleep(1800)
  const nodes = await ev(`document.querySelectorAll('.aurora-graph__node').length`).catch(() => 0)
  console.log(`[warmup] 点「${t}」 hit=${hit} 图谱节点=${nodes}`)
}

console.log('[warmup] 完成（**不关浏览器**，实例留给正式探针复用）')
process.exit(0)

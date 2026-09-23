/**
 * 复现探针：严格首次 · **概览 Tab「最近活动」**点笔记 + 高频采样（2026-09-22 第七轮报障）
 * ==========================================================================
 * 假设：用户「首次进入使用文档知识库」时落在**概览**（进库默认 Tab），直接在「最近活动」
 * 里点笔记 → 跳转发生但**又被弹回概览**（用户描述为「会回到概览界面」），第二次点击才稳定
 * 进简介页。故本探针在点击后以 100ms 间隔连续采样，捕捉「跳走 → 弹回」的瞬态序列。
 *
 * 用法（与 Edge 同一条 bash，profile 需全新）：node .workbuddy/artifacts/cdp-first-click-note-overview.mjs
 */
import { WebSocket } from 'ws'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find(t => t.type === 'page' && t.url.includes('5174'))
if (!page) throw new Error('no 5174 target')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
let id = 0; const pending = new Map(); const logs = []
ws.on('message', raw => { const m = JSON.parse(raw.toString())
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p(m.result) }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${m.params?.type}] ` + (m.params.args || []).map(a => a.value ?? '').join(' '))
})
const send = (method, params = {}) => new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value
}
async function waitFor(expr, { tries = 60, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) { if (await evalJs(expr)) return true; await sleep(ms) }
  console.log(`  ⏱ waitFor 超时: ${label}`)
  return false
}
async function realClick(sel) {
  const box = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)})
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, cls: String(el.className), tag: el.tagName } })()`)
  if (!box) throw new Error('realClick 未命中: ' + sel)
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
    await sleep(60)
  }
  return box
}
const TICK = `(() => ({ h: location.hash.replace('#view=', ''), brief: document.querySelectorAll('.aurora-brief').length,
  ed: document.querySelectorAll('.aurora-editor').length, kb: document.querySelectorAll('.aurora-kb').length }))()`
/** 高频采样：每 100ms 一次，压缩成「状态变化序列」 */
async function sample(label, times = 30) {
  const seq = []
  for (let i = 0; i < times; i++) {
    const t = await evalJs(TICK)
    const key = `${t.h}|brief${t.brief}|ed${t.ed}|kb${t.kb}`
    if (seq[seq.length - 1] !== key) seq.push(key)
    await sleep(100)
  }
  console.log(`${label} 状态序列: ${seq.join('  →  ')}`)
  return seq
}

await send('Runtime.enable')
await sleep(1000)
await waitFor(`!!document.querySelector('[class*="aurora"]')`, { tries: 60, ms: 500, label: 'app 挂载' })
console.log('app 已挂载，等待播种（新 profile 首启）…')
await sleep(3500)

// 侧栏「知识库」→ 列表 → 卡片进详情（**不切任何 Tab，直接落概览**）
await realClick('.aurora-sidebar-item[title="知识库"]')
await waitFor(`document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 60, ms: 400, label: '卡片列表' })
const cardBox = await evalJs(`(() => {
  const cards = [...document.querySelectorAll('.aurora-kb-kbcard')]
  const el = cards.find(x => (x.textContent || '').includes('MarkCraft 使用文档')) || cards[0]
  if (!el) return null
  const b = el.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + Math.min(20, b.height / 2) } })()`)
for (const type of ['mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: cardBox.x, y: cardBox.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await sleep(60)
}
await waitFor(`document.querySelectorAll('.aurora-kb-subbar__name').length > 0`, { label: '详情页' })
await waitFor(`document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { label: '概览最近活动' })
await sleep(600)
console.log('§0 落点:', JSON.stringify(await evalJs(TICK)))

// —— §1 严格首次：概览「最近活动」行真实鼠标点击 + 高频采样 ——
const row = await realClick('.aurora-kb-card--recent .aurora-kb-recent__item')
console.log(`§1 首次点「最近活动」行（真实鼠标, 命中 ${row.tag}.${row.cls}）`)
await sample('§1', 30)

// —— §2 第二次点击（若仍在概览则可点；已跳走则先返回） ——
const stillKb = await evalJs(`document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`)
if (!stillKb) {
  // 用「← 返回 XX」芯片回到知识库，再做第二次点击对照
  const back = await evalJs(`(() => { const c = document.querySelector('button.aurora-editor__return'); if (!c) return false; c.click(); return true })()`)
  console.log(`§2 已进简介页 → 点返回芯片(${back}) 回到知识库，准备第二次对照`)
  await waitFor(`document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`, { label: '第二次前回到概览' })
  await sleep(500)
}
const row2 = await realClick('.aurora-kb-card--recent .aurora-kb-recent__item')
console.log(`§2 第二次点「最近活动」行（命中 ${row2.tag}.${row2.cls}）`)
await sample('§2', 25)

console.log('\n页面日志(尾 8):', JSON.stringify(logs.slice(-8), null, 1))
ws.close()
process.exit(0)

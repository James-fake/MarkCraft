/**
 * 复现探针：**严格首次**场景下点击使用文档笔记（2026-09-22 第七轮报障）
 * ==========================================================================
 * 报障原话：「首次进入到 markcraft 使用文档知识库，首次点击笔记，会回到概览界面，
 *            再次点击笔记才会进入到正确对应的笔记界面」
 *
 * 与前几轮探针的关键差异 —— **必须复现「首次」**：
 *   · 用全新 Edge profile（localStorage / sessionStorage / IndexedDB 全空）→ 触发真正的
 *     首启路径（kbSeed 播种内置使用文档库）；
 *   · 进入知识库详情后**不预先点过任何笔记**（上一轮的探针 §A 先点过一次概览行，
 *     恰好把「首次」这一步吃掉了，所以没暴露本缺陷）。
 *
 * 记录：第一次点笔记（真实鼠标事件）后的视图/简介页/Tab，再点第二次做对照。
 * 用法（与 Edge 同一条 bash，profile 需全新）：node .workbuddy/artifacts/cdp-first-click-note.mjs
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
/** 真实鼠标点击（与合成 el.click() 分开，用于区分「链路被吞」与「探针没点对」） */
async function realClick(sel) {
  const box = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)})
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, cls: String(el.className), tag: el.tagName } })()`)
  if (!box) throw new Error('realClick 选择器未命中: ' + sel)
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
    await sleep(60)
  }
  return box
}

const SNAP = `(() => {
  const active = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
    .filter(x => /is-active/.test(String(x.className)) || x.getAttribute('aria-selected') === 'true')
    .map(x => (x.textContent || '').trim())
  return {
    hash: location.hash,
    brief: document.querySelectorAll('.aurora-brief').length,
    editorPanel: document.querySelectorAll('.aurora-editor').length,
    kbPanel: document.querySelectorAll('.aurora-kb').length,
    kbActiveTab: active,
    notesList: document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length,
    sidebarActive: [...document.querySelectorAll('.aurora-sidebar-item--active')].map(el => el.getAttribute('title')),
  }
})()`

await send('Runtime.enable')
await sleep(1000)

// —— 首启：等 app 挂载 + 播种完成 ——
await waitFor(`!!document.querySelector('[class*="aurora"]')`, { tries: 60, ms: 500, label: 'app 挂载' })
console.log('app 已挂载，等待播种（新 profile 首启）…')
await sleep(3000)

// 侧栏「知识库」→ 列表
await realClick('.aurora-sidebar-item[title="知识库"]')
await waitFor(`document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { tries: 60, ms: 400, label: '知识库卡片列表' })
const cardCount = await evalJs(`document.querySelectorAll('.aurora-kb-kbcard').length`)
console.log(`知识库列表卡片数: ${cardCount}`)

// 进「MarkCraft 使用文档」详情
const cardBox = await evalJs(`(() => {
  const cards = [...document.querySelectorAll('.aurora-kb-kbcard')]
  const i = cards.findIndex(x => (x.textContent || '').includes('MarkCraft 使用文档'))
  const el = i >= 0 ? cards[i] : cards[0]
  if (!el) return null
  const b = el.getBoundingClientRect()
  return { idx: i, x: b.left + b.width / 2, y: b.top + Math.min(20, b.height / 2), name: (el.textContent || '').trim().slice(0, 20) } })()`)
for (const type of ['mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: cardBox.x, y: cardBox.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await sleep(60)
}
await waitFor(`document.querySelectorAll('.aurora-kb-subbar__name').length > 0`, { label: '详情页' })
await sleep(800)
console.log('§0 详情页初始态:', JSON.stringify(await evalJs(SNAP)))

// 切「笔记」Tab（此时**尚未点过任何笔记** = 严格首次）
const tabBox = await evalJs(`(() => {
  const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
    .find(x => (x.textContent || '').includes('笔记'))
  if (!t) return null
  const b = t.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`)
for (const type of ['mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: tabBox.x, y: tabBox.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await sleep(60)
}
await waitFor(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`, { label: '笔记 Tab 列表' })
console.log('§1 笔记 Tab（首次，未点过笔记）:', JSON.stringify(await evalJs(SNAP)))

// —— §2 第一次点笔记（真实鼠标） ——
const firstRow = await realClick('.aurora-kb-notes .aurora-kb-recent__item')
console.log(`§2 第一次点笔记（真实鼠标, 命中 ${firstRow.tag}.${firstRow.cls}）…`)
await sleep(2000)
console.log('§2 第一次点击后:', JSON.stringify(await evalJs(SNAP)))

// —— §3 若第一次未进简介页，再点第二次做对照 ——
await sleep(500)
const secondBox = await evalJs(`(() => {
  const r = document.querySelector('.aurora-kb-notes .aurora-kb-recent__item')
  if (!r) return null
  const b = r.getBoundingClientRect()
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, name: (r.textContent || '').trim().slice(0, 18) } })()`)
if (secondBox) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: secondBox.x, y: secondBox.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
    await sleep(60)
  }
  await sleep(2000)
  console.log(`§3 第二次点笔记（${secondBox.name}）后:`, JSON.stringify(await evalJs(SNAP)))
} else {
  console.log('§3 跳过：当前视图已无笔记行（说明第一次已跳走）')
}

console.log('\n页面日志(尾 5):', JSON.stringify(logs.slice(-5)))
ws.close()
process.exit(0)

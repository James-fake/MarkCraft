/**
 * 复现探针：知识库详情页点击笔记后的真实去向（2026-09-22 第六轮报障）
 * ==========================================================================
 * 用户报障：「在使用文档知识库中点击笔记没能进入对应界面，而是直接回到知识库详细界面的概览页面中」
 *
 * 本探针不做断言，只**如实记录**两条入口各自的现场（视图 hash / 简介页数量 / KB 面板与 Tab / 侧栏激活项）：
 *   §A 概览 Tab「最近活动」行
 *   §B 「笔记」Tab 行
 * 用法（与 Edge 同一条 bash）：node .workbuddy/artifacts/cdp-repro-kb-note-click.mjs
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
  if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'info') logs.push((m.params.args || []).map(a => a.value ?? '').join(' '))
})
const send = (method, params = {}) => new Promise(res => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })) })
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value
}
async function waitFor(expr, { tries = 40, ms = 400, label = '' } = {}) {
  for (let i = 0; i < tries; i++) { if (await evalJs(expr)) return true; await sleep(ms) }
  console.log(`  ⏱ waitFor 超时: ${label}`)
  return false
}

const SNAPSHOT = `(() => {
  const txt = (sel) => ((document.querySelector(sel) || {}).textContent || '').trim().slice(0, 24)
  const tabNames = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
    .map(x => (x.textContent || '').trim())
  const activeTabs = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')]
    .filter(x => /active|is-active|aria-selected="true"/.test(String(x.className) + ' ' + x.getAttribute('aria-selected')))
    .map(x => (x.textContent || '').trim())
  return {
    hash: location.hash,
    brief: document.querySelectorAll('.aurora-brief').length,
    kbPanel: document.querySelectorAll('.aurora-kb').length,
    kbName: txt('.aurora-kb-subbar__name'),
    kbTabs: tabNames,
    kbActiveTab: activeTabs,
    overviewTab: document.querySelectorAll('.aurora-kb-card--recent').length,
    notesList: document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length,
    overviewRows: document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length,
    editorPanel: document.querySelectorAll('.aurora-editor').length,
    activeSidebar: [...document.querySelectorAll('.aurora-sidebar-item--active')].map(el => el.getAttribute('title')),
  }
})()`

await send('Runtime.enable')
await sleep(1000)
await evalJs('location.hash = ""')
await sleep(300)

// 进知识库列表 → 进 MarkCraft 使用文档详情
await evalJs(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-kbcard').length > 0`, { label: '知识库卡片' })
await evalJs(`(() => { const cards = [...document.querySelectorAll('.aurora-kb-kbcard')]
  const c = cards.find(x => (x.textContent || '').includes('MarkCraft 使用文档')) || cards[0]
  if (c) c.click(); return !!c })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-subbar__name').length > 0`, { label: '详情页' })
await sleep(800)
console.log('§0 详情页初始态:', JSON.stringify(await evalJs(SNAPSHOT)))

// —— §A 概览 Tab「最近活动」行 ——
const hasOverviewRows = await evalJs(`document.querySelectorAll('.aurora-kb-card--recent .aurora-kb-recent__item').length > 0`)
if (hasOverviewRows) {
  const rowName = await evalJs(`(() => { const r = document.querySelector('.aurora-kb-card--recent .aurora-kb-recent__item'); return r ? (r.textContent || '').trim().slice(0, 20) : '' })()`)
  const clicked = await evalJs(`(() => { const r = document.querySelector('.aurora-kb-card--recent .aurora-kb-recent__item'); if (r) r.click(); return !!r })()`)
  await sleep(1800)
  console.log(`§A 概览最近活动 · 点「${rowName}」(clicked=${clicked}) →`, JSON.stringify(await evalJs(SNAPSHOT)))
} else {
  console.log('§A 概览「最近活动」为空（无行可点）')
}

// 回到知识库详情
await evalJs(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
await sleep(600)
const backToKb = await evalJs(`(() => { const cards = [...document.querySelectorAll('.aurora-kb-kbcard')]
  const c = cards.find(x => (x.textContent || '').includes('MarkCraft 使用文档'))
  if (c) { c.click(); return true } return false })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-subbar__name').length > 0`, { label: '回到详情页' })
await sleep(600)

// —— §B 笔记 Tab 行 ——
const switched = await evalJs(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`, { label: '笔记 Tab 列表' })
console.log(`§B 笔记 Tab（switched=${switched}）点首行前:`, JSON.stringify(await evalJs(SNAPSHOT)))
const clickedB = await evalJs(`(() => { const r = document.querySelector('.aurora-kb-notes .aurora-kb-recent__item'); if (r) r.click(); return !!r })()`)
await sleep(1800)
console.log(`§B 点笔记首行(clicked=${clickedB}) →`, JSON.stringify(await evalJs(SNAPSHOT)))

console.log('\nFileStore 日志:', JSON.stringify(logs.filter(l => l.includes('FileStore')).slice(-3)))

// —— §C 简介页「← 返回」芯片落点：回到 KB 详情后落在哪个 Tab？ ——
// 用户描述「点击笔记…直接回到了知识库详细界面的概览页面中」与这条路径的落点吻合，故必须实测。
const inEditor = await evalJs(`location.hash.includes('editor')`)
if (inEditor) {
  const chipInfo = await evalJs(`(() => {
    // 🚨 必须命中 handler 所在元素本身（button.aurora-editor__return）；
    //    模糊选择器 [class*="return"] 会先命中父容器 .aurora-editor__returnbar ——
    //    在父元素上 el.click() 不触发子按钮 handler，表现为「点了没反应」的假缺陷。
    const chip = document.querySelector('button.aurora-editor__return')
    if (!chip) return { found: false }
    chip.click(); return { found: true, text: (chip.textContent || '').trim().slice(0, 24) }
  })()`)
  await sleep(1500)
  console.log('§C 简介页点「← 返回」芯片 →', JSON.stringify(chipInfo), '→', JSON.stringify(await evalJs(SNAPSHOT)))
} else {
  console.log('§C 跳过：当前不在编辑器视图')
}

// —— §D 真实鼠标事件重放点击（合成 el.click() 会绕过 pointer 链路，可能掩盖被吞的真实链路） ——
await evalJs(`(() => { const e = [...document.querySelectorAll('.aurora-sidebar-item')].find(x => (x.textContent || '').includes('知识库')); if (e) e.click(); return !!e })()`)
await sleep(700)
await evalJs(`(() => { const cards = [...document.querySelectorAll('.aurora-kb-kbcard')]
  const c = cards.find(x => (x.textContent || '').includes('MarkCraft 使用文档')) || cards[0]
  if (c) c.click(); return !!c })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-subbar__name').length > 0`, { label: '§D 回到详情页' })
await evalJs(`(() => { const t = [...document.querySelectorAll('.aurora-kb-subbar-tabs button, .aurora-kb-subbar-tabs [role="tab"]')].find(x => (x.textContent || '').includes('笔记')); if (t) t.click(); return !!t })()`)
await waitFor(`document.querySelectorAll('.aurora-kb-notes .aurora-kb-recent__item').length > 0`, { label: '§D 笔记 Tab' })
const box = await evalJs(`(() => { const r = document.querySelector('.aurora-kb-notes .aurora-kb-recent__item')
  if (!r) return null
  const b = r.getBoundingClientRect()
  return { name: (r.textContent || '').trim().slice(0, 16), x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`)
if (box) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1, pointerType: 'mouse' })
    await sleep(60)
  }
  await sleep(1800)
  console.log(`§D 真实鼠标点「${box.name}」→`, JSON.stringify(await evalJs(SNAPSHOT)))
} else {
  console.log('§D 跳过：无笔记行可取坐标')
}

ws.close()
process.exit(0)
